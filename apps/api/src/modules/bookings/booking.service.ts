import {
  AllocationError,
  allocate,
  breaksForDate,
  generateSlots,
  resolveCandidates,
  type Allocatable,
  type ServiceConfig,
  type TimeSlot,
} from "@sparq/booking";
import { prisma } from "../../config/prisma";
import { ApiError } from "../../middleware/errorHandler";
import {
  acquireAdvisoryLock,
  assertResourceOwned,
  assertServiceOwned,
  assertStaffOwned,
  resolveBookingCustomer,
} from "../../lib/tenant";
import {
  appointmentAddressRequirement,
  validateCollectedAddress,
} from "../../lib/address-policy";

export interface BookingInput {
  serviceId?: string;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  startTime: string;
  endTime?: string;
  locationChoice?: "AT_BUSINESS" | "AT_CUSTOMER";
  visitAddress?: {
    addressId?: string;
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    pincode?: string;
    landmark?: string;
  };
  partySize?: number;
  staffId?: string;
  resourceId?: string;
  notes?: string;
  source?: "WHATSAPP" | "DASHBOARD" | "API";
}

const bookingInclude = {
  service: { select: { id: true, name: true, duration: true, requiresPartySize: true } },
  customer: { select: { id: true, name: true, phone: true } },
  visitAddress: true,
  allocations: {
    include: {
      staff: { select: { id: true, name: true, color: true } },
      resource: { select: { id: true, name: true, kind: true, color: true } },
    },
  },
};

interface LoadedService {
  row: {
    id: string;
    duration: number;
    bufferMinutes: number;
    minLeadMinutes: number;
    maxAdvanceDays: number | null;
    requiresPartySize: boolean;
    assignmentMode: string;
    locationMode: string;
  };
  staff: { id: string; name: string; isActive: boolean }[];
  resources: { id: string; name: string; capacity: number | null; isActive: boolean }[];
}

export async function loadService(userId: string, serviceId: string): Promise<LoadedService> {
  const row = await assertServiceOwned(userId, serviceId);
  const [staff, links] = await Promise.all([
    prisma.staff.findMany({
      where: { userId, services: { some: { id: serviceId } } },
      select: { id: true, name: true, isActive: true },
    }),
    prisma.serviceResource.findMany({
      where: { serviceId },
      include: {
        resource: { select: { id: true, name: true, capacity: true, isActive: true } },
      },
    }),
  ]);
  return {
    row: {
      id: row.id,
      duration: row.duration,
      bufferMinutes: row.bufferMinutes,
      minLeadMinutes: row.minLeadMinutes,
      maxAdvanceDays: row.maxAdvanceDays,
      requiresPartySize: row.requiresPartySize,
      assignmentMode: row.assignmentMode,
      locationMode: row.locationMode,
    },
    staff,
    resources: links.map((l) => l.resource),
  };
}

export async function businessTimezone(userId: string): Promise<string> {
  const profile = await prisma.businessProfile.findUnique({
    where: { userId },
    select: { timezone: true },
  });
  return profile?.timezone || "Asia/Kolkata";
}

function toServiceConfig(row: LoadedService["row"]): ServiceConfig {
  return {
    id: row.id,
    duration: row.duration,
    bufferMinutes: row.bufferMinutes,
    minLeadMinutes: row.minLeadMinutes,
    maxAdvanceDays: row.maxAdvanceDays,
    requiresPartySize: row.requiresPartySize,
    assignmentMode: row.assignmentMode as ServiceConfig["assignmentMode"],
    locationMode: row.locationMode as ServiceConfig["locationMode"],
  };
}

async function candidatePool(
  userId: string,
  loaded: LoadedService,
  partySize?: number,
): Promise<Allocatable[]> {
  const linkedStaff: Allocatable[] = loaded.staff.map((s) => ({
    id: s.id,
    kind: "STAFF" as const,
    capacity: null,
    isActive: s.isActive,
  }));
  const linkedResources: Allocatable[] = loaded.resources.map((r) => ({
    id: r.id,
    kind: "RESOURCE" as const,
    capacity: r.capacity,
    isActive: r.isActive,
  }));
  let allTables: Allocatable[] = [];
  if (loaded.row.requiresPartySize && linkedResources.length === 0) {
    // Legacy-compatible fallback: party-size offerings with no explicit
    // table links can use any active table.
    const tables = await prisma.resource.findMany({
      where: { userId, kind: "TABLE", isActive: true },
      select: { id: true, capacity: true },
    });
    allTables = tables.map((t) => ({
      id: t.id,
      kind: "RESOURCE" as const,
      capacity: t.capacity,
      isActive: true,
    }));
  }
  return resolveCandidates({
    mode: loaded.row.assignmentMode as ServiceConfig["assignmentMode"],
    linkedStaff,
    linkedResources,
    allTables,
    requiresPartySize: loaded.row.requiresPartySize,
  });
}

