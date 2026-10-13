"use client";

import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

// ─── SlidePills ──────────────────────────────────────────────────────────────
// Segmented control whose active pill slides between options on a spring —
// the same "buttery" toggle used for the subscription billing cycle.
// One `id` per group so concurrent groups don't share layout animation.

export interface SlidePillOption<T extends string> {
  value: T;
  label: React.ReactNode;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
}

export function SlidePills<T extends string>({
  id,
  options,
  value,
  onChange,
  size = "md",
  tone = "paper",
  className,
}: {
  id: string;
  options: SlidePillOption<T>[];
  value: T;
  onChange: (v: T) => void;
  size?: "sm" | "md";
  tone?: "paper" | "card";
  className?: string;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <div
      role="tablist"
      aria-label={id}
      className={cn(
        "flex p-1 rounded-full w-fit max-w-full overflow-x-auto",
        tone === "paper" ? "bg-ink/[0.05]" : "bg-muted",
        className,
      )}
    >
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              "relative rounded-full font-medium whitespace-nowrap transition-colors duration-200",
              "focus-visible:outline-2 focus-visible:outline-brand focus-visible:outline-offset-2",
              size === "sm"
                ? "px-3 py-1.5 text-xs"
                : "px-4 py-2 text-[13px]",
              active ? "text-white" : "text-ink/55 hover:text-ink",
            )}
          >
            {active && (
              <motion.span
                layoutId={`slide-pill-${id}`}
                transition={
                  reduceMotion
                    ? { duration: 0 }
                    : { type: "spring", stiffness: 500, damping: 38 }
                }
                className="absolute inset-0 rounded-full bg-ink"
              />
            )}
            <span className="relative flex items-center gap-1.5">
              {opt.icon}
              {opt.label}
              {opt.badge}
            </span>
          </button>
        );
      })}
    </div>
  );
}
