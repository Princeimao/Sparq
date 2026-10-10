import { Worker, Job } from "bullmq";
import { redis } from "../config/redis";
import { prisma } from "../config/prisma";
import type { WhatsAppJobData } from "@sparq/types";

// Services
import { WhatsAppService } from "../services/whatsapp.service";
import { LlmService } from "../services/llm.service";

// Store
import { RedisConversationStore } from "../services/store/redis.conversation.store";

// Repositories
import { CustomerRepository } from "../repository/customer.repository";
import { ProductRepository } from "../repository/product.repository";
import { OrderRepository } from "../repository/order.repository";
import { ServiceRepository } from "../repository/service.repository";
import { BookingRepository } from "../repository/booking.repository";
import { ResourceRepository } from "../repository/resource.repository";
import { FlowRepository } from "../repository/flow.repository";

// Handlers
import { OrderHandler } from "../workflow/order/order.handler";
import { AppointmentHandler } from "../workflow/appointment/appointment.handler";
import { ReservationHandler } from "../workflow/reservation/reservation.handler";
import { GreetingHandler } from "../workflow/greeting/greeting.handler";
import {
  GoodbyeHandler,
  HelpHandler,
  UnknownHandler,
} from "../workflow/system/system.handlers";

// Engine & Registry
import { WorkflowEngine } from "../workflow/workflow.engine";
import { WorkflowRegistry } from "../workflow/workflow.registry";
import { Intent } from "../types/intent";
import { IncomingMessage } from "../types/message";

// Billing gate — independent server-side entitlement check
import { checkJobEntitlement } from "../guards/subscription.guard";

// ─── Bootstrap ────────────────────────────────────────────────────────────────

/**
 * Build the workflow graph once at startup.
 * All handlers are stateless (state is stored in Redis), so sharing a single
 * instance per worker process is safe and memory-efficient.
 */
function buildEngine(): WorkflowEngine {
  // Infrastructure
  const conversationStore = new RedisConversationStore();
  const llmService = new LlmService();

  // Repositories
  const customerRepo = new CustomerRepository();
  const productRepo = new ProductRepository();
  const orderRepo = new OrderRepository();
  const serviceRepo = new ServiceRepository();
  const bookingRepo = new BookingRepository();
  const resourceRepo = new ResourceRepository();
  const flowRepo = new FlowRepository();

  // Handlers
  const orderHandler = new OrderHandler(
    productRepo,
    customerRepo,
    orderRepo,
    flowRepo,
    conversationStore,
  );

  const appointmentHandler = new AppointmentHandler(
    serviceRepo,
    bookingRepo,
    resourceRepo,
    customerRepo,
    flowRepo,
    conversationStore,
  );

  const reservationHandler = new ReservationHandler(
    customerRepo,
    serviceRepo,
    bookingRepo,
    resourceRepo,
    conversationStore,
  );

  // Registry — handlers declare their own intents, modules and menu
  // entries, so adding a flow is one register() call (plus an optional
  // registerModule() for gate-only intents with no runnable handler yet).
  const registry = new WorkflowRegistry();
  registry
    .register(new GreetingHandler())
    .register(new GoodbyeHandler())
    .register(new HelpHandler())
    .register(new UnknownHandler())
    .register(orderHandler)
    .register(appointmentHandler)
    .register(reservationHandler)
    .registerModule(
      [Intent.CANCEL_ORDER, Intent.ORDER_STATUS],
      "products",
    )
    .registerModule(
      [Intent.RESCHEDULE_APPOINTMENT, Intent.CANCEL_APPOINTMENT],
      "bookings",
    )
    .registerModule([Intent.CANCEL_RESERVATION], "bookings");

  return new WorkflowEngine(conversationStore, llmService, registry);
}

// ─── Worker ────────────────────────────────────────────────────────────────────

