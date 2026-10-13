"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { toast } from "sonner";
import {
  Ban,
  CalendarOff,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Trash2,
  X,
} from "lucide-react";
import {
  addTimeOff,
  removeTimeOff,
} from "@/lib/resources";
import { cn } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface CalBooking {
  id: string;
  title: string;
  sub: string;
  start: string;
  end: string;
  staffId?: string | null;
  staffName?: string | null;
}

export interface CalBlock {
  id: string;
  start: string;
  end: string;
  reason?: string | null;
  staffId?: string | null;
  staffName?: string | null;
  resourceId?: string | null;
  resourceName?: string | null;
}

export interface CalPerson {
  id: string;
  name: string;
}

export interface BookingCalendarScope {
  staffId?: string;
  resourceId?: string;
}

// ─── Date helpers (local time, no TZ drift) ──────────────────────────────────

function startOfDay(d: Date): Date {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
}

function addDays(d: Date, n: number): Date {
  const c = new Date(d);
  c.setDate(c.getDate() + n);
  return c;
}

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function sameDay(a: Date, b: Date): boolean {
  return dayKey(a) === dayKey(b);
}

function fmtT(iso: string): string {
  return new Date(iso).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

function fmtD(d: Date): string {
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function toLocalInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const EASE = [0.22, 1, 0.36, 1] as const;
const MAX_LANES = 3;

// ─── Segments ────────────────────────────────────────────────────────────────

interface Seg {
  key: string;
  kind: "booking" | "block";
  row: number;
  startCol: number;
  span: number;
  label: string;
  title: string;
  lane: number;
  ref: CalBooking | CalBlock;
}

function chunkIntoRows(
  start: Date,
  end: Date,
  gridStart: Date,
): { row: number; startCol: number; span: number }[] {
  const out: { row: number; startCol: number; span: number }[] = [];
  let cur = startOfDay(start);
  const last = startOfDay(end);
  while (cur <= last) {
    const row = Math.floor((cur.getTime() - gridStart.getTime()) / 604_800_000);
    const col = Math.round((cur.getTime() - gridStart.getTime()) / 86_400_000) % 7;
    let span = 1;
    while (span < 7 - col) {
      const nxt = addDays(cur, span);
      if (nxt > last) break;
      span++;
    }
    if (row >= 0 && row < 6) out.push({ row, startCol: col, span });
    cur = addDays(cur, span);
  }
  return out;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function BookingCalendar({
  month,
  onMonthChange,
  bookings,
  blocks,
  onBookingClick,
  onChanged,
  scope,
  staffOptions = [],
  resourceOptions = [],
  reduceMotion: reduceMotionProp,
}: {
  month: Date;
  onMonthChange: (d: Date) => void;
  bookings: CalBooking[];
  blocks: CalBlock[];
  onBookingClick?: (id: string) => void;
  onChanged?: () => void;
  scope?: BookingCalendarScope;
  staffOptions?: CalPerson[];
  resourceOptions?: CalPerson[];
  reduceMotion?: boolean;
}) {
  const reduceMotionHook = useReducedMotion();
  const reduceMotion = reduceMotionProp ?? !!reduceMotionHook;

  const [dir, setDir] = useState(0);
  const [anchor, setAnchor] = useState<Date | null>(null);
  const [hover, setHover] = useState<Date | null>(null);
  const [dialogRange, setDialogRange] = useState<{ from: Date; to: Date } | null>(null);
  const [inspectBlock, setInspectBlock] = useState<CalBlock | null>(null);

  const gridStart = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    return addDays(first, -((first.getDay() + 6) % 7)); // Monday first
  }, [month]);

  const cells = useMemo(
    () => Array.from({ length: 42 }, (_, i) => addDays(gridStart, i)),
    [gridStart],
  );

  const monthKey = `${month.getFullYear()}-${month.getMonth()}`;
  const todayKey = dayKey(new Date());

  // ── Segments + lane packing ──
  const rows = useMemo(() => {
    const segs: Seg[] = [];

    for (const b of bookings) {
      const s = new Date(b.start);
      const e = new Date(b.end);
      const timed = !sameDay(s, e)
        ? `${fmtD(s)} → ${fmtD(e)}`
        : `${fmtT(b.start)}–${fmtT(b.end)}`;
      for (const c of chunkIntoRows(s, e, gridStart)) {
        segs.push({
          key: `b-${b.id}-${c.row}-${c.startCol}`,
          kind: "booking",
          ...c,
          label: `${b.sub || b.title} · ${timed}`,
          title: `${b.title} — ${b.sub} (${timed})`,
          lane: 0,
          ref: b,
        });
      }
    }

    for (const t of blocks) {
      const s = new Date(t.start);
      const e = new Date(t.end);
      const who =
        t.staffName ?? t.resourceName ?? (scope?.staffId ? "Blocked" : "Blocked");
      const fullDay =
        sameDay(s, e) && s.getHours() === 0 && s.getMinutes() === 0;
      const when = sameDay(s, e)
        ? fullDay
          ? "All day"
          : `${fmtT(t.start)}–${fmtT(t.end)}`
        : `${fmtD(s)} → ${fmtD(e)}`;
      const label = t.reason ? `${who} · ${t.reason}` : `${who} · ${when}`;
      for (const c of chunkIntoRows(s, e, gridStart)) {
        segs.push({
          key: `t-${t.id}-${c.row}-${c.startCol}`,
          kind: "block",
          ...c,
          label,
          title: `${who} blocked (${when})${t.reason ? ` — ${t.reason}` : ""}`,
          lane: 0,
          ref: t,
        });
      }
    }

    // Pack lanes per row: blocks above bookings? Reference shows mixed stack —
    // sort blocks first so they read as the "closed" layer.
    const byRow = new Map<number, Seg[]>();
    for (const s of segs) {
      const list = byRow.get(s.row) ?? [];
      list.push(s);
      byRow.set(s.row, list);
    }
    for (const list of byRow.values()) {
      list.sort((a, b) =>
        a.kind === b.kind
          ? a.startCol - b.startCol
          : a.kind === "block"
            ? -1
            : 1,
      );
      const lanes: number[] = [];
      for (const s of list) {
        let lane = 0;
        for (; lane < lanes.length; lane++) {
          if (lanes[lane]! <= s.startCol) break;
        }
        s.lane = lane;
        lanes[lane] = s.startCol + s.span;
      }
    }
    return byRow;
  }, [bookings, blocks, gridStart, scope?.staffId]);

  // ── Range selection ──
  const pending = useMemo(() => {
    if (!anchor) return null;
    const end = hover ?? anchor;
    const from = startOfDay(anchor < end ? anchor : end);
    const to = startOfDay(anchor < end ? end : anchor);
    return { from, to };
  }, [anchor, hover]);

  const commitRange = (to: Date) => {
    if (!anchor) return;
    const from = startOfDay(anchor < to ? anchor : to);
    const end = startOfDay(anchor < to ? to : anchor);
    setAnchor(null);
    setHover(null);
    setDialogRange({ from, to: end });
  };

  const onDayClick = (d: Date) => {
    if (!anchor) {
      setAnchor(startOfDay(d));
      setHover(startOfDay(d));
    } else if (sameDay(anchor, d)) {
      // second tap on the anchor = single-day block
      commitRange(d);
    } else {
      commitRange(d);
    }
  };

  const goMonth = (n: number) => {
    setDir(n);
    setAnchor(null);
    setHover(null);
    onMonthChange(new Date(month.getFullYear(), month.getMonth() + n, 1));
  };

  const monthLabel = month.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="select-none">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <h2 className="text-lg font-semibold tracking-tight text-ink min-w-36">
          {monthLabel}
        </h2>
        <div className="flex items-center gap-1 ml-auto">
          <button
            onClick={() => goMonth(-1)}
            aria-label="Previous month"
            className="size-8 rounded-full flex items-center justify-center text-ink/60 hover:text-ink hover:bg-ink/[0.06] transition-colors"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            onClick={() => {
              setDir(0);
              setAnchor(null);
              onMonthChange(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
            }}
            className="h-8 px-3 rounded-full text-xs font-medium text-ink/60 hover:text-ink hover:bg-ink/[0.06] transition-colors"
          >
            Today
          </button>
          <button
            onClick={() => goMonth(1)}
            aria-label="Next month"
            className="size-8 rounded-full flex items-center justify-center text-ink/60 hover:text-ink hover:bg-ink/[0.06] transition-colors"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>

      {/* Selection hint */}
      <AnimatePresence>
        {pending && !dialogRange && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="mb-2.5 flex items-center gap-2 text-xs"
          >
            <span className="inline-flex items-center gap-1.5 rounded-full bg-ink px-3 py-1.5 font-medium text-white">
              <Ban className="size-3" />
              {fmtD(pending.from)} → {fmtD(pending.to)} · pick the end date
            </span>
            <button
              onClick={() => {
                setAnchor(null);
                setHover(null);
              }}
              className="inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 font-medium text-ink/55 hover:text-ink hover:bg-ink/[0.06] transition-colors"
            >
              <X className="size-3" /> Cancel
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Grid */}
      <div className="rounded-[1.6rem] bg-ink/[0.035] p-2 sm:p-3 overflow-hidden">
        <div className="grid grid-cols-7 mb-1">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
            <p
              key={d}
              className="text-center text-[10px] font-semibold uppercase tracking-wider text-ink/40 py-1.5"
            >
              {d}
            </p>
          ))}
        </div>

        <AnimatePresence mode="wait" custom={dir}>
          <motion.div
            key={monthKey}
            custom={dir}
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, x: 48 * dir }}
            animate={{ opacity: 1, x: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: -48 * dir }}
            transition={{ duration: 0.28, ease: EASE }}
          >
            {[0, 1, 2, 3, 4, 5].map((row) => {
              const segs = (rows.get(row) ?? []).filter((s) => s.lane < MAX_LANES);
              const overflow = (rows.get(row) ?? []).filter(
                (s) => s.lane >= MAX_LANES,
              ).length;
              return (
                <div key={row} className="relative">
                  {/* day cells */}
                  <div className="grid grid-cols-7 gap-px">
                    {cells.slice(row * 7, row * 7 + 7).map((d) => {
                      const inMonth = d.getMonth() === month.getMonth();
                      const isToday = dayKey(d) === todayKey;
                      const inPending =
                        pending && d >= pending.from && d <= pending.to;
                      return (
                        <button
                          key={d.toISOString()}
                          onClick={() => onDayClick(d)}
                          onMouseEnter={() => anchor && setHover(startOfDay(d))}
                          onFocus={() => anchor && setHover(startOfDay(d))}
                          aria-label={`${fmtD(d)}${inPending ? " (in selected range)" : ""}`}
                          className={cn(
                            "relative min-h-[76px] sm:min-h-[92px] rounded-xl p-1.5 text-left transition-colors duration-150",
                            "focus-visible:outline-2 focus-visible:outline-brand focus-visible:outline-offset-1",
                            inPending
                              ? "bg-brand/[0.08]"
                              : "hover:bg-ink/[0.05]",
                            !inMonth && "opacity-35",
                          )}
                        >
                          <span
                            className={cn(
                              "inline-flex items-center justify-center size-6 text-xs tabular-nums",
                              isToday
                                ? "rounded-full bg-ink text-white font-bold"
                                : inMonth
                                  ? "font-semibold text-ink"
                                  : "text-ink/50",
                            )}
                          >
                            {d.getDate()}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* event lanes overlay */}
                  <div className="pointer-events-none absolute inset-x-0 top-[30px] sm:top-[32px] space-y-1 px-1">
                    {Array.from({ length: MAX_LANES }).map((_, lane) => (
                      <div key={lane} className="relative h-[22px]">
                        {segs
                          .filter((s) => s.lane === lane)
                          .map((s) => (
                            <SegBar
                              key={s.key}
                              seg={s}
                              reduceMotion={reduceMotion}
                              onBookingClick={onBookingClick}
                              onBlockClick={setInspectBlock}
                            />
                          ))}
                      </div>
                    ))}
                    {overflow > 0 && (
                      <p className="text-[10px] font-semibold text-ink/45 pl-1">
                        +{overflow} more
                      </p>
                    )}
                  </div>

                  {/* live pending-range bar */}
                  {pending && (
                    <PendingBar pending={pending} gridStart={gridStart} row={row} reduceMotion={reduceMotion} />
                  )}
                </div>
              );
            })}
          </motion.div>
        </AnimatePresence>
      </div>

      <p className="text-[11px] text-ink/40 mt-2 px-1">
        Tap a date, then another date, to block the range — or tap a red bar to
        edit it.
      </p>

      {/* Block create dialog */}
      {dialogRange && (
        <BlockDialog
          range={dialogRange}
          scope={scope}
          staffOptions={staffOptions}
          resourceOptions={resourceOptions}
          onClose={() => setDialogRange(null)}
          onChanged={onChanged}
        />
      )}

      {/* Block inspect / delete */}
      {inspectBlock && (
        <InspectBlockDialog
          block={inspectBlock}
          onClose={() => setInspectBlock(null)}
          onChanged={onChanged}
        />
      )}
    </div>
  );
}

// ─── Segment bar ─────────────────────────────────────────────────────────────

function SegBar({
  seg,
  reduceMotion,
  onBookingClick,
  onBlockClick,
}: {
  seg: Seg;
  reduceMotion: boolean;
  onBookingClick?: (id: string) => void;
  onBlockClick?: (b: CalBlock) => void;
}) {
  const left = `${(seg.startCol / 7) * 100}%`;
  const width = `calc(${(seg.span / 7) * 100}% - 3px)`;
  const isBlock = seg.kind === "block";

  return (
    <motion.button
      layout
      initial={reduceMotion ? false : { scaleX: 0, opacity: 0 }}
      animate={{ scaleX: 1, opacity: 1 }}
      transition={
        reduceMotion
          ? { duration: 0 }
          : { type: "spring", stiffness: 320, damping: 30 }
      }
      style={{ left, width, transformOrigin: "left center" }}
      title={seg.label}
      onClick={(e) => {
        e.stopPropagation();
        if (isBlock) onBlockClick?.(seg.ref as CalBlock);
        else onBookingClick?.((seg.ref as CalBooking).id);
      }}
      className={cn(
        "pointer-events-auto absolute top-0 h-[22px] rounded-full px-2 flex items-center gap-1 overflow-hidden text-left",
        "focus-visible:outline-2 focus-visible:outline-brand focus-visible:outline-offset-1",
        isBlock
          ? "bg-red-500 text-white hover:bg-red-600"
          : "bg-ink text-white hover:bg-brand-deep",
      )}
    >
      {isBlock && <Ban className="size-2.5 shrink-0 opacity-80" />}
      <span className="text-[10px] font-medium truncate leading-none">
        {seg.label}
      </span>
    </motion.button>
  );
}

// ─── Live pending-range bar (expands as hover moves) ─────────────────────────

function PendingBar({
  pending,
  gridStart,
  row,
  reduceMotion,
}: {
  pending: { from: Date; to: Date };
  gridStart: Date;
  row: number;
  reduceMotion: boolean;
}) {
  const chunks = chunkIntoRows(pending.from, pending.to, gridStart).filter(
    (c) => c.row === row,
  );
  if (chunks.length === 0) return null;
  return (
    <>
      {chunks.map((c, i) => (
        <motion.div
          key={i}
          className="pointer-events-none absolute top-[30px] sm:top-[32px] h-[22px] rounded-full border-2 border-dashed border-brand bg-brand/10"
          initial={false}
          animate={{
            left: `${(c.startCol / 7) * 100}%`,
            width: `calc(${(c.span / 7) * 100}% - 3px)`,
          }}
          transition={
            reduceMotion
              ? { duration: 0 }
              : { type: "spring", stiffness: 420, damping: 36 }
          }
        />
      ))}
    </>
  );
}

// ─── Block create dialog ─────────────────────────────────────────────────────

type ScopePick =
  | { kind: "everyone" }
  | { kind: "staff"; id: string }
  | { kind: "resource"; id: string };

function BlockDialog({
  range,
  scope,
  staffOptions,
  resourceOptions,
  onClose,
  onChanged,
}: {
  range: { from: Date; to: Date };
  scope?: BookingCalendarScope;
  staffOptions: CalPerson[];
  resourceOptions: CalPerson[];
  onClose: () => void;
  onChanged?: () => void;
}) {
  const locked: ScopePick | null = scope?.staffId
    ? { kind: "staff", id: scope.staffId }
    : scope?.resourceId
      ? { kind: "resource", id: scope.resourceId }
      : null;

  const [pick, setPick] = useState<ScopePick>(locked ?? { kind: "everyone" });
  const [reason, setReason] = useState("");
  const [allDay, setAllDay] = useState(true);
  const [fromT, setFromT] = useState("09:00");
  const [toT, setToT] = useState("18:00");
  const [saving, setSaving] = useState(false);

  const multiDay = !sameDay(range.from, range.to);

  const save = async () => {
    setSaving(true);
    try {
      const [fh, fm] = fromT.split(":").map(Number);
      const [th, tm] = toT.split(":").map(Number);
      const start = new Date(range.from);
      const end = new Date(range.to);
      if (allDay || multiDay) {
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
      } else {
        start.setHours(fh ?? 9, fm ?? 0, 0, 0);
        end.setHours(th ?? 18, tm ?? 0, 0, 0);
      }
      if (end <= start) {
        toast.error("End must be after the start");
        setSaving(false);
        return;
      }
      await addTimeOff({
        staffId: pick.kind === "staff" ? pick.id : undefined,
        resourceId: pick.kind === "resource" ? pick.id : undefined,
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        reason: reason.trim() || undefined,
      });
      toast.success(
        multiDay
          ? `Blocked ${fmtD(range.from)} → ${fmtD(range.to)}`
          : `Blocked ${fmtD(range.from)}`,
      );
      onChanged?.();
      onClose();
    } catch (err: unknown) {
      toast.error(
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error ?? "Could not save block",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <DialogShell onClose={onClose} title="Block time">
      <p className="text-sm text-ink/60">
        <span className="font-semibold text-ink">
          {fmtD(range.from)}
          {multiDay ? ` → ${fmtD(range.to)}` : ""}
        </span>{" "}
        · bookings won&apos;t be offered here
      </p>

      {/* Who */}
      {!locked && (
        <div className="mt-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink/45 mb-2">
            Who is blocked?
          </p>
          <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
            <ScopeChip
              active={pick.kind === "everyone"}
              onClick={() => setPick({ kind: "everyone" })}
              label="Everyone"
            />
            {staffOptions.map((s) => (
              <ScopeChip
                key={`s-${s.id}`}
                active={pick.kind === "staff" && pick.id === s.id}
                onClick={() => setPick({ kind: "staff", id: s.id })}
                label={s.name}
              />
            ))}
            {resourceOptions.map((r) => (
              <ScopeChip
                key={`r-${r.id}`}
                active={pick.kind === "resource" && pick.id === r.id}
                onClick={() => setPick({ kind: "resource", id: r.id })}
                label={r.name}
              />
            ))}
          </div>
        </div>
      )}

      {/* Reason */}
      <div className="mt-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink/45 mb-2">
          Why? (shown on the bar)
        </p>
        <input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. Holiday, deep-clean, sick leave…"
          autoFocus
          className="w-full rounded-2xl bg-ink/[0.05] px-4 py-3 text-sm font-medium text-ink placeholder:text-ink/30 placeholder:font-normal focus:outline-none focus:bg-ink/[0.08] transition-colors"
        />
      </div>

      {/* Timed vs all-day */}
      {!multiDay && (
        <div className="mt-4">
          <div className="flex items-center justify-between rounded-2xl bg-ink/[0.04] px-4 py-3">
            <span className="text-sm font-medium text-ink">All day</span>
            <button
              type="button"
              role="switch"
              aria-checked={allDay}
              aria-label="All day block"
              onClick={() => setAllDay((v) => !v)}
              className={cn(
                "relative h-6 w-11 rounded-full transition-colors",
                allDay ? "bg-brand" : "bg-ink/15",
              )}
            >
              <motion.span
                layout
                transition={{ type: "spring", stiffness: 550, damping: 30 }}
                className={cn(
                  "absolute top-0.5 size-5 rounded-full bg-white",
                  allDay ? "right-0.5" : "left-0.5",
                )}
              />
            </button>
          </div>
          {!allDay && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="overflow-hidden"
            >
              <div className="flex items-center gap-2 pt-2.5">
                <input
                  type="time"
                  value={fromT}
                  onChange={(e) => setFromT(e.target.value)}
                  aria-label="Block from time"
                  className="flex-1 rounded-2xl bg-ink/[0.05] px-4 py-3 text-sm font-medium tabular-nums focus:outline-none focus:bg-ink/[0.08]"
                />
                <span className="text-ink/40 text-sm">→</span>
                <input
                  type="time"
                  value={toT}
                  onChange={(e) => setToT(e.target.value)}
                  aria-label="Block to time"
                  className="flex-1 rounded-2xl bg-ink/[0.05] px-4 py-3 text-sm font-medium tabular-nums focus:outline-none focus:bg-ink/[0.08]"
                />
              </div>
            </motion.div>
          )}
        </div>
      )}

      <div className="mt-5 flex gap-2">
        <button
          onClick={onClose}
          className="h-11 px-5 rounded-full text-sm font-medium text-ink/60 hover:text-ink hover:bg-ink/[0.06] transition-colors"
        >
          Cancel
        </button>
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={save}
          disabled={saving}
          className="h-11 flex-1 inline-flex items-center justify-center gap-2 rounded-full bg-ink text-sm font-medium text-white hover:bg-red-600 transition-colors disabled:opacity-50"
        >
          {saving ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <CalendarOff className="size-4" />
          )}
          Block {multiDay ? `${Math.round((range.to.getTime() - range.from.getTime()) / 86_400_000) + 1} days` : "this day"}
        </motion.button>
      </div>
    </DialogShell>
  );
}

function ScopeChip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "text-xs px-2.5 py-1.5 rounded-full font-medium transition-colors",
        active ? "bg-ink text-white" : "bg-ink/[0.06] text-ink hover:bg-ink/10",
      )}
    >
      {label}
    </button>
  );
}