export interface Snapshots {
  candidates: Allocatable[];
  hours: { ownerId: string; dayOfWeek: number; startTime: string; endTime: string; isActive: boolean }[];
  timeOffs: { ownerId: string; startDate: Date; endDate: Date }[];
  busy: { ownerId: string; startTime: Date; endTime: Date }[];
}

async function snapshotsFor(
  userId: string,
  candidates: Allocatable[],
  windowStart: Date,
  windowEnd: Date,
  date?: { day: string; timeZone: string },
): Promise<Snapshots> {
  const staffIds = candidates.filter((c) => c.kind === "STAFF").map((c) => c.id);
  const resourceIds = candidates.filter((c) => c.kind === "RESOURCE").map((c) => c.id);
  const ownerFilter =
    staffIds.length || resourceIds.length
      ? {
          OR: [
            ...(staffIds.length ? [{ staffId: { in: staffIds } }] : []),
            ...(resourceIds.length ? [{ resourceId: { in: resourceIds } }] : []),
          ],
        }
      : { staffId: "__none__" };
  const [hours, timeOffs, breakRows, bookings] = await Promise.all([
    prisma.availability.findMany({
      where: ownerFilter,
      select: { staffId: true, resourceId: true, dayOfWeek: true, startTime: true, endTime: true, isActive: true },
    }),
    prisma.timeOff.findMany({
      where: {
        userId,
        ...ownerFilter,
        startDate: { lt: windowEnd },
        endDate: { gt: windowStart },
      },
      select: { staffId: true, resourceId: true, startDate: true, endDate: true },
    }),
    date
      ? prisma.break.findMany({
          where: { userId, ...ownerFilter },
          select: { staffId: true, resourceId: true, dayOfWeek: true, startTime: true, endTime: true },
        })
      : [],
    prisma.booking.findMany({
      where: {
        userId,
        status: { notIn: ["CANCELLED"] },
        startTime: { lt: windowEnd },
        endTime: { gt: windowStart },
      },
      select: {
        startTime: true,
        endTime: true,
        allocations: { select: { staffId: true, resourceId: true } },
      },
    }),
  ]);

  const busy: Snapshots["busy"] = [];
  for (const b of bookings) {
    for (const a of b.allocations) {
      const ownerId = a.staffId ?? a.resourceId;
      if (ownerId) busy.push({ ownerId, startTime: b.startTime, endTime: b.endTime });
    }
  }
  if (date) {
    busy.push(
      ...breaksForDate(
        breakRows.map((r) => ({
          ownerId: (r.staffId ?? r.resourceId)!,
          dayOfWeek: r.dayOfWeek,
          startTime: r.startTime,
          endTime: r.endTime,
        })),
        date.day,
        date.timeZone,
      ),
    );
  }
  return {
    candidates,
    hours: hours.map((h) => ({
      ownerId: (h.staffId ?? h.resourceId)!,
      dayOfWeek: h.dayOfWeek,
      startTime: h.startTime,
      endTime: h.endTime,
      isActive: h.isActive,
    })),
    timeOffs: timeOffs.map((t) => ({
      ownerId: (t.staffId ?? t.resourceId)!,
      startDate: t.startDate,
      endDate: t.endDate,
    })),
    busy,
  };
}

function businessHoursWindows(
  operatingHours: Record<string, { open: string; close: string; closed?: boolean }> | null | undefined,
  ownerId: string,
): Snapshots["hours"] {
  if (!operatingHours) return [];
  const dayMap: Record<string, number> = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };
  const out: Snapshots["hours"] = [];
  for (const [day, v] of Object.entries(operatingHours)) {
    const dow = dayMap[day.slice(0, 3).toLowerCase()];
    if (dow == null || v.closed) continue;
    out.push({ ownerId, dayOfWeek: dow, startTime: v.open, endTime: v.close, isActive: true });
  }
  return out;
}

