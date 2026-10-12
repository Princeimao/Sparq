"use client";

import { useEffect, useRef } from "react";
import { animate } from "animejs";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * Lightweight celebration burst — absolutely-positioned dots fired outward
 * with anime.js. No extra dependencies; respects reduced motion.
 */
export function Celebration({
  burstKey,
  colors = ["#178a4c", "#a7f3d0", "#14160f", "#fbbf24"],
  count = 26,
  className,
}: {
  burstKey: number;
  colors?: string[];
  count?: number;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (reduceMotion || burstKey === 0) return;
    const root = rootRef.current;
    if (!root) return;
    const dots = root.querySelectorAll("[data-confetti-dot]");
    if (dots.length === 0) return;
    const anim = animate(dots, {
      translateX: () => Math.random() * 260 - 130,
      translateY: () => Math.random() * 190 - 130,
      scale: [1, 0],
      opacity: [1, 0],
      duration: () => 700 + Math.random() * 500,
      ease: "outCubic",
    });
    return () => {
      anim.revert();
    };
  }, [burstKey, reduceMotion]);

  if (reduceMotion) return null;

  return (
    <div
      ref={rootRef}
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 flex items-center justify-center overflow-visible",
        className,
      )}
    >
      {Array.from({ length: count }).map((_, i) => (
        <span
          key={`${burstKey}-${i}`}
          data-confetti-dot
          className="absolute size-1.5 rounded-full"
          style={{
            backgroundColor: colors[i % colors.length],
            borderRadius: i % 3 === 0 ? "50%" : "2px",
          }}
        />
      ))}
    </div>
  );
}

/** Animated success check — SVG stroke draw + spring pop. */
export function SuccessCheck({ size = 72 }: { size?: number }) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.span
      initial={reduceMotion ? false : { scale: 0.4, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 320, damping: 18 }}
      className="relative inline-flex items-center justify-center rounded-full bg-brand"
      style={{ width: size, height: size }}
      aria-hidden
    >
      <Celebration burstKey={1} className="[&>div]:static" />
      <svg width={size * 0.44} height={size * 0.44} viewBox="0 0 24 24" fill="none">
        <motion.path
          d="M4 12.5l5 5L20 6.5"
          stroke="white"
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={reduceMotion ? false : { pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.5, delay: 0.15, ease: "easeOut" }}
        />
      </svg>
    </motion.span>
  );
}

/** Small step dots with an animated connector, for wizard headers. */
export function StepDots({
  total,
  current,
}: {
  total: number;
  current: number;
}) {
  return (
    <div className="flex items-center gap-1.5" aria-hidden>
      {Array.from({ length: total }).map((_, i) => (
        <span key={i} className="flex items-center gap-1.5">
          <motion.span
            animate={
              i === current
                ? { scale: [1, 1.35, 1] }
                : {}
            }
            transition={{ duration: 0.4 }}
            className={cn(
              "size-2 rounded-full transition-colors duration-300",
              i < current
                ? "bg-brand"
                : i === current
                  ? "bg-ink"
                  : "bg-zinc-300",
            )}
          />
          {i < total - 1 && (
            <span
              className={cn(
                "h-px w-5 transition-colors duration-300",
                i < current ? "bg-brand" : "bg-zinc-300",
              )}
            />
          )}
        </span>
      ))}
    </div>
  );
}

/** Inline field error with a shake nudge. */
export function FieldError({ message }: { message: string | null }) {
  const reduceMotion = useReducedMotion();
  if (!message) return null;
  return (
    <motion.p
      key={message}
      initial={reduceMotion ? false : { opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      role="alert"
      className="text-xs font-medium text-destructive"
    >
      {message}
    </motion.p>
  );
}
