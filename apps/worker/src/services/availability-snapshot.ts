import { breaksForDate } from "@sparq/booking";
import { BookingRepository } from "../repository/booking.repository";
import { ResourceRepository } from "../repository/resource.repository";

export interface OwnerSnapshots {
  hours: { ownerId: string; dayOfWeek: number; startTime: string; endTime: string; isActive: boolean }[];
  timeOffs: { ownerId: string; startDate: Date; endDate: Date }[];
  busy: { ownerId: string; startTime: Date; endTime: Date }[];
  timeZone: string;
}

/**
 * Load availability snapshots for a set of owners around one booking window.
 * Recurring breaks are expanded for the booking's calendar date and merged
 * into `busy`, so allocation + slot checks treat them as blocked.
 */
export async function loadSnapshots(
  userId: string,
  ownerIds: string[],
  start: Date,
  end: Date,
  bufferMinutes: number,
  resourceRepository: ResourceRepository,
  bookingRepository: BookingRepository,
): Promise<OwnerSnapshots> {
  const pad = bufferMinutes * 60_000;
  const timeZone = await resourceRepository.businessTimezone(userId);
  const [rawHours, rawTimeOffs, rawBreaks, busy] = await Promise.all([
    resourceRepository.findHours(ownerIds),
    resourceRepository.findTimeOffs(
      userId,
      ownerIds,
      new Date(start.getTime() - pad),
      new Date(end.getTime() + pad),
    ),
    resourceRepository.findBreaks(userId, ownerIds),
    bookingRepository.findBusy(
      userId,
      ownerIds,
      new Date(start.getTime() - pad),
      new Date(end.getTime() + pad),
    ),
  ]);
  const day = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(start);
  busy.push(
    ...breaksForDate(
      rawBreaks.map((b) => ({
        ownerId: (b.staffId ?? b.resourceId)!,
        dayOfWeek: b.dayOfWeek,
        startTime: b.startTime,
        endTime: b.endTime,
      })),
      day,
      timeZone,
    ),
  );
  return {
    hours: rawHours.map((h) => ({
      ownerId: (h.staffId ?? h.resourceId)!,
      dayOfWeek: h.dayOfWeek,
      startTime: h.startTime,
      endTime: h.endTime,
      isActive: h.isActive,
    })),
    timeOffs: rawTimeOffs.map((t) => ({
      ownerId: (t.staffId ?? t.resourceId)!,
      startDate: t.startDate,
      endDate: t.endDate,
    })),
    busy,
    timeZone,
  };
}
