// ─── Shared booking-domain shapes ───────────────────────────────────────────
// Plain data only (no Prisma dependency) so apps/api, apps/worker and
// apps/web can all share allocation + slot logic.

export type AssignmentMode =
  | "CUSTOMER_CHOICE"
  | "BUSINESS_ASSIGN"
  | "AUTO"
  | "SINGLE";

export type ResourceKind = "STAFF" | "TABLE" | "ROOM" | "EQUIPMENT" | "OTHER";

export type BookingStatus =
  | "PENDING"
  | "CONFIRMED"
  | "CANCELLED"
  | "COMPLETED"
  | "NO_SHOW"
  | "CHECKED_IN";

export type BookingSource = "WHATSAPP" | "DASHBOARD" | "API";

export interface ServiceConfig {
  id: string;
  duration: number; // minutes
  bufferMinutes: number;
  minLeadMinutes: number;
  maxAdvanceDays: number | null;
  requiresPartySize: boolean;
  assignmentMode: AssignmentMode;
  locationMode: "AT_BUSINESS" | "AT_CUSTOMER" | "BOTH";
}

/** A person or physical resource that can fulfill work. */
export interface Allocatable {
  id: string;
  kind: "STAFF" | "RESOURCE";
  /** Tables/rooms: seats. Null = not capacity-constrained. */
  capacity: number | null;
  isActive: boolean;
}

/** Weekly recurring working hours, local to the business timezone. */
export interface WeeklyHours {
  ownerId: string; // staffId or resourceId
  dayOfWeek: number; // 0 = Sunday
  startTime: string; // "HH:MM"
  endTime: string; // "HH:MM"
  isActive: boolean;
}

export interface TimeOffRange {
  ownerId: string;
  startDate: Date;
  endDate: Date;
}

/** An existing busy period for one allocatable. */
export interface BusyPeriod {
  ownerId: string;
  startTime: Date;
  endTime: Date;
}

export interface SlotRequest {
  service: ServiceConfig;
  /** Calendar date (YYYY-MM-DD) in the business timezone. */
  date: string;
  /** Day bounds in UTC (for clipping). */
  dayStart: Date;
  dayEnd: Date;
  partySize?: number;
  now?: Date;
}

export interface TimeSlot {
  start: Date;
  end: Date;
}

export interface AllocationInput {
  service: ServiceConfig;
  start: Date;
  end: Date;
  partySize?: number;
  /** Customer's explicit pick (staff or resource id). */
  choiceId?: string;
  candidates: Allocatable[];
  hours: WeeklyHours[];
  timeOffs: TimeOffRange[];
  busy: BusyPeriod[];
}

export interface AllocationResult {
  staffIds: string[];
  resourceIds: string[];
}
