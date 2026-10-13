import { Router, Request, Response, NextFunction } from "express";
import { env } from "../../config/env";
import { prisma } from "../../config/prisma";
import { authenticate } from "../../middleware/auth";
import axios from "axios";
import { decrypt, encrypt } from "../../lib/encryption";
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
        const customerName: string = value.contacts?.[0]?.profile?.name ?? "";

        for (const message of value.messages) {
          const msgType: string = message.type;

          // Idempotency: Meta retries webhooks — skip messages we've
          // already seen (waMessageId is unique in the DB).
          if (message.id) {
            const seen = await prisma.message.findUnique({
              where: { waMessageId: message.id },
              select: { id: true },
            });
            if (seen) continue;
          }

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
              text = JSON.stringify(interactive.nfm_reply?.response_json ?? {});
            }
          } else if (msgType === "button") {
            messageType = "button";
            interactiveId = message.button?.payload;
            text = message.button?.text ?? "";
          } else {
            continue;
          }

          if (!text && !interactiveId) continue;

          // Only enqueue if it's interactive OR has business intent
          if (messageType !== "text" || hasBusinessIntend(text)) {
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

router.post("/exchange", authenticate, async (req: Request, res: Response) => {
  const userId = req.user?.userId as string;
  const { code, wabaId, phoneNumberId } = req.body;

  if (!code || !wabaId || !phoneNumberId) {
    return res
      .status(400)
      .json({ error: "Missing code, wabaId or phoneNumberId" });
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
      accessToken: encryptedToken,
      wabaId,
      phoneNumberId,
    };

    const existing = await prisma.whatsappIntegration.findUnique({
      where: { userId },
    });

    if (existing) {
      await prisma.whatsappIntegration.update({
        where: { userId },
        data: { ...credentials, isActive: true },
      });
    } else {
      await prisma.whatsappIntegration.create({
        data: {
          userId,
          ...credentials,
        },
      });
    }

    res.status(200).json({
      success: true,
      message: "Successfully connected whatsapp",
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

// PATCH /whatsapp/toggle — flip isActive for the caller's connection
router.patch("/toggle", authenticate, async (req: Request, res: Response) => {
  const userId = req.user?.userId as string;

  const existing = await prisma.whatsappIntegration.findUnique({
    where: { userId },
  });

  if (!existing) {
    return res.status(404).json({ error: "WhatsApp not connected" });
  }

  const updated = await prisma.whatsappIntegration.update({
    where: { userId },
    data: { isActive: !existing.isActive },
    select: { id: true, isActive: true },
  });

  res.json({
    integration: updated,
    message: `WhatsApp ${updated.isActive ? "activated" : "deactivated"} successfully.`,
  });
});

// DELETE /whatsapp/disconnect — remove the caller's connection
router.delete(
  "/disconnect",
  authenticate,
  async (req: Request, res: Response) => {
    const userId = req.user?.userId as string;

    const existing = await prisma.whatsappIntegration.findUnique({
      where: { userId },
    });

    if (!existing) {
      return res.status(404).json({ error: "WhatsApp not connected" });
    }

    await prisma.whatsappIntegration.delete({ where: { userId } });

    res.json({ message: "WhatsApp disconnected successfully." });
  },
);

router.get("/callback", (req: Request, res: Response) => {
  const { code, state, error } = req.query;

  if (error) {
    return res.status(400).send(error);
  }

  console.log("Authorization code:", code);
  console.log("State:", state);

  res.send("Signup completed");
});

// GET /whatsapp/flows-status — can this number use WhatsApp Flows?
//
// Meta only enables Flows for numbers in good standing: the business number
// must hold a GREEN or YELLOW quality rating. New/unrated numbers stay
// locked until Meta deems them credible. This endpoint is the single
// source of truth the dashboard banner reads.
router.get(
  "/flows-status",
  authenticate,
  async (req: Request, res: Response) => {
    const userId = req.user?.userId as string;

    const row = await prisma.whatsappIntegration.findUnique({
      where: { userId },
    });

    if (!row) {
      return res.json({
        connected: false,
        eligible: false,
        qualityRating: null,
        verified: false,
        reason: "not_connected",
      });
    }

    if (!row.isActive) {
      return res.json({
        connected: true,
        eligible: false,
        qualityRating: null,
        verified: false,
        reason: "disabled",
      });
    }

    // Live credibility check against the Meta Graph API.
    try {
      const token = decrypt(row.accessToken);
      const { data } = await axios.get(
        `https://graph.facebook.com/v25.0/${row.phoneNumberId}`,
        {
          params: { fields: "quality_rating", access_token: token },
          timeout: 8000,
        },
      );
      const quality = (data?.quality_rating ?? "UNKNOWN") as string;
      const eligible = quality === "GREEN" || quality === "YELLOW";
      return res.json({
        connected: true,
        eligible,
        qualityRating: quality,
        verified: true,
        reason: eligible ? "ok" : "low_quality",
      });
    } catch {
      // Meta unreachable (or token invalid) — don't hard-lock the builder;
      // surface "pending verification" and let publish enforce later.
      return res.json({
        connected: true,
        eligible: true,
        qualityRating: null,
        verified: false,
        reason: "unverified",
      });
    }
  },
);

export default router;
