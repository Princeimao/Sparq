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
import { AppointmentRepository } from "../repository/appointment.repository";
import { FlowRepository } from "../repository/flow.repository";

// Handlers
import { OrderHandler } from "../workflow/order/order.handler";
import { AppointmentHandler } from "../workflow/appointment/appointment.handler";
import { ReservationHandler } from "../workflow/reservation/reservation.handler";

// Engine & Registry
import { WorkflowEngine } from "../workflow/workflow.engine";
import { WorkflowRegistry } from "../workflow/workflow.registry";
import { Intent } from "../types/intent";
import { IncomingMessage } from "../types/message";

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
  const appointmentRepo = new AppointmentRepository();
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
    appointmentRepo,
    customerRepo,
    flowRepo,
    conversationStore,
  );

  const reservationHandler = new ReservationHandler(
    customerRepo,
    conversationStore,
  );

  // Registry
  const registry = new WorkflowRegistry();
  registry.register(Intent.ORDER_PRODUCT, orderHandler);
  registry.register(Intent.BOOK_APPOINTMENT, appointmentHandler);
  registry.register(Intent.RESERVE_TABLE, reservationHandler);

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
        // Build the service for this specific message's WABA
        const whatsapp = new WhatsAppService({
          messageId,
          phoneNumberId,
          wabaId,
          customerWaId,
          customerName,
          text,
        });

        // Build the strongly-typed incoming message object
        const incomingMessage: IncomingMessage = {
          messageId,
          customerWaId,
          customerName,
          phoneNumberId,
          wabaId,
          userId: userId ?? await resolveUserId(phoneNumberId),
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
