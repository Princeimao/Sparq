import Razorpay from "razorpay";
import { env } from "../config/env";

/**
 * Razorpay client built on the official `razorpay` SDK.
 * Server-side only — never import from the frontend.
 *
 * The exported `razorpayClient` interface is the single seam the billing
 * service talks to, so provider mechanics stay in this file.
 */

let instance: Razorpay | null = null;

function getInstance(): Razorpay {
  if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) {
    throw new Error(
      "Razorpay is not configured. Set RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET.",
    );
  }
  if (!instance) {
    instance = new Razorpay({
      key_id: env.RAZORPAY_KEY_ID,
      key_secret: env.RAZORPAY_KEY_SECRET,
    });
  }
  return instance;
}

function toError(err: unknown, fallback: string): Error {
  const description = (err as { error?: { description?: string } })?.error
    ?.description;
  const message =
    description ??
    (err instanceof Error ? err.message : undefined) ??
    fallback;
  return new Error(message);
}

export interface RazorpaySubscription {
  id: string;
  plan_id: string;
  customer_id: string | null;
  status: string;
  current_start: number | null;
  current_end: number | null;
  ended_at: number | null;
  total_count: number;
  paid_count: number;
}

export interface RazorpayCustomer {
  id: string;
  name?: string;
  email?: string;
  contact?: string;
}

export const razorpayClient = {
  isConfigured(): boolean {
    return Boolean(env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET);
  },

  async createCustomer(input: {
    name?: string;
    email?: string;
    contact?: string;
  }): Promise<RazorpayCustomer> {
    try {
      return (await getInstance().customers.create({
        fail_existing: 0,
        ...input,
      })) as unknown as RazorpayCustomer;
    } catch (err) {
      throw toError(err, "Failed to create Razorpay customer.");
    }
  },

  async createSubscription(input: {
    plan_id: string;
    total_count: number;
    customer_id?: string;
    notes?: Record<string, string>;
  }): Promise<RazorpaySubscription> {
    try {
      return (await getInstance().subscriptions.create({
        customer_notify: 1,
        ...input,
      })) as unknown as RazorpaySubscription;
    } catch (err) {
      throw toError(err, "Failed to create Razorpay subscription.");
    }
  },

  async fetchSubscription(id: string): Promise<RazorpaySubscription> {
    try {
      return (await getInstance().subscriptions.fetch(
        id,
      )) as unknown as RazorpaySubscription;
    } catch (err) {
      throw toError(err, "Failed to fetch Razorpay subscription.");
    }
  },

  async cancelSubscription(
    id: string,
    cancelAtCycleEnd = false,
  ): Promise<RazorpaySubscription> {
    try {
      return (await getInstance().subscriptions.cancel(
        id,
        cancelAtCycleEnd,
      )) as unknown as RazorpaySubscription;
    } catch (err) {
      throw toError(err, "Failed to cancel Razorpay subscription.");
    }
  },
};

/** Map a Razorpay subscription status to our Prisma SubscriptionStatus. */
export function mapRazorpayStatus(status: string): string {
  switch (status) {
    case "active":
      return "ACTIVE";
    case "authenticated":
    case "created":
    case "pending":
      return "PENDING";
    case "paused":
      return "PAUSED";
    case "halted":
      return "PAST_DUE";
    case "cancelled":
      return "CANCELED";
    case "completed":
    case "expired":
      return "EXPIRED";
    default:
      return "PENDING";
  }
}
