import type {
  Allocatable,
  AllocationInput,
  AllocationResult,
  AssignmentMode,
} from "./types";
import {
  fitsPartySize,
  isFree,
  minutesInTZ,
  toMinutes,
  weekdayInTZ,
} from "./slots";

export class AllocationError extends Error {
  code: "NO_ELIGIBLE" | "CHOICE_INVALID" | "CHOICE_BUSY" | "NONE_FREE";
  constructor(code: AllocationError["code"], message: string) {
    super(message);
    this.code = code;
  }
}

export interface CandidatePool {
  mode: AssignmentMode;
  linkedStaff: Allocatable[];
  linkedResources: Allocatable[];
  /** Active tables used when a party-size offering links no resources. */
  allTables: Allocatable[];
  requiresPartySize: boolean;
}

/**
 * Resolve the candidate set for an offering before allocation.
 * - explicit staff + resource links always count
 * - party-size offerings with no resource links fall back to all tables
 *   (preserves the legacy "any active table is bookable" behaviour)
 * - deduped by id, tables never duplicate linked resources
 */
export function resolveCandidates(pool: CandidatePool): Allocatable[] {
  const seen = new Set<string>();
  const out: Allocatable[] = [];
  const push = (c: Allocatable) => {
    if (!seen.has(c.id)) {
      seen.add(c.id);
      out.push(c);
    }
  };
  for (const s of pool.linkedStaff) push(s);
  for (const r of pool.linkedResources) push(r);
  if (pool.requiresPartySize && pool.linkedResources.length === 0) {
    for (const t of pool.allTables) push(t);
  }
  return out;
}

/**
 * Allocate staff/resource(s) for a booking request.
 *
 * Pure function over caller-supplied snapshots — the caller (API tx or
 * worker) owns fetching + the final atomic insert. Rules:
 * - inactive or capacity-insufficient candidates are never eligible
 * - CUSTOMER_CHOICE: the explicit pick must be eligible AND free
 * - SINGLE: the one linked candidate, verified free (no choice UI needed)
 * - BUSINESS_ASSIGN / AUTO: least-loaded free candidate; ties by id
 * - opening-hours containment + time-off + busy checks always apply
 *
 * `timeZone` is the business IANA zone used to evaluate weekly hours.
 */
export function allocate(
  input: AllocationInput & { timeZone?: string },
): AllocationResult {
  const { service, start, end, partySize, choiceId } = input;
  const tz = input.timeZone ?? "UTC";
  const eligible = input.candidates.filter(
    (c) => c.isActive && fitsPartySize(c.capacity, partySize),
  );
  if (eligible.length === 0) {
    throw new AllocationError(
      "NO_ELIGIBLE",
      partySize != null
        ? `No resources fit a party of ${partySize}.`
        : "No resources are available for this offering.",
    );
  }

  const free = (c: Allocatable) =>
    isFree(c.id, start, end, service.bufferMinutes, input.busy, input.timeOffs) &&
    withinSchedule(c.id, start, end, service.bufferMinutes, input.hours, tz);

  if (service.assignmentMode === "CUSTOMER_CHOICE") {
    if (!choiceId) {
      throw new AllocationError(
        "CHOICE_INVALID",
        "Please choose who or what should fulfill this booking.",
      );
    }
    const picked = eligible.find((c) => c.id === choiceId);
    if (!picked) {
      throw new AllocationError(
        "CHOICE_INVALID",
        "That choice isn't available for this booking.",
      );
    }
    if (!free(picked)) {
      throw new AllocationError(
        "CHOICE_BUSY",
        "That choice was just taken for this time. Please pick another.",
      );
    }
    return split(picked);
  }

  if (service.assignmentMode === "SINGLE") {
    const one = eligible[0]!;
    if (!free(one)) {
      throw new AllocationError("NONE_FREE", "No availability at the requested time.");
    }
    return split(one);
  }

  // BUSINESS_ASSIGN and AUTO share the least-loaded strategy.
  const freeOnes = eligible.filter(free);
  if (freeOnes.length === 0) {
    throw new AllocationError("NONE_FREE", "No availability at the requested time.");
  }
  const day = new Date(start);
  day.setUTCHours(0, 0, 0, 0);
  const dayStart = day.getTime();
  const dayEnd = dayStart + 86_400_000;
  const load = (c: Allocatable) =>
    input.busy.filter(
      (b) =>
        b.ownerId === c.id &&
        b.startTime.getTime() < dayEnd &&
        b.endTime.getTime() > dayStart,
    ).length;
  freeOnes.sort((a, b) => load(a) - load(b) || (a.id < b.id ? -1 : 1));
  return split(freeOnes[0]!);
}

function split(c: Allocatable): AllocationResult {
  return c.kind === "STAFF"
    ? { staffIds: [c.id], resourceIds: [] }
    : { staffIds: [], resourceIds: [c.id] };
}

/**
 * Opening-hours containment in the business timezone. Owners with no
 * schedule rows at all are treated as open (manual mode); owners with rows
 * on other weekdays but none today are closed today.
 */
export function withinSchedule(
  ownerId: string,
  start: Date,
  end: Date,
  bufferMinutes: number,
  hours: { ownerId: string; dayOfWeek: number; startTime: string; endTime: string; isActive: boolean }[],
  timeZone: string,
): boolean {
  const mine = hours.filter((h) => h.ownerId === ownerId && h.isActive);
  if (mine.length === 0) return true;
  const weekday = weekdayInTZ(start, timeZone);
  const dayMine = mine.filter((h) => h.dayOfWeek === weekday);
  if (dayMine.length === 0) return false;
  const startMin = minutesInTZ(start, timeZone);
  const endMin = minutesInTZ(end, timeZone) + bufferMinutes;
  return dayMine.some((h) => {
    const s = toMinutes(h.startTime);
    const e = toMinutes(h.endTime);
    return s != null && e != null && s <= startMin && endMin <= e;
  });
}
