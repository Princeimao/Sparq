"use client";

// ─── AnimatedList — vendored from Magic UI (via MCP) ─────────────────────────
// Sequentially reveals items with spring pops. `delay` controls pacing;
// `cap` keeps the rail bounded (newest on top).

import React, { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

export function AnimatedListItem({ children }: { children: React.ReactNode }) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      initial={reduceMotion ? { opacity: 0 } : { scale: 0, opacity: 0 }}
      animate={reduceMotion ? { opacity: 1 } : { scale: 1, opacity: 1, originY: 0 }}
      exit={{ scale: 0, opacity: 0 }}
      transition={{ type: "spring", stiffness: 350, damping: 40 }}
      layout
      className="mx-auto w-full"
    >
      {children}
    </motion.div>
  );
}

export function AnimatedList({
  children,
  className,
  delay = 900,
  cap = 6,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  cap?: number;
}) {
  const reduceMotion = useReducedMotion();
  const [index, setIndex] = useState(0);
  const childrenArray = useMemo(() => React.Children.toArray(children), [children]);

  useEffect(() => {
    if (reduceMotion) {
      setIndex(childrenArray.length);
      return;
    }
    if (index >= childrenArray.length) return;
    const timeout = setTimeout(() => setIndex((i) => i + 1), index === 0 ? 250 : delay);
    return () => clearTimeout(timeout);
  }, [index, delay, childrenArray.length, reduceMotion]);

  const itemsToShow = useMemo(() => {
    const result = childrenArray.slice(0, index).reverse();
    return result.slice(0, cap);
  }, [index, childrenArray, cap]);

  return (
    <div className={cn("flex flex-col items-center gap-3", className)}>
      <AnimatePresence initial={false}>
        {itemsToShow.map((item) => (
          <AnimatedListItem key={(item as React.ReactElement).key}>
            {item}
          </AnimatedListItem>
        ))}
      </AnimatePresence>
    </div>
  );
}