// ─── Inspect / delete dialog ─────────────────────────────────────────────────

function InspectBlockDialog({
  block,
  onClose,
  onChanged,
}: {
  block: CalBlock;
  onClose: () => void;
  onChanged?: () => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const s = new Date(block.start);
  const e = new Date(block.end);
  const who = block.staffName ?? block.resourceName ?? "Everyone";

  const remove = async () => {
    setDeleting(true);
    try {
      await removeTimeOff(block.id);
      toast.success("Block removed — dates are bookable again");
      onChanged?.();
      onClose();
    } catch {
      toast.error("Could not remove block");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <DialogShell onClose={onClose} title="Blocked time">
      <div className="rounded-2xl bg-red-500/10 px-4 py-3.5">
        <p className="text-sm font-semibold text-ink">{who}</p>
        <p className="text-[13px] text-ink/60 mt-0.5 tabular-nums">
          {sameDay(s, e)
            ? `${fmtD(s)} · ${fmtT(block.start)}–${fmtT(block.end)}`
            : `${fmtD(s)} → ${fmtD(e)}`}
        </p>
        {block.reason && (
          <p className="text-[13px] text-ink/70 mt-1">“{block.reason}”</p>
        )}
      </div>
      <div className="mt-4 flex gap-2">
        <button
          onClick={onClose}
          className="h-11 px-5 rounded-full text-sm font-medium text-ink/60 hover:text-ink hover:bg-ink/[0.06] transition-colors"
        >
          Keep
        </button>
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={remove}
          disabled={deleting}
          className="h-11 flex-1 inline-flex items-center justify-center gap-2 rounded-full bg-red-600 text-sm font-medium text-white hover:bg-red-700 transition-colors disabled:opacity-50"
        >
          {deleting ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Trash2 className="size-4" />
          )}
          Unblock
        </motion.button>
      </div>
    </DialogShell>
  );
}

// ─── Minimal dialog shell (tonal, no borders) ────────────────────────────────

function DialogShell({
  onClose,
  title,
  children,
}: {
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-ink/40 backdrop-blur-[2px] p-4"
      onClick={onClose}
      role="presentation"
    >
      <motion.div
        initial={{ opacity: 0, y: 32, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 24, scale: 0.98 }}
        transition={{ type: "spring", stiffness: 380, damping: 32 }}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-[1.6rem] bg-paper p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold tracking-tight text-ink">
            {title}
          </h3>
          <button
            onClick={onClose}
            aria-label="Close"
            className="size-8 rounded-full flex items-center justify-center text-ink/55 hover:text-ink hover:bg-ink/[0.06] transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>
        {children}
      </motion.div>
    </motion.div>
  );
}

// Re-exported helpers for parents that keep raw domain objects.
export function toCalBookings(
  bookings: {
    id: string;
    startTime: string;
    endTime: string;
    customerName: string;
    service?: { name: string } | null;
    allocations?: { staff?: { id: string; name: string } | null }[];
  }[],
): CalBooking[] {
  return bookings.map((b) => ({
    id: b.id,
    title: b.service?.name ?? "Booking",
    sub: b.customerName,
    start: b.startTime,
    end: b.endTime,
    staffId: b.allocations?.[0]?.staff?.id ?? null,
    staffName: b.allocations?.[0]?.staff?.name ?? null,
  }));
}

export function toCalBlocks(
  blocks: {
    id: string;
    startDate: string;
    endDate: string;
    reason?: string | null;
    staffId?: string | null;
    staff?: { name: string } | null;
    resourceId?: string | null;
    resource?: { name: string } | null;
  }[],
): CalBlock[] {
  return blocks.map((t) => ({
    id: t.id,
    start: t.startDate,
    end: t.endDate,
    reason: t.reason,
    staffId: t.staffId,
    staffName: t.staff?.name ?? null,
    resourceId: t.resourceId,
    resourceName: t.resource?.name ?? null,
  }));
}
