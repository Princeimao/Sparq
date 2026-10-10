import { CustomerRepository } from "../../repository/customer.repository";
import { ServiceRepository } from "../../repository/service.repository";
import { BookingRepository } from "../../repository/booking.repository";
import { ResourceRepository } from "../../repository/resource.repository";
import { ConversationStore } from "../../services/store/conversation.store";
import {
  AllocationError,
  allocate,
  resolveCandidates,
  type Allocatable,
} from "@sparq/booking";
import { loadSnapshots } from "../../services/availability-snapshot";
import { BusinessModule, MenuEntry, WorkflowHandler } from "../../types/handler";
import { WorkflowContext } from "../../types/workflowContext";
import { Intent } from "../../types/intent";
import { ReservationStep } from "./reservation.state";

const TTL = 3600000; // 1 hour
const DEFAULT_TABLE_MINUTES = 120;

/**
 * Table-booking flow on the unified Booking model.
 * Collects party size → date → time, auto-allocates a fitting free table,
 * then confirms. The table name is shown before confirming; the allocation
 * is re-verified atomically at confirm time so retries can't double-book.
 */
export class ReservationHandler implements WorkflowHandler {
  readonly intents = [Intent.RESERVE_TABLE] as const;
  readonly module: BusinessModule = "bookings";
  readonly menu: MenuEntry = {
    buttonId: "MENU_RESERVE",
    module: "bookings",
    emoji: "🍽️",
    title: "Book a Table",
    hint: "reserve a table for your party",
    textHint: "Type *reserve* to book a table",
  };

  constructor(
    private customerRepository: CustomerRepository,
    private serviceRepository: ServiceRepository,
    private bookingRepository: BookingRepository,
    private resourceRepository: ResourceRepository,
    private conversationStore: ConversationStore,
  ) {}

  // ─── Entry Point ───────────────────────────────────────────────────────────

