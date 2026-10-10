"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Check, X, Flame, PlusIcon, ArrowUpRight } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { comparisonData, PLANS_DATA } from "@/constant";

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

  const handleGoogleLogin = () => {
    window.location.href = `${process.env.NEXT_PUBLIC_BACKEND_URL}/auth/google`;
  };

  return (
    <div className="w-full bg-white text-black py-16 px-4 md:px-8 selection:bg-purple-100 selection:text-purple-900">
      {/* Header and Toggle */}
      <div className="max-w-6xl mx-auto flex flex-col items-center justify-center text-center space-y-6 mb-16">
        <h2 className="text-4xl md:text-6xl font-bold tracking-tight text-zinc-900 leading-[1.1]">
          Choose your Sparq. subscription.
        </h2>
        <p className="text-zinc-500 max-w-2xl text-base md:text-lg">
          Get full access to all apps & features from only{" "}
          <span className="font-semibold text-zinc-950">₹799 per month</span>{" "}
          (billed annually) — Cancel any time.
        </p>

        {/* Billing Period Toggle */}
        <div className="flex items-center gap-2 p-1 bg-zinc-100 rounded-full border border-zinc-200/80 w-fit">
          <button
            onClick={() => setBillingPeriod("monthly")}
            className={cn(
              "px-4 py-2 text-xs font-semibold rounded-full transition-all duration-300",
              billingPeriod === "monthly"
                ? "bg-white text-black shadow-sm"
                : "text-zinc-500 hover:text-zinc-950",
            )}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingPeriod("yearly")}
            className={cn(
              "px-4 py-2 text-xs font-semibold rounded-full transition-all duration-300 flex items-center gap-1.5",
              billingPeriod === "yearly"
                ? "bg-white text-black shadow-sm"
                : "text-zinc-500 hover:text-zinc-950",
            )}
          >
            Yearly
            <span className="px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
              -28%
            </span>
          </button>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch mb-24">
        {PLANS_DATA.map((plan, idx) => {
          const isNormal = plan.name === "Normal";
          const currentPrice =
            billingPeriod === "monthly" ? plan.price : plan.yearlyPrice;
          const billingLabel =
            plan.price === 0
              ? ""
              : billingPeriod === "monthly"
                ? "/mo"
                : "/mo (billed yearly)";

          return (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: idx * 0.15 }}
              className="flex"
            >
              <Card
                className={cn(
                  "w-full rounded-3xl p-8 flex flex-col justify-between border shadow-xs transition-all relative overflow-hidden bg-white",
                  isNormal
                    ? "border-zinc-950 ring-1 ring-zinc-950"
                    : "border-zinc-200 hover:border-zinc-300",
                )}
              >
                {isNormal && (
                  <span className="absolute top-4 right-4 bg-zinc-950 text-white text-[11px] font-bold px-3 py-1 rounded-full flex items-center gap-1">
                    <Flame size={12} className="fill-white" /> Recommended
                  </span>
                )}

                <div>
                  <CardHeader className="p-0 mb-6">
                    <CardTitle className="text-2xl font-bold text-zinc-900">
                      {plan.name}
                    </CardTitle>
                    <CardDescription className="text-zinc-500 mt-2 text-sm">
                      {plan.description}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="p-0">
                    <div className="flex items-baseline gap-1 mb-6">
                      <span className="text-4xl md:text-5xl font-extrabold text-zinc-900">
                        ₹{currentPrice.toLocaleString()}
                      </span>
                      {billingLabel && (
                        <span className="text-zinc-500 text-sm font-medium">
                          {billingLabel}
                        </span>
                      )}
                    </div>

                    {billingPeriod === "yearly" && plan.yearlyBilledAmount && (
                      <p className="text-xs text-zinc-400 font-medium -mt-4 mb-6">
                        Billed ₹{plan.yearlyBilledAmount.toLocaleString()}{" "}
                        annually
                      </p>
                    )}

                    <Button
                      onClick={handleGoogleLogin}
                      className={cn(
                        "w-full h-11 rounded-xl font-semibold flex items-center justify-center gap-2 cursor-pointer shadow-xs transition-all active:scale-98",
                        isNormal
                          ? "bg-zinc-950 hover:bg-zinc-800 text-white"
                          : "bg-white hover:bg-zinc-50 text-zinc-950 border border-zinc-200",
                      )}
                    >
                      {plan.cta}
                      <ArrowUpRight size={16} />
                    </Button>

                    <Separator className="my-6 bg-zinc-100" />

                    <ul className="space-y-4">
                      {plan.features.map((feature) => (
                        <li
                          key={feature}
                          className="flex items-start gap-3 text-sm text-zinc-600 font-medium"
                        >
                          <Check className="size-4 text-emerald-600 shrink-0 mt-0.5" />
                          <span>{feature}</span>
                        </li>
                      ))}
                      {plan.notIncluded.map((feature) => (
                        <li
                          key={feature}
                          className="flex items-start gap-3 text-sm text-zinc-400 font-medium"
                        >
                          <X className="size-4 text-zinc-300 shrink-0 mt-0.5" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </div>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Comparison Table */}
      {showComparisonTable && (
        <div className="max-w-5xl mx-auto mb-24 hidden md:block">
          <div className="text-center md:text-left mb-12">
            <h3 className="text-2xl md:text-3xl font-bold text-zinc-900">
              Compare plans & features
            </h3>
            <p className="text-zinc-500 mt-2">
              Find the right fit for your custom workflows.
            </p>
          </div>

          <div className="border border-zinc-200 rounded-3xl overflow-hidden shadow-xs bg-white">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50/50">
                  <th className="px-8 py-5 font-bold text-zinc-800 w-1/3">
                    Feature
                  </th>

                  <th className="px-6 py-5 font-bold text-zinc-800 w-2/9 text-center">
                    Free
                  </th>

                  <th className="px-6 py-5 font-bold text-zinc-800 w-2/9 text-center bg-zinc-50/30">
                    Growth
                  </th>

                  <th className="px-6 py-5 font-bold text-zinc-800 w-2/9 text-center">
                    Pro
                  </th>
                </tr>
              </thead>

              <tbody>
                {Object.entries(comparisonData).map(([category, rows]) => (
                  <React.Fragment key={category}>
                    {/* Category */}
                    <tr className="bg-zinc-50/80 border-b border-zinc-200">
                      <td
                        colSpan={4}
                        className="px-8 py-3 font-bold text-[11px] text-zinc-400 tracking-wider uppercase"
                      >
                        {category === "storefront" && "Storefront"}

                        {category === "conversations" && "Conversations"}

                        {category === "commerce" && "Commerce"}

                        {category === "analytics" && "Analytics"}

                        {category === "advanced" && "Advanced Features"}
                      </td>
                    </tr>

                    {/* Features */}
                    {rows.map((row) => (
                      <tr
                        key={row.feature}
                        className="border-b border-zinc-100 hover:bg-zinc-50/30 transition-colors"
                      >
                        {/* Feature name */}
                        <td className="px-8 py-4 font-semibold text-zinc-700">
                          {row.feature}
                        </td>

                        {/* Free */}
                        <td className="px-6 py-4 text-center font-medium text-zinc-500">
                          {renderComparisonValue(row.free)}
                        </td>

                        {/* Growth */}
                        <td className="px-6 py-4 text-center font-bold text-zinc-950 bg-zinc-50/10">
                          {renderComparisonValue(row.growth)}
                        </td>

                        {/* Pro */}
                        <td className="px-6 py-4 text-center font-medium text-zinc-500">
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
  );
}

const renderComparisonValue = (
  value: boolean | string | number | undefined,
) => {
  if (typeof value === "boolean") {
    return value ? (
      <Check className="mx-auto size-4 text-emerald-600" strokeWidth={2.5} />
    ) : (
      <X className="mx-auto size-4 text-zinc-300" strokeWidth={2} />
    );
  }

  return value ?? "—";
};
