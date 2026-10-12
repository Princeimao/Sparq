"use client";

import { useEffect, useRef, useState } from "react";
import { animate, stagger } from "animejs";
import {
  ArrowUpRight,
  CalendarCheck2,
  Check,
  CreditCard,
  PackageCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SectionHeading, Reveal, usePrefersReducedMotion } from "./reveal";

/* ── 1. Bookings: split screen + interactive day/slot picker ─────────────── */
const WEEK = [
  { d: "Mon", n: 12, slots: ["10:00", "11:30", "4:00"] },
  { d: "Tue", n: 13, slots: ["9:30", "2:00", "5:30"] },
  { d: "Wed", n: 14, slots: [] },
  { d: "Thu", n: 15, slots: ["10:30", "12:00", "3:00", "6:00"] },
  { d: "Fri", n: 16, slots: ["11:00", "4:30"] },
  { d: "Sat", n: 17, slots: ["9:00", "10:00", "12:30"] },
  { d: "Sun", n: 18, slots: [] },
];

function BookingDemo() {
  const reduce = usePrefersReducedMotion();
  const [day, setDay] = useState(3);
  const [slot, setSlot] = useState<string | null>(null);
  const slotsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (reduce) return;
    const el = slotsRef.current;
    if (!el) return;
    const items = el.querySelectorAll("[data-slot]");
    if (items.length === 0) return;
    const anim = animate(items, {
      opacity: [0, 1],
      y: [8, 0],
      duration: 350,
      delay: stagger(60),
      ease: "outCubic",
    });
    return () => {
      anim.revert();
    };
  }, [day, reduce]);

  const current = WEEK[day]!;
  return (
    <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-[0_20px_50px_-30px_rgba(20,22,15,0.3)]">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">October</p>
        <p className="flex items-center gap-1.5 text-xs text-zinc-500">
          <span className="size-1.5 rounded-full bg-[#178a4c]" />
          Synced with Google Calendar
        </p>
      </div>
      <div className="mt-4 grid grid-cols-7 gap-1.5">
        {WEEK.map((w, i) => (
          <button
            key={w.d}
            onClick={() => {
              setDay(i);
              setSlot(null);
            }}
            aria-pressed={day === i}
            className={cn(
              "flex flex-col items-center gap-1 rounded-xl py-2 text-xs transition-colors",
              day === i
                ? "bg-[#14160f] text-white"
                : "hover:bg-zinc-100 text-zinc-700",
              w.slots.length === 0 && day !== i && "opacity-40",
            )}
          >
            <span className="font-medium">{w.d}</span>
            <span className="tabular-nums">{w.n}</span>
            <span
              className={cn(
                "size-1 rounded-full",
                w.slots.length > 0 ? "bg-[#178a4c]" : "bg-zinc-300",
              )}
            />
          </button>
        ))}
      </div>
      <div ref={slotsRef} className="mt-4 flex min-h-[52px] flex-wrap gap-2">
        {current.slots.length === 0 ? (
          <p className="text-sm text-zinc-500">
            Fully booked — Sparq already offered the next free day. 🎉
          </p>
        ) : (
          current.slots.map((s) => (
            <button
              key={s}
              data-slot
              onClick={() => setSlot(s)}
              aria-pressed={slot === s}
              className={cn(
                "rounded-full border px-4 py-2 text-sm font-medium tabular-nums transition-colors",
                slot === s
                  ? "border-[#178a4c] bg-[#178a4c] text-white"
                  : "border-zinc-200 hover:border-zinc-900",
              )}
            >
              {s}
            </button>
          ))
        )}
      </div>
      <div className="mt-4 flex items-center justify-between rounded-2xl bg-[#f2faf5] px-4 py-3 text-sm">
        <span className="flex items-center gap-2 font-medium text-zinc-900">
          <CalendarCheck2 className="size-4 text-[#178a4c]" />
          {slot ? `Thu 15 · ${slot} · Table for 2` : "Pick a time to preview"}
        </span>
        {slot && (
          <span className="flex items-center gap-1 rounded-full bg-[#178a4c] px-2.5 py-1 text-[11px] font-semibold text-white">
            <Check className="size-3" /> Held
          </span>
        )}
      </div>
    </div>
  );
}

