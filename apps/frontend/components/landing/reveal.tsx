"use client";

import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { animate, stagger } from "animejs";
import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

export function usePrefersReducedMotion(): boolean {
  const motionReduce = useReducedMotion();
  const [mediaReduce, setMediaReduce] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = (e: MediaQueryListEvent) => setMediaReduce(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return motionReduce || mediaReduce;
}

/* Scroll-triggered reveal with a soft rise. No-op wrapper when reduced motion. */
export function Reveal({
  children,
  delay = 0,
  y = 24,
  className,
  once = true,
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
  once?: boolean;
}) {
  const reduce = usePrefersReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once, margin: "-80px" }}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* Editorial masked-line headline reveal, choreographed with anime.js. */
export function MaskedLines({
  lines,
  className,
  lineClassName,
  as: Tag = "h1",
  delayStart = 0,
}: {
  lines: ReactNode[];
  className?: string;
  lineClassName?: string;
  as?: "h1" | "h2" | "p";
  delayStart?: number;
}) {
  const reduce = usePrefersReducedMotion();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (reduce) return;
    const el = ref.current;
    if (!el) return;
    const spans = el.querySelectorAll("[data-mask-line] > span");
    if (spans.length === 0) return;
    const anim = animate(spans, {
      y: ["110%", "0%"],
      duration: 900,
      delay: stagger(110, { start: delayStart * 1000 }),
      ease: "outExpo",
    });
    return () => {
      anim.revert();
    };
  }, [reduce, delayStart]);

  return (
    <Tag ref={ref as never} className={className}>
      {lines.map((line, i) => (
        <span key={i} data-mask-line className={cn("mask-line", lineClassName)}>
          <span style={reduce ? undefined : { transform: "translateY(0)" }}>
            {line}
          </span>
        </span>
      ))}
    </Tag>
  );
}

/* Eyebrow + title + lede block shared by sections. */
export function SectionHeading({
  eyebrow,
  title,
  lede,
  align = "left",
  dark = false,
}: {
  eyebrow: string;
  title: ReactNode;
  lede?: ReactNode;
  align?: "left" | "center";
  dark?: boolean;
}) {
  return (
    <div
      className={cn(
        "max-w-3xl",
        align === "center" && "mx-auto text-center items-center",
        "flex flex-col gap-4",
      )}
    >
      <Reveal>
        <p
          className={cn(
            "text-[11px] font-semibold uppercase tracking-[0.18em]",
            dark ? "text-emerald-300" : "text-[#178a4c]",
          )}
        >
          <span aria-hidden className="mr-2 inline-block h-px w-6 translate-y-[-3px] bg-current opacity-60" />
          {eyebrow}
        </p>
      </Reveal>
      <Reveal delay={0.08}>
        <h2 className="text-3xl md:text-5xl font-semibold tracking-tight text-balance leading-[1.05]">
          {title}
        </h2>
      </Reveal>
      {lede ? (
        <Reveal delay={0.16}>
          <p
            className={cn(
              "text-base md:text-lg leading-relaxed max-w-2xl",
              align === "center" && "mx-auto",
              dark ? "text-zinc-300" : "text-zinc-600",
            )}
          >
            {lede}
          </p>
        </Reveal>
      ) : null}
    </div>
  );
}
