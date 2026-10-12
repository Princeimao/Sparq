"use client";

import { useEffect, useRef } from "react";
import { animate, stagger } from "animejs";
import {
  CalendarCheck2,
  MessageSquare,
  ShoppingBag,
  TrendingUp,
} from "lucide-react";
import { SectionHeading, usePrefersReducedMotion } from "./reveal";
import { TextAnimate } from "@/components/ui/text-animate";

const BARS = [38, 62, 45, 78, 56, 88, 70, 96, 64, 82, 58, 74];

function MiniDashboard() {
  const reduce = usePrefersReducedMotion();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (reduce) return;
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        const bars = el.querySelectorAll("[data-bar]");
        animate(bars, {
          scaleY: [0.05, 1],
          duration: 800,
          delay: stagger(60),
          ease: "outExpo",
        });
        const panel = el.querySelector("[data-panel]");
        if (panel) {
          animate(panel, {
            opacity: [0, 1],
            y: [40, 0],
            duration: 900,
            ease: "outExpo",
          });
        }
        io.disconnect();
      },
      { threshold: 0.3 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [reduce]);

  return (
    <div ref={ref} className="overflow-hidden rounded-3xl ring-1 ring-white/15">
      <div
        data-panel
        className="bg-[#15170f] text-white"
        style={reduce ? undefined : { opacity: 1 }}
      >
        {/* chrome */}
        <div className="flex items-center gap-2 border-b border-white/10 px-4 py-2.5">
          <span className="size-2.5 rounded-full bg-white/15" />
          <span className="size-2.5 rounded-full bg-white/15" />
          <span className="size-2.5 rounded-full bg-emerald-400" />
          <span className="ml-2 text-[11px] text-zinc-400">
            Sparq dashboard — this week
          </span>
        </div>
        <div className="grid sm:grid-cols-[180px_1fr]">
          {/* mini sidebar */}
          <div className="hidden border-r border-white/10 p-3 sm:block">
            {["Dashboard", "Calendar", "Customers", "Orders", "Flows"].map(
              (item, i) => (
                <p
                  key={item}
                  className={
                    i === 0
                      ? "rounded-lg bg-white/10 px-2.5 py-1.5 text-xs font-medium text-white"
                      : "rounded-lg px-2.5 py-1.5 text-xs text-zinc-400"
                  }
                >
                  {item}
                </p>
              ),
            )}
          </div>
          <div className="p-4">
            {/* stat row */}
            <div className="grid grid-cols-3 gap-2.5">
              {[
                { icon: ShoppingBag, v: "128", l: "Orders" },
                { icon: CalendarCheck2, v: "64", l: "Bookings" },
                { icon: MessageSquare, v: "2.1k", l: "Chats" },
              ].map((s) => (
                <div
                  key={s.l}
                  className="rounded-xl bg-white/[0.06] p-3 ring-1 ring-white/10"
                >
                  <s.icon className="size-4 text-emerald-300" />
                  <p className="mt-1.5 text-lg font-bold tabular-nums">{s.v}</p>
                  <p className="text-[11px] text-zinc-400">{s.l}</p>
                </div>
              ))}
            </div>
            {/* bars */}
            <div className="mt-3 rounded-xl bg-white/[0.06] p-4 ring-1 ring-white/10">
              <p className="flex items-center gap-1.5 text-xs font-medium text-zinc-300">
                <TrendingUp className="size-3.5 text-emerald-300" />
                Revenue this week
              </p>
              <div className="mt-3 flex h-24 items-end gap-1.5">
                {BARS.map((h, i) => (
                  <span
                    key={i}
                    data-bar
                    style={{ height: `${h}%` }}
                    className="flex-1 origin-bottom rounded-sm bg-gradient-to-t from-emerald-500/40 to-emerald-300"
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function LandingShowcase() {
  return (
    <section className="bg-[#14160f] text-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-8 py-16 md:py-24 grid items-center gap-12 lg:grid-cols-2">
        <div>
          <SectionHeading
            dark
            eyebrow="Command center"
            title={
              <>
                Your whole business,{" "}
                <TextAnimate
                  as="span"
                  by="word"
                  animation="blurInUp"
                  startOnView
                  once
                  className="font-serif italic font-normal"
                  > one glance.</TextAnimate>
              </>
            }
            lede="Every chat, booking, order and payment lands in a single dashboard. No tab-switching between five tools to answer one question."
          />
          <ul className="mt-8 flex flex-col gap-4">
            {[
              ["Live pipeline", "See conversations turn into bookings and revenue as they happen."],
              ["Customer memory", "Preferences, history and addresses travel with every customer."],
              ["Team-ready", "Staff, tables and rooms share one calendar — no double bookings."],
            ].map(([t, d]) => (
              <li key={t} className="flex gap-3.5">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-emerald-400" />
                <div>
                  <p className="text-[15px] font-semibold">{t}</p>
                  <p className="mt-0.5 text-sm leading-relaxed text-zinc-400">{d}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <MiniDashboard />
      </div>
    </section>
  );
}