/* ── 2. Orders: auto-playing chat-to-checkout journey ─────────────────────── */

const ORDER_PHASES = [
  {
    id: "chat",
    label: "Chat",
    customer: "1x Chocolate truffle cake please 🎂",
    bot: "Added! Pay ₹850 to confirm 👇",
    card: { title: "Birthday cake · Chocolate", meta: "Aarav · WhatsApp · just now", amount: "₹850" },
    paid: false,
  },
  {
    id: "link",
    label: "Payment link",
    customer: "1x Chocolate truffle cake please 🎂",
    bot: "Added! Pay ₹850 to confirm 👇",
    card: { title: "Birthday cake · Chocolate", meta: "Link sent · pay.sparq.app/c/8F3K2", amount: "₹850" },
    paid: false,
  },
  {
    id: "paid",
    label: "Paid",
    customer: "Done, paid! 🙌",
    bot: "Payment received ✅ Order confirmed — pickup tomorrow 4 PM!",
    card: { title: "Birthday cake · Chocolate", meta: "Razorpay · UPI · just now", amount: "₹850" },
    paid: true,
  },
];

function OrdersDemo() {
  const reduce = usePrefersReducedMotion();
  const [idx, setIdx] = useState(2);
  const cardRef = useRef<HTMLDivElement>(null);
  const stampRef = useRef<HTMLSpanElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const visibleRef = useRef(true);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      ([entry]) => {
        visibleRef.current = entry.isIntersecting;
      },
      { threshold: 0.25 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (reduce) return;
    let i = 2;
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      if (!visibleRef.current) {
        timer = setTimeout(tick, 800);
        return;
      }
      i = (i + 1) % ORDER_PHASES.length;
      setIdx(i);
      timer = setTimeout(tick, i === 2 ? 3400 : 2200);
    };
    timer = setTimeout(tick, 2200);
    return () => clearTimeout(timer);
  }, [reduce]);

  // Card swap slide.
  useEffect(() => {
    if (reduce) return;
    const el = cardRef.current;
    if (!el) return;
    const anim = animate(el, {
      y: [16, 0],
      opacity: [0.2, 1],
      duration: 550,
      ease: "outCubic",
    });
    return () => {
      anim.revert();
    };
  }, [idx, reduce]);

  // Progress connector fill.
  useEffect(() => {
    if (reduce || !barRef.current) return;
    const anim = animate(barRef.current, {
      scaleX: [0, (idx + 1) / ORDER_PHASES.length],
      duration: 600,
      ease: "outExpo",
    });
    return () => {
      anim.revert();
    };
  }, [idx, reduce]);

  // PAID stamp slam.
  useEffect(() => {
    if (reduce || idx !== 2) return;
    const el = stampRef.current;
    if (!el) return;
    const anim = animate(el, {
      scale: [2.2, 1],
      rotate: [-14, -8],
      opacity: [0, 1],
      duration: 450,
      ease: "outBack(1.8)",
    });
    return () => {
      anim.revert();
    };
  }, [idx, reduce]);

  const s = ORDER_PHASES[idx]!;
  return (
    <div
      ref={wrapRef}
      className="overflow-hidden rounded-3xl bg-[#0c2b1d] p-6 text-white md:p-10"
    >
      {/* phase stepper */}
      <div className="flex flex-wrap items-center gap-2">
        {ORDER_PHASES.map((st, i) => (
          <button
            key={st.id}
            onClick={() => setIdx(i)}
            className="flex items-center gap-2"
            aria-pressed={idx === i}
          >
            <span
              className={cn(
                "rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors",
                idx === i ? "bg-white text-[#0c2b1d]" : "text-zinc-300 ring-1 ring-white/20 hover:ring-white/50",
              )}
            >
              {st.label}
            </span>
            {i < ORDER_PHASES.length - 1 && (
              <span aria-hidden className="h-px w-6 bg-white/25" />
            )}
          </button>
        ))}
      </div>
      <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/10">
        <div
          ref={barRef}
          className="h-full w-full origin-left rounded-full bg-emerald-400"
          style={{ transform: `scaleX(${(idx + 1) / ORDER_PHASES.length})` }}
        />
      </div>

      {/* chat thread */}
      <div className="mt-6 grid gap-3 md:grid-cols-2">
        <div className="flex flex-col gap-2 rounded-2xl bg-white/[0.05] p-4 ring-1 ring-white/10">
          <div className="flex justify-end">
            <p className="max-w-[90%] rounded-2xl rounded-tr-md bg-emerald-400/20 px-3 py-2 text-[13px] text-emerald-50">
              {s.customer}
            </p>
          </div>
          <div className="flex justify-start">
            <p className="max-w-[90%] rounded-2xl rounded-tl-md bg-white/10 px-3 py-2 text-[13px] text-zinc-100">
              {s.bot}
            </p>
          </div>
          {idx >= 1 && (
            <div className="flex justify-start">
              <span className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-[13px] font-medium text-zinc-900">
                <CreditCard className="size-4 text-[#178a4c]" />
                pay.sparq.app/c/8F3K2
                <span className="rounded-full bg-[#178a4c] px-2 py-0.5 text-[11px] font-semibold text-white">
                  ₹850
                </span>
              </span>
            </div>
          )}
        </div>

        {/* order card */}
        <div className="relative">
          <div
            ref={cardRef}
            className="flex h-full flex-col gap-1 rounded-2xl bg-white/[0.07] p-5 ring-1 ring-white/15 sm:flex-row sm:items-center"
          >
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-emerald-400/15 text-emerald-300">
              <PackageCheck className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-semibold">{s.card.title}</p>
              <p className="text-[13px] text-zinc-300">{s.card.meta}</p>
            </div>
            <p className="text-lg font-bold tabular-nums text-emerald-300">{s.card.amount}</p>
          </div>
          {s.paid && (
            <span
              ref={stampRef}
              aria-hidden
              className="absolute -right-2 -top-3 rounded-lg border-[3px] border-emerald-400 px-3 py-1 text-sm font-black uppercase tracking-[0.2em] text-emerald-300"
            >
              Paid
            </span>
          )}
        </div>
      </div>

      <p className="mt-4 flex items-center gap-2 text-[13px] text-zinc-300">
        <CreditCard className="size-4 text-emerald-300" />
        Payment links via Razorpay or Stripe, collected inside the chat.
      </p>
    </div>
  );
}