  async start(ctx: WorkflowContext): Promise<void> {
    const partySize = ctx.llm?.entities.partySize;
    const date = ctx.llm?.entities.date;
    const time = ctx.llm?.entities.time;
    const userId = ctx.message.userId;

    if (partySize && date && time) {
      await this.conversationStore.set(this.key(ctx), {
        flowId: "RESERVATION",
        intent: Intent.RESERVE_TABLE,
        step: ReservationStep.WAITING_CUSTOMER_DETAILS,
        data: {
          userId,
          metadata: { partySize, reservationDate: date, reservationTime: time },
          detailFields: [
            { id: "name", label: "What name should the reservation be under?", required: true },
          ],
          detailIndex: 0,
          collectedDetails: {},
        },
        expiresAt: Date.now() + TTL,
      });

      await ctx.whatsapp.sendTextMessage(
        `Perfect! A table for *${partySize} guest(s)* on *${date}* at *${time}*.\n\nWhat name should the reservation be under?`,
      );
      return;
    }

    // Otherwise, collect party size first
    await this.conversationStore.set(this.key(ctx), {
      flowId: "RESERVATION",
      intent: Intent.RESERVE_TABLE,
      step: partySize
        ? date
          ? ReservationStep.WAITING_TIME
          : ReservationStep.WAITING_DATE
        : ReservationStep.WAITING_PARTY_SIZE,
      data: {
        userId,
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
        `🍽️ Let's book you a table! How many people will be attending? (e.g., *2*, *4*, *6*)`,
      );
    } else if (!date) {
      await ctx.whatsapp.sendTextMessage(
        `Great — for *${partySize} guest(s)*! 🎉\n\nWhat date would you like? (e.g., *August 15* or *2026-08-15*)`,
      );
    } else {
      await ctx.whatsapp.sendTextMessage(
        `Perfect — *${partySize} guest(s)* on *${date}*. What time? (e.g., *7:00 PM* or *19:00*)`,
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

    if (isNaN(partySize) || partySize < 1 || partySize > 500) {
      await ctx.whatsapp.sendTextMessage(
        "Please enter a valid number of guests (1–500). How many people will be attending?",
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
      `Table for *${partySize}*! 🎉\n\nWhat date? (e.g., *Tomorrow*, *August 15* or *2026-08-15*)`,
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

  // ─── Step: Time → find a free table ─────────────────────────────────────────

  private async handleTime(ctx: WorkflowContext): Promise<void> {
    const timeText = ctx.message.text.trim();
    const data = ctx.state!.data;
    const meta = (data.metadata ?? {}) as Record<string, any>;
    const userId = data.userId ?? ctx.message.userId;
    const partySize = parseInt(meta["partySize"] || "1", 10);

    const parsedStart = this.parseStart(meta["reservationDate"], timeText);
    if (!parsedStart) {
      await ctx.whatsapp.sendTextMessage(
        `I couldn't understand that date/time. Please share the time again (e.g., *7:00 PM*).`,
      );
      return;
    }
    const cfg = await this.tableConfig(userId);
    const start = parsedStart;
    const end = new Date(start.getTime() + cfg.durationMinutes * 60_000);

    // Allocate a fitting free table now so the confirmation can name it.
    // The allocation is re-verified atomically at confirm time.
    const table = await this.findFreeTable(userId, partySize, start, end, cfg);
    if (!table) {
      await this.conversationStore.delete(this.key(ctx));
      await ctx.whatsapp.sendTextMessage(
        `Sorry, we're fully booked for *${partySize} guest(s)* at that time 😕 Please try another date or time — type *reserve* to start again.`,
      );
      return;
    }

    const withTable = {
      ...data,
      tableId: table.id,
      tableName: table.name,
      metadata: { ...meta, reservationTime: timeText },
      detailFields: [
        { id: "name", label: "What name should the reservation be under?", required: true },
        { id: "phone", label: "A contact phone number? (or type 'skip')" },
        { id: "notes", label: "Any special requests? (or type 'skip')" },
      ],
      detailIndex: 0,
      collectedDetails: {},
    };

    // Check for existing customer to pre-fill
    const customer = await this.customerRepository.findByPhone(
      ctx.message.customerWaId,
      ctx.message.phoneNumberId,
    );

    if (customer) {
      await this.conversationStore.set(this.key(ctx), {
        ...ctx.state!,
        step: ReservationStep.WAITING_CONFIRMATION,
        data: { ...withTable, customerId: customer.id },
        expiresAt: Date.now() + TTL,
      });
      await this.sendConfirmationCard(ctx, withTable, customer.name ?? ctx.message.customerName, {});
    } else {
      await this.conversationStore.set(this.key(ctx), {
        ...ctx.state!,
        step: ReservationStep.WAITING_CUSTOMER_DETAILS,
        data: withTable,
        expiresAt: Date.now() + TTL,
      });
      await ctx.whatsapp.sendTextMessage(
        `Good news — *${table.name}* is free! 🎉\n\nAlmost done! What name should the reservation be under?`,
      );
    }
  }

  private async sendConfirmationCard(
    ctx: WorkflowContext,
    data: Record<string, any>,
    name: string,
    collected: Record<string, string>,
  ): Promise<void> {
    const meta = (data.metadata ?? {}) as Record<string, any>;
    const notesLine = collected["notes"] ? `\n*Notes:* ${collected["notes"]}` : "";
    await ctx.whatsapp.sendInteractiveButtons({
      to: ctx.message.customerWaId,
      headerText: "🍽️ Confirm Reservation",
      bodyText:
        `*Name:* ${name}\n` +
        `*Guests:* ${meta["partySize"]}\n` +
        `*Table:* ${data.tableName ?? "Best available"}\n` +
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
    collected[currentField.id] = answer.toLowerCase() === "skip" ? "" : answer;

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
    const name = collected["name"] ?? ctx.message.customerName;

    await this.conversationStore.set(this.key(ctx), {
      ...ctx.state!,
      step: ReservationStep.WAITING_CONFIRMATION,
      data: { ...ctx.state!.data, collectedDetails: collected },
      expiresAt: Date.now() + TTL,
    });

    await this.sendConfirmationCard(ctx, ctx.state!.data, name, collected);
  }

  // ─── Confirmation ──────────────────────────────────────────────────────────

  private async handleConfirmation(ctx: WorkflowContext): Promise<void> {
    const reply = ctx.message.interactiveId ?? ctx.message.text.toLowerCase();

    if (reply !== "CONFIRM_RES" && reply !== "yes" && reply !== "confirm") {
      await this.conversationStore.delete(this.key(ctx));
      await ctx.whatsapp.sendTextMessage(
        "Reservation cancelled. Feel free to book again anytime! 🍽️",
      );
      return;
    }

    const data = ctx.state!.data;
    const meta = (data.metadata ?? {}) as Record<string, any>;
    const collected = data.collectedDetails ?? {};
    const name = collected["name"] ?? ctx.message.customerName;
    const userId = data.userId ?? ctx.message.userId;
    const partySize = parseInt(meta["partySize"] || "1", 10);

    const parsedStart = this.parseStart(meta["reservationDate"], meta["reservationTime"]);
    if (!parsedStart) {
      await ctx.whatsapp.sendTextMessage(
        `I couldn't understand that date/time. Please type *reserve* to start again.`,
      );
      await this.conversationStore.delete(this.key(ctx));
      return;
    }
    const cfg = await this.tableConfig(userId);
    const parsed = {
      start: parsedStart,
      end: new Date(parsedStart.getTime() + cfg.durationMinutes * 60_000),
    };

    // Link to the customer record (scoped to this business) while keeping
    // the transaction-time name/phone snapshot on the booking.
    const customer = await this.customerRepository.findOrCreate({
      phone: collected["phone"] || ctx.message.customerWaId,
      name,
      phoneNumberId: ctx.message.phoneNumberId,
      userId,
    });

    const tableId: string | undefined = data.tableId;
    const tableService = await this.serviceRepository.findTableService(userId);

    try {
      await this.bookingRepository.createChecked(
        `booking:table:${parsed.start.toISOString().slice(0, 10)}`,
        {
          customer: { connect: { id: customer.id } },
          customerName: name,
          customerPhone: collected["phone"] || ctx.message.customerWaId,
          startTime: parsed.start,
          endTime: parsed.end,
          partySize,
          notes: collected["notes"] || undefined,
          status: "PENDING",
          source: "WHATSAPP",
          ...(tableService ? { service: { connect: { id: tableService.id } } } : {}),
          user: { connect: { id: userId } },
          allocations: tableId
            ? { create: [{ resourceId: tableId, role: "TABLE" }] }
            : undefined,
        },
        {
          ownerIds: tableId ? [tableId] : [],
          startTime: parsed.start,
          endTime: parsed.end,
          bufferMinutes: tableService?.bufferMinutes ?? 0,
        },
      );
    } catch (err) {
      if (err instanceof Error && err.message === "SLOT_TAKEN") {
        await ctx.whatsapp.sendTextMessage(
          `Sorry, that table was just taken 😕 Please try another time — type *reserve* to start again.`,
        );
        await this.conversationStore.delete(this.key(ctx));
        return;
      }
      throw err;
    }

    await ctx.whatsapp.sendTextMessage(
      `🎉 *Reservation Confirmed!*\n\n` +
        `👤 Name: ${name}\n` +
        `👥 Guests: ${partySize}\n` +
        (data.tableName ? `🪑 Table: ${data.tableName}\n` : "") +
        `📅 Date: ${meta["reservationDate"]}\n` +
        `⏰ Time: ${meta["reservationTime"]}\n` +
        (collected["notes"] ? `📝 Notes: ${collected["notes"]}\n` : "") +
        `\nWe look forward to hosting you! 😊`,
    );

    await this.conversationStore.delete(this.key(ctx));
  }

  /** Parse free-text "August 15" + "7:00 PM" into a Date, or null. */
  private parseStart(dateText: unknown, timeText: unknown): Date | null {
    if (typeof dateText !== "string" || typeof timeText !== "string") return null;
    const start = new Date(`${dateText.trim()} ${timeText.trim()}`);
    return isNaN(start.getTime()) ? null : start;
  }

  private async tableConfig(userId: string): Promise<{
    durationMinutes: number;
    bufferMinutes: number;
    serviceId: string | null;
    linked: Allocatable[];
  }> {
    const svc = await this.serviceRepository.findTableService(userId);
    return {
      durationMinutes: svc?.duration ?? DEFAULT_TABLE_MINUTES,
      bufferMinutes: svc?.bufferMinutes ?? 0,
      serviceId: svc?.id ?? null,
      linked: (svc?.resourceLinks ?? []).map((l) => ({
        id: l.resource.id,
        kind: "RESOURCE" as const,
        capacity: l.resource.capacity,
        isActive: l.resource.isActive,
      })),
    };
  }

  private async findFreeTable(
    userId: string,
    partySize: number,
    start: Date,
    end: Date,
    cfg: { durationMinutes: number; bufferMinutes: number; serviceId: string | null; linked: Allocatable[] },
  ): Promise<{ id: string; name: string } | null> {
    const tables = await this.resourceRepository.findActiveTables(userId);
    const candidates = resolveCandidates({
      mode: "AUTO",
      linkedStaff: [],
      linkedResources: cfg.linked,
      allTables: tables.map((t) => ({
        id: t.id,
        kind: "RESOURCE" as const,
        capacity: t.capacity,
        isActive: t.isActive,
      })),
      requiresPartySize: true,
    }).filter((c) => c.capacity == null || c.capacity >= partySize);
    if (candidates.length === 0) return null;

    const ids = candidates.map((c) => c.id);
    const { hours, timeOffs, busy, timeZone: tz } = await loadSnapshots(
      userId,
      ids,
      start,
      end,
      cfg.bufferMinutes,
      this.resourceRepository,
      this.bookingRepository,
    );
    const names = new Map(tables.map((t) => [t.id, t.name]));
    for (const l of cfg.linked) {
      const found = tables.find((t) => t.id === l.id);
      if (found) names.set(l.id, found.name);
    }
    try {
      const alloc = allocate({
        service: {
          id: cfg.serviceId ?? "table",
          duration: Math.round((end.getTime() - start.getTime()) / 60_000),
          bufferMinutes: cfg.bufferMinutes,
          minLeadMinutes: 0,
          maxAdvanceDays: null,
          requiresPartySize: true,
          assignmentMode: "AUTO",
          locationMode: "AT_BUSINESS",
        },
        start,
        end,
        partySize,
        candidates,
        hours,
        timeOffs,
        busy,
        timeZone: tz,
      });
      const id = alloc.resourceIds[0];
      if (!id) return null;
      const table = tables.find((t) => t.id === id);
      return { id, name: table?.name ?? names.get(id) ?? "a table" };
    } catch (err) {
      if (err instanceof AllocationError) return null;
      throw err;
    }
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

  private key(ctx: WorkflowContext) {
    return `${ctx.message.phoneNumberId}:${ctx.message.customerWaId}`;
  }
}
