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
      const wabaId: string = entry.id;

      // Resolve the userId (SaaS owner) for this WABA once per entry
      const integration = await prisma.whatsappIntegration.findFirst({
        where: { wabaId },
        select: { userId: true },
      });
      const userId = integration?.userId ?? undefined;

      for (const change of entry.changes) {
        const value = change.value;
        if (!value.messages) continue;

        const phoneNumberId: string = value.metadata?.phone_number_id ?? "";
        const customerName: string =
          value.contacts?.[0]?.profile?.name ?? "";

        for (const message of value.messages) {
          const msgType: string = message.type;

          let text = "";
          let interactiveId: string | undefined;
          let messageType: "text" | "interactive" | "button" = "text";

          if (msgType === "text") {
            text = message.text?.body ?? "";
            messageType = "text";
          } else if (msgType === "interactive") {
            const interactive = message.interactive ?? {};
            messageType = "interactive";

            if (interactive.type === "button_reply") {
              interactiveId = interactive.button_reply?.id;
              text = interactive.button_reply?.title ?? "";
            } else if (interactive.type === "list_reply") {
              interactiveId = interactive.list_reply?.id;
              text = interactive.list_reply?.title ?? "";
            } else if (interactive.type === "nfm_reply") {
              // WhatsApp native flow response
              interactiveId = "FLOW_RESPONSE";
              text = JSON.stringify(
                interactive.nfm_reply?.response_json ?? {},
              );
            }
          } else if (msgType === "button") {
            messageType = "button";
            interactiveId = message.button?.payload;
            text = message.button?.text ?? "";
          } else {
            // Image, audio, video, etc. — skip for now
            continue;
          }

          if (!text && !interactiveId) continue;

          // Only enqueue if it's interactive OR has business intent
          if (
            messageType !== "text" ||
            hasBusinessIntend(text)
          ) {
            await enqueueWhatsAppMessage({
              messageId: message.id,
              phoneNumberId,
              wabaId,
              customerWaId: message.from,
              customerName,
              text,
              messageType,
              interactiveId,
              userId,
              timestamp: parseInt(message.timestamp ?? "0", 10) * 1000,
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
      where: { wabaId }
    });

    if (existing) {
      await prisma.whatsappIntegration.update({
        where: { id: existing.id },
        data: credentials
      });
    } else {
      await prisma.whatsappIntegration.create({
        data: {
          userId: orgId,
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

export default router;