/* ── Section assembly ─────────────────────────────────────────────────────── */

/* ── Section assembly ─────────────────────────────────────────────────────── */

export function LandingFeatures({ onPrimary }: { onPrimary: () => void }) {
  return (
    <section className="border-t border-zinc-200/70 bg-[#faf9f6]">
      <div className="mx-auto max-w-7xl px-4 sm:px-8 py-16 md:py-24 flex flex-col gap-16 md:gap-24">
        {/* 01 bookings — split */}
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <div>
            <SectionHeading
              eyebrow="Bookings"
              title={
                <>
                  Appointments that{" "}
                  <span className="font-serif italic font-normal">book themselves.</span>
                </>
              }
              lede="Sparq checks real availability, offers open slots, confirms the booking and syncs it to Google Calendar or Cal.com — all inside WhatsApp."
            />
            <Reveal delay={0.2}>
              <button
                onClick={onPrimary}
                className="group mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-[#14160f]"
              >
                Automate my bookings
                <ArrowUpRight className="size-4 text-[#178a4c] transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </button>
            </Reveal>
          </div>
          <Reveal delay={0.1}>
            <BookingDemo />
          </Reveal>
        </div>

        {/* 02 orders — immersive */}
        <div>
          <div className="max-w-3xl">
            <SectionHeading
              eyebrow="Orders"
              title={
                <>
                  From chat to{" "}
                  <span className="font-serif italic font-normal">checkout.</span>
                </>
              }
              lede="Customers browse your catalog in chat, place orders, and pay through secure links — you watch every step happen live."
            />
          </div>
          <Reveal delay={0.15} className="mt-8">
            <OrdersDemo />
          </Reveal>
        </div>
      </div>
    </section>
  );
}

