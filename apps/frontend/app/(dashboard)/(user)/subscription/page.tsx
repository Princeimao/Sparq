"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  Check,
  Zap,
  CreditCard,
  Download,
  ShieldCheck,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  cancelSubscription,
  changePlan,
  formatINR,
  getPayments,
  getPlans,
  getSubscription,
  isCheckoutResult,
  openRazorpayCheckout,
  startSubscription,
  verifySubscriptionPayment,
  type BillingInterval,
  type Payment,
  type Plan,
  type PlanId,
  type Subscription,
} from "@/lib/billing";

export default function SubscriptionPage() {
  return (
    <Suspense>
      <SubscriptionInner />
    </Suspense>
  );
}

function SubscriptionInner() {
  const searchParams = useSearchParams();
  // Plan preselected during signup onboarding (?plan=GROWTH).
  const requestedPlan = (["FREE", "GROWTH", "PRO"] as const).find(
    (p) => p === searchParams.get("plan"),
  );
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("yearly");
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);

  const interval: BillingInterval = billingCycle === "yearly" ? "YEARLY" : "MONTHLY";

  const refresh = useCallback(async () => {
    const [fetchedPlans, fetchedSub, fetchedPayments] = await Promise.all([
      getPlans(),
      getSubscription(),
      getPayments(10).catch(() => [] as Payment[]),
    ]);
    setPlans(fetchedPlans);
    setSubscription(fetchedSub);
    setPayments(fetchedPayments);
  }, []);

  useEffect(() => {
    refresh()
      .catch(() => toast.error("Failed to load billing information"))
      .finally(() => setLoading(false));
  }, [refresh]);

  // Scroll a plan chosen during onboarding into view.
  useEffect(() => {
    if (!loading && requestedPlan) {
      document
        .getElementById(`plan-${requestedPlan}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [loading, requestedPlan]);

  const completeCheckout = async (plan: Plan, planId: PlanId) => {
    // Create (or change to) the subscription server-side, then open
    // Razorpay Checkout with the IDs the API returns.
    const isChange =
      subscription != null && !(subscription.plan === "FREE" && planId !== "FREE");
    const result = isChange
      ? await changePlan(planId, interval)
      : await startSubscription(planId as Exclude<PlanId, "FREE">, interval);

    if (!isCheckoutResult(result)) {
      setSubscription(result.subscription);
      toast.success(`Subscribed to ${plan.name} plan`);
      setActing(null);
      return;
    }

    await openRazorpayCheckout({
      key: result.razorpayKeyId,
      subscriptionId: result.razorpaySubscriptionId,
      description: `${plan.name} plan (${billingCycle})`,
      onSuccess: async (response) => {
        try {
          const verified = await verifySubscriptionPayment(response);
          setSubscription(verified.subscription);
          toast.success(`Subscribed to ${plan.name} plan!`);
        } catch {
          toast.error("Payment verification failed. Contact support.");
        } finally {
          setActing(null);
          refresh().catch(() => {});
        }
      },
      onDismiss: () => {
        setActing(null);
        refresh().catch(() => {});
      },
    });
  };

  const handleSelectPlan = async (plan: Plan) => {
    if (subscription && subscription.plan === plan.id && subscription.interval === interval) return;
    setActing(plan.id);
    try {
      if (plan.id === "FREE") {
        const res = await changePlan("FREE", interval);
        setSubscription(res.subscription);
        toast.success("Downgraded to Free. Takes effect at period end.");
      } else {
        await completeCheckout(plan, plan.id);
      }
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        "Could not update subscription";
      toast.error(message);
      setActing(null);
    }
  };

  const handleCancel = async () => {
    if (!confirm("Cancel your subscription at the end of the billing period?")) return;
    setActing("cancel");
    try {
      const res = await cancelSubscription(true);
      setSubscription(res.subscription);
      toast.success("Subscription will cancel at period end");
    } catch {
      toast.error("Failed to cancel subscription");
    } finally {
      setActing(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const currentPlanName = subscription?.plan ?? "FREE";
  const isActive = subscription?.status === "ACTIVE" || subscription?.status === "PENDING";

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
            Manage your Sparq plan and view invoice history.
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
            Yearly (Save 20%)
            <Badge variant="secondary" className="bg-emerald-500 text-white text-[9px] px-1 py-0 border-none">
              Save
            </Badge>
          </button>
        </div>
      </motion.div>

      {/* Current subscription status */}
      <Card className="bg-gradient-to-r from-primary/5 via-blue-500/5 to-purple-500/5 border-primary/20">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="size-4 text-primary fill-primary" /> Current Tier: {currentPlanName} Plan
            </CardTitle>
            <Badge className={isActive ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30" : "bg-amber-500/10 text-amber-600 border-amber-500/30"}>
              {subscription?.status ?? "FREE"}
            </Badge>
          </div>
          <CardDescription>
            {subscription?.cancelAtPeriodEnd
              ? `Cancels at period end (${new Date(subscription.currentPeriodEnd).toLocaleDateString()}).`
              : subscription?.currentPeriodEnd
                ? `Your next billing date is ${new Date(subscription.currentPeriodEnd).toLocaleDateString()}.`
                : "You are on the Free plan."}
          </CardDescription>
        </CardHeader>
        {subscription && subscription.plan !== "FREE" && !subscription.cancelAtPeriodEnd && (
          <CardContent>
            <Button variant="outline" size="sm" onClick={handleCancel} disabled={acting === "cancel"}>
              {acting === "cancel" ? <Loader2 className="size-4 animate-spin" /> : "Cancel subscription"}
            </Button>
          </CardContent>
        )}
      </Card>

      {/* Subscription Plans */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold tracking-tight">Available Subscription Plans</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => {
            const isCurrent = subscription?.plan === plan.id && (plan.id === "FREE" || subscription.interval === interval);
            const highlighted = requestedPlan === plan.id && !isCurrent;
            const displayPaise = billingCycle === "yearly" ? plan.yearlyPricePaisePerMonth : plan.monthlyPricePaise;

            return (
              <Card
                key={plan.id}
                id={`plan-${plan.id}`}
                className={`relative flex flex-col justify-between transition-all duration-300 scroll-mt-24 ${
                  highlighted
                    ? "border-2 border-zinc-900 shadow-lg scale-[1.02]"
                    : plan.recommended
                      ? "border-2 border-primary shadow-lg scale-[1.02] bg-gradient-to-b from-primary/5 to-transparent"
                      : "hover:border-primary/50"
                }`}
              >
                {highlighted ? (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-zinc-900 text-white text-xs px-3">
                    Chosen during setup
                  </Badge>
                ) : (
                  plan.recommended && (
                    <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs px-3">
                      Most Popular
                    </Badge>
                  )
                )}

                <CardHeader>
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  <CardDescription className="text-xs min-h-[36px]">
                    {plan.description}
                  </CardDescription>
                  <div className="pt-4 flex items-baseline gap-1">
                    <span className="text-3xl font-extrabold">{formatINR(displayPaise)}</span>
                    <span className="text-xs text-muted-foreground">/ month</span>
                  </div>
                  {billingCycle === "yearly" && plan.yearlyBilledPaise > 0 && (
                    <p className="text-[11px] text-muted-foreground">
                      Billed {formatINR(plan.yearlyBilledPaise)} annually
                    </p>
                  )}
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
                    onClick={() => handleSelectPlan(plan)}
                    disabled={isCurrent || acting === plan.id}
                    variant={isCurrent ? "outline" : plan.recommended ? "default" : "secondary"}
                    className="w-full py-5 rounded-xl font-medium"
                  >
                    {acting === plan.id ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : isCurrent ? (
                      "Current Plan"
                    ) : (
                      `Switch to ${plan.name}`
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
          {payments.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              No payments recorded yet
            </p>
          ) : (
            <div className="space-y-3">
              {payments.map((payment) => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between p-3 rounded-xl border bg-muted/20 hover:bg-muted/40 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600">
                      <ShieldCheck className="size-4" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold">{payment.id}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {new Date(payment.createdAt).toLocaleDateString()}
                        {payment.method ? ` • ${payment.method}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-xs font-mono font-bold">
                      {formatINR(payment.amount)}
                    </span>
                    <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                      {payment.status}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 rounded-lg"
                    >
                      <Download className="size-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
