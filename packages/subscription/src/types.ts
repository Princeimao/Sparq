// ─── Canonical plan / status types ───────────────────────────────────────────
// Mirrors the Prisma enums (SubscriptionPlan, BillingInterval,
// SubscriptionStatus) so api / worker / web share one definition.

export type PlanId = "FREE" | "GROWTH" | "PRO";
export type BillingInterval = "MONTHLY" | "YEARLY";
export type SubscriptionStatus =
  | "ACTIVE"
  | "PENDING"
  | "PAUSED"
  | "CANCELED"
  | "EXPIRED"
  | "PAST_DUE";

export interface PlanLimits {
  /** Max WhatsApp conversation sessions per billing period. -1 = unlimited. */
  monthlyMessages: number;
  /** Max active automation workflows/flows. -1 = unlimited. */
  maxWorkflows: number;
  /** Max catalog items (products + services). -1 = unlimited. */
  maxCatalogItems: number;
  advancedAnalytics: boolean;
  advancedAutomation: boolean;
  prioritySupport: boolean;
}

export interface PlanDefinition {
  id: PlanId;
  name: string;
  description: string;
  /** Price in paise (INR). */
  monthlyPricePaise: number;
  yearlyPricePaisePerMonth: number;
  yearlyBilledPaise: number;
  razorpayPlanId: Record<BillingInterval, string | undefined>;
  limits: PlanLimits;
  features: string[];
  recommended?: boolean;
}

export interface SubscriptionSnapshot {
  plan: PlanId;
  interval: BillingInterval;
  status: SubscriptionStatus;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: Date | string;
  currentPeriodStart?: Date | string;
}

export interface Entitlement {
  active: boolean;
  plan: PlanId;
  limits: PlanLimits;
}

export type BillableAction =
  | "workflow execution"
  | "send message"
  | "create workflow"
  | "catalog write";

export interface UsageCounters {
  monthlyMessagesUsed: number;
  activeWorkflows: number;
  catalogItems: number;
}
