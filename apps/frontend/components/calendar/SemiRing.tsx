"use client";

import { useEffect, useRef } from "react";
import { animate } from "animejs";
import { useReducedMotion } from "framer-motion";
import { NumberTicker } from "@/components/bits/NumberTicker";

// ─── SemiRing — day-load gauge for the calendar rail ─────────────────────────
// Booked minutes vs open minutes, animated sweep on mount/update.

export function SemiRing({
  percent,
  label,
  sublabel,
}: {
  percent: number; // 0..100
  label: string;
  sublabel: string;
}) {
  const reduceMotion = useReducedMotion();
  const arcRef = useRef<SVGPathElement>(null);
  const R = 70;
  const CIRC = Math.PI * R;

  useEffect(() => {
    const el = arcRef.current;
    if (!el) return;
    const target = CIRC * (1 - Math.min(100, Math.max(0, percent)) / 100);
    if (reduceMotion) {
      el.style.strokeDashoffset = String(target);
      return;
    }
    const anim = animate(el, {
      strokeDashoffset: [CIRC, target],
      duration: 1100,
      ease: "outCubic",
    });
    return () => {
      anim.revert();
    };
  }, [percent, reduceMotion]);

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 160 92" className="w-40" role="img" aria-label={`${label}: ${Math.round(percent)} percent`}>
        {/* segmented track */}
        {Array.from({ length: 12 }).map((_, i) => {
          const angle = (Math.PI * i) / 11;
          const x1 = 80 - Math.cos(angle) * (R + 8);
          const y1 = 84 - Math.sin(angle) * (R + 8);
          const x2 = 80 - Math.cos(angle) * (R - 8);
          const y2 = 84 - Math.sin(angle) * (R - 8);
          return (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              strokeWidth={7}
              strokeLinecap="round"
              className="stroke-zinc-200 dark:stroke-zinc-800"
            />
          );
        })}
        <path
          ref={arcRef}
          d={`M ${80 - R} 84 A ${R} ${R} 0 0 1 ${80 + R} 84`}
          fill="none"
          strokeWidth={9}
          strokeLinecap="round"
          className="stroke-zinc-900 dark:stroke-zinc-100"
          strokeDasharray={CIRC}
          strokeDashoffset={CIRC}
        />
      </svg>
      <p className="-mt-9 text-3xl font-bold tracking-tight tabular-nums">
        <NumberTicker value={Math.round(percent)} />%
      </p>
      <p className="text-xs font-medium mt-0.5">{label}</p>
      <p className="text-[11px] text-muted-foreground">{sublabel}</p>
    </div>
  );
}
