import { prisma } from "../../config/prisma";
import { env } from "../../config/env";
import {
  PLANS,
  amountForPlan,
  razorpayPlanIdFor,
  type BillingInterval,
  type PlanId,
} from "@sparq/subscription";
import { razorpayClient, mapRazorpayStatus } from "../../lib/razorpay";

/**
 * Billing service — the only place that talks to Razorpay.
 * Subscription/entitlement rules live in @sparq/subscription; this service
 * only handles persistence + provider calls.
 */

export interface PublicSubscription {
  plan: PlanId;
  interval: BillingInterval;
  status: string;
  amount: number;
  currency: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  canceledAt: Date | null;
  startedAt: Date | null;
}

function toPublic(s: {
  plan: string;
  interval: string;
  status: string;
  amount: number;
  currency: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  canceledAt: Date | null;
  startedAt: Date | null;
}): PublicSubscription {
  return {
    plan: s.plan as PlanId,
    interval: s.interval as BillingInterval,
    status: s.status,
    amount: s.amount,
    currency: s.currency,
    currentPeriodStart: s.currentPeriodStart,
    currentPeriodEnd: s.currentPeriodEnd,
    cancelAtPeriodEnd: s.cancelAtPeriodEnd,
    canceledAt: s.canceledAt,
    startedAt: s.startedAt,
  };
}

function defaultPeriod() {
  const start = new Date();
  const end = new Date(start);
  end.setDate(end.getDate() + 30);
  return { start, end };
}

export async function getOrCreateDbSubscription(userId: string) {
  const existing = await prisma.subscription.findUnique({
    where: { userId },
  });
  if (existing) return existing;
  const { start, end } = defaultPeriod();
  return prisma.subscription.create({
    data: {
      userId,
      plan: "FREE",
      interval: "MONTHLY",
      status: "ACTIVE",
      amount: 0,
      currency: "INR",
      provider: "RAZORPAY",
      currentPeriodStart: start,
      currentPeriodEnd: end,
      startedAt: start,
    },
  });
}

export async function getCurrentSubscription(userId: string) {
  const sub = await getOrCreateDbSubscription(userId);
  return toPublic(sub);
}

export function listPlans() {
  return Object.values(PLANS).map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    monthlyPricePaise: p.monthlyPricePaise,
    yearlyPricePaisePerMonth: p.yearlyPricePaisePerMonth,
    yearlyBilledPaise: p.yearlyBilledPaise,
    features: p.features,
    limits: p.limits,
    recommended: p.recommended ?? false,
  }));
}

async function ensureProviderCustomer(
  userId: string,
  email?: string,
  name?: string,
): Promise<string | undefined> {
  const sub = await getOrCreateDbSubscription(userId);
  if (sub.providerCustomerId) return sub.providerCustomerId;
  if (!razorpayClient.isConfigured()) return undefined;
  const customer = await razorpayClient.createCustomer({
    name,
    email,
  });
  await prisma.subscription.update({
    where: { userId },
    data: { providerCustomerId: customer.id },
  });
  return customer.id;
}

