import { prisma } from "../../config/prisma";
import { verifyRazorpayWebhookSignature } from "@sparq/subscription";
import { env } from "../../config/env";
import { mapRazorpayStatus } from "../../lib/razorpay";

/**
 * Idempotent Razorpay webhook processor.
 * - Signature is verified with the raw request body (HMAC-SHA256).
 * - Each event id is stored in `webhook_events`; duplicates are acked
 *   without re-applying side effects.
 */

interface RazorpayWebhookPayload {
  id?: string;
  event: string;
  payload?: {
    subscription?: { entity?: Record<string, unknown> };
    payment?: { entity?: Record<string, unknown> };
    invoice?: { entity?: Record<string, unknown> };
  };
}

function unixToDate(v: unknown): Date | undefined {
  if (typeof v === "number" && v > 0) return new Date(v * 1000);
  return undefined;
}

async function applySubscriptionEntity(entity: Record<string, unknown>) {
  const providerId = entity["id"] as string | undefined;
  if (!providerId) return;
  const status = mapRazorpayStatus(String(entity["status"] ?? "pending"));
  const start = unixToDate(entity["current_start"]) ?? new Date();
  const end =
    unixToDate(entity["current_end"]) ??
    (() => {
      const e = new Date(start);
      e.setMonth(e.getMonth() + 1);
      return e;
    })();
  const endedAt = unixToDate(entity["ended_at"]);

  const existing = await prisma.subscription.findFirst({
    where: { providerSubscriptionId: providerId },
  });
  if (!existing) {
    console.warn(`[billing webhook] unknown subscription ${providerId}`);
    return;
  }
  await prisma.subscription.update({
    where: { id: existing.id },
    data: {
      status: status as never,
      currentPeriodStart: start,
      currentPeriodEnd: end,
      ...(endedAt ? { endedAt } : {}),
      ...(status === "CANCELED"
        ? { cancelAtPeriodEnd: false, canceledAt: new Date(), endedAt: endedAt ?? new Date() }
        : {}),
      ...(status === "ACTIVE"
        ? { cancelAtPeriodEnd: false, canceledAt: null }
        : {}),
      ...(entity["customer_id"]
        ? { providerCustomerId: String(entity["customer_id"]) }
        : {}),
    },
  });
}

async function applyPaymentEntity(
  entity: Record<string, unknown>,
  subscriptionProviderId?: string,
) {
  const providerPaymentId = entity["id"] as string | undefined;
  if (!providerPaymentId) return;
  const status = String(entity["status"] ?? "created").toUpperCase();
  const allowed = [
    "CREATED",
    "AUTHORIZED",
    "CAPTURED",
    "FAILED",
    "REFUNDED",
    "PARTIALLY_REFUNDED",
  ];
  const paymentStatus = allowed.includes(status) ? status : "CREATED";

  let subscriptionId: string | undefined;
  let userId: string | undefined;
  if (subscriptionProviderId) {
    const sub = await prisma.subscription.findFirst({
      where: { providerSubscriptionId: subscriptionProviderId },
      select: { id: true, userId: true },
    });
    subscriptionId = sub?.id;
    userId = sub?.userId;
  }
  if (!userId) {
    // Fall back: payment notes carry userId when created via our API.
    const notes = entity["notes"] as Record<string, string> | undefined;
    userId = notes?.["userId"];
    if (userId) {
      const sub = await prisma.subscription.findUnique({
        where: { userId },
        select: { id: true },
      });
      subscriptionId = sub?.id;
    }
  }
  if (!userId) {
    console.warn(
      `[billing webhook] payment ${providerPaymentId} has no matching user`,
    );
    return;
  }

  await prisma.payment.upsert({
    where: { providerPaymentId },
    create: {
      userId,
      subscriptionId,
      provider: "RAZORPAY",
      status: paymentStatus as never,
      amount: Number(entity["amount"] ?? 0),
      currency: String(entity["currency"] ?? "INR"),
      providerPaymentId,
      providerOrderId:
        typeof entity["order_id"] === "string" ? entity["order_id"] : undefined,
      method: typeof entity["method"] === "string" ? entity["method"] : undefined,
      paidAt: paymentStatus === "CAPTURED" ? new Date() : undefined,
    },
    update: {
      status: paymentStatus as never,
      method: typeof entity["method"] === "string" ? entity["method"] : undefined,
      ...(paymentStatus === "CAPTURED" ? { paidAt: new Date() } : {}),
    },
  });

  // A failed recurring charge puts the subscription past-due (grace period
  // is handled by entitlement checks in @sparq/subscription).
  if (paymentStatus === "FAILED" && subscriptionId) {
    await prisma.subscription.update({
      where: { id: subscriptionId },
      data: { status: "PAST_DUE" },
    });
  }
  if (paymentStatus === "CAPTURED" && subscriptionId) {
    await prisma.subscription.update({
      where: { id: subscriptionId },
      data: { status: "ACTIVE", cancelAtPeriodEnd: false, canceledAt: null },
    });
  }
}

export async function processRazorpayWebhook(
  rawBody: string,
  signature: string | undefined,
): Promise<{ ok: boolean; duplicate?: boolean }> {
  if (
    !verifyRazorpayWebhookSignature(
      rawBody,
      signature,
      env.RAZORPAY_WEBHOOK_SECRET,
    )
  ) {
    throw Object.assign(new Error("Invalid webhook signature."), {
      statusCode: 401,
    });
  }

  const body = JSON.parse(rawBody) as RazorpayWebhookPayload;
  const eventId = body.id ?? `${body.event}:${Date.now()}`;

  // Idempotency gate: unique eventId. A duplicate insert means "already seen".
  try {
    await prisma.webhookEvent.create({
      data: {
        eventId,
        type: body.event,
        provider: "RAZORPAY",
        payload: body as never,
      },
    });
  } catch {
    const seen = await prisma.webhookEvent.findUnique({
      where: { eventId },
    });
    if (seen?.processedAt) return { ok: true, duplicate: true };
    // Seen but not processed (crash mid-handling) — continue processing.
  }

  const entity = body.payload ?? {};
  switch (body.event) {
    case "subscription.authenticated":
    case "subscription.activated":
    case "subscription.charged":
    case "subscription.updated":
    case "subscription.paused":
    case "subscription.resumed":
    case "subscription.cancelled":
    case "subscription.completed":
    case "subscription.halted": {
      const sub = entity.subscription?.entity;
      if (sub) await applySubscriptionEntity(sub);
      const payment = entity.payment?.entity;
      if (payment) {
        const subId =
          (entity.subscription?.entity?.["id"] as string | undefined) ??
          (sub?.["id"] as string | undefined);
        await applyPaymentEntity(payment, subId);
      }
      break;
    }
    case "payment.authorized":
    case "payment.captured":
    case "payment.failed": {
      const payment = entity.payment?.entity;
      if (payment) {
        const subEntity = entity.subscription?.entity;
        await applyPaymentEntity(
          payment,
          subEntity?.["id"] as string | undefined,
        );
      }
      break;
    }
    case "invoice.paid":
    case "invoice.partially_paid": {
      const invoice = entity.invoice?.entity;
      const payment = entity.payment?.entity;
      if (payment) {
        await applyPaymentEntity(
          payment,
          typeof invoice?.["subscription_id"] === "string"
            ? (invoice["subscription_id"] as string)
            : undefined,
        );
      }
      break;
    }
    default:
      console.log(`[billing webhook] ignoring event ${body.event}`);
  }

  await prisma.webhookEvent.update({
    where: { eventId },
    data: { processedAt: new Date() },
  });
  return { ok: true };
}
