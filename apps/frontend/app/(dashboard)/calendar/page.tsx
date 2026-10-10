"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { animate, stagger } from "animejs";
import { motion, useReducedMotion } from "framer-motion";
import { toast } from "sonner";
import {
  CalendarCheck,
  Check,
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAppSelector } from "@/lib/store";
import { listBookings, setBookingStatus, type Booking } from "@/lib/bookings";
import { BookingDrawer } from "@/components/calendar/BookingDrawer";
import { NewBookingDialog } from "@/components/calendar/NewBookingDialog";
import { SemiRing } from "@/components/calendar/SemiRing";
import { AnimatedList } from "@/components/bits/AnimatedList";
import { FuseButton } from "@/components/bits/FuseButton";
import { SwipeRow } from "@/components/bits/SwipeRow";
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

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
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

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// ─── Page ───────────────────────────────────────────────────────────────────

export default function CalendarPage() {
  const reduceMotion = useReducedMotion();
  const { user } = useAppSelector((state) => state.auth);
  const gridRef = useRef<HTMLDivElement>(null);

  const [view, setView] = useState<"day" | "week" | "month">("week");
  const [anchor, setAnchor] = useState(() => new Date());
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const [bookingOpen, setBookingOpen] = useState(false);
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

  useEffect(() => {
    load();
  }, [load]);

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

  const changeStatus = async (id: string, status: string, label: string) => {
    try {
      const updated = await setBookingStatus(id, status);
      setBookings((prev) =>
        status === "CANCELLED"
          ? prev.filter((b) => b.id !== id)
          : prev.map((b) => (b.id === id ? updated : b)),
      );
      toast.success(`Booking ${label}`);
    } catch (error: unknown) {
      const msg =
        (error as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        "Action failed";
      toast.error(msg);
    }
  };

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
        <h1 className="text-2xl font-semibold tracking-tight">
          {greeting()}, {firstName} 👋
        </h1>
        <div className="flex items-center gap-2 ml-auto">
          <span className="text-xs font-medium px-3 py-1.5 rounded-full bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 tabular-nums">
            {view === "week" ? weekLabel : anchor.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
          </span>
          <Tabs value={view} onValueChange={(v) => setView(v as typeof view)}>
            <TabsList className="rounded-full">
              <TabsTrigger value="day" className="rounded-full text-xs">Day</TabsTrigger>
              <TabsTrigger value="week" className="rounded-full text-xs">Week</TabsTrigger>
              <TabsTrigger value="month" className="rounded-full text-xs">Month</TabsTrigger>
            </TabsList>
          </Tabs>
          <FuseButton onClick={() => setBookingOpen(true)} ariaLabel="New booking">
            <Plus className="size-4" /> New booking
          </FuseButton>
        </div>
      </div>

      <div className="grid xl:grid-cols-[1fr_290px] gap-5 items-start">
        <div ref={gridRef} className="min-w-0">
          {/* Week nav */}
          <div className="flex items-center gap-1 mb-3">
            <Button variant="ghost" size="icon" className="size-8" aria-label="Previous"
              onClick={() => setAnchor((a) => addDays(a, view === "month" ? -30 : view === "week" ? -7 : -1))}>
              <ChevronLeft className="size-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setAnchor(new Date())}>
              Today
            </Button>
            <Button variant="ghost" size="icon" className="size-8" aria-label="Next"
              onClick={() => setAnchor((a) => addDays(a, view === "month" ? 30 : view === "week" ? 7 : 1))}>
              <ChevronRight className="size-4" />
            </Button>
          </div>

          {loading ? (
            <div className="rounded-2xl border p-4 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />
              ))}
            </div>
          ) : view === "week" ? (
            <WeekGrid
              days={weekDays}
              byDay={byDay}
              dayKey={dayKey}
              hours={hours}
              now={now}
              onOpen={setOpenId}
            />
          ) : view === "day" ? (
            <DayAgenda
              bookings={byDay.get(dayKey(anchor)) ?? []}
              onOpen={setOpenId}
              onStatus={changeStatus}
            />
          ) : (
            <MonthGrid
              anchor={anchor}
              byDay={byDay}
              dayKey={dayKey}
              onPickDay={(d) => {
                setAnchor(d);
                setView("day");
              }}
            />
          )}
        </div>

        {/* Right rail */}
        <aside className="space-y-4 xl:sticky xl:top-4">
          <div className="rounded-2xl border bg-card p-4">
            <SemiRing
              percent={loadPercent}
              label="Today's load"
              sublabel={`${todayList.length} booking${todayList.length === 1 ? "" : "s"} today`}
            />
          </div>
          <div className="rounded-2xl border bg-card p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold">Up next</p>
              <Badge variant="secondary" className="text-[10px]">{todayList.length}</Badge>
            </div>
            {todayList.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">
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
                      className="w-full text-left rounded-xl border bg-background px-3 py-2.5 hover:border-zinc-400 transition-colors"
                    >
                      <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full text-white ${c.pill}`}>
                        {b.service?.name ?? "Booking"}
                      </span>
                      <span className="block text-sm font-medium mt-1 truncate">
                        {b.customerName}
                      </span>
                      <span className="block text-xs text-muted-foreground tabular-nums">
                        {fmtTime(b.startTime)} – {fmtTime(b.endTime)}
                      </span>
                    </button>
                  );
                })}
              </AnimatedList>
            )}
          </div>
          {team.length > 0 && (
            <div className="rounded-2xl border bg-card p-4">
              <p className="text-sm font-semibold mb-2.5">On the books</p>
              <div className="flex -space-x-2">
                {team.slice(0, 6).map((m) => (
                  <span
                    key={m.name}
                    title={m.name}
                    className="size-9 rounded-full border-2 border-card flex items-center justify-center text-white text-xs font-bold"
                    style={{ backgroundColor: m.color ?? "#52525b" }}
                  >
                    {m.name.charAt(0).toUpperCase()}
                  </span>
                ))}
                {team.length > 6 && (
                  <span className="size-9 rounded-full border-2 border-card bg-zinc-900 text-white text-[10px] font-bold flex items-center justify-center">
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
        onOpenChange={setBookingOpen}
        defaultDate={anchor}
        onCreated={load}
      />
    </div>
  );
}

// ─── Week grid (reference: image 3) ─────────────────────────────────────────

function WeekGrid({
  days,
  byDay,
  dayKey,
  hours,
  now,
  onOpen,
}: {
  days: Date[];
  byDay: Map<string, Booking[]>;
  dayKey: (d: Date) => string;
  hours: { lo: number; hi: number };
  now: Date;
  onOpen: (id: string) => void;
}) {
  const rows = hours.hi - hours.lo;
  const height = rows * HOUR_PX;
  const todayKey = dayKey(new Date());

  return (
    <div className="rounded-2xl border bg-card overflow-x-auto">
      <div className="min-w-[720px]">
        {/* day headers */}
        <div className="grid grid-cols-[52px_repeat(7,1fr)] border-b">
          <div />
          {days.map((d, i) => {
            const isToday = dayKey(d) === todayKey;
            return (
              <div key={i} className="py-2.5 text-center">
                <p className={cn("text-xs", isToday ? "font-bold text-zinc-900 dark:text-zinc-100" : "text-muted-foreground")}>
                  {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][i]}
                </p>
                <p className={cn(
                  "inline-flex items-center justify-center size-7 text-sm rounded-full mt-0.5 tabular-nums",
                  isToday ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-bold" : "font-medium",
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
                className="absolute right-2 text-[10px] text-muted-foreground tabular-nums -translate-y-1/2"
                style={{ top: i * HOUR_PX }}
              >
                {String(hours.lo + i).padStart(2, "0")}:00
              </span>
            ))}
          </div>
          {days.map((d, i) => {
            const list = byDay.get(dayKey(d)) ?? [];
            const isToday = dayKey(d) === todayKey;
            return (
              <div
                key={i}
                className={cn("relative border-l border-zinc-100 dark:border-zinc-800", isToday && "bg-zinc-50/60 dark:bg-zinc-900/40")}
                style={{ height }}
              >
                {Array.from({ length: rows + 1 }).map((_, r) => (
                  <span key={r} className="absolute inset-x-0 border-t border-zinc-100 dark:border-zinc-800" style={{ top: r * HOUR_PX }} />
                ))}
                {/* now line */}
                {isToday && (() => {
                  const mins = (now.getHours() - hours.lo) * 60 + now.getMinutes();
                  const top = (mins / 60) * HOUR_PX;
                  if (top < 0 || top > height) return null;
                  return (
                    <span className="absolute inset-x-0 z-10 border-t-2 border-red-500" style={{ top }}>
                      <span className="absolute -left-1 -top-[5px] size-2 rounded-full bg-red-500" />
                    </span>
                  );
                })()}
                {list.map((b) => {
                  const s = new Date(b.startTime);
                  const e = new Date(b.endTime);
                  const top = ((s.getHours() * 60 + s.getMinutes()) / 60 - hours.lo) * HOUR_PX;
                  const h = Math.max(30, ((+e - +s) / 3_600_000) * HOUR_PX - 3);
                  const c = colorFor(b.service?.id ?? b.id);
                  const who = b.allocations.map((a) => a.staff?.name ?? a.resource?.name).filter(Boolean)[0];
                  return (
                    <button
                      key={b.id}
                      data-cal-block
                      onClick={() => onOpen(b.id)}
                      className={cn("absolute inset-x-1 rounded-xl p-1.5 text-left overflow-hidden", c.bg, "hover:ring-2 hover:ring-zinc-900/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900")}
                      style={{ top: Math.max(0, top), height: h }}
                      aria-label={`${b.service?.name ?? "Booking"} for ${b.customerName} at ${fmtTime(b.startTime)}`}
                    >
                      <span className={cn("inline-block text-[9px] font-bold px-1.5 py-px rounded-full text-white", c.pill)}>
                        {(b.service?.name ?? "Booking").slice(0, 14)}
                      </span>
                      <span className={cn("block text-[11px] font-semibold leading-tight mt-0.5 truncate", c.text)}>
                        {b.customerName}
                      </span>
                      <span className={cn("block text-[10px] tabular-nums", c.text, "opacity-80")}>
                        {fmtTime(b.startTime)}–{fmtTime(b.endTime)}
                      </span>
                      {who && h > 64 && (
                        <span className={cn("flex items-center gap-1 text-[10px] mt-0.5 truncate", c.text)}>
                          <span className="size-4 rounded-full bg-white/70 text-zinc-900 text-[8px] font-bold flex items-center justify-center shrink-0">
                            {who.charAt(0).toUpperCase()}
                          </span>
                          <span className="truncate">{who}</span>
                        </span>
                      )}
                    </button>
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

// ─── Day agenda with swipe actions ───────────────────────────────────────────

function DayAgenda({
  bookings,
  onOpen,
  onStatus,
}: {
  bookings: Booking[];
  onOpen: (id: string) => void;
  onStatus: (id: string, status: string, label: string) => void;
}) {
  if (bookings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed rounded-2xl bg-muted/5">
        <CalendarCheck className="size-10 text-muted-foreground mb-3" />
        <p className="font-medium text-sm">A quiet day</p>
        <p className="text-xs text-muted-foreground mt-1">No bookings scheduled.</p>
      </div>
    );
  }
  return (
    <div className="space-y-2.5">
      {bookings.map((b) => {
        const c = colorFor(b.service?.id ?? b.id);
        const primary =
          b.status === "PENDING"
            ? { label: "Confirm", icon: <Check className="size-4" />, fn: () => onStatus(b.id, "CONFIRMED", "confirmed") }
            : b.status === "CONFIRMED"
              ? { label: "Done", icon: <Check className="size-4" />, fn: () => onStatus(b.id, "COMPLETED", "completed") }
              : null;
        return (
          <SwipeRow
            key={b.id}
            left={primary ? [{ label: primary.label, icon: primary.icon, tone: "primary" as const, onPress: primary.fn }] : []}
            right={
              b.status !== "CANCELLED" && b.status !== "COMPLETED"
                ? [{ label: "Cancel", icon: <X className="size-4" />, tone: "danger" as const, onPress: () => onStatus(b.id, "CANCELLED", "cancelled") }]
                : []
            }
          >
            <button
              onClick={() => onOpen(b.id)}
              className="w-full flex items-center gap-3 rounded-2xl border bg-card px-4 py-3 text-left hover:border-zinc-400 transition-colors"
            >
              <span className={cn("w-1.5 self-stretch rounded-full", c.pill)} aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold truncate">
                  {b.service?.name ?? "Booking"} · {b.customerName}
                </span>
                <span className="block text-xs text-muted-foreground tabular-nums">
                  {fmtTime(b.startTime)} – {fmtTime(b.endTime)}
                  {b.partySize ? ` · 👥 ${b.partySize}` : ""}
                </span>
              </span>
              <Badge variant="outline" className="text-[10px] shrink-0">{b.status}</Badge>
            </button>
          </SwipeRow>
        );
      })}
    </div>
  );
}

// ─── Month grid ──────────────────────────────────────────────────────────────

function MonthGrid({
  anchor,
  byDay,
  dayKey,
  onPickDay,
}: {
  anchor: Date;
  byDay: Map<string, Booking[]>;
  dayKey: (d: Date) => string;
  onPickDay: (d: Date) => void;
}) {
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const lead = (first.getDay() + 6) % 7;
  const cells = Array.from({ length: 42 }, (_, i) => addDays(first, i - lead));
  const todayKey = dayKey(new Date());
  return (
    <div className="rounded-2xl border bg-card p-3">
      <div className="grid grid-cols-7 gap-1">
        {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
          <p key={i} className="text-center text-[10px] font-semibold text-muted-foreground py-1">{d}</p>
        ))}
        {cells.map((d, i) => {
          const list = byDay.get(dayKey(d)) ?? [];
          const inMonth = d.getMonth() === anchor.getMonth();
          const isToday = dayKey(d) === todayKey;
          return (
            <button
              key={i}
              onClick={() => onPickDay(d)}
              className={cn(
                "rounded-xl p-1.5 min-h-[64px] text-left border transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900/20",
                inMonth ? "hover:border-zinc-400 bg-background" : "opacity-40",
                isToday && "border-zinc-900",
              )}
            >
              <span className={cn("text-xs tabular-nums", isToday ? "font-bold" : "text-muted-foreground")}>
                {d.getDate()}
              </span>
              <span className="flex flex-wrap gap-0.5 mt-1">
                {list.slice(0, 5).map((b) => (
                  <span key={b.id} className={cn("size-1.5 rounded-full", colorFor(b.service?.id ?? b.id).pill)} />
                ))}
                {list.length > 5 && (
                  <span className="text-[9px] text-muted-foreground">+{list.length - 5}</span>
                )}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
