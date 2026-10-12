"use client";

import Image from "next/image";
import { integrations } from "@/constant";
import { SectionHeading, Reveal } from "./reveal";

export function LandingIntegrations() {
  return (
    <section className="border-t border-zinc-200/70 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-8 py-16 md:py-24">
        <SectionHeading
          align="center"
          eyebrow="Plugs in"
          title={
            <>
              Works with your{" "}
              <span className="font-serif italic font-normal">stack.</span>
            </>
          }
          lede="Payments, calendars and storefronts you already use — connected in minutes, not months."
        />
        <Reveal delay={0.15}>
          <ul className="mx-auto mt-10 grid max-w-4xl grid-cols-2 gap-px overflow-hidden rounded-3xl border border-zinc-200 bg-zinc-200 sm:grid-cols-3">
            {integrations.map((item) => (
              <li
                key={item.name}
                className="group flex items-center gap-3.5 bg-white p-5 transition-colors hover:bg-[#f2faf5]"
              >
                <span className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white ring-1 ring-zinc-200">
                  <Image
                    src={item.icon}
                    alt=""
                    width={28}
                    height={28}
                    className="object-contain"
                  />
                </span>
                <span>
                  <span className="block text-sm font-semibold text-zinc-900">
                    {item.name}
                  </span>
                  <span className="block text-xs text-zinc-500">
                    {item.description}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}
