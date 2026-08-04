"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  FAQ_DATA,
  featureData,
  INTEGRATIONS,
  STATS,
  WHATSAPP_FLOW,
} from "@/constant";
import { cn } from "@/lib/utils";
import { motion } from "motion/react";
import { ArrowUpRight, PlusIcon, CheckCircle2 } from "lucide-react";
import { Instrument_Serif } from "next/font/google";
import PricingSection from "@/components/pricing-section";
import Feature from "@/components/Features";
import Bentogrid from "@/components/bentogrid/Bentogrid";
import { useRouter } from "next/navigation";
import { useAppSelector } from "@/lib/store";
import WhatsappDemo from "@/components/WhatsappDemo";
import { FeaturesSectionDemo } from "@/components/Tools";

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: ["400"],
  style: ["italic"],
});

export default function LandingPage() {
  const router = useRouter();
  const { isAuthenticated } = useAppSelector((state) => state.auth);

  const handleCTA = () => {
    if (isAuthenticated) {
      router.push("/dashboard");
    } else {
      const backendUrl =
        process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000/api";
      window.location.href = `${backendUrl}/auth/google`;
    }
  };

  const bottomAnimation = {
    initial: { y: "5%", opacity: 0 },
    animate: { y: 0, opacity: 1 },
    transition: { duration: 1, delay: 0.8 },
  };

  return (
    <div>
      {/* ── HERO SECTION ── */}
      <section>
        <div className="w-full min-h-screen relative">
          <div className="relative w-full pt-0 md:pt-20 pb-6 md:pb-10 before:absolute before:w-full before:h-full before:bg-linear-to-r before:from-sky-100 before:via-white before:to-amber-100 before:rounded-full before:top-24 before:blur-3xl before:-z-10 dark:before:from-slate-800 dark:before:via-black dark:before:to-stone-700 dark:before:rounded-full dark:before:blur-3xl dark:before:-z-10">
            <div className="container mx-auto relative z-10">
              <div className="flex flex-col max-w-5xl mx-auto gap-8">
                <div className="relative flex flex-col text-center items-center sm:gap-6 gap-4">
                  <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                  >
                    <Badge
                      variant="outline"
                      className="text-sm h-auto py-1.5 px-4 border-sky-200 dark:border-sky-800 text-sky-700 dark:text-sky-300 bg-sky-50/60 dark:bg-sky-900/20"
                    >
                      Built on WhatsApp Cloud API — Official Meta Partner
                    </Badge>
                  </motion.div>

                  <motion.h1
                    initial={{ opacity: 0, y: 32 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 1, ease: "easeInOut" }}
                    className="lg:text-8xl md:text-7xl text-5xl font-medium leading-14 md:leading-20 lg:leading-24 pt-4"
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
                    Sparq turns your WhatsApp Business account into a revenue
                    machine — automating bookings, orders, payments, and
                    follow-ups so your team can focus on what matters.
                  </motion.p>
                </div>

                <motion.div
                  initial={{ opacity: 0, y: 32 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 1, delay: 0.2, ease: "easeInOut" }}
                  className="flex items-center flex-col md:flex-row justify-center gap-4"
                >
                  <Button
                    id="hero-cta-primary"
                    onClick={handleCTA}
                    className="relative text-sm font-medium rounded-full h-12 p-1 ps-6 pe-14 group transition-all duration-500 hover:ps-14 hover:pe-6 w-fit overflow-hidden cursor-pointer"
                  >
                    <span className="relative z-10 transition-all duration-500">
                      {isAuthenticated ? "Go to Dashboard" : "Start for Free"}
                    </span>
                    <span className="absolute right-1 w-10 h-10 bg-background text-foreground rounded-full flex items-center justify-center transition-all duration-500 group-hover:right-[calc(100%-44px)] group-hover:rotate-45">
                      <ArrowUpRight size={16} />
                    </span>
                  </Button>
                  <Button
                    id="hero-cta-secondary"
                    variant="outline"
                    onClick={() => router.push("/pricing")}
                    className="rounded-full h-12 px-6 text-sm font-medium cursor-pointer"
                  >
                    View Pricing
                  </Button>
                </motion.div>

                {/* Trusted by line */}
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 1, delay: 0.6 }}
                  className="text-xs text-center text-muted-foreground"
                >
                  Trusted by 10,000+ businesses across India &amp; Southeast
                  Asia
                </motion.p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── SOCIAL PROOF STATS BAR ── */}
      <section className="border-y border-border bg-muted/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-10">
          <div className="grid grid-cols-3 md:grid-cols-3 gap-8">
            {STATS.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="flex flex-col items-center text-center gap-1"
              >
                <stat.icon
                  className="size-5 text-sky-500 mb-1"
                  strokeWidth={1.5}
                />
                <p className="text-3xl font-bold tracking-tight">
                  {stat.value}
                </p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES SECTION ── */}
      <Feature featureData={featureData} />

      {/* ── BENTO GRID (HOW IT WORKS) ── */}
      <Bentogrid />

      {/* ── WHATSAPP CHAT SIMULATOR ── */}
      <section className="py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left: Copy */}
            <motion.div
              initial={{ opacity: 0, x: -40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="flex flex-col gap-6"
            >
              <Badge
                variant="outline"
                className="w-fit px-3 py-1 h-auto text-sm"
              >
                Live Automation Preview
              </Badge>
              <h2 className="text-3xl md:text-5xl font-semibold leading-tight">
                Your bot works while{" "}
                <span className={`${instrumentSerif.className}`}>
                  you sleep
                </span>
              </h2>
              <p className="text-muted-foreground text-base leading-relaxed">
                Every incoming WhatsApp message is handled by your custom bot
                flow. Capture leads, collect orders, confirm bookings, and send
                payment links — all without human intervention.
              </p>
              <ul className="flex flex-col gap-3">
                {[
                  "Natural language conversations in any language",
                  "Automatic appointment booking & Google Calendar sync",
                  "Payment links via Stripe or Razorpay in one tap",
                  "CRM auto-updates after every interaction",
                ].map((point) => (
                  <li key={point} className="flex items-start gap-3">
                    <CheckCircle2 className="size-5 text-sky-500 mt-0.5 shrink-0" />
                    <span className="text-sm text-muted-foreground">
                      {point}
                    </span>
                  </li>
                ))}
              </ul>
              <Button
                id="chat-preview-cta"
                onClick={handleCTA}
                className="w-fit rounded-full h-11 px-6 text-sm cursor-pointer"
              >
                Try It Now <ArrowUpRight className="size-4 ml-1" />
              </Button>
            </motion.div>

            {/* Right: Chat Simulator */}
            <WhatsappDemo />
          </div>
        </div>
      </section>

      {/* ── INTEGRATIONS ECOSYSTEM ── */}
      <section className="py-16 md:py-24 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="flex flex-col items-center gap-4 mb-14 text-center"
          >
            <Badge
              variant="outline"
              className="px-3 py-1 h-auto text-sm font-normal"
            >
              Integrations
            </Badge>
            <h2 className="text-3xl md:text-5xl font-semibold">
              Connects with tools you already use
            </h2>
            <p className="text-muted-foreground max-w-xl">
              Sparq plugs into your existing stack — payments, calendars, and
              commerce platforms — so you can go live in minutes, not months.
            </p>
          </motion.div>

          <FeaturesSectionDemo />
        </div>
      </section>

      {/* ── PRICING ── */}
      <PricingSection showComparisonTable={false} />

      {/* ── CTA BANNER ── */}
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
                  <p className="max-w-2xl mx-auto text-muted-foreground">
                    Join 10,000+ businesses already using Sparq to automate
                    their WhatsApp — and watch revenue grow on autopilot.
                  </p>
                </div>
                <div className="flex gap-4 flex-wrap justify-center">
                  <Button
                    id="cta-banner-primary"
                    onClick={handleCTA}
                    className="relative text-sm font-medium rounded-full h-12 p-1 ps-6 pe-14 group transition-all duration-500 hover:ps-14 hover:pe-6 w-fit overflow-hidden hover:bg-primary/80 cursor-pointer"
                  >
                    <span className="relative z-10 transition-all duration-500">
                      {isAuthenticated ? "Go to Dashboard" : "Get Started Free"}
                    </span>
                    <div className="absolute right-1 w-10 h-10 bg-background text-foreground rounded-full flex items-center justify-center transition-all duration-500 group-hover:right-[calc(100%-44px)] group-hover:rotate-45">
                      <ArrowUpRight size={16} />
                    </div>
                  </Button>
                  <Button
                    id="cta-banner-pricing"
                    variant="outline"
                    onClick={() => router.push("/pricing")}
                    className="rounded-full h-12 px-6 text-sm cursor-pointer"
                  >
                    See All Plans
                  </Button>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
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
              Got questions? We&apos;ve got answers ready
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
                    "p-6 border border-border rounded-2xl flex flex-col gap-3 group/item data-open:bg-accent transition-colors animate-in fade-in slide-in-from-bottom-8 duration-700 fill-mode-both",
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
  );
}
