import {
  checkUsageLimit,
  resolveEntitlement,
  type BillableAction,
  type Entitlement,
  type SubscriptionSnapshot,
} from "@sparq/subscription";
import { prisma } from "../config/prisma";

/**
 * Subscription enforcement for worker jobs.
 *
 * The worker NEVER trusts subscription state from the job payload / API
 * request. It loads the subscription from PostgreSQL and evaluates it with
 * the shared @sparq/subscription package.
 *
 * Usage — at the top of any billable job handler:
 *
 *   const gate = await checkJobEntitlement(userId, "workflow execution");
 *   if (!gate.allowed) {
 *     console.warn(`[billing] blocked job: ${gate.reason}`);
 *     return; // complete without retry — retrying won't fix billing
 *   }
 */

export interface JobGate {
  allowed: boolean;
  reason?: string;
  entitlement: Entitlement;
}

export async function loadSubscriptionSnapshot(
  userId: string,
): Promise<SubscriptionSnapshot | null> {
  const sub = await prisma.subscription.findUnique({ where: { userId } });
  if (!sub) return null; // FREE tier default (see @sparq/subscription)
  return {
    plan: sub.plan as SubscriptionSnapshot["plan"],
    interval: sub.interval as SubscriptionSnapshot["interval"],
    status: sub.status as SubscriptionSnapshot["status"],
    cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
    currentPeriodEnd: sub.currentPeriodEnd,
    currentPeriodStart: sub.currentPeriodStart,
  };
}

/** Live usage counters for quota checks (messages this period, etc.). */
export async function getUsageCounters(userId: string) {
  const sub = await prisma.subscription.findUnique({
    where: { userId },
    select: { currentPeriodStart: true },
  });
  const periodStart = sub?.currentPeriodStart ?? new Date(0);
  const [monthlyMessagesUsed, activeWorkflows] = await Promise.all([
    prisma.message.count({
      where: {
        userId,
        direction: "OUTBOUND",
        createdAt: { gte: periodStart },
      },
    }),
    // Published WhatsApp flows stand in for the "active workflows" quota.
    prisma.flow.count({ where: { userId, status: "PUBLISHED" } }),
  ]);
  return { monthlyMessagesUsed, activeWorkflows, catalogItems: 0 };
}

export async function checkJobEntitlement(
  userId: string,
  action: BillableAction = "workflow execution",
): Promise<JobGate> {
  const snapshot = await loadSubscriptionSnapshot(userId);
  const entitlement = resolveEntitlement(snapshot);
  if (!entitlement.active) {
    return {
      allowed: false,
      reason: "Workspace subscription is not active.",
      entitlement,
    };
  }
  const usage = await getUsageCounters(userId);
  const check = checkUsageLimit(snapshot, action, usage);
  return {
    allowed: check.allowed,
    reason: check.reason,
    entitlement,
  };
}
