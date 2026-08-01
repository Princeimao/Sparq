import { ServiceRepository } from "../../repository/service.repository";
import { AppointmentRepository } from "../../repository/appointment.repository";
import { CustomerRepository } from "../../repository/customer.repository";
import { FlowRepository } from "../../repository/flow.repository";
import { ConversationStore } from "../../services/store/conversation.store";
import { WorkflowHandler } from "../../types/handler";
import { WorkflowContext } from "../../types/workflowContext";
import { Intent } from "../../types/intent";
import { AppointmentStep } from "./appointment.state";

const TTL = 3600000; // 1 hour

export class AppointmentHandler implements WorkflowHandler {
  constructor(
    private serviceRepository: ServiceRepository,
    private appointmentRepository: AppointmentRepository,
    private customerRepository: CustomerRepository,
    private flowRepository: FlowRepository,
    private conversationStore: ConversationStore,
  ) {}

  // ─── Entry Point ───────────────────────────────────────────────────────────

  async start(ctx: WorkflowContext): Promise<void> {
    const serviceQuery = ctx.llm?.entities.serviceQuery;

    const services = await this.serviceRepository.search(
      ctx.message.phoneNumberId,
      serviceQuery ?? "",
    );

    if (services.length === 0) {
      await ctx.whatsapp.sendTextMessage(
        "Sorry, I couldn't find any available services right now. Please contact us directly to book an appointment.",
      );
      return;
    }

    await this.conversationStore.set(this.key(ctx), {
      flowId: "APPOINTMENT",
      intent: Intent.BOOK_APPOINTMENT,
      step: AppointmentStep.WAITING_SERVICE_SELECTION,
      data: {
        serviceIds: services.map((s) => s.id),
        userId: ctx.message.userId,
      },
      expiresAt: Date.now() + TTL,
    });

    if (services.length === 1) {
      const s = services[0]!;
      await ctx.whatsapp.sendInteractiveButtons({
        to: ctx.message.customerWaId,
        headerText: "📅 Book Appointment",
        bodyText: `*${s.name}*\n${s.description ?? ""}\n\n⏱ Duration: ${s.duration} mins${s.price ? `\n💰 Price: ₹${s.price}` : ""}`,
        footerText: "Would you like to book this?",
        buttons: [
          { type: "reply", reply: { id: s.id, title: "Book This" } },
          { type: "reply", reply: { id: "CANCEL", title: "Never mind" } },
        ],
      });
    } else {
      await ctx.whatsapp.sendInteractiveListMessage({
        to: ctx.message.customerWaId,
        header: { type: "text", text: "📅 Book Appointment" },
        body: "Choose a service to book:",
        button: "View Services",
        sections: [
          {
            title: "Available Services",
            rows: services.map((s) => ({
              id: s.id,
              title: s.name.slice(0, 24),
              description: `${s.duration} mins${s.price ? ` · ₹${s.price}` : ""}`,
            })),
          },
        ],
        token: "",
        footer: "Powered by Sparq",
      });
    }
  }

  async resume(ctx: WorkflowContext): Promise<void> {
    switch (ctx.state?.step as AppointmentStep) {
      case AppointmentStep.WAITING_SERVICE_SELECTION:
        return this.handleServiceSelected(ctx);
      case AppointmentStep.WAITING_DATE:
        return this.handleDateProvided(ctx);
      case AppointmentStep.WAITING_TIME:
        return this.handleTimeProvided(ctx);
      case AppointmentStep.WAITING_CUSTOMER_DETAILS:
        return this.handleCustomerDetails(ctx);
      case AppointmentStep.WAITING_CONFIRMATION:
        return this.handleConfirmation(ctx);
      default:
        await this.conversationStore.delete(this.key(ctx));
        await ctx.whatsapp.sendTextMessage(
          "Session expired. Please start again to book an appointment.",
        );
    }
  }

  // ─── Service Selected ──────────────────────────────────────────────────────

