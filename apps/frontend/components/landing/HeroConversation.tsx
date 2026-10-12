"use client";

import { useEffect, useRef, useState } from "react";
import { animate } from "animejs";
import { AnimatePresence, motion } from "motion/react";
import {
  BellRing,
  CalendarCheck2,
  CheckCheck,
  CreditCard,
  Inbox,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { usePrefersReducedMotion } from "./reveal";

type Msg = {
  from: "customer" | "bot";
  text: React.ReactNode;
  time: string;
};

const SCRIPT: Msg[] = [
  {
    from: "customer",
    text: "Hi! Do you have a table for 2 this Saturday? 🙏",
    time: "6:02 PM",
  },
  {
    from: "bot",
    text: "Hi Priya! Yes — we have 7:00 PM and 8:30 PM open. Which works for you?",
    time: "6:02 PM",
  },
  { from: "customer", text: "7 works! Table by the window?", time: "6:03 PM" },
  {
    from: "bot",
    text: "Done ✅ Table for 2, Saturday 7:00 PM. A ₹500 advance confirms it:",
    time: "6:03 PM",
  },
  { from: "customer", text: "Paid! See you Saturday 🎉", time: "6:05 PM" },
  {
    from: "bot",
    text: "Confirmed 🎉 Reminder set for Saturday morning. Anything else I can do?",
    time: "6:05 PM",
  },
];

const STAGES = [
  { icon: Inbox, label: "Received" },
  { icon: Sparkles, label: "Understood" },
  { icon: CalendarCheck2, label: "Booked" },
  { icon: CreditCard, label: "Paid" },
];

/**
 * Auto-playing product simulation: a customer conversation that becomes a
 * booking + payment, with the workflow rail lighting up in sync.
 * Static final state when reduced motion is preferred.
 */
export function HeroConversation() {
  const reduce = usePrefersReducedMotion();
  const [step, setStep] = useState(() =>
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? SCRIPT.length
      : 0,
  );
  const [runId, setRunId] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLDivElement>(null);
  const visibleRef = useRef(true);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      ([entry]) => {
        visibleRef.current = entry.isIntersecting;
      },
      { threshold: 0.2 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (reduce) return;
    let i = 0;
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      if (!visibleRef.current) {
        timer = setTimeout(tick, 800);
        return;
      }
      i += 1;
      if (i > SCRIPT.length + 1) {
        timer = setTimeout(() => {
          setRunId((r) => r + 1);
          i = 0;
          setStep(0);
          timer = setTimeout(tick, 600);
        }, 3400);
        return;
      }
      setStep(i);
      timer = setTimeout(tick, i === 1 ? 900 : 1700);
    };
    timer = setTimeout(tick, 900);
    return () => clearTimeout(timer);
  }, [reduce, runId]);

  // Booking card entrance pulse.
  useEffect(() => {
    if (reduce || step < 4) return;
    const el = railRef.current?.querySelector("[data-booking-card]");
    if (!el) return;
    const anim = animate(el, {
      scale: [0.96, 1],
      opacity: [0.4, 1],
      duration: 600,
      ease: "outBack(1.4)",
    });
    return () => {
      anim.revert();
    };
  }, [step, reduce]);

  const stageIndex =
    step <= 0 ? -1 : step <= 2 ? 0 : step <= 3 ? 1 : step <= 4 ? 2 : 3;
  const shown = SCRIPT.slice(0, Math.min(step, SCRIPT.length));

  return (
    <div
      ref={wrapRef}
      className="relative rounded-3xl border border-zinc-200 bg-white shadow-[0_24px_70px_-30px_rgba(20,22,15,0.25)] overflow-hidden"
    >
      {/* window chrome */}
      <div className="flex items-center gap-2 border-b border-zinc-100 px-4 py-2.5">
        <span className="size-2.5 rounded-full bg-zinc-200" />
        <span className="size-2.5 rounded-full bg-zinc-200" />
        <span className="size-2.5 rounded-full bg-[#178a4c]" />
        <span className="ml-2 text-[11px] font-medium text-zinc-500">
          Sparq live — Saturday bookings
        </span>
        <span className="ml-auto flex items-center gap-1.5 text-[11px] text-zinc-500">
          <span className="relative flex size-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#178a4c] opacity-60" />
            <span className="relative inline-flex size-2 rounded-full bg-[#178a4c]" />
          </span>
          Live demo
        </span>
      </div>

      <div className="grid md:grid-cols-[1fr_210px]">
        {/* thread */}
        <div className="bg-[#f3efe7] px-4 py-4 min-h-[380px] flex flex-col gap-2.5">
          <div className="flex items-center gap-2.5 pb-1">
            <span className="flex size-8 items-center justify-center rounded-full bg-[#178a4c] text-white text-xs font-bold">
              S
            </span>
            <div>
              <p className="text-xs font-semibold text-zinc-900">Sparq Bot</p>
              <p className="text-[11px] text-zinc-500">online · replies instantly</p>
            </div>
          </div>
          <AnimatePresence initial={false}>
            {shown.map((m, i) => (
              <motion.div
                key={`${runId}-${i}`}
                initial={
                  reduce
                    ? { opacity: 1 }
                    : { opacity: 0, y: 10, scale: 0.96 }
                }
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
                className={cn(
                  "flex",
                  m.from === "customer" ? "justify-end" : "justify-start",
                )}
              >
                <div
                  className={cn(
                    "max-w-[82%] px-3 py-2 text-[13px] leading-snug shadow-sm",
                    m.from === "customer"
                      ? "rounded-2xl rounded-tr-md bg-[#d9f2e3] text-zinc-900"
                      : "rounded-2xl rounded-tl-md bg-white text-zinc-900",
                  )}
                >
                  <p>{m.text}</p>
                  <p className="mt-1 flex items-center justify-end gap-1 text-[10px] text-zinc-500">
                    {m.time}
                    {m.from === "customer" && (
                      <CheckCheck className="size-3 text-sky-500" />
                    )}
                  </p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {step >= 4 && !reduce && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-start"
            >
              <a
                href="#pricing"
                className="flex items-center gap-2 rounded-2xl rounded-tl-md bg-white px-3 py-2 text-[13px] shadow-sm ring-1 ring-[#178a4c]/30"
              >
                <CreditCard className="size-4 text-[#178a4c]" />
                <span className="font-medium text-zinc-900">
                  pay.sparq.app/t/8F3K2
                </span>
                <span className="rounded-full bg-[#178a4c] px-2 py-0.5 text-[11px] font-semibold text-white">
                  ₹500
                </span>
              </a>
            </motion.div>
          )}
        </div>

        {/* workflow rail */}
        <div
          ref={railRef}
          className="border-t md:border-t-0 md:border-l border-zinc-100 bg-white p-4 flex md:flex-col gap-3"
        >
          <p className="hidden md:block text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
            Workflow
          </p>
          <ol className="flex md:flex-col gap-2.5 flex-1">
            {STAGES.map((s, i) => {
              const active = i <= stageIndex;
              const current = i === stageIndex;
              return (
                <li key={s.label} className="flex items-center gap-2.5">
                  <span
                    className={cn(
                      "flex size-7 shrink-0 items-center justify-center rounded-full border transition-colors duration-500",
                      active
                        ? "border-[#178a4c] bg-[#178a4c] text-white"
                        : "border-zinc-200 text-zinc-400",
                      current && "ring-4 ring-[#178a4c]/15",
                    )}
                  >
                    <s.icon className="size-3.5" />
                  </span>
                  <span
                    className={cn(
                      "text-xs font-medium transition-colors duration-500",
                      active ? "text-zinc-900" : "text-zinc-400",
                    )}
                  >
                    {s.label}
                  </span>
                </li>
              );
            })}
          </ol>
          <div
            data-booking-card
            className={cn(
              "rounded-2xl border p-3 text-xs transition-opacity duration-500",
              step >= 4
                ? "border-[#178a4c]/40 bg-[#f2faf5] opacity-100"
                : "border-zinc-100 opacity-40",
            )}
          >
            <p className="flex items-center gap-1.5 font-semibold text-zinc-900">
              <BellRing className="size-3.5 text-[#178a4c]" />
              Table for 2
            </p>
            <p className="mt-1 text-zinc-600">Sat · 7:00 PM · Window</p>
            <p className="mt-1 font-medium text-zinc-900">Priya Sharma</p>
          </div>
        </div>
      </div>
    </div>
  );
}