export async function createSubscription(
  userId: string,
  input: { plan: PlanId; interval: BillingInterval; email?: string; name?: string },
) {
  const { plan, interval } = input;
  if (plan === "FREE") {
    throw Object.assign(new Error("FREE plan needs no Razorpay subscription."), {
      statusCode: 400,
    });
  }
  if (!razorpayClient.isConfigured()) {
    throw Object.assign(
      new Error("Billing is not configured. Contact support."),
      { statusCode: 503 },
    );
  }
  const razorpayPlanId = razorpayPlanIdFor(plan, interval);
  if (!razorpayPlanId) {
    throw Object.assign(
      new Error(`No Razorpay plan configured for ${plan} ${interval}.`),
      { statusCode: 503 },
    );
  }

  const customerId = await ensureProviderCustomer(
    userId,
    input.email,
    input.name,
  );
  const totalCount = interval === "YEARLY" ? 10 : 60;
  const providerSub = await razorpayClient.createSubscription({
    plan_id: razorpayPlanId,
    total_count: totalCount,
    customer_id: customerId,
    notes: { userId, plan, interval },
  });

  const { amountPaise, currency } = amountForPlan(plan, interval);
  const start = providerSub.current_start
    ? new Date(providerSub.current_start * 1000)
    : new Date();
  const end = providerSub.current_end
    ? new Date(providerSub.current_end * 1000)
    : (() => {
        const e = new Date(start);
        if (interval === "YEARLY") e.setFullYear(e.getFullYear() + 1);
        else e.setMonth(e.getMonth() + 1);
        return e;
      })();

  const saved = await prisma.subscription.upsert({
    where: { userId },
    create: {
      userId,
      plan,
      interval,
      status: mapRazorpayStatus(providerSub.status) as never,
      amount: amountPaise,
      currency,
      provider: "RAZORPAY",
      providerSubscriptionId: providerSub.id,
      providerCustomerId: providerSub.customer_id ?? customerId,
      providerPlanId: razorpayPlanId,
      currentPeriodStart: start,
      currentPeriodEnd: end,
      cancelAtPeriodEnd: false,
      canceledAt: null,
      startedAt: start,
    },
    update: {
      plan,
      interval,
      status: mapRazorpayStatus(providerSub.status) as never,
      amount: amountPaise,
      currency,
      providerSubscriptionId: providerSub.id,
      providerCustomerId: providerSub.customer_id ?? customerId,
      providerPlanId: razorpayPlanId,
      currentPeriodStart: start,
      currentPeriodEnd: end,
      cancelAtPeriodEnd: false,
      canceledAt: null,
      endedAt: null,
    },
  });

  // Only hand the frontend what Checkout needs — no secrets.
  return {
    subscription: toPublic(saved),
    razorpayKeyId: env.RAZORPAY_KEY_ID,
    razorpaySubscriptionId: providerSub.id,
  };
}

/** Upgrade/downgrade: cancel the current provider sub, create a new one. */
export async function changePlan(
  userId: string,
  input: { plan: PlanId; interval: BillingInterval; email?: string; name?: string },
) {
  const current = await getOrCreateDbSubscription(userId);
  if (current.plan === input.plan && current.interval === input.interval) {
    throw Object.assign(new Error("Already on this plan and interval."), {
      statusCode: 400,
    });
  }
  // Downgrade to FREE = cancel at period end, keep access until then.
  if (input.plan === "FREE") {
    return cancelSubscription(userId, true);
  }
  if (current.providerSubscriptionId && razorpayClient.isConfigured()) {
    try {
      await razorpayClient.cancelSubscription(current.providerSubscriptionId);
    } catch (err) {
      console.warn("[billing] failed to cancel previous subscription:", err);
    }
  }
  return createSubscription(userId, input);
}

export async function cancelSubscription(userId: string, atPeriodEnd = true) {
  const current = await getOrCreateDbSubscription(userId);
  if (current.providerSubscriptionId && razorpayClient.isConfigured()) {
    try {
      await razorpayClient.cancelSubscription(
        current.providerSubscriptionId,
        atPeriodEnd,
      );
    } catch (err) {
      console.warn("[billing] provider cancel failed:", err);
    }
  }
  const now = new Date();
  const saved = await prisma.subscription.update({
    where: { userId },
    data: atPeriodEnd
      ? { cancelAtPeriodEnd: true, canceledAt: now }
      : {
          status: "CANCELED",
          cancelAtPeriodEnd: false,
          canceledAt: now,
          endedAt: now,
        },
  });
  return toPublic(saved);
}

export async function listPayments(userId: string, limit = 20) {
  const payments = await prisma.payment.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: Math.min(Math.max(limit, 1), 100),
    select: {
      id: true,
      amount: true,
      currency: true,
      status: true,
      method: true,
      paidAt: true,
      createdAt: true,
    },
  });
  return payments;
}
