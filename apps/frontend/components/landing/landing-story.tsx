"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCheck, CreditCard } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/lib/utils";
import { TextAnimate } from "@/components/ui/text-animate";
import { SectionHeading, usePrefersReducedMotion } from "./reveal";

type ChatMsg = {
  from: "customer" | "bot";
  text: string;
  slots?: string[];
  link?: { url: string; amount: string };
};

const SCRIPT: { step: number; messages: ChatMsg[] }[] = [
  {
    step: 0,
    messages: [
      { from: "customer", text: "Hi! Is Sunday brunch still on?" },
      {
        from: "bot",
        text: "Hi Aarav! Yes — we have 11:00 AM and 1:00 PM free this Sunday. Want me to hold one?",
      },
    ],
  },
  {
    step: 1,
    messages: [
      { from: "customer", text: "11 sounds perfect, 4 of us" },
      {
        from: "bot",
        text: "Great — pick a time and I'll lock it in 👇",
        slots: ["11:00 AM", "1:00 PM"],
      },
    ],
  },
  {
    step: 2,
    messages: [
      { from: "customer", text: "Table for 4, Sunday 11:00 AM ✅" },
      {
        from: "bot",
        text: "Locked in 🎉 A ₹500 advance confirms your table:",
        link: { url: "pay.sparq.app/t/9Q2MA", amount: "₹500" },
      },
      { from: "customer", text: "Paid ✅" },
      {
        from: "bot",
        text: "Confirmed! See you Sunday 🎉 Reminder set for the morning.",
      },
    ],
  },
];

const STEPS = [
  {
    id: "message",
    kicker: "Step 01 — Message",
    title: "It starts with a hello",
    body: "A customer texts your business number exactly like they'd text a friend. No app to install, nothing to learn — WhatsApp is already on their phone.",
    outcome: null as null | { label: string; value: string },
  },
  {
    id: "understand",
    kicker: "Step 02 — Understand",
    title: "Sparq reads the intent",
    body: "Your flow parses dates, party size and preferences straight from natural language — then offers real, tappable time slots right inside the chat.",
    outcome: { label: "Intent detected", value: "book_table · party of 4" },
  },
  {
    id: "act",
    kicker: "Step 03 — Act",
    title: "Booked, paid, done",
    body: "One tap books the table. The advance is collected over a secure link, and your calendar, customers and analytics update themselves.",
    outcome: { label: "Completed", value: "booking + ₹500 advance" },
  },
];