/** Day availability for the booking UI / WhatsApp slot picker. */
export async function dayAvailability(
  userId: string,
  serviceId: string,
  date: string,
  partySize?: number,
  onlyOwnerId?: string,
): Promise<{ slots: { start: string; end: string; options: { id: string; kind: string; name: string }[] }[]; timezone: string; ownerImplicit: boolean }> {
  const loaded = await loadService(userId, serviceId);
  const tz = await businessTimezone(userId);
  const candidates = (await candidatePool(userId, loaded, partySize)).filter(
    (c) => !onlyOwnerId || c.id === onlyOwnerId,
  );
  const ownerImplicit = candidates.length === 0;
  const dayStart = new Date(`${date}T00:00:00Z`);
  const dayEnd = new Date(`${date}T23:59:59Z`);

  const names = new Map<string, { kind: string; name: string }>();
  for (const s of loaded.staff) names.set(s.id, { kind: "STAFF", name: s.name });
  for (const r of loaded.resources) names.set(r.id, { kind: "RESOURCE", name: r.name });
  if (!ownerImplicit) {
    const snap = await snapshotsFor(userId, candidates, dayStart, dayEnd, {
      day: date,
      timeZone: tz,
    });
    // Union windows across candidates; fall back to business hours.
    let windows = snap.hours;
    if (windows.length === 0) {
      const profile = await prisma.businessProfile.findUnique({ where: { userId } });
      const biz = businessHoursWindows(
        profile?.operatingHours as Record<string, { open: string; close: string; closed?: boolean }> | null,
        "__business__",
      );
      windows = biz.length > 0 ? biz : defaultDayWindows();
    }
    const slots = generateSlots(
      {
        service: toServiceConfig(loaded.row),
        date,
        dayStart,
        dayEnd,
        partySize,
        now: new Date(),
      },
      windows.map((w) => ({ ...w, ownerId: "__union__" })),
      snap.timeOffs,
      snap.busy,
      tz,
    );
    // Per-slot eligible options (capacity + free at that slot).
    const withOptions = slots.map((s) => {
      const options = candidates
        .filter((c) => {
          if (partySize != null && c.capacity != null && c.capacity < partySize) return false;
          return true;
        })
        .filter((c) => {
          try {
            allocate({
              service: { ...toServiceConfig(loaded.row), assignmentMode: "CUSTOMER_CHOICE" },
              start: s.start,
              end: s.end,
              partySize,
              choiceId: c.id,
              candidates: [c],
              hours: snap.hours.filter((h) => h.ownerId === c.id),
              timeOffs: snap.timeOffs.filter((t) => t.ownerId === c.id),
              busy: snap.busy.filter((b) => b.ownerId === c.id),
              timeZone: tz,
            });
            return true;
          } catch {
            return false;
          }
        })
        .map((c) => ({ id: c.id, kind: c.kind, name: names.get(c.id)?.name ?? c.id }));
      return { start: s.start.toISOString(), end: s.end.toISOString(), options };
    });
    return { slots: withOptions.filter((s) => s.options.length > 0), timezone: tz, ownerImplicit };
  }

  // Owner-implicit (solo, no linked providers): business-hours slots, no options.
  const profile = await prisma.businessProfile.findUnique({ where: { userId } });
  const biz = businessHoursWindows(
    profile?.operatingHours as Record<string, { open: string; close: string; closed?: boolean }> | null,
    "__business__",
  );
  const slots = generateSlots(
    {
      service: toServiceConfig(loaded.row),
      date,
      dayStart,
      dayEnd,
      partySize,
      now: new Date(),
    },
    (biz.length > 0 ? biz : defaultDayWindows()).map((w) => ({ ...w, ownerId: "__union__" })),
    [],
    [],
    tz,
  );
  return {
    slots: slots.map((s) => ({ start: s.start.toISOString(), end: s.end.toISOString(), options: [] })),
    timezone: tz,
    ownerImplicit,
  };
}

function defaultDayWindows(): Snapshots["hours"] {
  // Sensible fallback when nobody configured hours: 09:00–18:00 every day.
  return [0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({
    ownerId: "__business__",
    dayOfWeek,
    startTime: "09:00",
    endTime: "18:00",
    isActive: true,
  }));
}

