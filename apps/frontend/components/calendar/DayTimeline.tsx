"use client";

import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import type { CalBlock, CalBooking } from "./BookingCalendar";
import { cn } from "@/lib/utils";

const HOUR_PX = 60;
const EASE = [0.22, 1, 0.36, 1] as const;

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

interface Placed {
  top: number;
  height: number;
  col: number;
  cols: number;
}

function placeDay(
  items: { start: Date; end: Date }[],
  lo: number,
): Placed[] {
  const sorted = items
    .map((it, i) => ({ it, i }))
    .sort((a, b) => +a.it.start - +b.it.start);
  const lanes: Date[] = [];
  const out: Placed[] = new Array(items.length);
  for (const { it, i } of sorted) {
    let lane = 0;
    for (; lane < lanes.length; lane++) {
      if (lanes[lane]! <= it.start) break;
    }
    lanes[lane] = it.end;
    const top = ((it.start.getHours() * 60 + it.start.getMinutes()) / 60 - lo) * HOUR_PX;
    const height = Math.max(30, ((+it.end - +it.start) / 3_600_000) * HOUR_PX - 4);
    out[i] = { top: Math.max(0, top), height, col: lane, cols: 0 };
  }
  // Second pass: columns per overlap cluster (cap visual at 2).
  for (let i = 0; i < out.length; i++) {
    let cols = 1;
    for (let j = 0; j < out.length; j++) {
      if (i === j) continue;
      const a = out[i]!;
      const b = out[j]!;
      if (a.top < b.top + b.height && b.top < a.top + a.height) cols = 2;
    }
    out[i]!.cols = cols;
  }
  return out;
}

