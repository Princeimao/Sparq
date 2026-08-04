import Stripe from "stripe";
import { env } from "../config/env";

let stripeClient: Stripe | null = null;

function getStripe(): Stripe {
  if (!stripeClient) {
    if (!env.STRIPE_SECRET_KEY) {
      throw new Error("STRIPE_SECRET_KEY is not configured");
    }
    stripeClient = new Stripe(env.STRIPE_SECRET_KEY, {});
  }
  return stripeClient;
}

export interface CreatePaymentLinkParams {
  amount: number; // in smallest currency unit (cents/paise)
  currency: string;
  productName: string;
  customerPhone: string;
  successUrl?: string;
  cancelUrl?: string;
}

/**
 * Create a Stripe Checkout session (payment link) for an order.
 */
export async function createPaymentLink(
  params: CreatePaymentLinkParams
): Promise<{ url: string; sessionId: string }> {
  const stripe = getStripe();

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: params.currency.toLowerCase(),
          product_data: {
            name: params.productName,
          },
          unit_amount: params.amount,
        },
        quantity: 1,
      },
    ],
    mode: "payment",
    metadata: {
      customerPhone: params.customerPhone,
    },
    success_url: params.successUrl || `${env.FRONTEND_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: params.cancelUrl || `${env.FRONTEND_URL}/payment/cancel`,
  });

  return {
    url: session.url!,
    sessionId: session.id,
  };
}

/**
 * Verify a Stripe webhook signature.
 */
export function verifyWebhookSignature(
  payload: Buffer,
  signature: string
): Stripe.Event {
  const stripe = getStripe();
  if (!env.STRIPE_WEBHOOK_SECRET) {
    throw new Error("STRIPE_WEBHOOK_SECRET is not configured");
  }
  return stripe.webhooks.constructEvent(payload, signature, env.STRIPE_WEBHOOK_SECRET);
}

/**
 * Retrieve a checkout session.
 */
export async function getCheckoutSession(
  sessionId: string
): Promise<Stripe.Checkout.Session> {
  const stripe = getStripe();
  return stripe.checkout.sessions.retrieve(sessionId);
}
