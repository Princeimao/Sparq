"use client";

import { TextAnimate } from "@/components/ui/text-animate";
import { SectionHeading, Reveal } from "./reveal";

const BENEFITS = [
  {
    n: "01",
    title: "Nights, weekends, holidays — covered",
    body: "Most customer messages arrive outside business hours. Sparq answers, books and collects payment while your shutters are down, and hands you a tidy summary in the morning.",
  },
  {
    n: "02",
    title: "Get paid without chasing",
    body: "Send secure Razorpay or Stripe links right inside the chat and get notified the second they're paid. Advances, balances, receipts — handled.",
  },
  {
    n: "03",
    title: "Your data stays yours",
    body: "Customers, conversations and history live in your workspace with industry-standard encryption. Connect your own WhatsApp number — we never hold it hostage.",
  },
];

export function LandingBenefits() {
  return (
    <section className="border-t border-zinc-200/70 bg-[#faf9f6]">
      <div className="mx-auto max-w-7xl px-4 sm:px-8 py-16 md:py-24">
        <SectionHeading
          eyebrow="Why it matters"
          title={
            <>
              Less chasing,{" "}
              <span className="font-serif italic font-normal">more business.</span>
            </>
          }
        />
        <div className="mt-12 grid gap-px overflow-hidden rounded-3xl border border-zinc-200 bg-zinc-200 md:grid-cols-3">
          {BENEFITS.map((b) => (
            <Reveal key={b.n} className="bg-[#faf9f6]">
              <article className="flex h-full flex-col gap-3 p-7 md:p-9">
                <p className="text-xs font-bold tracking-[0.18em] text-[#178a4c]">
                  {b.n}
                </p>
                <h3 className="text-xl font-semibold tracking-tight text-balance">
                  <TextAnimate
                    as="span"
                    by="word"
                    animation="blurInUp"
                    startOnView
                    once
                  >
                    {b.title}
                  </TextAnimate>
                </h3>
                <p className="text-[15px] leading-relaxed text-zinc-600">
                  {b.body}
                </p>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