export function DayTimeline({
  date,
  bookings,
  blocks,
  hours,
  now,
  onBookingClick,
  onSlotTap,
  reduceMotion = false,
}: {
  date: Date;
  bookings: CalBooking[];
  blocks: CalBlock[];
  hours: { lo: number; hi: number };
  now: Date;
  onBookingClick: (id: string) => void;
  onSlotTap: (at: Date) => void;
  reduceMotion?: boolean;
}) {
  const rows = hours.hi - hours.lo;
  const height = rows * HOUR_PX;
  const isToday =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);

  const dayBookings = bookings.filter((b) => {
    const s = new Date(b.start);
    const e = new Date(b.end);
    return s <= dayEnd && e >= dayStart;
  });
  const dayBlocks = blocks.filter((t) => {
    const s = new Date(t.start);
    const e = new Date(t.end);
    return s <= dayEnd && e >= dayStart;
  });

  const placed = placeDay(
    dayBookings.map((b) => ({ start: new Date(b.start), end: new Date(b.end) })),
    hours.lo,
  );

  const nowTop = isToday
    ? ((now.getHours() * 60 + now.getMinutes()) / 60 - hours.lo) * HOUR_PX
    : -1;

  const tapHour = (h: number) => {
    const at = new Date(date);
    at.setHours(h, 0, 0, 0);
    onSlotTap(at);
  };

  return (
    <div className="rounded-[1.6rem] bg-ink/[0.035] p-3 sm:p-4 overflow-hidden">
      <div className="grid grid-cols-[52px_1fr]">
        {/* gutter */}
        <div className="relative" style={{ height }}>
          {Array.from({ length: rows + 1 }).map((_, i) => (
            <span
              key={i}
              className="absolute right-2 text-[10px] font-medium text-ink/40 tabular-nums -translate-y-1/2"
              style={{ top: i * HOUR_PX }}
            >
              {String(hours.lo + i).padStart(2, "0")}:00
            </span>
          ))}
        </div>

        {/* lane */}
        <div className="relative" style={{ height }}>
          {/* hour lines + tap targets */}
          {Array.from({ length: rows }).map((_, i) => {
            const h = hours.lo + i;
            return (
              <motion.button
                key={h}
                type="button"
                initial={reduceMotion ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: Math.min(i * 0.02, 0.3), duration: 0.3 }}
                onClick={() => tapHour(h)}
                aria-label={`Book at ${h}:00`}
                className="group absolute inset-x-0 border-t border-ink/10 focus-visible:outline-2 focus-visible:outline-brand"
                style={{ top: i * HOUR_PX, height: HOUR_PX }}
              >
                <span className="absolute inset-0 rounded-lg transition-colors group-hover:bg-brand/[0.07]" />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center gap-1 rounded-full bg-ink px-2.5 py-1 text-[10px] font-semibold text-white">
                  <Plus className="size-2.5" /> Book {String(h).padStart(2, "0")}:00
                </span>
              </motion.button>
            );
          })}

          {/* now line */}
          {nowTop >= 0 && nowTop <= height && (
            <span
              className="absolute inset-x-0 z-20 border-t-2 border-red-500 pointer-events-none"
              style={{ top: nowTop }}
            >
              <span className="absolute -left-1 -top-[5px] size-2 rounded-full bg-red-500" />
            </span>
          )}

          {/* block bands */}
          {dayBlocks.map((t) => {
            const s = new Date(t.start < dayStart.toISOString() ? dayStart.toISOString() : t.start);
            const e = new Date(t.end > dayEnd.toISOString() ? dayEnd.toISOString() : t.end);
            const top = Math.max(0, ((s.getHours() * 60 + s.getMinutes()) / 60 - hours.lo) * HOUR_PX);
            const h = Math.max(
              26,
              ((+e - +s) / 3_600_000) * HOUR_PX - 4,
            );
            const who = t.staffName ?? t.resourceName ?? "Blocked";
            return (
              <motion.div
                key={t.id}
                title={`${who}${t.reason ? ` — ${t.reason}` : ""}`}
                initial={reduceMotion ? false : { opacity: 0, scaleX: 0.6 }}
                animate={{ opacity: 1, scaleX: 1 }}
                style={{ top, height: h, transformOrigin: "left center" }}
                className="absolute inset-x-1 z-10 rounded-xl bg-red-500/15 px-2.5 py-1.5 overflow-hidden pointer-events-none"
              >
                <p className="text-[11px] font-semibold text-red-700 truncate leading-tight">
                  {who}
                  {t.reason ? ` · ${t.reason}` : ""}
                </p>
                <p className="text-[10px] text-red-600/80 tabular-nums">
                  {fmtTime(t.start)}–{fmtTime(t.end)}
                </p>
              </motion.div>
            );
          })}

          {/* bookings */}
          {dayBookings.map((b, i) => {
            const p = placed[i]!;
            const widthPct = p.cols > 1 ? "calc(50% - 3px)" : "calc(100% - 4px)";
            const leftPct = p.cols > 1 && p.col === 1 ? "calc(50% + 1px)" : "2px";
            const who = b.staffName;
            return (
              <motion.button
                key={b.id}
                type="button"
                initial={reduceMotion ? false : { opacity: 0, y: 10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: Math.min(i * 0.05, 0.35), duration: 0.35, ease: EASE }}
                onClick={() => onBookingClick(b.id)}
                aria-label={`${b.title} for ${b.sub} at ${fmtTime(b.start)}`}
                style={{ top: p.top, height: p.height, width: widthPct, left: leftPct }}
                className="absolute z-10 rounded-xl bg-ink text-white p-2 text-left overflow-hidden hover:bg-brand-deep transition-colors focus-visible:outline-2 focus-visible:outline-brand"
              >
                <span className="block text-[11px] font-semibold leading-tight truncate">
                  {b.sub || b.title}
                </span>
                <span className="block text-[10px] text-white/65 truncate">
                  {b.title} · {fmtTime(b.start)}–{fmtTime(b.end)}
                </span>
                {who && p.height > 56 && (
                  <span className="mt-1 flex items-center gap-1 text-[10px] text-white/75 truncate">
                    <span className="size-4 rounded-full bg-white/20 text-[8px] font-bold flex items-center justify-center shrink-0">
                      {who.charAt(0).toUpperCase()}
                    </span>
                    <span className="truncate">{who}</span>
                  </span>
                )}
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