  private async handleServiceSelected(ctx: WorkflowContext): Promise<void> {
    const serviceId = ctx.message.interactiveId ?? "";

    if (!serviceId || serviceId === "CANCEL") {
      await this.conversationStore.delete(this.key(ctx));
      await ctx.whatsapp.sendTextMessage("No problem! Let me know if you need anything. 😊");
      return;
    }

    await this.conversationStore.set(this.key(ctx), {
      ...ctx.state!,
      step: AppointmentStep.WAITING_DATE,
      data: {
        ...ctx.state!.data,
        selectedServiceId: serviceId,
      },
      expiresAt: Date.now() + TTL,
    });

    await ctx.whatsapp.sendTextMessage(
      "Great choice! 📅\n\nWhat date would you like? (e.g., *August 5* or *2026-08-05*)",
    );
  }

  // ─── Date Provided ─────────────────────────────────────────────────────────

  private async handleDateProvided(ctx: WorkflowContext): Promise<void> {
    const dateText = ctx.message.text.trim();

    await this.conversationStore.set(this.key(ctx), {
      ...ctx.state!,
      step: AppointmentStep.WAITING_TIME,
      data: {
        ...ctx.state!.data,
        metadata: {
          ...(ctx.state!.data.metadata ?? {}),
          appointmentDate: dateText,
        },
      },
      expiresAt: Date.now() + TTL,
    });

    await ctx.whatsapp.sendTextMessage(
      `Got it — *${dateText}* ✅\n\nWhat time works for you? (e.g., *10:00 AM* or *14:30*)`,
    );
  }

  // ─── Time Provided ─────────────────────────────────────────────────────────

  private async handleTimeProvided(ctx: WorkflowContext): Promise<void> {
    const timeText = ctx.message.text.trim();
    const data = ctx.state!.data;
    const meta = (data.metadata ?? {}) as Record<string, any>;

    // Check for existing customer record
    const customer = await this.customerRepository.findByPhone(
      ctx.message.customerWaId,
      ctx.message.phoneNumberId,
    );

    await this.conversationStore.set(this.key(ctx), {
      ...ctx.state!,
      step: AppointmentStep.WAITING_CONFIRMATION,
      data: {
        ...data,
        customerId: customer?.id,
        metadata: {
          ...meta,
          appointmentTime: timeText,
        },
      },
      expiresAt: Date.now() + TTL,
    });

    if (customer) {
      const name = customer.name ?? ctx.message.customerName;
      await ctx.whatsapp.sendInteractiveButtons({
        to: ctx.message.customerWaId,
        headerText: "📋 Confirm Appointment",
        bodyText:
          `*Name:* ${name}\n` +
          `*Date:* ${meta["appointmentDate"]}\n` +
          `*Time:* ${timeText}\n\n` +
          `Shall I confirm this booking?`,
        buttons: [
          { type: "reply", reply: { id: "CONFIRM_APPT", title: "Yes, confirm!" } },
          { type: "reply", reply: { id: "CANCEL_APPT", title: "Cancel" } },
        ],
      });
    } else {
      // Need customer name/phone
      await this.conversationStore.set(this.key(ctx), {
        ...ctx.state!,
        step: AppointmentStep.WAITING_CUSTOMER_DETAILS,
        data: {
          ...data,
          metadata: { ...meta, appointmentTime: timeText },
          detailFields: [
            { id: "name", label: "What is your full name?", required: true },
            { id: "email", label: "Your email address? (optional — type 'skip' to skip)" },
          ],
          detailIndex: 0,
          collectedDetails: {},
        },
        expiresAt: Date.now() + TTL,
      });

      await ctx.whatsapp.sendTextMessage(
        `Almost there! I just need a couple of details.\n\nWhat is your full name?`,
      );
    }
  }

  // ─── Customer Details Collection ───────────────────────────────────────────

  private async handleCustomerDetails(ctx: WorkflowContext): Promise<void> {
    const data = ctx.state!.data;
    const fields = data.detailFields ?? [];
    const index = data.detailIndex ?? 0;
    const collected = data.collectedDetails ?? {};

    const currentField = fields[index];
    if (!currentField) {
      return this.proceedToConfirmation(ctx);
    }

    const answer = ctx.message.text.trim();
    collected[currentField.id] = answer === "skip" ? "" : answer;

    const nextIndex = index + 1;
    const nextField = fields[nextIndex];

    await this.conversationStore.set(this.key(ctx), {
      ...ctx.state!,
      data: {
        ...data,
        detailIndex: nextIndex,
        collectedDetails: collected,
      },
      expiresAt: Date.now() + TTL,
    });

    if (nextField) {
      await ctx.whatsapp.sendTextMessage(nextField.label);
    } else {
      await this.proceedToConfirmation(ctx);
    }
  }