async function resolveVisitAddress(
  userId: string,
  customer: { id: string } | null,
  serviceLocation: string,
  locationChoice: "AT_BUSINESS" | "AT_CUSTOMER" | undefined,
  visitAddress: BookingInput["visitAddress"],
): Promise<string | undefined> {
  if (serviceLocation === "AT_BUSINESS" && locationChoice === "AT_CUSTOMER") {
    throw new ApiError(422, "This offering is only available at the business location");
  }
  if (serviceLocation === "AT_CUSTOMER" && locationChoice === "AT_BUSINESS") {
    throw new ApiError(422, "This offering is only available as a home visit");
  }
  const effective = locationChoice ?? (serviceLocation === "AT_CUSTOMER" ? "AT_CUSTOMER" : "AT_BUSINESS");
  const req = appointmentAddressRequirement(serviceLocation as never, effective);
  if (!req.required) return undefined;
  if (visitAddress?.addressId) {
    const saved = await prisma.address.findFirst({
      where: { id: visitAddress.addressId, customer: { userId } },
    });
    if (!saved || (customer && saved.customerId !== customer.id)) {
      throw new ApiError(422, "Selected address is not valid for this customer");
    }
    return saved.id;
  }
  const errors = validateCollectedAddress(visitAddress ?? {});
  if (errors.length > 0) throw new ApiError(422, errors.join(" "));
  if (!customer) throw new ApiError(422, "A customer is required to save a visit address");
  const created = await prisma.address.create({
    data: {
      customerId: customer.id,
      label: "Visit",
      line1: visitAddress!.line1!,
      line2: visitAddress!.line2,
      city: visitAddress!.city!,
      state: visitAddress!.state ?? "",
      pincode: visitAddress!.pincode!,
      landmark: visitAddress!.landmark,
    },
  });
  return created.id;
}

/** Create a booking: validate → allocate → insert, all under one advisory lock. */
export async function createBooking(userId: string, input: BookingInput) {
  if (!input.serviceId) throw new ApiError(422, "serviceId is required");
  const loaded = await loadService(userId, input.serviceId);
  const tz = await businessTimezone(userId);
  const cfg = toServiceConfig(loaded.row);

  const customer = await resolveBookingCustomer(userId, {
    customerId: input.customerId,
    customerPhone: input.customerPhone,
    customerName: input.customerName,
  });

  const start = new Date(input.startTime);
  if (isNaN(start.getTime())) throw new ApiError(422, "Invalid start time");
  const end = input.endTime ? new Date(input.endTime) : new Date(start.getTime() + cfg.duration * 60_000);
  if (isNaN(end.getTime()) || end <= start) throw new ApiError(422, "Invalid booking period");

  if (cfg.requiresPartySize && (input.partySize == null || input.partySize <= 0)) {
    throw new ApiError(422, "Party size is required for this offering");
  }

  const visitAddressId = await resolveVisitAddress(
    userId,
    customer,
    loaded.row.locationMode,
    input.locationChoice,
    input.visitAddress,
  );
  const effectiveChoice =
    input.locationChoice ?? (loaded.row.locationMode === "AT_CUSTOMER" ? "AT_CUSTOMER" : "AT_BUSINESS");

  const candidates = await candidatePool(userId, loaded, input.partySize);
  const ownerImplicit = candidates.length === 0 && cfg.assignmentMode !== "CUSTOMER_CHOICE";
  if (candidates.length === 0 && !ownerImplicit) {
    throw new ApiError(422, "This offering has no bookable options configured yet");
  }

  // Snapshots BEFORE the lock (read-only); re-verified inside the tx.
  const padMs = cfg.bufferMinutes * 60_000;
  const dayInTz = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(start);
  const snap = await snapshotsFor(
    userId,
    candidates,
    new Date(start.getTime() - padMs),
    new Date(end.getTime() + padMs),
    { day: dayInTz, timeZone: tz },
  );

  let allocation: { staffIds: string[]; resourceIds: string[] } = { staffIds: [], resourceIds: [] };
  if (!ownerImplicit) {
    try {
      allocation = allocate({
        service: cfg,
        start,
        end,
        partySize: input.partySize,
        choiceId: input.staffId ?? input.resourceId,
        candidates,
        hours: snap.hours,
        timeOffs: snap.timeOffs,
        busy: snap.busy,
        timeZone: tz,
      });
    } catch (err) {
      if (err instanceof AllocationError) throw new ApiError(409, err.message);
      throw err;
    }
  }

  const booking = await prisma.$transaction(async (tx) => {
    await acquireAdvisoryLock(tx, `booking:${loaded.row.id}:${start.toISOString().slice(0, 10)}`);

    // Re-check chosen owners inside the lock (kills the check-then-act race).
    for (const ownerId of [...allocation.staffIds, ...allocation.resourceIds]) {
      const clash = await tx.booking.findFirst({
        where: {
          userId,
          status: { notIn: ["CANCELLED"] },
          startTime: { lt: new Date(end.getTime() + padMs) },
          endTime: { gt: new Date(start.getTime() - padMs) },
          allocations: {
            some: { OR: [{ staffId: ownerId }, { resourceId: ownerId }] },
          },
        },
        select: { id: true },
      });
      if (clash) {
        throw new ApiError(409, "That time was just taken. Please pick another slot.");
      }
    }

    return tx.booking.create({
      data: {
        userId,
        serviceId: loaded.row.id,
        customerId: customer?.id,
        customerName: customer?.name ?? input.customerName ?? "Guest",
        customerPhone: customer?.phone ?? input.customerPhone,
        customerEmail: customer?.email ?? input.customerEmail,
        startTime: start,
        endTime: end,
        locationMode: effectiveChoice as never,
        visitAddressId,
        partySize: input.partySize,
        notes: input.notes,
        status: "PENDING",
        source: (input.source ?? "DASHBOARD") as never,
        allocations: {
          create: [
            ...allocation.staffIds.map((staffId) => ({ staffId, role: "PRIMARY" })),
            ...allocation.resourceIds.map((resourceId) => ({ resourceId, role: "PRIMARY" })),
          ],
        },
      },
      include: bookingInclude,
    });
  });

  return booking;
}

