"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { PlusIcon } from "lucide-react";
import { FAQ_DATA } from "@/constant";
import { SectionHeading, Reveal } from "./reveal";

export function LandingFaq() {
  return (
    <section id="faq" className="border-t border-zinc-200/70 bg-white">
      <div className="mx-auto max-w-4xl px-4 sm:px-8 py-16 md:py-24">
        <SectionHeading
          align="center"
          eyebrow="Questions"
          title={
            <>
              Asked,{" "}
              <span className="font-serif italic font-normal">answered.</span>
            </>
          }
        />
        <Reveal delay={0.1}>
          <Accordion type="single" collapsible className="mt-10 flex w-full flex-col gap-3">
            {FAQ_DATA.map((faq, index) => (
              <AccordionItem
                key={`item-${index}`}
                value={`item-${index}`}
                className="rounded-2xl border border-zinc-200 px-5 transition-colors data-open:bg-[#faf9f6] data-open:shadow-[0_10px_30px_-20px_rgba(20,22,15,0.3)]"
              >
                <AccordionTrigger className="py-4 text-left text-[15px] font-semibold hover:no-underline [&>svg]:hidden">
                  {faq.question}
                  <PlusIcon className="size-5 shrink-0 text-zinc-400 transition-transform duration-300 [[data-state=open]_&]:rotate-45 [[data-state=open]_&]:text-[#178a4c]" />
                </AccordionTrigger>
                <AccordionContent className="pb-5 text-[15px] leading-relaxed text-zinc-600">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Reveal>
        <p className="mt-6 text-center text-sm text-zinc-500">
          Still curious?{" "}
          <a
            href="mailto:support@sparq.app"
            className="font-medium text-zinc-900 underline decoration-[#178a4c]/50 underline-offset-4 hover:decoration-[#178a4c]"
          >
            Talk to us
          </a>
        </p>
      </div>
    </section>
  );
}

