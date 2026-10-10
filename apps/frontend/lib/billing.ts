import { api } from "./api";

// ─── Types (shaped by the API — no Razorpay details leak here) ───────────────

export type PlanId = "FREE" | "GROWTH" | "PRO";
export type BillingInterval = "MONTHLY" | "YEARLY";

export interface Plan {
  id: PlanId;
  name: string;
  description: string;
  monthlyPricePaise: number;
  yearlyPricePaisePerMonth: number;
  yearlyBilledPaise: number;
  features: string[];
  limits: {
    monthlyMessages: number;
    maxCatalogItems: number;
    advancedAnalytics: boolean;
    advancedAutomation: boolean;
    prioritySupport: boolean;
  };
  recommended: boolean;
}

export interface Subscription {
  plan: PlanId;
  interval: BillingInterval;
  status: string;
  amount: number;
  currency: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  canceledAt: string | null;
  startedAt: string | null;
}

export interface Payment {
  id: string;
  amount: number;
  currency: string;
  status: string;
  method: string | null;
  paidAt: string | null;
  createdAt: string;
}

interface ApiEnvelope<T> {
  data: T;
  message: string;
  success: boolean;
}

// ─── API calls ──────────────────────────────────────────────────────────────

export async function getPlans(): Promise<Plan[]> {
  const res = await api.get<ApiEnvelope<Plan[]>>("/billing/plans");
  return res.data.data;
}

export async function getSubscription(): Promise<Subscription> {
  const res = await api.get<ApiEnvelope<Subscription>>("/billing/subscription");
  return res.data.data;
}

export async function getPayments(limit = 20): Promise<Payment[]> {
  const res = await api.get<ApiEnvelope<Payment[]>>("/billing/payments", {
    params: { limit },
  });
  return res.data.data;
}

export interface StartSubscriptionResult {
  subscription: Subscription;
  razorpayKeyId: string;
  razorpaySubscriptionId: string;
}

export async function startSubscription(
  plan: Exclude<PlanId, "FREE">,
  interval: BillingInterval,
): Promise<StartSubscriptionResult> {
  const res = await api.post<ApiEnvelope<StartSubscriptionResult>>(
    "/billing/subscriptions",
    { plan, interval },
  );
  return res.data.data;
}

export async function changePlan(
  plan: PlanId,
  interval: BillingInterval,
): Promise<StartSubscriptionResult | { subscription: Subscription }> {
  const res = await api.patch<
    ApiEnvelope<StartSubscriptionResult | { subscription: Subscription }>
  >("/billing/subscriptions", { plan, interval });
  return res.data.data;
}

/** Narrow a create/change result to one that needs Razorpay Checkout. */
export function isCheckoutResult(
  result: StartSubscriptionResult | { subscription: Subscription },
): result is StartSubscriptionResult {
  return (
    "razorpaySubscriptionId" in result &&
    typeof (result as StartSubscriptionResult).razorpaySubscriptionId ===
      "string"
  );
}

export async function cancelSubscription(
  atPeriodEnd = true,
): Promise<{ subscription: Subscription }> {
  const res = await api.delete<ApiEnvelope<{ subscription: Subscription }>>(
    "/billing/subscriptions",
    { data: { atPeriodEnd } },
  );
  return res.data.data;
}

export async function verifySubscriptionPayment(payload: {
  razorpay_payment_id: string;
  razorpay_subscription_id: string;
  razorpay_signature: string;
}): Promise<{ subscription: Subscription; verified: boolean }> {
  const res = await api.post<
    ApiEnvelope<{ subscription: Subscription; verified: boolean }>
  >("/billing/subscriptions/verify", payload);
  return res.data.data;
}

// ─── Razorpay Checkout (display only — amounts/plans come from the API) ─────

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => {
      open: () => void;
      on: (event: string, cb: (err: unknown) => void) => void;
    };
  }
}

function loadCheckoutScript(): Promise<void> {
  if (typeof window !== "undefined" && window.Razorpay)
    return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () =>
      reject(new Error("Failed to load Razorpay Checkout"));
    document.body.appendChild(script);
  });
}

/** Open Razorpay Checkout for an API-created subscription. */
export async function openRazorpayCheckout(input: {
  key: string;
  subscriptionId: string;
  name?: string;
  description?: string;
  onSuccess: (response: {
    razorpay_payment_id: string;
    razorpay_subscription_id: string;
    razorpay_signature: string;
  }) => void;
  onDismiss?: () => void;
}): Promise<void> {
  await loadCheckoutScript();
  if (!window.Razorpay) throw new Error("Razorpay Checkout failed to load");
  const checkout = new window.Razorpay({
    key: input.key,
    subscription_id: input.subscriptionId,
    name: input.name ?? "Sparq",
    description: input.description ?? "Subscription payment",
    handler: input.onSuccess,
    modal: { ondismiss: input.onDismiss },
  });
  checkout.open();
}

export function formatINR(paise: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(paise / 100);
}
