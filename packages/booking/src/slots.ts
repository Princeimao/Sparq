import type {
  BusyPeriod,
  SlotRequest,
  TimeOffRange,
  TimeSlot,
  WeeklyHours,
} from "./types";

export const DAY_MS = 86_400_000;

/** Half-open interval overlap: [aStart, aEnd) vs [bStart, bEnd). */
export function overlaps(
  aStart: Date | number,
  aEnd: Date | number,
  bStart: Date | number,
  bEnd: Date | number,
): boolean {
  const a = +aStart;
  const b = +aEnd;
  const c = +bStart;
  const d = +bEnd;
  return a < d && c < b;
}

export function toMinutes(hhmm: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

/**
 * Weekday (0=Sunday) of a UTC instant as seen in an IANA timezone.
 * Uses only Intl — no date library needed.
 */
export function weekdayInTZ(date: Date, timeZone: string): number {
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
  }).format(date);
  return (
    { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 } as Record<
      string,
      number
    >
  )[weekday] ?? date.getUTCDay();
}

/** Minutes since local midnight of a UTC instant in an IANA timezone. */
export function minutesInTZ(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  return get("hour") * 60 + get("minute");
}

/**
 * UTC instant of local midnight for a YYYY-MM-DD calendar date in an IANA
 * timezone. Resolved from the zone's actual UTC offset that day, so DST
 * transitions are handled.
 */
export function localMidnightUtc(date: string, timeZone: string): number {
  const midnightUtc = Date.parse(`${date}T00:00:00Z`);
  const tzName =
    new Intl.DateTimeFormat("en-US", {
      timeZone,
      timeZoneName: "shortOffset",
    })
      .formatToParts(new Date(midnightUtc))
      .find((p) => p.type === "timeZoneName")?.value ?? "GMT";
  const mm = /GMT([+-])(\d{1,2})(?::(\d{2}))?/.exec(tzName);
  let offsetMin = 0;
  if (mm) {
    const sign = mm[1] === "+" ? 1 : -1;
    offsetMin = sign * (Number(mm[2]) * 60 + Number(mm[3] ?? 0));
  }
  return midnightUtc - offsetMin * 60_000;
}

/**
 * Generate bookable start slots for one UTC day.
 *
 * Rules applied (all server-side):
 * - candidate starts step every `stepMinutes` inside each open window
 * - full [start, end+buffer) must fit inside an open window
 * - must not overlap any busy period (expanded by buffer)
 * - must not intersect a time-off range
 * - must satisfy minLeadMinutes and maxAdvanceDays vs `now`
 */
export function generateSlots(
  req: SlotRequest,
  hours: WeeklyHours[],
  timeOffs: TimeOffRange[],
  busy: BusyPeriod[],
  timeZone: string,
  stepMinutes = 15,
): TimeSlot[] {
  const { service } = req;
  const now = req.now ?? new Date();
  const earliest = now.getTime() + service.minLeadMinutes * 60_000;
  const latest =
    service.maxAdvanceDays == null
      ? Number.POSITIVE_INFINITY
      : now.getTime() + service.maxAdvanceDays * DAY_MS;

  const dayBase = localMidnightUtc(req.date, timeZone);
  const weekday = weekdayInTZ(new Date(dayBase + 12 * 3_600_000), timeZone);
  const open = hours.filter(
    (h) => h.dayOfWeek === weekday && h.isActive,
  );
  if (open.length === 0) return [];

  const durationMs = service.duration * 60_000;
  const blockMs = durationMs + service.bufferMinutes * 60_000;
  const out: TimeSlot[] = [];

  for (const window of open) {
    const wStart = toMinutes(window.startTime);
    const wEnd = toMinutes(window.endTime);
    if (wStart == null || wEnd == null || wEnd <= wStart) continue;
    const winStart = dayBase + wStart * 60_000;
    const winEnd = dayBase + wEnd * 60_000;

    for (
      let t = winStart;
      t + blockMs <= winEnd;
      t += stepMinutes * 60_000
    ) {
      const end = t + durationMs;
      if (t < earliest || t > latest) continue;
      if (t < req.dayStart.getTime() || end > req.dayEnd.getTime()) continue;
      const blockedByTimeOff = timeOffs.some((o) =>
        overlaps(t, t + blockMs, o.startDate, o.endDate),
      );
      if (blockedByTimeOff) continue;
      const clashes = busy.some((b) =>
        overlaps(t, t + blockMs, b.startTime, b.endTime),
      );
      if (clashes) continue;
      out.push({ start: new Date(t), end: new Date(end) });
    }
  }
  return out;
}

export interface RecurringBreak {
  ownerId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

/**
 * Expand recurring breaks into concrete busy periods for one calendar date
 * (YYYY-MM-DD in `timeZone`). Breaks make intraday gaps (lunch, cleaning)
 * unbookable without touching weekly hours.
 */
export function breaksForDate(
  breaks: RecurringBreak[],
  date: string,
  timeZone: string,
): BusyPeriod[] {
  const dayBase = localMidnightUtc(date, timeZone);
  const weekday = weekdayInTZ(new Date(dayBase + 12 * 3_600_000), timeZone);
  const out: BusyPeriod[] = [];
  for (const b of breaks) {
    if (b.dayOfWeek !== weekday) continue;
    const s = toMinutes(b.startTime);
    const e = toMinutes(b.endTime);
    if (s == null || e == null || e <= s) continue;
    out.push({
      ownerId: b.ownerId,
      startTime: new Date(dayBase + s * 60_000),
      endTime: new Date(dayBase + e * 60_000),
    });
  }
  return out;
}

/** Party-size fit for one allocatable: null capacity = unconstrained. */
export function fitsPartySize(
  capacity: number | null,
  partySize?: number,
): boolean {
  if (partySize == null || partySize <= 0) return true;
  if (capacity == null) return true;
  return capacity >= partySize;
}

/**
 * Whether [start, end) (expanded by buffer) is free for `ownerId` given
 * that owner's busy periods + time-offs.
 */
export function isFree(
  ownerId: string,
  start: Date,
  end: Date,
  bufferMinutes: number,
  busy: BusyPeriod[],
  timeOffs: TimeOffRange[],
): boolean {
  const s = start.getTime();
  const e = end.getTime() + bufferMinutes * 60_000;
  if (
    timeOffs.some((o) => o.ownerId === ownerId && overlaps(s, e, o.startDate, o.endDate))
  )
    return false;
  return !busy.some(
    (b) => b.ownerId === ownerId && overlaps(s, e, b.startTime, b.endTime),
  );
}

/**
 * Whether [start, end) sits inside one of the owner's open windows on that
 * weekday (timezone-aware). No windows at all for the owner on that day
 * means "no explicit schedule" → allowed (manual mode).
 */
export function withinHours(
  ownerId: string,
  weekday: number,
  startMin: number,
  endMin: number,
  hours: WeeklyHours[],
): boolean {
  const mine = hours.filter(
    (h) => h.ownerId === ownerId && h.dayOfWeek === weekday && h.isActive,
  );
  if (mine.length === 0) return true;
  return mine.some((h) => {
    const s = toMinutes(h.startTime);
    const e = toMinutes(h.endTime);
    return s != null && e != null && s <= startMin && endMin <= e;
  });
}
