import { createHmac, timingSafeEqual } from "node:crypto";
import { getPlan } from "./plans";
import type {
  BillableAction,
  Entitlement,
  PlanId,
  SubscriptionSnapshot,
  UsageCounters,
} from "./types";

const ACTIVE_STATUSES = new Set(["ACTIVE", "PENDING"]);

/** Statuses that still grant access (grace period for past-due/paused). */
function isActiveStatus(status: string): boolean {
  return ACTIVE_STATUSES.has(status);
}

function isPeriodValid(snapshot: SubscriptionSnapshot | null | undefined): boolean {
  if (!snapshot) return false;
  const end = new Date(snapshot.currentPeriodEnd).getTime();
  if (Number.isNaN(end)) return false;
  if (snapshot.cancelAtPeriodEnd) return Date.now() <= end;
  return true;
}

/**
 * Core rule: a null subscription means the FREE tier (active, no grace
 * needed). Used by API + worker — never trust client-provided status,
 * always pass the DB record.
 */
export function hasActiveSubscription(
  snapshot: SubscriptionSnapshot | null | undefined,
): boolean {
  if (!snapshot) return true; // FREE tier default
  if (!isActiveStatus(snapshot.status)) return false;
  // Canceled-at-period-end stays usable until the period lapses.
  return isPeriodValid(snapshot);
}

export function resolveEntitlement(
  snapshot: SubscriptionSnapshot | null | undefined,
): Entitlement {
  const plan: PlanId = snapshot?.plan ?? "FREE";
  const active = hasActiveSubscription(snapshot);
  return { active, plan, limits: getPlan(plan).limits };
}

export interface LimitCheck {
  allowed: boolean;
  reason?: string;
}

/**
 * Quota check for a billable action given current usage counters.
 * Pass -1 limits are treated as unlimited.
 */
export function checkUsageLimit(
  snapshot: SubscriptionSnapshot | null | undefined,
  action: BillableAction,
  usage: Partial<UsageCounters> = {},
): LimitCheck {
  const ent = resolveEntitlement(snapshot);
  if (!ent.active) {
    return {
      allowed: false,
      reason: "Subscription is not active. Please renew to continue.",
    };
  }
  const { limits } = ent;
  if (action === "send message" || action === "workflow execution") {
    if (
      limits.monthlyMessages !== -1 &&
      (usage.monthlyMessagesUsed ?? 0) >= limits.monthlyMessages
    ) {
      return {
        allowed: false,
        reason: `Monthly message limit reached for the ${ent.plan} plan.`,
      };
    }
  }
  if (action === "create workflow") {
    if (
      limits.maxWorkflows !== -1 &&
      (usage.activeWorkflows ?? 0) >= limits.maxWorkflows
    ) {
      return {
        allowed: false,
        reason: `Workflow limit reached for the ${ent.plan} plan.`,
      };
    }
  }
  if (action === "catalog write") {
    if (
      limits.maxCatalogItems !== -1 &&
      (usage.catalogItems ?? 0) >= limits.maxCatalogItems
    ) {
      return {
        allowed: false,
        reason: `Catalog limit reached for the ${ent.plan} plan.`,
      };
    }
  }
  return { allowed: true };
}

export class SubscriptionRequiredError extends Error {
  statusCode = 402;
  constructor(message = "An active subscription is required.") {
    super(message);
    this.name = "SubscriptionRequiredError";
  }
}

/** Throw when the snapshot does not allow the action. */
export function assertEntitlement(
  snapshot: SubscriptionSnapshot | null | undefined,
  action: BillableAction = "workflow execution",
  usage: Partial<UsageCounters> = {},
): Entitlement {
  const ent = resolveEntitlement(snapshot);
  if (!ent.active) {
    throw new SubscriptionRequiredError(
      "Subscription is not active. Please renew to continue.",
    );
  }
  const check = checkUsageLimit(snapshot, action, usage);
  if (!check.allowed) throw new SubscriptionRequiredError(check.reason);
  return ent;
}

// ─── Razorpay webhook signature ──────────────────────────────────────────────

/**
 * Verify a Razorpay webhook signature:
 *   HMAC_SHA256(webhookSecret, rawBody) === x-razorpay-signature
 * Uses timing-safe comparison. Pure function — safe to use in API/worker.
 */
export function verifyRazorpayWebhookSignature(
  rawBody: string | Buffer,
  signature: string | undefined | null,
  webhookSecret: string | undefined | null,
): boolean {
  if (!signature || !webhookSecret) return false;
  const body = typeof rawBody === "string" ? rawBody : rawBody.toString("utf8");
  const expected = createHmac("sha256", webhookSecret).update(body).digest("hex");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signature, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/**
 * Verify a Razorpay subscription payment (checkout `razorpay_signature`):
 *   HMAC_SHA256(keySecret, `${paymentId}|${subscriptionId}`)
 */
export function verifyRazorpayPaymentSignature(
  razorpayPaymentId: string,
  razorpaySubscriptionId: string,
  razorpaySignature: string,
  keySecret: string,
): boolean {
  const payload = `${razorpayPaymentId}|${razorpaySubscriptionId}`;
  const expected = createHmac("sha256", keySecret).update(payload).digest("hex");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(razorpaySignature, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
