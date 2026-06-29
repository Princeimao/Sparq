import { Router, Request, Response, NextFunction } from "express";
import { env } from "../../config/env";
import { prisma } from "../../config/prisma";
import { processMessage } from "../../services/conversation-engine";

const router = Router();

/**
 * WhatsApp Webhook Verification (GET)
 * Meta sends a GET request to verify the webhook URL during setup.
 */
router.get("/webhook", (req: Request, res: Response) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === env.WHATSAPP_VERIFY_TOKEN) {
    console.log("✅ WhatsApp webhook verified");
    res.status(200).send(challenge);
  } else {
    console.warn("❌ WhatsApp webhook verification failed");
    res.sendStatus(403);
  }
});

/**
 * WhatsApp Webhook Handler (POST)
 * Receives incoming messages, button clicks, and status updates.
 */
router.post("/webhook", async (req: Request, res: Response, _next: NextFunction) => {
  // Always respond 200 immediately (Meta expects fast response)
  res.sendStatus(200);

  try {
    const body = req.body;

    // Validate it's a WhatsApp message notification
    if (body.object !== "whatsapp_business_account") return;

    const entries = body.entry || [];

    for (const entry of entries) {
      const changes = entry.changes || [];

      for (const change of changes) {
        if (change.field !== "messages") continue;

        const value = change.value;

        // Handle status updates (sent, delivered, read, failed)
        if (value.statuses) {
          await handleStatusUpdates(value.statuses);
        }

        // Handle incoming messages
        if (value.messages) {
          const metadata = value.metadata;
          const contacts = value.contacts || [];

          for (const message of value.messages) {
            await handleIncomingMessage(message, metadata, contacts);
          }
        }
      }
    }
  } catch (error) {
    console.error("WhatsApp webhook processing error:", error);
  }
});

/**
 * Handle an incoming WhatsApp message.
 */
async function handleIncomingMessage(
  message: Record<string, unknown>,
  metadata: Record<string, unknown>,
  contacts: Array<Record<string, unknown>>
): Promise<void> {
  const from = message.from as string; // Customer's phone number
  const timestamp = message.timestamp as string;
  const messageId = message.id as string;
  const messageType = message.type as string;

  // Extract message text
  let messageText = "";
  let buttonId = "";

  if (messageType === "text") {
    messageText = (message.text as Record<string, string>)?.body || "";
  } else if (messageType === "interactive") {
    const interactive = message.interactive as Record<string, unknown>;
    const interactiveType = interactive.type as string;

    if (interactiveType === "button_reply") {
      const buttonReply = interactive.button_reply as Record<string, string>;
      buttonId = buttonReply.id || "";
      messageText = buttonReply.title || "";
    } else if (interactiveType === "list_reply") {
      const listReply = interactive.list_reply as Record<string, string>;
      buttonId = listReply.id || "";
      messageText = listReply.title || "";
    }
  } else if (messageType === "button") {
    const button = message.button as Record<string, string>;
    buttonId = button.payload || "";
    messageText = button.text || "";
  }

  // Find customer by phone number
  const customers = await prisma.customer.findMany({
    where: { phone: from },
  });

  if (customers.length === 0) {
    console.log(`Unknown customer: ${from}`);
    return;
  }

  // Process for each org the customer belongs to (usually one)
  for (const customer of customers) {
    // Log the inbound message
    await prisma.message.create({
      data: {
        customerId: customer.id,
        waMessageId: messageId,
        direction: "INBOUND",
        body: messageText,
        status: "DELIVERED",
      },
    });

    // Feed into conversation state machine
    await processMessage(customer.id, messageText, buttonId || undefined);
  }
}

/**
 * Handle message status updates (sent, delivered, read, failed).
 */
async function handleStatusUpdates(
  statuses: Array<Record<string, unknown>>
): Promise<void> {
  for (const status of statuses) {
    const waMessageId = status.id as string;
    const statusValue = status.status as string;

    const statusMap: Record<string, string> = {
      sent: "SENT",
      delivered: "DELIVERED",
      read: "READ",
      failed: "FAILED",
    };

    const mappedStatus = statusMap[statusValue];
    if (!mappedStatus || !waMessageId) continue;

    try {
      await prisma.message.updateMany({
        where: { waMessageId },
        data: { status: mappedStatus as "SENT" | "DELIVERED" | "READ" | "FAILED" },
      });
    } catch {
      // Message might not exist in our DB (e.g., pre-existing messages)
    }
  }
}

export default router;