export function LandingStory() {
  const reduce = usePrefersReducedMotion();
  const [active, setActive] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const stepRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    if (reduce) return;

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            const idx = Number((e.target as HTMLElement).dataset.stepIdx);
            if (!Number.isNaN(idx)) {
              setActive((prev) => (prev !== idx ? idx : prev));
            }
          }
        }
      },
      { rootMargin: "-30% 0px -30% 0px", threshold: 0.15 },
    );

    stepRefs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, [reduce]);

  const activeStep = reduce ? STEPS.length - 1 : active;

  const visible = useMemo(() => {
    return SCRIPT.filter((s) => s.step <= activeStep).flatMap((s, si) =>
      s.messages.map((m, mi) => ({ ...m, key: `${si}-${mi}` })),
    );
  }, [activeStep]);

  const current = STEPS[activeStep]!;

  const tapSlot = (slot: string) => {
    setPicked(slot);
    setActive(2);
    document.querySelector('[data-step-idx="2"]')?.scrollIntoView({
      behavior: reduce ? "auto" : "smooth",
      block: "center",
    });
  };

  const progressScale = 0.05 + (activeStep / (STEPS.length - 1)) * 0.95;

  return (
    <section
      id="how"
      className="border-t border-zinc-200/70 bg-white overflow-hidden"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16 md:py-24">
        <SectionHeading
          eyebrow="How it works"
          title={
            <>
              One message in,{" "}
              <TextAnimate
                as="span"
                by="word"
                animation="blurInUp"
                startOnView
                once
                className="font-serif italic font-normal"
              >
                business done.
              </TextAnimate>
            </>
          }
          lede="Follow a single Sunday-brunch request as it travels from chat bubble to confirmed, paid booking."
        />

        {/* Layout: Sticky preview on desktop, ordered column on mobile */}
        <div className="mt-8 sm:mt-12 grid gap-8 lg:grid-cols-2 lg:gap-16">
          {/* Conversation Preview - Mobile sticky top header / Desktop side pin */}
          <div className="lg:sticky lg:top-28 self-start z-10">
            <div className="rounded-2xl sm:rounded-3xl border border-zinc-200 bg-[#faf9f6] p-3.5 sm:p-5 shadow-sm">
              <div className="flex flex-col gap-2 sm:gap-2.5 min-h-[260px] sm:min-h-[320px]">
                <AnimatePresence initial={false}>
                  {visible.map((m) => (
                    <motion.div
                      key={m.key}
                      initial={
                        reduce
                          ? { opacity: 1 }
                          : { opacity: 0, y: 8, scale: 0.98 }
                      }
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{
                        type: "spring",
                        stiffness: 400,
                        damping: 28,
                      }}
                      className={cn(
                        "flex transform-gpu",
                        m.from === "customer" ? "justify-end" : "justify-start",
                      )}
                    >
                      <div
                        className={cn(
                          "max-w-[90%] sm:max-w-[85%] px-3 py-2 sm:px-3.5 sm:py-2.5 text-xs sm:text-sm leading-snug shadow-sm",
                          m.from === "customer"
                            ? "rounded-2xl rounded-tr-xs bg-[#d9f2e3] text-zinc-900"
                            : "rounded-2xl rounded-tl-xs bg-white text-zinc-900 ring-1 ring-zinc-200/70",
                        )}
                      >
                        {m.text}
                        {m.from === "customer" && (
                          <span className="ml-1 inline-flex align-middle">
                            <CheckCheck className="size-3.5 text-sky-500" />
                          </span>
                        )}
                        {m.slots && (
                          <span className="mt-2 flex flex-wrap gap-1.5">
                            {m.slots.map((s) => {
                              const chosen =
                                picked === s ||
                                (!picked && s === "11:00 AM" && active >= 2);
                              return (
                                <button
                                  key={s}
                                  type="button"
                                  onClick={() => tapSlot(s)}
                                  aria-pressed={chosen}
                                  className={cn(
                                    "rounded-full px-2.5 py-1 sm:px-3 sm:py-1.5 text-[11px] sm:text-xs font-semibold tabular-nums transition-colors duration-150",
                                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#178a4c]",
                                    chosen
                                      ? "bg-[#178a4c] text-white shadow"
                                      : "bg-[#f2faf5] text-[#178a4c] ring-1 ring-[#178a4c]/40 hover:bg-[#178a4c] hover:text-white",
                                  )}
                                >
                                  {s}
                                </button>
                              );
                            })}
                          </span>
                        )}
                        {m.link && (
                          <a
                            href="#pricing"
                            className="mt-2 flex items-center gap-1.5 sm:gap-2 rounded-xl bg-[#f2faf5] px-2 sm:px-2.5 py-1.5 ring-1 ring-[#178a4c]/30 text-xs sm:text-sm"
                          >
                            <CreditCard className="size-3.5 sm:size-4 shrink-0 text-[#178a4c]" />
                            <span className="truncate font-medium">
                              {m.link.url}
                            </span>
                            <span className="ml-auto shrink-0 rounded-full bg-[#178a4c] px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-[11px] font-semibold text-white">
                              {m.link.amount}
                            </span>
                          </a>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              {/* Status bar - scaled down for compact mobile screens */}
              <div className="mt-3 sm:mt-4 flex items-center justify-between gap-2 rounded-xl sm:rounded-2xl bg-[#14160f] px-3 sm:px-4 py-2.5 sm:py-3 text-white">
                <span className="text-[10px] sm:text-xs font-medium uppercase tracking-[0.12em] text-zinc-400 truncate">
                  {current.outcome ? current.outcome.label : "Listening…"}
                </span>
                <span className="text-xs sm:text-sm font-semibold text-emerald-300 shrink-0">
                  {current.outcome ? current.outcome.value : "—"}
                </span>
              </div>
            </div>
          </div>

          {/* Scrolling Steps Column with Responsive Timeline Offset */}
          <div className="relative flex flex-col gap-5 sm:gap-6 pb-6 pl-10 sm:pl-12">
            {/* Timeline vertical bar adjusted dynamically for mobile alignment */}
            <div
              aria-hidden
              className="absolute left-[18px] sm:left-[22px] top-4 bottom-6 w-px bg-zinc-200"
            >
              <motion.div
                className="h-full w-full origin-top bg-[#178a4c] transform-gpu"
                animate={{ scaleY: progressScale }}
                transition={{ duration: 0.4, ease: "easeOut" }}
              />
            </div>

            {STEPS.map((s, i) => (
              <div
                key={s.id}
                ref={(el) => {
                  stepRefs.current[i] = el;
                }}
                data-step-idx={i}
                className={cn(
                  "relative rounded-2xl sm:rounded-3xl border p-4 sm:p-6 md:p-8 transition-colors duration-300 transform-gpu",
                  reduce || active >= i
                    ? "border-zinc-200 bg-[#faf9f6]"
                    : "border-zinc-100 bg-white opacity-60",
                )}
              >
                {/* Step badge positioned smoothly outside card edge without overflow truncation */}
                <span
                  className={cn(
                    "absolute -left-10 sm:-left-12 top-6 sm:top-8 flex size-9 sm:size-11 -translate-x-1/2 items-center justify-center rounded-full border text-xs sm:text-sm font-bold transition-colors duration-300 shadow-xs",
                    reduce || active >= i
                      ? "border-[#178a4c] bg-[#178a4c] text-white"
                      : "border-zinc-200 bg-white text-zinc-400",
                  )}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>

                <div>
                  <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.14em] text-[#178a4c]">
                    {s.kicker}
                  </p>
                  <h3 className="mt-1 sm:mt-2 text-lg sm:text-2xl font-semibold tracking-tight text-zinc-900">
                    {s.title}
                  </h3>
                  <p className="mt-1.5 sm:mt-2 text-xs sm:text-[15px] leading-relaxed text-zinc-600">
                    {s.body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
