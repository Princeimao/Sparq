"use client";

import { useEffect, useRef } from "react";
import { animate, stagger } from "animejs";
import { CalendarCheck2, MessagesSquare, Plug2 } from "lucide-react";
import { SectionHeading, usePrefersReducedMotion } from "./reveal";

const STEPS = [
  {
    icon: Plug2,
    n: "01",
    title: "Connect WhatsApp",
    body: "Link your Meta WhatsApp Business account in minutes with guided setup. Your number, your customers.",
  },
  {
    icon: MessagesSquare,
    n: "02",
    title: "Teach it your business",
    body: "Add services, hours, tables and payment links. Or start from a template built for salons, clinics, restaurants and stores.",
  },
  {
    icon: CalendarCheck2,
    n: "03",
    title: "Let it run",
    body: "Bookings confirm themselves, orders get paid, reminders go out. You step in only when you want to.",
  },
];

export function LandingHow() {
  const reduce = usePrefersReducedMotion();
  const lineRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (reduce) return;
    const wrap = wrapRef.current;
    const line = lineRef.current;
    if (!wrap || !line) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        animate(line, {
          scaleX: [0, 1],
          duration: 1400,
          ease: "outExpo",
        });
        const cards = wrap.querySelectorAll("[data-how-card]");
        animate(cards, {
          opacity: [0, 1],
          y: [22, 0],
          duration: 650,
          delay: stagger(220, { start: 200 }),
          ease: "outCubic",
        });
        io.disconnect();
      },
      { threshold: 0.25 },
    );
    io.observe(wrap);
    return () => io.disconnect();
  }, [reduce]);

  return (
    <section id="how" className="border-t border-zinc-200/70 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-8 py-16 md:py-24">
        <SectionHeading
          eyebrow="Setup"
          title={
            <>
              Live before{" "}
              <span className="font-serif italic font-normal">lunch.</span>
            </>
          }
          lede="Three steps, no developers, no hardware. Most businesses send their first automated booking the same day."
        />
        <div ref={wrapRef} className="relative mt-12">
          <div
            aria-hidden
            className="absolute left-0 right-0 top-7 hidden h-px bg-zinc-200 md:block"
          >
            <div
              ref={lineRef}
              className="h-full w-full origin-left bg-[#178a4c]"
              style={reduce ? undefined : { transform: "scaleX(1)" }}
            />
          </div>
          <ol className="grid gap-10 md:grid-cols-3 md:gap-6">
            {STEPS.map((s) => (
              <li key={s.n} data-how-card className="relative">
                <span className="relative z-10 flex size-14 items-center justify-center rounded-2xl border border-zinc-200 bg-white shadow-sm">
                  <s.icon className="size-6 text-[#178a4c]" />
                </span>
                <p className="mt-5 text-[11px] font-semibold tracking-[0.16em] text-zinc-400">
                  {s.n}
                </p>
                <h3 className="mt-1.5 text-xl font-semibold tracking-tight">
                  {s.title}
                </h3>
                <p className="mt-2 max-w-sm text-[15px] leading-relaxed text-zinc-600">
                  {s.body}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
