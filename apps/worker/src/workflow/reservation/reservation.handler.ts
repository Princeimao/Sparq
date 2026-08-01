import { CustomerRepository } from "../../repository/customer.repository";
import { ConversationStore } from "../../services/store/conversation.store";
import { WorkflowHandler } from "../../types/handler";
import { WorkflowContext } from "../../types/workflowContext";
import { Intent } from "../../types/intent";
import { ReservationStep } from "./reservation.state";

const TTL = 3600000; // 1 hour

export class ReservationHandler implements WorkflowHandler {
  constructor(
    private customerRepository: CustomerRepository,
    private conversationStore: ConversationStore,
  ) {}

  // ─── Entry Point ───────────────────────────────────────────────────────────

  async start(ctx: WorkflowContext): Promise<void> {
    const partySize = ctx.llm?.entities.partySize;
    const date = ctx.llm?.entities.date;
    const time = ctx.llm?.entities.time;

    // If LLM extracted enough details, skip asking
    if (partySize && date && time) {
      await this.conversationStore.set(this.key(ctx), {
        flowId: "RESERVATION",
        intent: Intent.RESERVE_TABLE,
        step: ReservationStep.WAITING_CUSTOMER_DETAILS,
        data: {
          userId: ctx.message.userId,
          metadata: {
            partySize,
            reservationDate: date,
            reservationTime: time,
          },
          detailFields: [
            { id: "name", label: "What name should the reservation be under?", required: true },
          ],
          detailIndex: 0,
          collectedDetails: {},
        },
        expiresAt: Date.now() + TTL,
      });

      await ctx.whatsapp.sendTextMessage(
        `Perfect! A table for *${partySize}* on *${date}* at *${time}*.\n\nWhat name should the reservation be under?`,
      );
      return;
    }

    // Ask for party size first
    await this.conversationStore.set(this.key(ctx), {
      flowId: "RESERVATION",
      intent: Intent.RESERVE_TABLE,
      step: partySize
        ? date
          ? ReservationStep.WAITING_TIME
          : ReservationStep.WAITING_DATE
        : ReservationStep.WAITING_PARTY_SIZE,
      data: {
        userId: ctx.message.userId,
        metadata: {
          partySize: partySize ?? null,
          reservationDate: date ?? null,
          reservationTime: time ?? null,
        },
      },
      expiresAt: Date.now() + TTL,
    });

    if (!partySize) {
      await ctx.whatsapp.sendTextMessage(
        "🍽️ Let's reserve a table!\n\nHow many people will be dining? (e.g., *2*, *4*, *6*)",
      );
    } else if (!date) {
      await ctx.whatsapp.sendTextMessage(
        `Great — table for *${partySize}*! 🎉\n\nWhat date would you like? (e.g., *August 5* or *2026-08-05*)`,
      );
    } else {
      await ctx.whatsapp.sendTextMessage(
        `Perfect — *${partySize}* guests on *${date}*. What time? (e.g., *7:00 PM* or *19:00*)`,
      );
    }
  }

  async resume(ctx: WorkflowContext): Promise<void> {
    switch (ctx.state?.step as ReservationStep) {
      case ReservationStep.WAITING_PARTY_SIZE:
        return this.handlePartySize(ctx);
      case ReservationStep.WAITING_DATE:
        return this.handleDate(ctx);
      case ReservationStep.WAITING_TIME:
        return this.handleTime(ctx);
      case ReservationStep.WAITING_CUSTOMER_DETAILS:
        return this.handleCustomerDetails(ctx);
      case ReservationStep.WAITING_CONFIRMATION:
        return this.handleConfirmation(ctx);
      default:
        await this.conversationStore.delete(this.key(ctx));
        await ctx.whatsapp.sendTextMessage(
          "Session expired. Please start again to reserve a table.",
        );
    }
  }

  // ─── Step: Party Size ──────────────────────────────────────────────────────

  private async handlePartySize(ctx: WorkflowContext): Promise<void> {
    const text = ctx.message.text.trim();
    const partySize = parseInt(text, 10);

    if (isNaN(partySize) || partySize < 1 || partySize > 50) {
      await ctx.whatsapp.sendTextMessage(
        "Please enter a valid number of guests (1–50). How many people will be dining?",
      );
      return;
    }

    const meta = (ctx.state!.data.metadata ?? {}) as Record<string, any>;

    await this.conversationStore.set(this.key(ctx), {
      ...ctx.state!,
      step: ReservationStep.WAITING_DATE,
      data: {
        ...ctx.state!.data,
        metadata: { ...meta, partySize },
      },
      expiresAt: Date.now() + TTL,
    });

    await ctx.whatsapp.sendTextMessage(
      `Table for *${partySize}*! 🎉\n\nWhat date? (e.g., *August 5* or *2026-08-05*)`,
    );
  }

  // ─── Step: Date ─────────────────────────────────────────────────────────────

  private async handleDate(ctx: WorkflowContext): Promise<void> {
    const dateText = ctx.message.text.trim();
    const meta = (ctx.state!.data.metadata ?? {}) as Record<string, any>;

    await this.conversationStore.set(this.key(ctx), {
      ...ctx.state!,
      step: ReservationStep.WAITING_TIME,
      data: {
        ...ctx.state!.data,
        metadata: { ...meta, reservationDate: dateText },
      },
      expiresAt: Date.now() + TTL,
    });

    await ctx.whatsapp.sendTextMessage(
      `Got it — *${dateText}* ✅\n\nWhat time? (e.g., *7:00 PM* or *19:00*)`,
    );
  }

  // ─── Step: Time ─────────────────────────────────────────────────────────────

