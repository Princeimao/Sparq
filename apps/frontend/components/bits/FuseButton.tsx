"use client";

import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

// ─── FuseButton — React Bits "fuse button" adaptation ─────────────────────────
// Dark CTA wrapped in a slowly orbiting conic "fuse" glow. Pure decoration
// around a real <button>: keyboard, focus ring and disabled states intact.

export function FuseButton({
  children,
  className,
  disabled,
  onClick,
  type = "button",
  ariaLabel,
}: {
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  type?: "button" | "submit";
  ariaLabel?: string;
}) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.button
      type={type}
      disabled={disabled}
      onClick={onClick}
      aria-label={ariaLabel}
      whileTap={reduceMotion || disabled ? undefined : { scale: 0.97 }}
      className={cn(
        "relative rounded-xl p-[1.5px] overflow-hidden",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900/30",
        "disabled:opacity-50 disabled:cursor-not-allowed group",
        className,
      )}
    >
      {/* orbiting fuse glow */}
      <motion.span
        aria-hidden
        className="absolute inset-[-60%] bg-[conic-gradient(from_0deg,transparent_0deg,rgba(255,255,255,0)_300deg,#a5b4fc_330deg,#fff_360deg)] dark:bg-[conic-gradient(from_0deg,transparent_0deg,rgba(255,255,255,0)_300deg,#818cf8_330deg,#fff_360deg)]"
        animate={reduceMotion ? undefined : { rotate: 360 }}
        transition={{ duration: 3.2, repeat: Infinity, ease: "linear" }}
      />
      <span className="absolute inset-[1.5px] rounded-[10px] bg-zinc-900 dark:bg-zinc-100" aria-hidden />
      <span className="relative flex items-center justify-center gap-1.5 rounded-[10px] px-4 py-2 text-sm font-medium text-white dark:text-zinc-900">
        {children}
      </span>
    </motion.button>
  );
}
