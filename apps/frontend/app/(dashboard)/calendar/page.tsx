"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { animate, stagger } from "animejs";
import { motion, useReducedMotion } from "framer-motion";
import { toast } from "sonner";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SlidePills } from "@/components/bits/SlidePills";
import { useAppSelector } from "@/lib/store";
import { listBookings, type Booking } from "@/lib/bookings";
import {
  listResources,
  listStaff,
  listTimeOff,
  type TimeOff,
} from "@/lib/resources";
import { BookingDrawer } from "@/components/calendar/BookingDrawer";
import { NewBookingDialog } from "@/components/calendar/NewBookingDialog";
import { DayTimeline } from "@/components/calendar/DayTimeline";
import { SemiRing } from "@/components/calendar/SemiRing";
import {
  BookingCalendar,
  toCalBlocks,
  toCalBookings,
  type CalBlock,
  type CalBooking,
} from "@/components/calendar/BookingCalendar";
import { AnimatedList } from "@/components/bits/AnimatedList";
import { FuseButton } from "@/components/bits/FuseButton";
import { cn } from "@/lib/utils";

// ─── Helpers ────────────────────────────────────────────────────────────────

const HOUR_PX = 56;

const PALETTE = [
  { bg: "bg-emerald-200/80 dark:bg-emerald-900/60", pill: "bg-emerald-600/90", text: "text-emerald-950 dark:text-emerald-100" },
  { bg: "bg-sky-200/80 dark:bg-sky-900/60", pill: "bg-sky-600/90", text: "text-sky-950 dark:text-sky-100" },
  { bg: "bg-amber-200/80 dark:bg-amber-900/60", pill: "bg-amber-600/90", text: "text-amber-950 dark:text-amber-100" },
  { bg: "bg-pink-200/80 dark:bg-pink-900/60", pill: "bg-pink-600/90", text: "text-pink-950 dark:text-pink-100" },
  { bg: "bg-violet-200/80 dark:bg-violet-900/60", pill: "bg-violet-600/90", text: "text-violet-950 dark:text-violet-100" },
  { bg: "bg-teal-200/80 dark:bg-teal-900/60", pill: "bg-teal-600/90", text: "text-teal-950 dark:text-teal-100" },
];

function colorFor(key: string) {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length]!;
}

function startOfWeek(d: Date): Date {
  const c = new Date(d);
  const dow = (c.getDay() + 6) % 7; // Monday first
  c.setDate(c.getDate() - dow);
  c.setHours(0, 0, 0, 0);
  return c;
}