  private async proceedToConfirmation(ctx: WorkflowContext): Promise<void> {
    const data = ctx.state!.data;
    const collected = data.collectedDetails ?? {};
    const meta = (data.metadata ?? {}) as Record<string, any>;
    const name = collected["name"] ?? ctx.message.customerName;

    await this.conversationStore.set(this.key(ctx), {
      ...ctx.state!,
      step: AppointmentStep.WAITING_CONFIRMATION,
      data: { ...data, collectedDetails: collected },
      expiresAt: Date.now() + TTL,
    });

    await ctx.whatsapp.sendInteractiveButtons({
      to: ctx.message.customerWaId,
      headerText: "📋 Confirm Appointment",
      bodyText:
        `*Name:* ${name}\n` +
        `*Date:* ${meta["appointmentDate"]}\n` +
        `*Time:* ${meta["appointmentTime"]}\n\n` +
        `Shall I confirm this booking?`,
      buttons: [
        { type: "reply", reply: { id: "CONFIRM_APPT", title: "Yes, confirm!" } },
        { type: "reply", reply: { id: "CANCEL_APPT", title: "Cancel" } },
      ],
    });
  }

  // ─── Confirmation ──────────────────────────────────────────────────────────

  private async handleConfirmation(ctx: WorkflowContext): Promise<void> {
    const reply = ctx.message.interactiveId ?? ctx.message.text.toLowerCase();

    if (reply !== "CONFIRM_APPT" && reply !== "yes" && reply !== "confirm") {
      await this.conversationStore.delete(this.key(ctx));
      await ctx.whatsapp.sendTextMessage(
        "Appointment cancelled. Feel free to book again anytime! 😊",
      );
      return;
    }

    const data = ctx.state!.data;
    const meta = (data.metadata ?? {}) as Record<string, any>;
    const collected = data.collectedDetails ?? {};

    // Ensure customer exists
    let customer = await this.customerRepository.findByPhone(
      ctx.message.customerWaId,
      ctx.message.phoneNumberId,
    );

    if (!customer) {
      customer = await this.customerRepository.findOrCreate({
        phone: ctx.message.customerWaId,
        name: collected["name"] ?? ctx.message.customerName,
        phoneNumberId: ctx.message.phoneNumberId,
        userId: data.userId!,
      });
    }

    // Parse date + time into a DateTime
    const dateTimeStr = `${meta["appointmentDate"]} ${meta["appointmentTime"]}`;
    const startTime = new Date(dateTimeStr);
    if (isNaN(startTime.getTime())) {
      await ctx.whatsapp.sendTextMessage(
        `I couldn't parse the date/time "${dateTimeStr}". Please try booking again with a clearer format.`,
      );
      await this.conversationStore.delete(this.key(ctx));
      return;
    }

    const service = await this.serviceRepository.findById(
      data.selectedServiceId!,
    );
    const durationMinutes = service?.duration ?? 60;
    const endTime = new Date(startTime.getTime() + durationMinutes * 60000);

    await this.appointmentRepository.create({
      customerName: customer.name ?? ctx.message.customerName,
      customerPhone: ctx.message.customerWaId,
      customerEmail: collected["email"] || undefined,
      startTime,
      endTime,
      notes: data.notes,
      service: { connect: { id: data.selectedServiceId! } },
      user: { connect: { id: data.userId! } },
    });

    await ctx.whatsapp.sendTextMessage(
      `🎉 *Appointment Confirmed!*\n\n` +
        `📅 Date: ${meta["appointmentDate"]}\n` +
        `⏰ Time: ${meta["appointmentTime"]}\n` +
        `⏱ Duration: ${durationMinutes} mins\n\n` +
        `We look forward to seeing you! 😊\nIf you need to reschedule, feel free to reach out.`,
    );

    await this.conversationStore.delete(this.key(ctx));
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

  private key(ctx: WorkflowContext) {
    return `${ctx.message.phoneNumberId}:${ctx.message.customerWaId}`;
  }
}
