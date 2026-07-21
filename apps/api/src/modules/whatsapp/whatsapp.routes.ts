import { Router, Request, Response, NextFunction } from "express";
import { env } from "../../config/env";
import { prisma } from "../../config/prisma";
import axios from "axios";
import { encrypt } from "../../lib/encryption";
import { hasBusinessIntend } from "../../services/whatsappRule";
import { enqueueWhatsAppMessage } from "../../queues/whatsapp.queue";

const router = Router();

router.get("/webhook", (req: Request, res: Response) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === env.WHATSAPP_VERIFY_TOKEN) {
    console.log("WhatsApp webhook verified");
    res.status(200).send(challenge);
  } else {
    console.warn("WhatsApp webhook verification failed");
    res.sendStatus(403);
  }
});

router.post("/webhook", async (req: Request, res: Response) => {
  res.sendStatus(200);

  try {
    const body = req.body;
    if (body.object !== "whatsapp_business_account") return;

    for (const entry of body.entry) {
      for (const change of entry.changes) {
        const value = change.value;
        if (!value.messages) continue;
        
        for (const message of value.messages) {
          if (message.type !== "text") continue;

          const textMessage = message.text?.body;
          if (hasBusinessIntend(textMessage)) {
            await enqueueWhatsAppMessage({
              messageId: message.id,
              phoneNumberId: value.metadata.phone_number_id,
              wabaId: entry.id,
              customerWaId: message.from,
              customerName: value.contacts?.[0]?.profile?.name || "",
              text: textMessage,
            });
          }
        }
      }
    }
  } catch (error) {
    console.error("WhatsApp webhook processing error:", error);
  }
});

router.post("/exchange", async (req: Request, res: Response) => {
  const { businessId, code, orgId, wabaId, phoneNumberId } = req.body;

  if (!code || !orgId) {
    return res.status(400).json({ error: "No code or orgId provided" });
  }

  try {
    const url = "https://graph.facebook.com/v25.0/oauth/access_token";

    const resToken = await axios.post(url, {
      client_id: process.env.FB_APP_ID,
      client_secret: process.env.FB_APP_SECRET,
      code,
    });

    const accessToken = resToken.data.access_token;

    const encryptedToken = encrypt(accessToken);

    const credentials = {
      businessId,
      accessToken: encryptedToken,
      wabaId,
      phoneNumberId,
    };

    const existing = await prisma.whatsappIntegration.findFirst({
      where: { organizationId: orgId }
    });

    if (existing) {
      await prisma.whatsappIntegration.update({
        where: { id: existing.id },
        data: credentials
      });
    } else {
      await prisma.whatsappIntegration.create({
        data: {
          organizationId: orgId,
          ...credentials,
        }
      });
    }

    res.status(200).json({
      success: true,
      message: "Successfully connected whatsapp"
    });
  } catch (error: any) {
    if (error.response) {
      console.error("Meta API Error:", {
        status: error.response.status,
        data: error.response.data,
        headers: error.response.headers,
      });
    } else if (error.request) {
      console.error("No response received:", error.request);
    } else {
      console.error("Axios setup error:", error.message);
    }

    res.status(500).json({
      error: "Failed to exchange code for token",
    });
  }
});

router.get("/callback", (req: Request, res: Response) => {
  const { code, state, error } = req.query;

  if (error) {
    return res.status(400).send(error);
  }

  console.log("Authorization code:", code);
  console.log("State:", state);

  res.send("Signup completed");
})

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

