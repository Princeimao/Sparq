"use client";

import { motion } from "motion/react";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { Instrument_Serif } from "next/font/google";
import { HeroConversation } from "./HeroConversation";
import { MaskedLines, usePrefersReducedMotion } from "./reveal";
import { Highlighter } from "@/components/ui/highlighter";
import { cn } from "@/lib/utils";

const serif = Instrument_Serif({
  subsets: ["latin"],
  weight: ["400"],
  style: ["italic"],
});

// Stagger container variant for smooth, main-thread-free entrance
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.2,
    },
  },
};

// Item variant offloaded to GPU transforms
const itemVariants = {
  hidden: { opacity: 0, y: 14 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: [0.25, 1, 0.5, 1], // Equivalent to outCubic
    },
  },
};

export function LandingHero({ onPrimary }: { onPrimary: () => void }) {
  const reduce = usePrefersReducedMotion();

  const stepsData = [
    {
      k: "01",
      t: "Customer messages you",
      d: "A natural chat — no apps, no links, no friction.",
    },
    {
      k: "02",
      t: "Sparq does the work",
      d: "Checks availability, books, and collects payment.",
    },
    {
      k: "03",
      t: "You get the outcome",
      d: "Confirmed booking, paid order, updated records.",
    },
  ];

  return (
    <section className="relative overflow-hidden">
      {/* Faint dot texture, paper background */}
      <div
        aria-hidden
        className="absolute inset-0 [background-image:radial-gradient(#14160f14_1px,transparent_1px)] [background-size:22px_22px] [mask-image:radial-gradient(ellipse_75%_60%_at_50%_0%,black,transparent)]"
      />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-8 pt-14 md:pt-24 pb-10 md:pb-16">
        <div className="grid items-end gap-10 lg:grid-cols-12 lg:gap-8">
          {/* Left column: Tagline + CTAs with hardware-accelerated stagger */}
          <motion.div
            variants={reduce ? undefined : containerVariants}
            initial="hidden"
            animate="show"
            className="lg:col-span-4 flex flex-col gap-6"
          >
            <motion.p className="inline-flex w-fit items-center gap-2 rounded-full border border-zinc-200 bg-white px-3.5 py-1.5 text-xs font-medium text-zinc-700 transform-gpu">
              <span className="size-1.5 rounded-full bg-[#178a4c]" />
              Built on the official WhatsApp Cloud API
            </motion.p>

            <motion.p className="max-w-xs text-[15px] leading-relaxed text-zinc-600 transform-gpu">
              Bookings, orders and payments — handled automatically,{" "}
              <Highlighter action="underline" color="#178a4c" strokeWidth={2}>
                around the clock
              </Highlighter>
              .
            </motion.p>

            <motion.div className="flex flex-wrap items-center gap-3 transform-gpu">
              <button
                type="button"
                onClick={onPrimary}
                className="group inline-flex h-12 items-center gap-2 rounded-full bg-[#14160f] pl-6 pr-2 text-sm font-medium text-white transition-colors hover:bg-[#178a4c] focus-visible:outline-none"
              >
                Start for free
                <span className="flex size-9 items-center justify-center rounded-full bg-white/15 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
                  <ArrowUpRight className="size-4" />
                </span>
              </button>
              <a
                href="#how"
                className="group inline-flex h-12 items-center gap-1.5 px-2 text-sm font-medium text-zinc-900"
              >
                See how it works
                <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
              </a>
            </motion.div>

            <motion.ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500 transform-gpu">
              {["Free to start", "No credit card", "INR billing"].map((t) => (
                <li key={t} className="flex items-center gap-1.5">
                  <span
                    aria-hidden
                    className="size-1 rounded-full bg-[#178a4c]"
                  />
                  {t}
                </li>
              ))}
            </motion.ul>
          </motion.div>

          {/* Right column: Headline */}
          <div className="lg:col-span-8">
            <MaskedLines
              className="text-[13vw] sm:text-6xl lg:text-7xl xl:text-[5.4rem] font-semibold tracking-[-0.03em] leading-[0.98] text-[#14160f]"
              lines={[
                <>Your WhatsApp,</>,
                <>
                  put to{" "}
                  <span className={cn(serif.className, "font-normal")}>
                    work.
                  </span>
                </>,
              ]}
            />
          </div>
        </div>

        {/* Product visual section */}
        <div className="mt-10 md:mt-14 grid gap-6 lg:grid-cols-12">
          <div className="lg:col-span-9">
            <HeroConversation />
          </div>

          <motion.div
            variants={reduce ? undefined : containerVariants}
            initial="hidden"
            animate="show"
            className="lg:col-span-3 flex flex-col justify-center gap-5"
          >
            {stepsData.map((s) => (
              <motion.div
                key={s.k}
                className="border-l-2 border-zinc-200 pl-4 transform-gpu"
              >
                <p className="text-[11px] font-semibold tracking-[0.16em] text-[#178a4c]">
                  {s.k}
                </p>
                <p className="mt-1 text-sm font-semibold text-zinc-900">
                  {s.t}
                </p>
                <p className="mt-0.5 text-[13px] leading-relaxed text-zinc-600">
                  {s.d}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
