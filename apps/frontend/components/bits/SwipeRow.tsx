"use client";

import { useRef, useState } from "react";
import { motion, useMotionValue, useReducedMotion, animate } from "framer-motion";

// ─── SwipeRow — React Bits "swipe row" adaptation ────────────────────────────
// Drag a row to reveal actions (right = primary, left = danger). Pointer
// events cover mouse + touch; actions stay real buttons for keyboard users.

export interface SwipeAction {
  label: string;
  icon?: React.ReactNode;
  tone: "primary" | "danger" | "muted";
  onPress: () => void;
}

const TONES: Record<SwipeAction["tone"], string> = {
  primary: "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900",
  danger: "bg-red-600 text-white",
  muted: "bg-zinc-200 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200",
};

export function SwipeRow({
  children,
  left,
  right,
  maxSwipe = 160,
}: {
  children: React.ReactNode;
  left?: SwipeAction[];
  right?: SwipeAction[];
  maxSwipe?: number;
}) {
  const reduceMotion = useReducedMotion();
  const x = useMotionValue(0);
  const [open, setOpen] = useState<"left" | "right" | null>(null);
  const startX = useRef(0);
  const dragging = useRef(false);

  const snap = (target: number, side: "left" | "right" | null) => {
    setOpen(side);
    if (reduceMotion) {
      x.set(target);
      return;
    }
    animate(x, target, { type: "spring", stiffness: 500, damping: 40 });
  };

  return (
    <div className="relative overflow-hidden rounded-2xl">
      {/* behind: actions */}
      <div className="absolute inset-0 flex items-stretch justify-between">
        <div className="flex items-stretch">
          {(left ?? []).map((a) => (
            <button
              key={a.label}
              onClick={() => {
                a.onPress();
                snap(0, null);
              }}
              className={`flex items-center gap-1.5 px-4 text-sm font-medium ${TONES[a.tone]}`}
            >
              {a.icon}
              {a.label}
            </button>
          ))}
        </div>
        <div className="flex items-stretch">
          {(right ?? []).map((a) => (
            <button
              key={a.label}
              onClick={() => {
                a.onPress();
                snap(0, null);
              }}
              className={`flex items-center gap-1.5 px-4 text-sm font-medium ${TONES[a.tone]}`}
            >
              {a.icon}
              {a.label}
            </button>
          ))}
        </div>
      </div>

      {/* front: draggable content */}
      <motion.div
        style={{ x, touchAction: "pan-y" }}
        className="relative bg-card cursor-grab active:cursor-grabbing"
        onPointerDown={(e) => {
          dragging.current = true;
          startX.current = e.clientX - x.get();
          (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (!dragging.current) return;
          const next = e.clientX - startX.current;
          const lo = right?.length ? -maxSwipe : 0;
          const hi = left?.length ? maxSwipe : 0;
          x.set(Math.max(lo, Math.min(hi, next)));
        }}
        onPointerUp={() => {
          dragging.current = false;
          const v = x.get();
          if (v > maxSwipe * 0.4 && left?.length) snap(maxSwipe, "left");
          else if (v < -maxSwipe * 0.4 && right?.length) snap(-maxSwipe, "right");
          else snap(0, null);
        }}
        onPointerCancel={() => {
          dragging.current = false;
          snap(0, null);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight" && left?.length) snap(maxSwipe, "left");
          if (e.key === "ArrowLeft" && right?.length) snap(-maxSwipe, "right");
          if (e.key === "Escape") snap(0, null);
        }}
        tabIndex={0}
        role="group"
        aria-label="Swipe for actions. Arrow keys reveal actions, Escape closes."
      >
        {children}
      </motion.div>
    </div>
  );
}
