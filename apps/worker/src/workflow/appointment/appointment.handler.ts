import { ServiceRepository } from "../../repository/service.repository";
import { BookingRepository } from "../../repository/booking.repository";
import { ResourceRepository } from "../../repository/resource.repository";
import { CustomerRepository } from "../../repository/customer.repository";
import { FlowRepository } from "../../repository/flow.repository";
import { ConversationStore } from "../../services/store/conversation.store";
import {
  AllocationError,
  allocate,
  type Allocatable,
} from "@sparq/booking";
import { loadSnapshots } from "../../services/availability-snapshot";
import { BusinessModule, MenuEntry, WorkflowHandler } from "../../types/handler";
import { WorkflowContext } from "../../types/workflowContext";
import { WorkflowData } from "../../types/workflowData";
import { Intent } from "../../types/intent";
import { AppointmentStep } from "./appointment.state";

const TTL = 3600000; // 1 hour

export class AppointmentHandler implements WorkflowHandler {
  readonly intents = [Intent.BOOK_APPOINTMENT] as const;
  readonly module: BusinessModule = "bookings";
  readonly menu: MenuEntry = {
    buttonId: "MENU_BOOK",
    module: "bookings",
    emoji: "📅",
    title: "Book Appointment",
    hint: "schedule a service or consultation",
    textHint: "Type *book* to schedule an appointment",
  };

