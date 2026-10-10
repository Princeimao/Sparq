"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── JellyRadio — React Bits "jelly radio" adaptation ─────────────────────────
// Options whose selection dot squishes like jelly on pick. Keyboard-native
// (real radios), animated with springs, still on reduced motion.

export interface JellyOption<T extends string> {
  value: T;
  title: string;
  blurb?: string;
}

export function JellyRadioGroup<T extends string>({
  name,
  options,
  value,
  onChange,
  multi,
}: {
  name: string;
  options: JellyOption<T>[];
  value: T | T[] | null;
  onChange: (value: T) => void;
  multi?: boolean;
}) {
  const reduceMotion = useReducedMotion();
  const selected = (v: T) =>
    multi ? (value as T[] | null)?.includes(v) ?? false : value === v;

  return (
    <div role={multi ? "group" : "radiogroup"} aria-label={name} className="divide-y divide-zinc-100">
      {options.map((opt) => {
        const active = selected(opt.value);
        return (
          <label
            key={opt.value}
            className={cn(
              "flex items-center justify-between gap-4 px-1 py-3 cursor-pointer group",
              "focus-within:outline-none focus-within:ring-2 focus-within:ring-zinc-900/10 rounded-lg",
            )}
          >
            <input
              type={multi ? "checkbox" : "radio"}
              name={name}
              value={opt.value}
              checked={active}
              onChange={() => onChange(opt.value)}
              className="sr-only"
            />
            <span className="min-w-0">
              <span className="block text-[15px] font-medium text-zinc-900">
                {opt.title}
              </span>
              {opt.blurb && (
                <span className="block text-[13px] text-zinc-500 mt-0.5 leading-snug">
                  {opt.blurb}
                </span>
              )}
            </span>
            <motion.span
              aria-hidden
              initial={false}
              animate={
                reduceMotion
                  ? {}
                  : active
                    ? { scale: [1.5, 0.85, 1.1, 1] }
                    : { scale: 1 }
              }
              transition={{ duration: 0.45, ease: "easeOut" }}
              className={cn(
                "shrink-0 size-6 rounded-full border-2 flex items-center justify-center transition-colors duration-200",
                active
                  ? "border-zinc-900 bg-zinc-900 text-white"
                  : "border-zinc-300 bg-white group-hover:border-zinc-500",
              )}
            >
              {active && <Check className="size-3.5" strokeWidth={3} />}
            </motion.span>
          </label>
        );
      })}
    </div>
  );
}
