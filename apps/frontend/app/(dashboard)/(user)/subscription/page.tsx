"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { PLANS_DATA, FAQ_DATA } from "@/constant";
import { toast } from "sonner";
import {
  Check,
  Zap,
  Sparkles,
  CreditCard,
  Download,
  Calendar,
  MessageSquare,
  Workflow,
  ShoppingBag,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function SubscriptionPage() {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("yearly");
  const [currentPlan, setCurrentPlan] = useState<string>("Normal");
  const [upgrading, setUpgrading] = useState<string | null>(null);

  const handleUpgrade = (planName: string) => {
    setUpgrading(planName);
    setTimeout(() => {
      setCurrentPlan(planName);
      setUpgrading(null);
      toast.success(`Subscribed to ${planName} Plan! Billing schedule updated.`);
    }, 1200);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-10">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Subscription & Billing</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your Sparq plan, view monthly usage meters, and download invoice history.
          </p>
        </div>
        <div className="flex items-center gap-3 bg-muted/40 p-1.5 rounded-xl border">
          <button
            onClick={() => setBillingCycle("monthly")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              billingCycle === "monthly" ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Monthly Billing
          </button>
          <button
            onClick={() => setBillingCycle("yearly")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
              billingCycle === "yearly" ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Yearly (Save 28%)
            <Badge variant="secondary" className="bg-emerald-500 text-white text-[9px] px-1 py-0 border-none">
              Save
            </Badge>
          </button>
        </div>
      </motion.div>

      {/* Usage Overview Bar */}
      <Card className="bg-gradient-to-r from-primary/5 via-blue-500/5 to-purple-500/5 border-primary/20">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="size-4 text-primary fill-primary" /> Current Tier: {currentPlan} Plan
            </CardTitle>
            <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30">Active</Badge>
          </div>
          <CardDescription>Your next billing date is September 10, 2026.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-2">
          {/* Meter 1: WhatsApp Messages */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <MessageSquare className="size-3.5 text-blue-500" /> WhatsApp Messages
              </span>
              <span className="font-semibold">4,280 / 10,000</span>
            </div>
            <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
              <div className="h-full bg-blue-500 rounded-full" style={{ width: "42%" }} />
            </div>
          </div>

          {/* Meter 2: Active Workflows */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <Workflow className="size-3.5 text-purple-500" /> Active Automation Flows
              </span>
              <span className="font-semibold">6 / 15</span>
            </div>
            <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
              <div className="h-full bg-purple-500 rounded-full" style={{ width: "40%" }} />
            </div>
          </div>

          {/* Meter 3: Catalog Items */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <ShoppingBag className="size-3.5 text-amber-500" /> Products & Services
              </span>
              <span className="font-semibold">28 / Unlimited</span>
            </div>
            <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
              <div className="h-full bg-amber-500 rounded-full" style={{ width: "15%" }} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Subscription Plans */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold tracking-tight">Available Subscription Plans</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PLANS_DATA.map((plan) => {
            const isCurrent = currentPlan === plan.name;
            const displayPrice =
              billingCycle === "yearly" ? plan.yearlyPrice : plan.price;

            return (
              <Card
                key={plan.name}
                className={`relative flex flex-col justify-between transition-all duration-300 ${
                  plan.recommended
                    ? "border-2 border-primary shadow-lg scale-[1.02] bg-gradient-to-b from-primary/5 to-transparent"
                    : "hover:border-primary/50"
                }`}
              >
                {plan.recommended && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs px-3">
                    Most Popular
                  </Badge>
                )}

                <CardHeader>
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  <CardDescription className="text-xs min-h-[36px]">
                    {plan.description}
                  </CardDescription>
                  <div className="pt-4 flex items-baseline gap-1">
                    <span className="text-3xl font-extrabold">₹{displayPrice}</span>
                    <span className="text-xs text-muted-foreground">/ month</span>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3 flex-1 pt-2">
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Included Features
                  </div>
                  <ul className="space-y-2 text-xs">
                    {plan.features.map((feat) => (
                      <li key={feat} className="flex items-start gap-2">
                        <Check className="size-3.5 text-emerald-500 shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>

                <CardFooter className="pt-4 border-t mt-auto">
                  <Button
                    onClick={() => handleUpgrade(plan.name)}
                    disabled={isCurrent || upgrading === plan.name}
                    variant={isCurrent ? "outline" : plan.recommended ? "default" : "secondary"}
                    className="w-full py-5 rounded-xl font-medium"
                  >
                    {upgrading === plan.name ? (
                      <span className="size-4 animate-spin border-2 border-current border-t-transparent rounded-full" />
                    ) : isCurrent ? (
                      "Current Plan"
                    ) : (
                      `Upgrade to ${plan.name}`
                    )}
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Invoice History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <CreditCard className="size-4 text-primary" /> Billing & Payment Invoices
          </CardTitle>
          <CardDescription>Past receipts and invoice history for your account.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { id: "INV-2026-008", date: "Aug 10, 2026", amount: "₹799.00", status: "Paid" },
              { id: "INV-2026-007", date: "Jul 10, 2026", amount: "₹799.00", status: "Paid" },
              { id: "INV-2026-006", date: "Jun 10, 2026", amount: "₹799.00", status: "Paid" },
            ].map((inv) => (
              <div
                key={inv.id}
                className="flex items-center justify-between p-3 rounded-xl border bg-muted/20 hover:bg-muted/40 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600">
                    <ShieldCheck className="size-4" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold">{inv.id}</p>
                    <p className="text-[11px] text-muted-foreground">{inv.date}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-xs font-mono font-bold">{inv.amount}</span>
                  <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                    {inv.status}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => toast.success(`Downloading invoice ${inv.id}...`)}
                    className="size-8 rounded-lg"
                  >
                    <Download className="size-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
