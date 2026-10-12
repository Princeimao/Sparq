"use client";

import React, { useState } from "react";
import { Check, X, ArrowUpRight } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { TextAnimate } from "@/components/ui/text-animate";
import { cn } from "@/lib/utils";
import { comparisonData, PLANS_DATA } from "@/constant";
import { SectionHeading, usePrefersReducedMotion } from "./landing/reveal";

type PricingSectionProps = {
  showComparisonTable?: boolean;
  showFaqs?: boolean;
};

export default function PricingSection({
  showComparisonTable = true,
}: PricingSectionProps) {
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">(
    "monthly",
  );
  const reduce = usePrefersReducedMotion();

  const handleGoogleLogin = () => {
    window.location.href = `${process.env.NEXT_PUBLIC_BACKEND_URL}/auth/google`;
  };

  return (
    <div className="w-full bg-[#faf9f6] text-zinc-900 py-16 md:py-24 px-4 md:px-8">
      <div className="max-w-6xl mx-auto">
        <SectionHeading
          align="center"
          eyebrow="Pricing"
          title={
            <>
              Start free.{" "}
              <TextAnimate
                as="span"
                by="word"
                animation="blurInUp"
                startOnView
                once
                className="font-serif italic font-normal"
                > Grow when ready.</TextAnimate>
            </>
          }
          lede="Transparent INR pricing, billed monthly or yearly. Cancel anytime."
        />

        {/* Billing toggle */}
        <div className="mt-8 flex justify-center">
          <div className="flex items-center gap-1 rounded-full border border-zinc-200 bg-white p-1">
            {(["monthly", "yearly"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setBillingPeriod(p)}
                aria-pressed={billingPeriod === p}
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold transition-all duration-300",
                  billingPeriod === p
                    ? "bg-[#14160f] text-white"
                    : "text-zinc-500 hover:text-zinc-900",
                )}
              >
                {p === "monthly" ? "Monthly" : "Yearly"}
                {p === "yearly" && (
                  <span className="rounded-full bg-[#178a4c] px-1.5 py-0.5 text-[10px] font-bold text-white">
                    -20%
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Cards */}
        <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-3 items-stretch">
          {PLANS_DATA.map((plan, idx) => {
            const featured = plan.recommended;
            const currentPrice =
              billingPeriod === "monthly" ? plan.price : plan.yearlyPrice;
            return (
              <motion.div
                key={plan.name}
                initial={reduce ? false : { opacity: 0, y: 28 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: idx * 0.12, ease: [0.22, 1, 0.36, 1] }}
                className="flex"
              >
                <div
                  className={cn(
                    "relative flex w-full flex-col justify-between overflow-hidden rounded-3xl border p-7 transition-transform duration-300 hover:-translate-y-1",
                    featured
                      ? "border-[#14160f] bg-[#14160f] text-white shadow-[0_24px_60px_-30px_rgba(20,22,15,0.6)]"
                      : "border-zinc-200 bg-white",
                  )}
                >
                  {featured && (
                    <span className="absolute right-5 top-5 rounded-full bg-[#178a4c] px-3 py-1 text-[11px] font-bold text-white">
                      Most popular
                    </span>
                  )}
                  <div>
                    <h3
                      className={cn(
                        "text-lg font-semibold",
                        featured ? "text-white" : "text-zinc-900",
                      )}
                    >
                      {plan.name}
                    </h3>
                    <p
                      className={cn(
                        "mt-1.5 min-h-10 text-[13px] leading-relaxed",
                        featured ? "text-zinc-300" : "text-zinc-500",
                      )}
                    >
                      {plan.description}
                    </p>
                    <div className="mt-5 flex items-baseline gap-1.5">
                      <AnimatePresence mode="wait" initial={false}>
                        <motion.span
                          key={billingPeriod + plan.name}
                          initial={reduce ? false : { opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={reduce ? undefined : { opacity: 0, y: -8 }}
                          transition={{ duration: 0.25 }}
                          className="text-4xl font-bold tracking-tight tabular-nums"
                        >
                          ₹{currentPrice.toLocaleString("en-IN")}
                        </motion.span>
                      </AnimatePresence>
                      <span
                        className={cn(
                          "text-xs font-medium",
                          featured ? "text-zinc-400" : "text-zinc-500",
                        )}
                      >
                        {plan.price === 0
                          ? "forever"
                          : billingPeriod === "monthly"
                            ? "/mo"
                            : "/mo, billed yearly"}
                      </span>
                    </div>
                    {billingPeriod === "yearly" && plan.yearlyBilledAmount > 0 && (
                      <p
                        className={cn(
                          "mt-1 text-xs",
                          featured ? "text-zinc-400" : "text-zinc-400",
                        )}
                      >
                        Billed ₹{plan.yearlyBilledAmount.toLocaleString("en-IN")} annually
                      </p>
                    )}
                    <button
                      onClick={handleGoogleLogin}
                      className={cn(
                        "mt-6 flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-all active:scale-[0.98]",
                        featured
                          ? "bg-[#178a4c] text-white hover:bg-[#12703d]"
                          : "bg-zinc-900 text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900",
                      )}
                    >
                      {plan.cta}
                      <ArrowUpRight className="size-4" />
                    </button>
                    <ul className="mt-6 space-y-3">
                      {plan.features.map((feature) => (
                        <li
                          key={feature}
                          className={cn(
                            "flex items-start gap-2.5 text-[13px] font-medium",
                            featured ? "text-zinc-200" : "text-zinc-600",
                          )}
                        >
                          <Check className="mt-0.5 size-4 shrink-0 text-[#178a4c]" strokeWidth={2.5} />
                          <span>{feature}</span>
                        </li>
                      ))}
                      {plan.notIncluded.map((feature) => (
                        <li
                          key={feature}
                          className="flex items-start gap-2.5 text-[13px] font-medium text-zinc-400"
                        >
                          <X className="mt-0.5 size-4 shrink-0 text-zinc-300" strokeWidth={2} />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Comparison table */}
        {showComparisonTable && (
          <div className="mx-auto mt-20 hidden max-w-5xl md:block">
            <div className="mb-8">
              <h3 className="text-2xl font-semibold tracking-tight">
                Compare plans <span className="font-serif italic font-normal">in detail.</span>
              </h3>
            </div>
            <div className="overflow-hidden rounded-3xl border border-zinc-200 bg-white">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-200">
                    <th className="w-1/3 px-8 py-5 font-semibold text-zinc-700">Feature</th>
                    {["Free", "Growth", "Pro"].map((p) => (
                      <th
                        key={p}
                        className={cn(
                          "w-2/9 px-6 py-5 text-center font-semibold",
                          p === "Growth" ? "bg-[#f2faf5] text-zinc-950" : "text-zinc-700",
                        )}
                      >
                        {p}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(comparisonData).map(([category, rows]) => (
                    <React.Fragment key={category}>
                      <tr className="border-b border-zinc-100 bg-zinc-50/70">
                        <td
                          colSpan={4}
                          className="px-8 py-2.5 text-[11px] font-bold uppercase tracking-wider text-zinc-400"
                        >
                          {category === "storefront" && "Storefront"}
                          {category === "conversations" && "Conversations"}
                          {category === "commerce" && "Commerce"}
                          {category === "analytics" && "Analytics"}
                          {category === "advanced" && "Advanced Features"}
                        </td>
                      </tr>
                      {rows.map((row) => (
                        <tr
                          key={row.feature}
                          className="border-b border-zinc-100 transition-colors last:border-0 hover:bg-zinc-50/50"
                        >
                          <td className="px-8 py-3.5 font-medium text-zinc-700">
                            {row.feature}
                          </td>
                          <td className="px-6 py-3.5 text-center text-zinc-500">
                            {renderComparisonValue(row.free)}
                          </td>
                          <td className="bg-[#f2faf5]/60 px-6 py-3.5 text-center font-semibold text-zinc-950">
                            {renderComparisonValue(row.growth)}
                          </td>
                          <td className="px-6 py-3.5 text-center text-zinc-500">
                            {renderComparisonValue(row.pro)}
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const renderComparisonValue = (
  value: boolean | string | number | undefined,
) => {
  if (typeof value === "boolean") {
    return value ? (
      <Check className="mx-auto size-4 text-[#178a4c]" strokeWidth={2.5} />
    ) : (
      <X className="mx-auto size-4 text-zinc-300" strokeWidth={2} />
    );
  }
  return value ?? "—";
};