const TERMINAL: string[] = ["CANCELLED", "COMPLETED", "NO_SHOW"];

export async function setBookingStatus(userId: string, bookingId: string, status: string) {
  const existing = await prisma.booking.findFirst({ where: { id: bookingId, userId } });
  if (!existing) throw new ApiError(404, "Booking not found");
  if (TERMINAL.includes(existing.status) && !TERMINAL.includes(status)) {
    throw new ApiError(422, `A ${existing.status.toLowerCase()} booking cannot be reopened`);
  }
  return prisma.booking.update({
    where: { id: existing.id },
    data: { status: status as never },
    include: bookingInclude,
  });
}

/** Replace PRIMARY allocations (e.g. move a booking to another stylist/table). */
export async function reassignBooking(
  userId: string,
  bookingId: string,
  input: { staffId?: string; resourceId?: string },
) {
  const existing = await prisma.booking.findFirst({
    where: { id: bookingId, userId },
    include: { service: true, allocations: true },
  });
  if (!existing) throw new ApiError(404, "Booking not found");
  if (TERMINAL.includes(existing.status)) {
    throw new ApiError(422, "A finished booking cannot be reassigned");
  }
  if (!input.staffId && !input.resourceId) {
    throw new ApiError(422, "Provide staffId or resourceId");
  }
  for (const sid of input.staffId ? [input.staffId] : []) {
    await assertStaffOwned(userId, sid);
  }
  if (input.resourceId) {
    await assertResourceOwned(userId, input.resourceId);
  }
  // Eligibility: must be linked to the booking's service.
  if (existing.serviceId) {
    if (input.staffId) {
      const linked = await prisma.service.findFirst({
        where: { id: existing.serviceId, staff: { some: { id: input.staffId } } },
        select: { id: true },
      });
      if (!linked) throw new ApiError(422, "Staff member cannot perform this offering");
    }
    if (input.resourceId) {
      const linked = await prisma.serviceResource.findFirst({
        where: { serviceId: existing.serviceId, resourceId: input.resourceId },
      });
      if (!linked) throw new ApiError(422, "Resource is not eligible for this offering");
    }
  }
  // Freedom at the booking's own time (excluding the booking itself).
  return prisma.$transaction(async (tx) => {
    await acquireAdvisoryLock(tx, `booking:${existing.serviceId ?? "nosvc"}:${existing.startTime.toISOString().slice(0, 10)}`);
    for (const ownerId of [input.staffId, input.resourceId].filter(Boolean) as string[]) {
      const clash = await tx.booking.findFirst({
        where: {
          userId,
          NOT: { id: existing.id },
          status: { notIn: ["CANCELLED"] },
          startTime: { lt: existing.endTime },
          endTime: { gt: existing.startTime },
          allocations: { some: { OR: [{ staffId: ownerId }, { resourceId: ownerId }] } },
        },
        select: { id: true },
      });
      if (clash) throw new ApiError(409, "That provider or resource is busy at this time");
    }
    await tx.bookingAllocation.deleteMany({
      where: { bookingId: existing.id, role: "PRIMARY" },
    });
    await tx.bookingAllocation.createMany({
      data: [
        ...(input.staffId ? [{ bookingId: existing.id, staffId: input.staffId, role: "PRIMARY" }] : []),
        ...(input.resourceId ? [{ bookingId: existing.id, resourceId: input.resourceId, role: "PRIMARY" }] : []),
      ],
    });
    return tx.booking.findUniqueOrThrow({ where: { id: existing.id }, include: bookingInclude });
  });
}

export { bookingInclude };
export type { TimeSlot };