  private async handleTime(ctx: WorkflowContext): Promise<void> {
    const timeText = ctx.message.text.trim();
    const meta = (ctx.state!.data.metadata ?? {}) as Record<string, any>;

    await this.conversationStore.set(this.key(ctx), {
      ...ctx.state!,
      step: ReservationStep.WAITING_CUSTOMER_DETAILS,
      data: {
        ...ctx.state!.data,
        metadata: { ...meta, reservationTime: timeText },
        detailFields: [
          { id: "name", label: "What name should the reservation be under?", required: true },
          { id: "phone", label: "A contact number for the reservation? (or type 'skip')" },
          { id: "notes", label: "Any special requests? (or type 'skip')" },
        ],
        detailIndex: 0,
        collectedDetails: {},
      },
      expiresAt: Date.now() + TTL,
    });

    // Check for existing customer to pre-fill
    const customer = await this.customerRepository.findByPhone(
      ctx.message.customerWaId,
      ctx.message.phoneNumberId,
    );

    if (customer) {
      await this.conversationStore.set(this.key(ctx), {
        ...ctx.state!,
        step: ReservationStep.WAITING_CONFIRMATION,
        data: {
          ...ctx.state!.data,
          customerId: customer.id,
          metadata: { ...meta, reservationTime: timeText },
        },
        expiresAt: Date.now() + TTL,
      });

      await ctx.whatsapp.sendInteractiveButtons({
        to: ctx.message.customerWaId,
        headerText: "🍽️ Confirm Reservation",
        bodyText:
          `*Name:* ${customer.name ?? ctx.message.customerName}\n` +
          `*Guests:* ${meta["partySize"]}\n` +
          `*Date:* ${meta["reservationDate"]}\n` +
          `*Time:* ${timeText}\n\n` +
          `Confirm this reservation?`,
        buttons: [
          { type: "reply", reply: { id: "CONFIRM_RES", title: "Yes, confirm!" } },
          { type: "reply", reply: { id: "CANCEL_RES", title: "Cancel" } },
        ],
      });
    } else {
      await ctx.whatsapp.sendTextMessage(
        `Almost done!\n\nWhat name should the reservation be under?`,
      );
    }
  }

  // ─── Step: Customer Details ────────────────────────────────────────────────

  private async handleCustomerDetails(ctx: WorkflowContext): Promise<void> {
    const data = ctx.state!.data;
    const fields = data.detailFields ?? [];
    const index = data.detailIndex ?? 0;
    const collected = data.collectedDetails ?? {};
    const currentField = fields[index];

    if (!currentField) {
      return this.showConfirmation(ctx, collected);
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
      await this.showConfirmation(ctx, collected);
    }
  }

  private async showConfirmation(
    ctx: WorkflowContext,
    collected: Record<string, string>,
  ): Promise<void> {
    const meta = (ctx.state!.data.metadata ?? {}) as Record<string, any>;
    const name = collected["name"] ?? ctx.message.customerName;

    await this.conversationStore.set(this.key(ctx), {
      ...ctx.state!,
      step: ReservationStep.WAITING_CONFIRMATION,
      data: { ...ctx.state!.data, collectedDetails: collected },
      expiresAt: Date.now() + TTL,
    });

    const notesLine = collected["notes"] ? `\n*Notes:* ${collected["notes"]}` : "";

    await ctx.whatsapp.sendInteractiveButtons({
      to: ctx.message.customerWaId,
      headerText: "🍽️ Confirm Reservation",
      bodyText:
        `*Name:* ${name}\n` +
        `*Guests:* ${meta["partySize"]}\n` +
        `*Date:* ${meta["reservationDate"]}\n` +
        `*Time:* ${meta["reservationTime"]}` +
        notesLine +
        `\n\nConfirm this reservation?`,
      buttons: [
        { type: "reply", reply: { id: "CONFIRM_RES", title: "Yes, confirm!" } },
        { type: "reply", reply: { id: "CANCEL_RES", title: "Cancel" } },
      ],
    });
  }

  // ─── Confirmation ──────────────────────────────────────────────────────────

  private async handleConfirmation(ctx: WorkflowContext): Promise<void> {
    const reply = ctx.message.interactiveId ?? ctx.message.text.toLowerCase();

    if (reply !== "CONFIRM_RES" && reply !== "yes" && reply !== "confirm") {
      await this.conversationStore.delete(this.key(ctx));
      await ctx.whatsapp.sendTextMessage(
        "Reservation cancelled. Feel free to book a table again anytime! 🍽️",
      );
      return;
    }

    const data = ctx.state!.data;
    const meta = (data.metadata ?? {}) as Record<string, any>;
    const collected = data.collectedDetails ?? {};
    const name = collected["name"] ?? ctx.message.customerName;

    // Note: The schema has no "Reservation" model — sending a confirmation message
    // and optionally saving to a generic record. SaaS owners see this via messages.
    await ctx.whatsapp.sendTextMessage(
      `🎉 *Reservation Confirmed!*\n\n` +
        `👤 Name: ${name}\n` +
        `👥 Guests: ${meta["partySize"]}\n` +
        `📅 Date: ${meta["reservationDate"]}\n` +
        `⏰ Time: ${meta["reservationTime"]}\n` +
        (collected["notes"] ? `📝 Notes: ${collected["notes"]}\n` : "") +
        `\nWe look forward to having you! 😊`,
    );

    await this.conversationStore.delete(this.key(ctx));
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

  private key(ctx: WorkflowContext) {
    return `${ctx.message.phoneNumberId}:${ctx.message.customerWaId}`;
  }
}
