import type { BillingInterval, PlanDefinition, PlanId } from "./types";

function razorpayPlanId(monthly?: string, yearly?: string) {
  return { MONTHLY: monthly, YEARLY: yearly } as Record<
    BillingInterval,
    string | undefined
  >;
}

/**
 * Single source of truth for plans. Frontend, API and worker must import
 * from here — never duplicate these definitions.
 *
 * Razorpay plan IDs are resolved from env (RAZORPAY_PLAN_<PLAN>_<INTERVAL>).
 * Empty string means "not configured" (dev without Razorpay).
 */
export const PLANS: Record<PlanId, PlanDefinition> = {
  FREE: {
    id: "FREE",
    name: "Free",
    description:
      "A simple way to get started with selling and managing customer conversations on WhatsApp.",
    monthlyPricePaise: 0,
    yearlyPricePaisePerMonth: 0,
    yearlyBilledPaise: 0,
    razorpayPlanId: razorpayPlanId(undefined, undefined),
    limits: {
      monthlyMessages: 50,
      maxWorkflows: 3,
      maxCatalogItems: 20,
      advancedAnalytics: false,
      advancedAutomation: false,
      prioritySupport: false,
    },
    features: [
      "50 customer conversation sessions/month",
      "WhatsApp storefront",
      "Product & service catalog",
      "Customer conversation management",
      "Order & purchase tracking",
      "Basic analytics",
      "Customer onboarding",
      "Payment collection",
    ],
  },
  GROWTH: {
    id: "GROWTH",
    name: "Growth",
    description:
      "For growing businesses that want to manage unlimited customer conversations and sell directly through WhatsApp.",
    monthlyPricePaise: 99900,
    yearlyPricePaisePerMonth: 79900,
    yearlyBilledPaise: 958800,
    razorpayPlanId: razorpayPlanId(
      process.env.RAZORPAY_PLAN_GROWTH_MONTHLY,
      process.env.RAZORPAY_PLAN_GROWTH_YEARLY,
    ),
    limits: {
      monthlyMessages: -1,
      maxWorkflows: 15,
      maxCatalogItems: -1,
      advancedAnalytics: false,
      advancedAutomation: false,
      prioritySupport: false,
    },
    features: [
      "Unlimited customer conversation sessions",
      "WhatsApp storefront",
      "Product & service catalog",
      "Customer conversation management",
      "Order & purchase tracking",
      "Basic analytics",
      "Customer onboarding",
      "Payment collection",
    ],
    recommended: true,
  },
  PRO: {
    id: "PRO",
    name: "Pro",
    description:
      "For businesses that need the complete Sparq experience to manage and grow their WhatsApp storefront.",
    monthlyPricePaise: 249900,
    yearlyPricePaisePerMonth: 199900,
    yearlyBilledPaise: 2398800,
    razorpayPlanId: razorpayPlanId(
      process.env.RAZORPAY_PLAN_PRO_MONTHLY,
      process.env.RAZORPAY_PLAN_PRO_YEARLY,
    ),
    limits: {
      monthlyMessages: -1,
      maxWorkflows: -1,
      maxCatalogItems: -1,
      advancedAnalytics: true,
      advancedAutomation: true,
      prioritySupport: true,
    },
    features: [
      "Everything in Growth",
      "Unlimited customer conversation sessions",
      "Advanced conversation features",
      "Advanced customer & order management",
      "Advanced analytics",
      "Priority feature access",
    ],
  },
};

export const PLAN_IDS = Object.keys(PLANS) as PlanId[];

export function getPlan(plan: PlanId): PlanDefinition {
  const def = PLANS[plan];
  if (!def) throw new Error(`Unknown plan: ${plan}`);
  return def;
}

export function amountForPlan(plan: PlanId, interval: BillingInterval): {
  amountPaise: number;
  currency: string;
} {
  const def = getPlan(plan);
  if (plan === "FREE") return { amountPaise: 0, currency: "INR" };
  return {
    amountPaise:
      interval === "YEARLY"
        ? def.yearlyBilledPaise
        : def.monthlyPricePaise,
    currency: "INR",
  };
}

export function razorpayPlanIdFor(
  plan: PlanId,
  interval: BillingInterval,
): string | undefined {
  return getPlan(plan).razorpayPlanId[interval];
}