export function startWhatsAppWorker() {
  console.log("[WhatsApp Worker] Initializing BullMQ worker…");

  const engine = buildEngine();

  const worker = new Worker<WhatsAppJobData>(
    "whatsapp-messages",
    async (job: Job<WhatsAppJobData>) => {
      const {
        messageId,
        phoneNumberId,
        wabaId,
        customerWaId,
        customerName,
        text,
        interactiveId,
        messageType,
        timestamp,
        userId,
      } = job.data;

      console.log(
        `[Worker] Job ${job.id} | from: ${customerWaId} | type: ${messageType ?? "text"} | text: "${text.slice(0, 60)}"`,
      );

      try {
        // Resolve the owning user first — the worker never trusts
        // subscription state from the job payload.
        const ownerId = userId ?? (await resolveUserId(phoneNumberId));

        // ── Subscription gate: block billable work without retry ──
        const gate = await checkJobEntitlement(ownerId, "workflow execution");
        if (!gate.allowed) {
          console.warn(
            `[Worker] Job ${job.id} blocked: ${gate.reason} (plan=${gate.entitlement.plan})`,
          );
          return;
        }

        // ── Customer identity: one record per (business, phone) ──
        // Scoped to the owning business — never merged across tenants.
        const customerRepo = new CustomerRepository();
        const customer = await customerRepo.findOrCreate({
          phone: customerWaId,
          name: customerName || undefined,
          phoneNumberId,
          userId: ownerId,
        });

        // ── Inbound history + redelivery dedup ──
        // waMessageId is unique: a P2002 here means this is a retried
        // webhook whose effects already happened — complete, don't retry.
        try {
          await prisma.message.create({
            data: {
              customerId: customer.id,
              userId: ownerId,
              waMessageId: messageId,
              direction: "INBOUND",
              type: mapInboundType(messageType),
              body: text.slice(0, 4000),
              status: "DELIVERED",
            },
          });
        } catch (err: unknown) {
          if (
            typeof err === "object" &&
            err !== null &&
            "code" in err &&
            (err as { code: string }).code === "P2002"
          ) {
            console.log(
              `[Worker] Job ${job.id} is a redelivery of ${messageId} — skipping`,
            );
            return;
          }
          throw err;
        }

        // Build the service for this specific message's WABA
        const whatsapp = new WhatsAppService({
          messageId,
          phoneNumberId,
          wabaId,
          customerWaId,
          customerName,
          text,
          // Best-effort outbound history for the customer timeline.
          onSend: (info) => {
            void prisma.message
              .create({
                data: {
                  customerId: customer.id,
                  userId: ownerId,
                  direction: "OUTBOUND",
                  type: mapOutboundType(info.type),
                  body: info.body?.slice(0, 4000),
                  status: "SENT",
                },
              })
              .catch((e) =>
                console.warn("[Worker] outbound log failed:", e),
              );
          },
        });

        // Build the strongly-typed incoming message object
        const incomingMessage: IncomingMessage = {
          messageId,
          customerWaId,
          customerName,
          phoneNumberId,
          wabaId,
          userId: ownerId,
          text,
          interactiveId,
          messageType: (messageType as any) ?? "text",
          timestamp: timestamp ?? Date.now(),
        };

        // Run the workflow engine — it decides whether to start or resume
        await engine.process(incomingMessage, whatsapp);
      } catch (error) {
        console.error(`[Worker] Error processing job ${job.id}:`, error);
        throw error; // BullMQ will retry according to queue config
      }
    },
    {
      connection: redis,
      concurrency: 15,
      limiter: {
        max: 50,        // max 50 jobs
        duration: 1000, // per second (WhatsApp rate limit safe zone)
      },
    },
  );

  worker.on("completed", (job) => {
    console.log(`[Worker] Job ${job.id} completed`);
  });

  worker.on("failed", (job, err) => {
    console.error(`[Worker] Job ${job?.id} failed:`, err.message);
  });

  worker.on("error", (err) => {
    console.error("[Worker] Worker error:", err);
  });

  return worker;
}

// ─── Helpers ────────────────────────────────────────────────────────────────────

function mapInboundType(messageType?: string): "TEXT" | "INTERACTIVE" | "TEMPLATE" {
  if (messageType === "interactive" || messageType === "button")
    return "INTERACTIVE";
  return "TEXT";
}

function mapOutboundType(type: string): "TEXT" | "INTERACTIVE" | "TEMPLATE" | "FLOW" {
  if (type === "interactive") return "INTERACTIVE";
  if (type === "template") return "TEMPLATE";
  return "TEXT";
}

// ─── Helper: Resolve userId ────────────────────────────────────────────────────

/**
 * Resolves the SaaS user ID from the WhatsApp phoneNumberId
 * when the API job data doesn't include it directly.
 */
async function resolveUserId(phoneNumberId: string): Promise<string> {
  const integration = await prisma.whatsappIntegration.findFirst({
    where: { phoneNumberId },
    select: { userId: true },
  });

  if (!integration) {
    throw new Error(
      `[Worker] Could not resolve userId for phoneNumberId: ${phoneNumberId}`,
    );
  }

  return integration.userId;
}
