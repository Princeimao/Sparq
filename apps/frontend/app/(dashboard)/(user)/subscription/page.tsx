"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { toast } from "sonner";
import { Check, Download, Loader2, ShieldCheck, Zap } from "lucide-react";
import { useConfirm } from "@/components/ui/confirm";
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
  const confirmAction = useConfirm();

  // ALL HOOKS MUST BE CALLED AT THE TOP BEFORE ANY EARLY RETURNS
  const reduceMotion = useReducedMotion();

  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">(
    "yearly",
  );
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);

  // Plan preselected during signup onboarding (?plan=GROWTH).
  const requestedPlan = (["FREE", "GROWTH", "PRO"] as const).find(
    (p) => p === searchParams.get("plan"),
  );

  const interval: BillingInterval =
    billingCycle === "yearly" ? "YEARLY" : "MONTHLY";

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
    const isChange =
      subscription != null &&
      !(subscription.plan === "FREE" && planId !== "FREE");
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
    if (
      subscription &&
      subscription.plan === plan.id &&
      subscription.interval === interval
    )
      return;
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
        (error as { response?: { data?: { error?: string } } })?.response?.data
          ?.error ?? "Could not update subscription";
      toast.error(message);
      setActing(null);
    }
  };

  const handleCancel = async () => {
    const ok = await confirmAction({
      title: "Cancel at period end?",
      body: "You keep every feature until the billing date, then drop to Free.",
      confirmLabel: "Yes, cancel",
    });
    if (!ok) return;
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

  // Early return is now safely placed AFTER all hooks have been invoked
  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const currentPlanName = subscription?.plan ?? "FREE";
  const isActive =
    subscription?.status === "ACTIVE" || subscription?.status === "PENDING";
  const EASE = [0.22, 1, 0.36, 1] as const;

  return (
    <div className="relative p-6 max-w-6xl mx-auto space-y-9">
      {!reduceMotion && (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute -top-24 right-0 size-72 rounded-full bg-brand/10 blur-[110px]"
          animate={{ x: [0, -20, 0], y: [0, 20, 0] }}
          transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
        />
      )}

      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: EASE }}
        className="relative flex flex-col md:flex-row md:items-end justify-between gap-4"
      >
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand">
            Billing
          </p>
          <h1 className="text-4xl font-semibold tracking-[-0.03em] text-ink mt-1">
            Subscription
          </h1>
          <p className="text-[15px] text-ink/55 mt-2">
            Your plan, billing cycle and invoice history.
          </p>
        </div>
        <div className="flex p-1 rounded-full bg-ink/[0.05] w-fit">
          {(["monthly", "yearly"] as const).map((cycle) => (
            <button
              key={cycle}
              onClick={() => setBillingCycle(cycle)}
              aria-pressed={billingCycle === cycle}
              className={`relative px-4 py-2 rounded-full text-xs font-medium transition-colors ${
                billingCycle === cycle
                  ? "text-white"
                  : "text-ink/55 hover:text-ink"
              }`}
            >
              {billingCycle === cycle && (
                <motion.span
                  layoutId="billing-cycle-pill"
                  transition={{ type: "spring", stiffness: 450, damping: 35 }}
                  className="absolute inset-0 rounded-full bg-ink"
                />
              )}
              <span className="relative flex items-center gap-1.5">
                {cycle === "monthly" ? "Monthly" : "Yearly"}
                {cycle === "yearly" && (
                  <span
                    className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                      billingCycle === "yearly"
                        ? "bg-brand text-white"
                        : "bg-brand/15 text-brand-deep"
                    }`}
                  >
                    −20%
                  </span>
                )}
              </span>
            </button>
          ))}
        </div>
      </motion.div>

      {/* Current plan band */}
      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.06, ease: EASE }}
        className="relative rounded-[1.6rem] bg-ink text-white px-6 py-5 flex flex-wrap items-center gap-4"
      >
        <span className="flex size-11 items-center justify-center rounded-2xl bg-white/10 shrink-0">
          <Zap className="size-5 text-brand" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="font-semibold tracking-tight text-lg leading-tight">
            {currentPlanName} plan
          </p>
          <p className="text-[13px] text-white/60 mt-0.5">
            {subscription?.cancelAtPeriodEnd
              ? `Cancels at period end (${new Date(subscription.currentPeriodEnd).toLocaleDateString()}).`
              : subscription?.currentPeriodEnd
                ? `Next billing date ${new Date(subscription.currentPeriodEnd).toLocaleDateString()}.`
                : "You are on the Free plan."}
          </p>
        </div>
        <div className="flex items-center gap-2.5 ml-auto">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
              isActive
                ? "bg-brand/20 text-emerald-300"
                : "bg-white/10 text-white/70"
            }`}
          >
            <span
              className={`size-1.5 rounded-full ${isActive ? "bg-emerald-400" : "bg-white/40"}`}
            />
            {subscription?.status ?? "FREE"}
          </span>
          {subscription &&
            subscription.plan !== "FREE" &&
            !subscription.cancelAtPeriodEnd && (
              <button
                onClick={handleCancel}
                disabled={acting === "cancel"}
                className="h-9 inline-flex items-center rounded-full px-4 text-xs font-medium text-white/70 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-50"
              >
                {acting === "cancel" ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  "Cancel plan"
                )}
              </button>
            )}
        </div>
      </motion.div>

      {/* Plans */}
      <div className="relative space-y-4">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink/50 px-1">
          Available plans
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {plans.map((plan, i) => {
            const isCurrent =
              subscription?.plan === plan.id &&
              (plan.id === "FREE" || subscription.interval === interval);
            const highlighted = requestedPlan === plan.id && !isCurrent;
            const displayPaise =
              billingCycle === "yearly"
                ? plan.yearlyPricePaisePerMonth
                : plan.monthlyPricePaise;

            return (
              <motion.div
                key={plan.id}
                id={`plan-${plan.id}`}
                initial={reduceMotion ? false : { opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  delay: Math.min(i * 0.07, 0.3),
                  duration: 0.45,
                  ease: EASE,
                }}
                className={`relative flex flex-col rounded-[1.6rem] p-6 scroll-mt-24 transition-colors duration-300 ${
                  isCurrent ? "bg-ink text-white" : "bg-ink/[0.045]"
                }`}
              >
                {(highlighted || plan.recommended) && !isCurrent && (
                  <span
                    className={`absolute -top-2.5 left-6 rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-wider ${
                      highlighted ? "bg-brand text-white" : "bg-ink text-white"
                    }`}
                  >
                    {highlighted ? "Chosen during setup" : "Most popular"}
                  </span>
                )}

                <p
                  className={`text-base font-semibold tracking-tight ${isCurrent ? "text-white" : "text-ink"}`}
                >
                  {plan.name}
                </p>
                <p
                  className={`text-xs mt-0.5 min-h-8 ${isCurrent ? "text-white/60" : "text-ink/50"}`}
                >
                  {plan.description}
                </p>
                <div className="pt-3 flex items-baseline gap-1.5">
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={billingCycle}
                      initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={
                        reduceMotion ? { opacity: 0 } : { opacity: 0, y: -8 }
                      }
                      transition={{ duration: 0.2 }}
                      className={`text-4xl font-semibold tracking-tight tabular-nums ${isCurrent ? "text-white" : "text-ink"}`}
                    >
                      {formatINR(displayPaise)}
                    </motion.span>
                  </AnimatePresence>
                  <span
                    className={`text-xs ${isCurrent ? "text-white/55" : "text-ink/45"}`}
                  >
                    / month
                  </span>
                </div>
                <p
                  className={`text-[11px] mt-1 h-4 ${isCurrent ? "text-white/50" : "text-ink/40"}`}
                >
                  {billingCycle === "yearly" && plan.yearlyBilledPaise > 0
                    ? `Billed ${formatINR(plan.yearlyBilledPaise)} annually`
                    : ""}
                </p>

                <ul className="space-y-2 text-[13px] mt-4 flex-1">
                  {plan.features.map((feat) => (
                    <li key={feat} className="flex items-start gap-2">
                      <span
                        className={`mt-0.5 flex size-4.5 items-center justify-center rounded-full shrink-0 ${isCurrent ? "bg-white/15 text-emerald-300" : "bg-brand/15 text-brand"}`}
                      >
                        <Check className="size-3" strokeWidth={3} />
                      </span>
                      <span
                        className={isCurrent ? "text-white/80" : "text-ink/70"}
                      >
                        {feat}
                      </span>
                    </li>
                  ))}
                </ul>

                <motion.button
                  whileTap={isCurrent ? undefined : { scale: 0.98 }}
                  onClick={() => handleSelectPlan(plan)}
                  disabled={isCurrent || acting === plan.id}
                  className={`mt-6 h-11 w-full inline-flex items-center justify-center rounded-full text-sm font-medium transition-colors ${
                    isCurrent
                      ? "bg-white/10 text-white/60 cursor-default"
                      : "bg-ink text-white hover:bg-brand"
                  } disabled:opacity-60`}
                >
                  {acting === plan.id ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : isCurrent ? (
                    "Current plan"
                  ) : (
                    `Switch to ${plan.name}`
                  )}
                </motion.button>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Invoice history */}
      <div className="relative space-y-4">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink/50 px-1">
          Invoices
        </h2>
        {payments.length === 0 ? (
          <div className="rounded-[1.6rem] bg-ink/[0.045] py-10 text-center">
            <p className="text-sm text-ink/50">No payments recorded yet</p>
            <p className="text-xs text-ink/35 mt-1">
              Receipts appear here after your first payment.
            </p>
          </div>
        ) : (
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: EASE }}
            className="space-y-2"
          >
            {payments.map((payment) => (
              <div
                key={payment.id}
                className="flex items-center justify-between gap-3 px-5 py-3.5 rounded-[1.4rem] bg-ink/[0.045] hover:bg-ink/[0.07] transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="flex size-9 items-center justify-center rounded-full bg-brand/15 text-brand shrink-0">
                    <ShieldCheck className="size-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-ink truncate">
                      {payment.id}
                    </p>
                    <p className="text-[11px] text-ink/45">
                      {new Date(payment.createdAt).toLocaleDateString()}
                      {payment.method ? ` · ${payment.method}` : ""}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-[13px] font-semibold tabular-nums text-ink">
                    {formatINR(payment.amount)}
                  </span>
                  <span className="rounded-full bg-brand/15 text-brand-deep px-2.5 py-1 text-[10px] font-semibold">
                    {payment.status}
                  </span>
                  <button
                    aria-label="Download invoice"
                    className="p-2 rounded-full text-ink/50 hover:text-ink hover:bg-ink/10 transition-colors"
                  >
                    <Download className="size-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}
