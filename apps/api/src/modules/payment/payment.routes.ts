import { Router, Request, Response, NextFunction } from "express";
import express from "express";
import { prisma } from "../../config/prisma";
import { verifyWebhookSignature } from "../../services/payment.service";
import { completeOrder } from "../../services/conversation-engine";

const router = Router();

/**
 * Stripe Webhook Handler
 * Listens for payment success events and updates order + conversation state.
 *
 * IMPORTANT: This route needs raw body for signature verification.
 * It should be mounted BEFORE the express.json() middleware in app.ts,
 * or use a specific raw body parser here.
 */
router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  async (req: Request, res: Response, _next: NextFunction) => {
    const sig = req.headers["stripe-signature"] as string;

    if (!sig) {
      res.status(400).json({ error: "Missing stripe-signature header" });
      return;
    }

    try {
      const event = verifyWebhookSignature(req.body, sig);

      switch (event.type) {
        case "checkout.session.completed": {
          const session = event.data.object;
          const orderId = session.metadata?.orderId;
          const organizationId = session.metadata?.organizationId;

          if (!orderId) {
            console.warn("Stripe webhook: no orderId in metadata");
            break;
          }

          console.log(`💳 Payment completed for order ${orderId}`);

          // Update order status
          const order = await prisma.order.update({
            where: { id: orderId },
            data: {
              status: "PAID",
              paymentId: session.id,
            },
          });

          // Find the conversation and complete it
          const conversation = await prisma.conversationState.findFirst({
            where: {
              orderId,
              step: "WAITING_PAYMENT",
            },
          });

          if (conversation) {
            await completeOrder(conversation.id);
          }

          break;
        }

        case "checkout.session.expired": {
          const session = event.data.object;
          const orderId = session.metadata?.orderId;

          if (orderId) {
            console.log(`⏰ Payment expired for order ${orderId}`);
            await prisma.order.update({
              where: { id: orderId },
              data: { status: "CANCELLED" },
            });
          }

          break;
        }

        default:
          console.log(`Unhandled Stripe event: ${event.type}`);
      }

      res.json({ received: true });
    } catch (error) {
      console.error("Stripe webhook error:", error);
      res.status(400).json({ error: "Webhook signature verification failed" });
    }
  }
);

export default router;