  constructor(
    private serviceRepository: ServiceRepository,
    private bookingRepository: BookingRepository,
    private resourceRepository: ResourceRepository,
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
        serviceIds: services.map((s: any) => s.id),
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
            rows: services.map((s: any) => ({
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
      case AppointmentStep.WAITING_STAFF_SELECTION:
        return this.handleStaffSelected(ctx);
      case AppointmentStep.WAITING_LOCATION_CHOICE:
        return this.handleLocationChoice(ctx);
      case AppointmentStep.WAITING_DATE:
        return this.handleDateProvided(ctx);
      case AppointmentStep.WAITING_TIME:
        return this.handleTimeProvided(ctx);
      case AppointmentStep.WAITING_VISIT_ADDRESS:
        return this.handleVisitAddress(ctx);
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

  // ─── Service Selected → Staff → Location ────────────────────────────────────

  private async handleServiceSelected(ctx: WorkflowContext): Promise<void> {
    const serviceId = ctx.message.interactiveId ?? "";

    if (!serviceId || serviceId === "CANCEL") {
      await this.conversationStore.delete(this.key(ctx));
      await ctx.whatsapp.sendTextMessage("No problem! Let me know if you need anything. 😊");
      return;
    }

    const service = await this.serviceRepository.findBookingConfig(serviceId);
    if (!service || service.userId !== ctx.message.userId) {
      await ctx.whatsapp.sendTextMessage(
        "That service is no longer available. Please try again.",
      );
      await this.conversationStore.delete(this.key(ctx));
      return;
    }

    const eligibleStaff = service.staff;
    const linkedResources = service.resourceLinks.map((l) => l.resource);
    const data = {
      ...ctx.state!.data,
      selectedServiceId: serviceId,
      assignmentMode: service.assignmentMode,
      eligibleStaffIds: eligibleStaff.map((s) => s.id),
      linkedResourceIds: linkedResources.map((r) => r.id),
    };

    // CUSTOMER_CHOICE with more than one eligible provider → choice UI.
    // One eligible provider → auto-select (no pointless choice screen).
    // SINGLE / AUTO / BUSINESS_ASSIGN → the system allocates later.
    if (service.assignmentMode === "CUSTOMER_CHOICE" && eligibleStaff.length > 1) {
      await this.conversationStore.set(this.key(ctx), {
        ...ctx.state!,
        step: AppointmentStep.WAITING_STAFF_SELECTION,
        data,
        expiresAt: Date.now() + TTL,
      });
      await ctx.whatsapp.sendInteractiveListMessage({
        to: ctx.message.customerWaId,
        header: { type: "text", text: `🧑‍💼 ${service.name}` },
        body: "Choose your preferred specialist:",
        button: "View Staff",
        sections: [
          {
            title: "Specialists",
            rows: service.staff.map((s) => ({
              id: s.id,
              title: s.name.slice(0, 24),
            })),
          },
        ],
        token: "",
        footer: "Powered by Sparq",
      });
      return;
    }

    await this.enterLocationStep(ctx, data, service.locationMode);
  }

  private async handleStaffSelected(ctx: WorkflowContext): Promise<void> {
    const staffId = ctx.message.interactiveId ?? "";

    if (!staffId || staffId === "CANCEL") {
      await this.conversationStore.delete(this.key(ctx));
      await ctx.whatsapp.sendTextMessage("No problem! Let me know if you need anything. 😊");
      return;
    }

    const data = ctx.state!.data;
    const service = await this.serviceRepository.findByIdWithStaff(
      data.selectedServiceId!,
    );
    const valid = service?.staff.some((s) => s.id === staffId);
    if (!service || !valid) {
      await ctx.whatsapp.sendTextMessage(
        "That specialist isn't available for this service. Please pick from the list.",
      );
      return;
    }

    await this.enterLocationStep(
      ctx,
      { ...data, selectedStaffId: staffId },
      service.locationMode,
    );
  }

  /**
   * Location routing — the core of conditional address collection:
   * - AT_BUSINESS → straight to date (never ask for an address)
   * - AT_CUSTOMER → remember home-visit, straight to date
   * - BOTH → let the customer choose first
   */
  private async enterLocationStep(
    ctx: WorkflowContext,
    data: WorkflowData,
    locationMode: string,
  ): Promise<void> {
    if (locationMode === "BOTH") {
      await this.conversationStore.set(this.key(ctx), {
        ...ctx.state!,
        step: AppointmentStep.WAITING_LOCATION_CHOICE,
        data,
        expiresAt: Date.now() + TTL,
      });
      await ctx.whatsapp.sendInteractiveButtons({
        to: ctx.message.customerWaId,
        headerText: "📍 Where?",
        bodyText: "Would you like the service at our place or yours?",
        buttons: [
          { type: "reply", reply: { id: "LOC_BUSINESS", title: "🏠 At your place" } },
          { type: "reply", reply: { id: "LOC_HOME", title: "🏢 Visit us" } },
        ],
      });
      return;
    }

    await this.conversationStore.set(this.key(ctx), {
      ...ctx.state!,
      step: AppointmentStep.WAITING_DATE,
      data: {
        ...data,
        locationChoice: locationMode === "AT_CUSTOMER" ? "AT_CUSTOMER" : "AT_BUSINESS",
      },
      expiresAt: Date.now() + TTL,
    });

    await ctx.whatsapp.sendTextMessage(
      locationMode === "AT_CUSTOMER"
        ? "Great! 🏠 We'll come to you.\n\nWhat date works? (e.g., *August 5* or *2026-08-05*)"
        : "Great choice! 📅\n\nWhat date would you like? (e.g., *August 5* or *2026-08-05*)",
    );
  }

  private async handleLocationChoice(ctx: WorkflowContext): Promise<void> {
    const choice = ctx.message.interactiveId ?? ctx.message.text.trim().toLowerCase();
    const data = ctx.state!.data;

    let locationChoice: "AT_BUSINESS" | "AT_CUSTOMER" | undefined;
    if (choice === "LOC_HOME" || choice.includes("home") || choice.includes("my place")) {
      locationChoice = "AT_CUSTOMER";
    } else if (
      choice === "LOC_BUSINESS" ||
      choice.includes("visit") ||
      choice.includes("your place") ||
      choice.includes("salon") ||
      choice.includes("shop")
    ) {
      locationChoice = "AT_BUSINESS";
    }

    if (!locationChoice) {
      await ctx.whatsapp.sendTextMessage(
        "Please tap a button — at your place or visit us?",
      );
      return;
    }

    await this.conversationStore.set(this.key(ctx), {
      ...ctx.state!,
      step: AppointmentStep.WAITING_DATE,
      data: { ...data, locationChoice },
      expiresAt: Date.now() + TTL,
    });

    await ctx.whatsapp.sendTextMessage(
      locationChoice === "AT_CUSTOMER"
        ? "Perfect — a home visit! 🏠\n\nWhat date works? (e.g., *August 5* or *2026-08-05*)"
        : "Perfect — we'll see you here! 🏢\n\nWhat date works? (e.g., *August 5* or *2026-08-05*)",
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

    const updated = {
      ...data,
      metadata: { ...meta, appointmentTime: timeText },
    };

    // Home visit → collect the visit address BEFORE customer details.
    // In-business → no address is ever asked for.
    if (data.locationChoice === "AT_CUSTOMER") {
      return this.startVisitAddressCollection(ctx, updated);
    }
    return this.proceedToCustomerStep(ctx, updated);
  }

  // ─── Visit Address (home visits only) ────────────────────────────────────────

  private visitAddressFields() {
    return [
      {
        id: "line1",
        label:
          "Where should we come? 🏠\nPlease share your full street address (house no, street, area).",
        required: true,
      },
      { id: "city", label: "Which city?", required: true },
      { id: "pincode", label: "Pincode (6 digits)?", required: true },
      {
        id: "landmark",
        label: "Any landmark to help us find you? (or type 'skip')",
      },
    ];
  }

  private validateVisitField(id: string, answer: string): string | null {
    const value = answer.trim();
    if (id === "line1" && value.length < 5)
      return "Please share a complete street address (at least 5 characters).";
    if (id === "city" && value.length < 2)
      return "Please share a valid city.";
    if (id === "pincode" && !/^[1-9][0-9]{5}$/.test(value))
      return "Please share a valid 6-digit pincode.";
    return null;
  }

  private async startVisitAddressCollection(
    ctx: WorkflowContext,
    data: WorkflowData,
  ): Promise<void> {
    const fields = this.visitAddressFields();
    await this.conversationStore.set(this.key(ctx), {
      ...ctx.state!,
      step: AppointmentStep.WAITING_VISIT_ADDRESS,
      data: {
        ...data,
        detailFields: fields,
        detailIndex: 0,
        visitAddress: {},
      },
      expiresAt: Date.now() + TTL,
    });
    await ctx.whatsapp.sendTextMessage(
      `To arrange the home visit, I need your address.\n\n${fields[0]!.label}`,
    );
  }

  private async handleVisitAddress(ctx: WorkflowContext): Promise<void> {
    const data = ctx.state!.data;
    const fields = data.detailFields ?? [];
    const index = data.detailIndex ?? 0;
    const visitAddress: Record<string, string> = { ...(data.visitAddress ?? {}) };
    const currentField = fields[index];

    if (!currentField) {
      return this.proceedToCustomerStep(ctx, data);
    }

    const answer = ctx.message.text.trim();
    if (answer.toLowerCase() !== "skip") {
      const error = this.validateVisitField(currentField.id, answer);
      if (error) {
        await ctx.whatsapp.sendTextMessage(`${error}\n\n${currentField.label}`);
        return;
      }
      visitAddress[currentField.id] = answer;
    }

    const nextIndex = index + 1;
    const nextField = fields[nextIndex];
    const picked = {
      line1: visitAddress["line1"],
      city: visitAddress["city"],
      pincode: visitAddress["pincode"],
      landmark: visitAddress["landmark"],
    };

    await this.conversationStore.set(this.key(ctx), {
      ...ctx.state!,
      data: { ...data, detailIndex: nextIndex, visitAddress: picked },
      expiresAt: Date.now() + TTL,
    });

    if (nextField) {
      await ctx.whatsapp.sendTextMessage(nextField.label);
    } else {
      await this.proceedToCustomerStep(ctx, {
        ...data,
        detailIndex: nextIndex,
        visitAddress: picked,
      });
    }
  }

  // ─── Customer step (known → confirm card, unknown → name/email) ─────────────

  private async proceedToCustomerStep(
    ctx: WorkflowContext,
    data: WorkflowData,
  ): Promise<void> {
    const meta = (data.metadata ?? {}) as Record<string, any>;

    // Check for existing customer record
    const customer = await this.customerRepository.findByPhone(
      ctx.message.customerWaId,
      ctx.message.phoneNumberId,
    );

    if (customer) {
      const name = customer.name ?? ctx.message.customerName;
      await this.conversationStore.set(this.key(ctx), {
        ...ctx.state!,
        step: AppointmentStep.WAITING_CONFIRMATION,
        data: { ...data, customerId: customer.id },
        expiresAt: Date.now() + TTL,
      });
      await ctx.whatsapp.sendInteractiveButtons({
        to: ctx.message.customerWaId,
        headerText: "📋 Confirm Appointment",
        bodyText: this.confirmationSummary(name, data, meta),
        buttons: [
          { type: "reply", reply: { id: "CONFIRM_APPT", title: "Yes, confirm!" } },
          { type: "reply", reply: { id: "CANCEL_APPT", title: "Cancel" } },
        ],
      });
      return;
    }

    // Need customer name/email
    await this.conversationStore.set(this.key(ctx), {
      ...ctx.state!,
      step: AppointmentStep.WAITING_CUSTOMER_DETAILS,
      data: {
        ...data,
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

  private confirmationSummary(
    name: string,
    data: WorkflowData,
    meta: Record<string, unknown>,
  ): string {
    const lines = [
      `*Name:* ${name}`,
      `*Date:* ${meta["appointmentDate"]}`,
      `*Time:* ${meta["appointmentTime"]}`,
    ];
    if (data.locationChoice === "AT_CUSTOMER") {
      const addr = data.visitAddress;
      const addrText = [addr?.line1, addr?.city, addr?.pincode]
        .filter(Boolean)
        .join(", ");
      lines.push(`*Where:* Home visit 🏠`);
      if (addrText) lines.push(`*Visit address:* ${addrText}`);
    } else {
      lines.push(`*Where:* At our place 🏢`);
    }
    lines.push(``, `Shall I confirm this booking?`);
    return lines.join("\n");
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
      bodyText: this.confirmationSummary(name, data, meta),
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

    const config = await this.serviceRepository.findBookingConfig(
      data.selectedServiceId!,
    );
    // Tenant check: the interactive id is client-controlled — the service
    // must belong to this business.
    if (!config || config.userId !== ctx.message.userId) {
      await ctx.whatsapp.sendTextMessage(
        "That service is no longer available. Please start again.",
      );
      await this.conversationStore.delete(this.key(ctx));
      return;
    }
    const durationMinutes = config.duration;
    const endTime = new Date(startTime.getTime() + durationMinutes * 60000);

    // Persist a home-visit address as its own record (labelled "Visit") and
    // link it — saved addresses are never silently reused for visits.
    let visitAddressId: string | undefined;
    const collectedAddr = (data.visitAddress ?? {}) as Record<string, string>;
    if (data.locationChoice === "AT_CUSTOMER" && collectedAddr["line1"]) {
      const saved = await this.customerRepository.createAddress(customer.id, {
        line1: collectedAddr["line1"]!,
        city: collectedAddr["city"] ?? "",
        state: "",
        pincode: collectedAddr["pincode"] ?? "",
        country: "India",
      });
      visitAddressId = saved.id;
    }

    // ── Allocate providers + rooms via the shared engine ──
    const userId = data.userId!;
    const staffCands: Allocatable[] = config.staff.map((s) => ({
      id: s.id,
      kind: "STAFF" as const,
      capacity: null,
      isActive: true,
    }));
    const resourceCands: Allocatable[] = config.resourceLinks.map((l) => ({
      id: l.resource.id,
      kind: "RESOURCE" as const,
      capacity: l.resource.capacity,
      isActive: l.resource.isActive,
    }));
    const ownerIds = [...staffCands, ...resourceCands].map((c) => c.id);
    const { hours, timeOffs, busy, timeZone: tz } = await loadSnapshots(
      userId,
      ownerIds,
      startTime,
      endTime,
      config.bufferMinutes,
      this.resourceRepository,
      this.bookingRepository,
    );
    const svc = {
      id: config.id,
      duration: config.duration,
      bufferMinutes: config.bufferMinutes,
      minLeadMinutes: config.minLeadMinutes,
      maxAdvanceDays: config.maxAdvanceDays,
      requiresPartySize: config.requiresPartySize,
      assignmentMode: config.assignmentMode as "CUSTOMER_CHOICE" | "BUSINESS_ASSIGN" | "AUTO" | "SINGLE",
      locationMode: config.locationMode as "AT_BUSINESS" | "AT_CUSTOMER" | "BOTH",
    };

    let staffIds: string[] = [];
    let resourceIds: string[] = [];
    try {
      if (staffCands.length > 0) {
        const mode =
          svc.assignmentMode === "CUSTOMER_CHOICE" ? "CUSTOMER_CHOICE" : "AUTO";
        const staffAlloc = allocate({
          service: { ...svc, assignmentMode: mode },
          start: startTime,
          end: endTime,
          choiceId: data.selectedStaffId,
          candidates: staffCands,
          hours: hours.filter((h) => staffCands.some((c) => c.id === h.ownerId)),
          timeOffs: timeOffs.filter((t) => staffCands.some((c) => c.id === t.ownerId)),
          busy: busy.filter((b) => staffCands.some((c) => c.id === b.ownerId)),
          timeZone: tz,
        });
        staffIds = staffAlloc.staffIds;
      }
      if (resourceCands.length > 0) {
        // Linked rooms/equipment are required companions: auto-allocate one.
        const roomAlloc = allocate({
          service: { ...svc, assignmentMode: "AUTO" },
          start: startTime,
          end: endTime,
          candidates: resourceCands,
          hours: hours.filter((h) => resourceCands.some((c) => c.id === h.ownerId)),
          timeOffs: timeOffs.filter((t) => resourceCands.some((c) => c.id === t.ownerId)),
          busy: busy.filter((b) => resourceCands.some((c) => c.id === b.ownerId)),
          timeZone: tz,
        });
        resourceIds = roomAlloc.resourceIds;
      }
      if (
        staffCands.length === 0 &&
        resourceCands.length === 0 &&
        svc.assignmentMode === "CUSTOMER_CHOICE"
      ) {
        throw new AllocationError("NO_ELIGIBLE", "Nothing to choose from.");
      }
    } catch (err) {
      if (err instanceof AllocationError) {
        await ctx.whatsapp.sendTextMessage(
          `${err.message} Please try another time — type *book* to start again.`,
        );
        await this.conversationStore.delete(this.key(ctx));
        return;
      }
      throw err;
    }

    try {
      await this.bookingRepository.createChecked(
        `booking:${config.id}:${startTime.toISOString().slice(0, 10)}`,
        {
          customer: { connect: { id: customer.id } },
          customerName: customer.name ?? ctx.message.customerName,
          customerPhone: ctx.message.customerWaId,
          customerEmail: collected["email"] || undefined,
          startTime,
          endTime,
          notes: data.notes,
          locationMode: (data.locationChoice ?? "AT_BUSINESS") as never,
          visitAddress: visitAddressId
            ? { connect: { id: visitAddressId } }
            : undefined,
          service: { connect: { id: data.selectedServiceId! } },
          user: { connect: { id: data.userId! } },
          source: "WHATSAPP",
          allocations: {
            create: [
              ...staffIds.map((staffId) => ({ staffId, role: "PRIMARY" })),
              ...resourceIds.map((resourceId) => ({ resourceId, role: "ROOM" })),
            ],
          },
        },
        {
          ownerIds: [...staffIds, ...resourceIds],
          startTime,
          endTime,
          bufferMinutes: config.bufferMinutes,
        },
      );
    } catch (err) {
      if (err instanceof Error && err.message === "SLOT_TAKEN") {
        await ctx.whatsapp.sendTextMessage(
          "Sorry, that slot was just taken 😕 Please try another date or time — type *book* to start again.",
        );
        await this.conversationStore.delete(this.key(ctx));
        return;
      }
      throw err;
    }

    const whereLine =
      data.locationChoice === "AT_CUSTOMER"
        ? `🏠 Home visit — our specialist will come to you\n`
        : ``;

    await ctx.whatsapp.sendTextMessage(
      `🎉 *Appointment Confirmed!*\n\n` +
        `📅 Date: ${meta["appointmentDate"]}\n` +
        `⏰ Time: ${meta["appointmentTime"]}\n` +
        `⏱ Duration: ${config.duration} mins\n` +
        whereLine +
        `\nWe look forward to seeing you! 😊\nIf you need to reschedule, feel free to reach out.`,
    );

    await this.conversationStore.delete(this.key(ctx));
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

  private key(ctx: WorkflowContext) {
    return `${ctx.message.phoneNumberId}:${ctx.message.customerWaId}`;
  }
}