function addDays(d: Date, n: number): Date {
  const c = new Date(d);
  c.setDate(c.getDate() + n);
  return c;
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function CalendarPage() {
  const reduceMotion = useReducedMotion();
  const { user } = useAppSelector((state) => state.auth);
  const gridRef = useRef<HTMLDivElement>(null);

  const [view, setView] = useState<"day" | "week" | "month">("month");
  const [anchor, setAnchor] = useState(() => new Date());
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [blocks, setBlocks] = useState<TimeOff[]>([]);
  const [staffOptions, setStaffOptions] = useState<{ id: string; name: string }[]>([]);
  const [resourceOptions, setResourceOptions] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [slotSeed, setSlotSeed] = useState<Date | null>(null);
  const [now, setNow] = useState(() => new Date());

  const weekStart = useMemo(() => startOfWeek(anchor), [anchor]);
  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  );

  const range = useMemo(() => {
    if (view === "day") {
      const s = new Date(anchor);
      s.setHours(0, 0, 0, 0);
      const e = new Date(anchor);
      e.setHours(23, 59, 59, 999);
      return { from: s.toISOString(), to: e.toISOString() };
    }
    if (view === "week") {
      return { from: weekStart.toISOString(), to: addDays(weekStart, 7).toISOString() };
    }
    const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
    const start = addDays(first, -((first.getDay() + 6) % 7));
    return { from: start.toISOString(), to: addDays(start, 42).toISOString() };
  }, [view, anchor, weekStart]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listBookings({ ...range, limit: 200 });
      setBookings(res.bookings.filter((b) => b.status !== "CANCELLED"));
    } catch {
      toast.error("Failed to load bookings");
    } finally {
      setLoading(false);
    }
  }, [range]);

  const loadBlocks = useCallback(async () => {
    try {
      const all = await listTimeOff();
      const from = new Date(range.from).getTime();
      const to = new Date(range.to).getTime();
      setBlocks(
        all.filter((t) => {
          const s = new Date(t.startDate).getTime();
          const e = new Date(t.endDate).getTime();
          return s <= to && e >= from;
        }),
      );
    } catch {
      // blocks are advisory — bookings still render without them
    }
  }, [range]);

  useEffect(() => {
    load();
    loadBlocks();
  }, [load, loadBlocks]);

  // Staff + spaces for the block dialog scope picker (loaded once).
  useEffect(() => {
    Promise.all([listStaff(true).catch(() => []), listResources().catch(() => [])]).then(
      ([staff, resources]) => {
        setStaffOptions(staff.map((s) => ({ id: s.id, name: s.name })));
        setResourceOptions(resources.map((r) => ({ id: r.id, name: r.name })));
      },
    );
  }, []);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  // Anime.js: stagger event blocks whenever the visible set changes.
  useEffect(() => {
    if (loading || reduceMotion) return;
    const root = gridRef.current;
    if (!root) return;
    const blocks = root.querySelectorAll("[data-cal-block]");
    if (blocks.length === 0) return;
    const anim = animate(blocks, {
      opacity: [0, 1],
      translateY: [10, 0],
      scale: [0.96, 1],
      duration: 380,
      delay: stagger(35),
      ease: "outCubic",
    });
    return () => {
      anim.revert();
    };
  }, [loading, view, anchor, bookings.length, reduceMotion]);

  const hours = useMemo(() => {
    let lo = 8;
    let hi = 20;
    for (const b of bookings) {
      const s = new Date(b.startTime);
      const e = new Date(b.endTime);
      lo = Math.min(lo, s.getHours());
      hi = Math.max(hi, e.getHours() + (e.getMinutes() > 0 ? 1 : 0));
    }
    return { lo: Math.max(0, lo - 1), hi: Math.min(24, hi + 1) };
  }, [bookings]);

  const byDay = useMemo(() => {
    const map = new Map<string, Booking[]>();
    for (const b of bookings) {
      const d = new Date(b.startTime);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      const list = map.get(key) ?? [];
      list.push(b);
      map.set(key, list);
    }
    for (const list of map.values()) list.sort((a, c) => +new Date(a.startTime) - +new Date(c.startTime));
    return map;
  }, [bookings]);

  const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

  const calBookings = useMemo<CalBooking[]>(() => toCalBookings(bookings), [bookings]);
  const calBlocks = useMemo<CalBlock[]>(() => toCalBlocks(blocks), [blocks]);

  const anchorDayStart = useMemo(() => {
    const d = new Date(anchor);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [anchor]);
  const anchorDayEnd = useMemo(() => {
    const d = new Date(anchor);
    d.setHours(23, 59, 59, 999);
    return d;
  }, [anchor]);
  const dayCalBookings = useMemo(
    () =>
      calBookings.filter((b) => {
        const s = new Date(b.start).getTime();
        const e = new Date(b.end).getTime();
        return s <= anchorDayEnd.getTime() && e >= anchorDayStart.getTime();
      }),
    [calBookings, anchorDayStart, anchorDayEnd],
  );
  const dayCalBlocks = useMemo(
    () =>
      calBlocks.filter((t) => {
        const s = new Date(t.start).getTime();
        const e = new Date(t.end).getTime();
        return s <= anchorDayEnd.getTime() && e >= anchorDayStart.getTime();
      }),
    [calBlocks, anchorDayStart, anchorDayEnd],
  );
  const monthDate = useMemo(
    () => new Date(anchor.getFullYear(), anchor.getMonth(), 1),
    [anchor],
  );

  // Right rail: today's load + up next.
  const todayList = useMemo(() => {
    const t = new Date();
    return (byDay.get(dayKey(t)) ?? []).filter((b) => new Date(b.endTime) >= t);
  }, [byDay]);

  const loadPercent = useMemo(() => {
    const openMin = (hours.hi - hours.lo) * 60;
    if (openMin <= 0) return 0;
    const bookedMin = todayList.reduce(
      (sum, b) => sum + (+new Date(b.endTime) - +new Date(b.startTime)) / 60_000,
      0,
    );
    return Math.min(100, (bookedMin / openMin) * 100);
  }, [todayList, hours]);

  const team = useMemo(() => {
    const map = new Map<string, { name: string; color: string | null }>();
    for (const b of bookings) {
      for (const a of b.allocations) {
        if (a.staff && !map.has(a.staff.id)) {
          map.set(a.staff.id, { name: a.staff.name, color: a.staff.color });
        }
      }
    }
    return [...map.values()].slice(0, 8);
  }, [bookings]);

  const firstName = user?.name?.split(" ")[0] ?? "there";
  const weekLabel = `${weekDays[0]!.toLocaleDateString(undefined, { month: "short", day: "numeric" })}–${weekDays[6]!.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;

  return (
    <div className="p-4 sm:p-6 max-w-[1400px] mx-auto space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">
          {greeting()}, {firstName} 👋
        </h1>
        <div className="flex items-center gap-2 ml-auto">
          <span className="text-xs font-medium px-3 py-1.5 rounded-full bg-ink text-white tabular-nums">
            {view === "week" ? weekLabel : anchor.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
          </span>
          <SlidePills
            id="calendar-view"
            size="sm"
            value={view}
            onChange={setView}
            options={[
              { value: "day", label: "Day" },
              { value: "week", label: "Week" },
              { value: "month", label: "Month" },
            ]}
          />
          <FuseButton onClick={() => setBookingOpen(true)} ariaLabel="New booking">
            <Plus className="size-4" /> New booking
          </FuseButton>
        </div>
      </div>

      <div className="grid xl:grid-cols-[1fr_290px] gap-5 items-start">
        <div ref={gridRef} className="min-w-0">
          {/* Nav (hidden for month — the calendar owns its own nav) */}
          {view !== "month" && (
            <div className="flex items-center gap-1 mb-3">
              <Button variant="ghost" size="icon" className="size-8 rounded-full" aria-label="Previous"
                onClick={() => setAnchor((a) => addDays(a, view === "week" ? -7 : -1))}>
                <ChevronLeft className="size-4" />
              </Button>
              <Button variant="ghost" size="sm" className="rounded-full" onClick={() => setAnchor(new Date())}>
                Today
              </Button>
              <Button variant="ghost" size="icon" className="size-8 rounded-full" aria-label="Next"
                onClick={() => setAnchor((a) => addDays(a, view === "week" ? 7 : 1))}>
                <ChevronRight className="size-4" />
              </Button>
            </div>
          )}

          {loading ? (
            <div className="rounded-[1.6rem] bg-ink/[0.035] p-4 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-16 rounded-2xl bg-ink/[0.05] animate-pulse" />
              ))}
            </div>
          ) : view === "week" ? (
            <WeekGrid
              days={weekDays}
              byDay={byDay}
              dayKey={dayKey}
              hours={hours}
              now={now}
              blocks={blocks}
              onOpen={setOpenId}
              reduceMotion={!!reduceMotion}
            />
          ) : view === "day" ? (
            <DayTimeline
              date={anchor}
              bookings={dayCalBookings}
              blocks={dayCalBlocks}
              hours={hours}
              now={now}
              onBookingClick={setOpenId}
              onSlotTap={(at) => {
                setSlotSeed(at);
                setBookingOpen(true);
              }}
              reduceMotion={!!reduceMotion}
            />
          ) : (
            <BookingCalendar
              month={monthDate}
              onMonthChange={setAnchor}
              bookings={calBookings}
              blocks={calBlocks}
              onBookingClick={setOpenId}
              onChanged={loadBlocks}
              staffOptions={staffOptions}
              resourceOptions={resourceOptions}
              reduceMotion={!!reduceMotion}
            />
          )}
        </div>

        {/* Right rail */}
        <aside className="space-y-3 xl:sticky xl:top-4">
          <div className="rounded-[1.4rem] bg-ink/[0.045] p-4">
            <SemiRing
              percent={loadPercent}
              label="Today's load"
              sublabel={`${todayList.length} booking${todayList.length === 1 ? "" : "s"} today`}
            />
          </div>
          <div className="rounded-[1.4rem] bg-ink/[0.045] p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-ink">Up next</p>
              <Badge variant="secondary" className="text-[10px] rounded-full">{todayList.length}</Badge>
            </div>
            {todayList.length === 0 ? (
              <p className="text-xs text-ink/50 py-4 text-center">
                Nothing else today. Enjoy the breather ✨
              </p>
            ) : (
              <AnimatedList delay={700} cap={5}>
                {todayList.slice(0, 6).map((b) => {
                  const c = colorFor(b.service?.id ?? b.id);
                  return (
                    <button
                      key={b.id}
                      onClick={() => setOpenId(b.id)}
                      className="w-full text-left rounded-2xl bg-white px-3 py-2.5 hover:bg-ink/[0.07] transition-colors"
                    >
                      <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full text-white ${c.pill}`}>
                        {b.service?.name ?? "Booking"}
                      </span>
                      <span className="block text-sm font-medium mt-1 truncate text-ink">
                        {b.customerName}
                      </span>
                      <span className="block text-xs text-ink/50 tabular-nums">
                        {fmtTime(b.startTime)} – {fmtTime(b.endTime)}
                      </span>
                    </button>
                  );
                })}
              </AnimatedList>
            )}
          </div>
          {team.length > 0 && (
            <div className="rounded-[1.4rem] bg-ink/[0.045] p-4">
              <p className="text-sm font-semibold mb-2.5 text-ink">On the books</p>
              <div className="flex -space-x-2">
                {team.slice(0, 6).map((m) => (
                  <span
                    key={m.name}
                    title={m.name}
                    className="size-9 rounded-full border-2 border-paper flex items-center justify-center text-white text-xs font-bold"
                    style={{ backgroundColor: m.color ?? "#52525b" }}
                  >
                    {m.name.charAt(0).toUpperCase()}
                  </span>
                ))}
                {team.length > 6 && (
                  <span className="size-9 rounded-full border-2 border-paper bg-ink text-white text-[10px] font-bold flex items-center justify-center">
                    +{team.length - 6}
                  </span>
                )}
              </div>
            </div>
          )}
        </aside>
      </div>

      <BookingDrawer
        bookingId={openId}
        onClose={() => setOpenId(null)}
        onChanged={load}
      />
      <NewBookingDialog
        open={bookingOpen}
        onOpenChange={(o) => {
          setBookingOpen(o);
          if (!o) setSlotSeed(null);
        }}
        defaultDate={slotSeed ?? anchor}
        defaultSlotStart={slotSeed ?? undefined}
        onCreated={load}
      />
    </div>
  );
}

