"use client";

import Header from "@/components/header";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FAQ_DATA, navigationData } from "@/constant";
import { cn } from "@/lib/utils";
import { motion } from "motion/react";
import { ArrowUpRight, PlusIcon } from "lucide-react";
import { Instrument_Serif } from "next/font/google";
import PricingSection from "@/components/pricing-section";
import Footer from "@/components/footer";

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: ["400"],
  style: ["italic"],
});

export default function LandingPage() {
  const handleGoogleLogin = () => {
    window.location.href = `${process.env.NEXT_PUBLIC_BACKEND_URL}/auth/google`;
  };

  const bottomAnimation = {
    initial: { y: "5%", opacity: 0 },
    animate: { y: 0, opacity: 1 },
    transition: { duration: 1, delay: 0.8 },
  };

  return (
    <div className="relative min-h-screen bg-black">
      {/* Main Content Wrapper */}
      <div className="relative z-20 bg-background rounded-b-[32px] md:rounded-b-[48px] shadow-[0_20px_50px_-20px_rgba(0,0,0,0.3)] pb-12">
        {/* HEADER */}
        <Header navigationData={navigationData} />

        {/* HERO SECTION */}
        <section>
          <div className="w-full h-screen relative">
            <div className="relative w-full h-scree pt-0 md:pt-20 pb-6 md:pb-10 before:absolute before:w-full before:h-full before:bg-linear-to-r before:from-sky-100 before:via-white before:to-amber-100 before:rounded-full before:top-24 before:blur-3xl before:-z-10 dark:before:from-slate-800 dark:before:via-black dark:before:to-stone-700 dark:before:rounded-full dark:before:blur-3xl dark:before:-z-10">
              <div className="container mx-auto relative z-10">
                <div className="flex flex-col max-w-5xl mx-auto gap-8">
                  <div className="relative flex flex-col text-center items-center sm:gap-6 gap-4">
                    <motion.h1
                      initial={{ opacity: 0, y: 32 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 1, ease: "easeInOut" }}
                      className="lg:text-8xl md:text-7xl text-5xl font-medium leading-14 md:leading-20 lg:leading-24 pt-16"
                    >
                      The Better Way To{" "}
                      <span
                        className={`${instrumentSerif.className} tracking-tight`}
                      >
                        Automate Your Business
                      </span>
                    </motion.h1>
                    <motion.p
                      initial={{ opacity: 0, y: 32 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        duration: 1,
                        delay: 0.1,
                        ease: "easeInOut",
                      }}
                      className="text-base font-normal max-w-2xl text-muted-foreground"
                    >
                      A fully customizable software for businesses to faster the
                      conversion of customers and automate the scheduling of
                      appointments.
                    </motion.p>
                  </div>
                  <motion.div
                    initial={{ opacity: 0, y: 32 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 1, delay: 0.2, ease: "easeInOut" }}
                    className="flex items-center flex-col md:flex-row justify-center gap-8"
                  >
                    <Button className="relative text-sm font-medium rounded-full h-12 p-1 ps-6 pe-14 group transition-all duration-500 hover:ps-14 hover:pe-6 w-fit overflow-hidden cursor-pointer">
                      <span className="relative z-10 transition-all duration-500">
                        Get Started
                      </span>
                      <span className="absolute right-1 w-10 h-10 bg-background text-foreground rounded-full flex items-center justify-center transition-all duration-500 group-hover:right-[calc(100%-44px)] group-hover:rotate-45">
                        <ArrowUpRight size={16} />
                      </span>
                    </Button>
                  </motion.div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* PRICING PAGE */}
        <PricingSection showComparisonTable={false} />

        {/* CTA BUTTON */}
        <section>
          <div className="sm:py-20 py-8">
            <div className="max-w-7xl mx-auto sm:px-16 px-4">
              <div className="relative overflow-hidden min-h-96 flex items-center justify-center px-6 border border-border rounded-3xl before:absolute before:w-full before:h-4/5 before:bg-linear-to-r before:from-sky-100 before:from-15% before:via-white before:via-55% before:to-amber-100 before:to-90% before:rounded-full before:top-24 before:blur-3xl before:-z-10 dark:before:from-sky-400/10 dark:before:from-40% dark:before:via-black dark:before:via-55% dark:before:to-amber-300/10 dark:before:to-60% dark:before:rounded-full dark:before:-z-10">
                <motion.div
                  {...bottomAnimation}
                  className="flex flex-col gap-6 items-center mx-auto"
                >
                  <div className="flex flex-col gap-3 items-center text-center">
                    <h2 className="text-3xl md:text-5xl font-medium">
                      Ready to scale your business?
                    </h2>
                    <p className="max-w-2xl mx-auto">
                      Start your free trial today and see how Sparq can help you
                      streamline your operations and boost your conversions.
                    </p>
                  </div>
                  <Button className="relative text-sm font-medium rounded-full h-12 p-1 ps-6 pe-14 group transition-all duration-500 hover:ps-14 hover:pe-6 w-fit overflow-hidden hover:bg-primary/80 cursor-pointer">
                    <span className="relative z-10 transition-all duration-500">
                      Let's craft together
                    </span>
                    <div className="absolute right-1 w-10 h-10 bg-background text-foreground rounded-full flex items-center justify-center transition-all duration-500 group-hover:right-[calc(100%-44px)] group-hover:rotate-45">
                      <ArrowUpRight size={16} />
                    </div>
                  </Button>
                </motion.div>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 xl:py-24 py-8 flex flex-col gap-16">
            <div className="flex flex-col gap-4 items-center animate-in fade-in slide-in-from-top-10 duration-1000 delay-100 ease-in-out fill-mode-both">
              <Badge
                variant="outline"
                className="text-sm h-auto py-1 px-3 border-0 outline outline-border"
              >
                FAQs
              </Badge>
              <h2 className="text-5xl font-medium text-center max-w-lg">
                Got questions? We’ve got answers ready
              </h2>
            </div>
            <div>
              <Accordion
                type="single"
                collapsible
                className="w-full flex flex-col gap-6"
              >
                {FAQ_DATA.map((faq, index) => (
                  <AccordionItem
                    key={`item-${index}`}
                    value={`item-${index}`}
                    className={cn(
                      "p-6 border border-border rounded-2xl flex flex-col gap-3 group/item data-[open]:bg-accent transition-colors animate-in fade-in slide-in-from-bottom-8 duration-700 fill-mode-both",
                      index === 0 && "delay-100",
                      index === 1 && "delay-200",
                      index === 2 && "delay-300",
                      index === 3 && "delay-400",
                      index === 4 && "delay-500",
                    )}
                  >
                    <AccordionTrigger className="p-0 text-xl font-medium hover:no-underline **:data-[slot=accordion-trigger-icon]:hidden cursor-pointer">
                      {faq.question}
                      <PlusIcon className="w-6 h-6 shrink-0 transition-transform duration-200 group-aria-expanded/accordion-trigger:rotate-45" />
                    </AccordionTrigger>
                    <AccordionContent className="p-0 text-muted-foreground text-base">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </div>
        </section>
      </div>

      {/* FOOTER */}
      <div className="md:sticky md:bottom-0 md:z-10 w-full">
        <Footer />
      </div>
    </div>
  );
}
