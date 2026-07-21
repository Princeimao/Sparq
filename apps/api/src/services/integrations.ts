import Stripe from "stripe";
import { prisma } from "../config/prisma";
import { decrypt } from "../lib/encryption";
import { env } from "../config/env";
import { IntegrationType } from "@sparq/database";

export interface CreatePaymentLinkParams {
  amount: number;
  currency: string;
  productName: string;
  customerPhone: string;
  orderId: string;
  organizationId: string;
  successUrl?: string;
  cancelUrl?: string;
}

export interface PaymentLinkResponse {
  url: string;
  sessionId: string;
}

export abstract class BasePaymentProvider {
  protected credentials: any;

  constructor(credentials: any) {
    this.credentials = credentials;
  }

  abstract createPaymentLink(params: CreatePaymentLinkParams): Promise<PaymentLinkResponse>;
  abstract verifyWebhook(payload: any, signature: string): Promise<any>;
}

export class StripePaymentProvider extends BasePaymentProvider {
  private stripe: Stripe;

  constructor(credentials: any) {
    super(credentials);
    
    // Retrieve apiKey from credentials, fallback to global environment variable
    const apiKey = credentials?.apiKey || credentials?.secretKey || env.STRIPE_SECRET_KEY;
    if (!apiKey) {
      throw new Error("Stripe API key is not configured for this organization.");
    }
    
    this.stripe = new Stripe(apiKey, {
      apiVersion: "2025-01-27" as any, // Use standard stable or match SDK version
    });
  }

  async createPaymentLink(params: CreatePaymentLinkParams): Promise<PaymentLinkResponse> {
    const session = await this.stripe.checkout.sessions.create({
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
        orderId: params.orderId,
        organizationId: params.organizationId,
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

  async verifyWebhook(payload: any, signature: string): Promise<Stripe.Event> {
    const webhookSecret = this.credentials?.webhookSecret || env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      throw new Error("Stripe webhook secret is not configured.");
    }
    return this.stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  }
}

export class RazorpayPaymentProvider extends BasePaymentProvider {
  constructor(credentials: any) {
    super(credentials);
  }

  async createPaymentLink(params: CreatePaymentLinkParams): Promise<PaymentLinkResponse> {
    console.log("Generating Razorpay payment link for params:", params);
    // In real implementation: call Razorpay SDK
    // const rzp = new Razorpay({ key_id: this.credentials.keyId, key_secret: this.credentials.keySecret });
    // const link = await rzp.paymentLink.create(...)
    
    // Stub response
    const mockSessionId = `rzp_link_${Date.now()}`;
    return {
      url: `https://api.razorpay.com/v1/payment_links/${mockSessionId}`,
      sessionId: mockSessionId,
    };
  }

  async verifyWebhook(payload: any, signature: string): Promise<any> {
    // Razorpay signature verification logic
    return { verified: true };
  }
}

export class PaymentIntegrationManager {
  static async getActiveProvider(): Promise<BasePaymentProvider> {
    const integration = await prisma.integration.findFirst({
      where: {
        isActive: true,
        type: {
          in: [IntegrationType.STRIPE, IntegrationType.RAZORPAY],
        },
      },
    });

    if (!integration) {
      throw new Error(`No active payment integration found`);
    }

    let parsedCredentials: any = {};
    if (integration.credentials) {
      try {
        if (typeof integration.credentials === "string") {
          // If it is a encrypted JSON string, decrypt it
          parsedCredentials = JSON.parse(decrypt(integration.credentials));
        } else {
          parsedCredentials = integration.credentials;
        }
      } catch (err) {
        console.error("Error decrypting/parsing integration credentials:", err);
        parsedCredentials = integration.credentials; // fallback
      }
    }

    // Resolve corresponding class
    switch (integration.type) {
      case IntegrationType.STRIPE:
        return new StripePaymentProvider(parsedCredentials);
      case IntegrationType.RAZORPAY:
        return new RazorpayPaymentProvider(parsedCredentials);
      default:
        throw new Error(`Unsupported payment integration type: ${integration.type}`);
    }
  }
}