// ─── Week grid ───────────────────────────────────────────────────────────────

function WeekGrid({
  days,
  byDay,
  dayKey,
  hours,
  now,
  blocks,
  onOpen,
  reduceMotion,
}: {
  days: Date[];
  byDay: Map<string, Booking[]>;
  dayKey: (d: Date) => string;
  hours: { lo: number; hi: number };
  now: Date;
  blocks: TimeOff[];
  onOpen: (id: string) => void;
  reduceMotion: boolean;
}) {
  const rows = hours.hi - hours.lo;
  const height = rows * HOUR_PX;
  const todayKey = dayKey(new Date());

  return (
    <div className="rounded-[1.6rem] bg-ink/[0.035] p-2 sm:p-3 overflow-x-auto">
      <div className="min-w-[720px]">
        {/* day headers */}
        <div className="grid grid-cols-[52px_repeat(7,1fr)]">
          <div />
          {days.map((d, i) => {
            const isToday = dayKey(d) === todayKey;
            return (
              <div key={i} className="py-2 text-center">
                <p className={cn("text-[11px] font-medium", isToday ? "text-ink font-bold" : "text-ink/45")}>
                  {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][i]}
                </p>
                <p className={cn(
                  "inline-flex items-center justify-center size-7 text-sm rounded-full mt-0.5 tabular-nums",
                  isToday ? "bg-ink text-white font-bold" : "font-medium text-ink",
                )}>
                  {d.getDate()}
                </p>
              </div>
            );
          })}
        </div>
        {/* time grid */}
        <div className="grid grid-cols-[52px_repeat(7,1fr)]">
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
          {days.map((d, i) => {
            const list = byDay.get(dayKey(d)) ?? [];
            const isToday = dayKey(d) === todayKey;
            const dayStart = new Date(d);
            dayStart.setHours(0, 0, 0, 0);
            const dayEnd = new Date(d);
            dayEnd.setHours(23, 59, 59, 999);
            const dayBlocks = blocks.filter((t) => {
              const s = new Date(t.startDate).getTime();
              const e = new Date(t.endDate).getTime();
              return s <= dayEnd.getTime() && e >= dayStart.getTime();
            });
            return (
              <div
                key={i}
                className={cn("relative rounded-lg", isToday && "bg-ink/[0.045]")}
                style={{ height }}
              >
                {Array.from({ length: rows + 1 }).map((_, r) => (
                  <span key={r} className="absolute inset-x-1 border-t border-ink/10" style={{ top: r * HOUR_PX }} />
                ))}
                {/* now line */}
                {isToday && (() => {
                  const mins = (now.getHours() - hours.lo) * 60 + now.getMinutes();
                  const top = (mins / 60) * HOUR_PX;
                  if (top < 0 || top > height) return null;
                  return (
                    <span className="absolute inset-x-0 z-20 border-t-2 border-red-500 pointer-events-none" style={{ top }}>
                      <span className="absolute -left-1 -top-[5px] size-2 rounded-full bg-red-500" />
                    </span>
                  );
                })()}
                {/* block bands */}
                {dayBlocks.map((t) => {
                  const s = new Date(Math.max(new Date(t.startDate).getTime(), dayStart.getTime()));
                  const e = new Date(Math.min(new Date(t.endDate).getTime(), dayEnd.getTime()));
                  const top = Math.max(0, ((s.getHours() * 60 + s.getMinutes()) / 60 - hours.lo) * HOUR_PX);
                  const h = Math.max(22, ((+e - +s) / 3_600_000) * HOUR_PX - 3);
                  const who = t.staff?.name ?? t.resource?.name ?? "Blocked";
                  return (
                    <motion.div
                      key={t.id}
                      title={`${who}${t.reason ? ` — ${t.reason}` : ""} (${fmtTime(t.startDate)}–${fmtTime(t.endDate)})`}
                      initial={reduceMotion ? false : { opacity: 0, scaleX: 0.7 }}
                      animate={{ opacity: 1, scaleX: 1 }}
                      style={{ top, height: h, transformOrigin: "left center" }}
                      className="absolute inset-x-1 z-10 rounded-lg bg-red-500/20 px-1.5 py-1 overflow-hidden pointer-events-none"
                    >
                      <p className="text-[9px] font-semibold text-red-700 truncate leading-tight">
                        {who}{t.reason ? ` · ${t.reason}` : ""}
                      </p>
                    </motion.div>
                  );
                })}
                {list.map((b, bi) => {
                  const s = new Date(b.startTime);
                  const e = new Date(b.endTime);
                  const top = ((s.getHours() * 60 + s.getMinutes()) / 60 - hours.lo) * HOUR_PX;
                  const h = Math.max(30, ((+e - +s) / 3_600_000) * HOUR_PX - 3);
                  const who = b.allocations.map((a) => a.staff?.name ?? a.resource?.name).filter(Boolean)[0];
                  return (
                    <motion.button
                      key={b.id}
                      data-cal-block
                      initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(bi * 0.03, 0.3), duration: 0.3 }}
                      onClick={() => onOpen(b.id)}
                      className="absolute inset-x-1 z-10 rounded-xl bg-ink text-white p-1.5 text-left overflow-hidden hover:bg-brand-deep transition-colors focus-visible:outline-2 focus-visible:outline-brand"
                      style={{ top: Math.max(0, top), height: h }}
                      aria-label={`${b.service?.name ?? "Booking"} for ${b.customerName} at ${fmtTime(b.startTime)}`}
                    >
                      <span className="block text-[10px] font-semibold leading-tight truncate">
                        {b.customerName}
                      </span>
                      <span className="block text-[9px] text-white/60 truncate tabular-nums">
                        {(b.service?.name ?? "Booking").slice(0, 16)} · {fmtTime(b.startTime)}–{fmtTime(b.endTime)}
                      </span>
                      {who && h > 60 && (
                        <span className="flex items-center gap-1 text-[9px] mt-0.5 truncate text-white/75">
                          <span className="size-3.5 rounded-full bg-white/20 text-[7px] font-bold flex items-center justify-center shrink-0">
                            {who.charAt(0).toUpperCase()}
                          </span>
                          <span className="truncate">{who}</span>
                        </span>
                      )}
                    </motion.button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

