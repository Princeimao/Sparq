"use client";

import { useEffect, useRef } from "react";
import { animate, stagger } from "animejs";
import { ArrowUpRight } from "lucide-react";
import { Highlighter } from "@/components/ui/highlighter";
import { TextAnimate } from "@/components/ui/text-animate";
import { usePrefersReducedMotion } from "./reveal";

export function LandingFinal({ onPrimary }: { onPrimary: () => void }) {
  const reduce = usePrefersReducedMotion();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (reduce) return;
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        animate(el.querySelectorAll("[data-final]"), {
          opacity: [0, 1],
          y: [26, 0],
          duration: 800,
          delay: stagger(130),
          ease: "outExpo",
        });
        io.disconnect();
      },
      { threshold: 0.35 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [reduce]);

  return (
    <section className="bg-[#0c2b1d] text-white">
      <div
        ref={ref}
        className="mx-auto flex max-w-7xl flex-col items-start gap-8 px-4 py-20 sm:px-8 md:py-28 lg:flex-row lg:items-end lg:justify-between"
      >
        <div className="max-w-2xl">
          <p
            data-final
            className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-300"
          >
            <span
              aria-hidden
              className="mr-2 inline-block h-px w-6 translate-y-[-3px] bg-current opacity-60"
            />
            Get started
          </p>
          <h2
            data-final
            className="mt-4 text-4xl font-semibold tracking-tight text-balance leading-[1.02] md:text-6xl"
          >
            <TextAnimate as="span" by="word" animation="blurInUp">
              Your best employee
            </TextAnimate>
            <span className="font-serif italic font-normal text-emerald-200">
              <Highlighter action="highlight" color="#178a4c" strokeWidth={2}>
                never sleeps.
              </Highlighter>
            </span>
          </h2>
          <p
            data-final
            className="mt-4 max-w-xl text-base leading-relaxed text-zinc-300 md:text-lg"
          >
            Connect WhatsApp today and wake up to confirmed bookings, paid
            orders and happy customers.
          </p>
        </div>
        <div data-final className="flex flex-wrap items-center gap-3">
          <button
            onClick={onPrimary}
            className="group inline-flex h-13 items-center gap-2 rounded-full bg-white py-2 pl-7 pr-2 text-sm font-semibold text-[#0c2b1d] transition-transform duration-300 hover:scale-[1.03] focus-visible:outline-none"
          >
            Start for free
            <span className="flex size-9 items-center justify-center rounded-full bg-[#0c2b1d] text-white transition-transform duration-300 group-hover:rotate-45">
              <ArrowUpRight className="size-4" />
            </span>
          </button>
          <a
            href="/pricing"
            className="inline-flex h-13 items-center rounded-full px-6 py-2 text-sm font-medium text-zinc-200 ring-1 ring-white/25 transition-colors hover:bg-white/10 hover:text-white"
          >
            See plans
          </a>
        </div>
      </div>
    </section>
  );
}
