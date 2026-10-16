import { Router, Request, Response } from "express";
import crypto from "crypto";
import axios from "axios";
import jwt from "jsonwebtoken";
import { env } from "../../config/env";
import { prisma } from "../../config/prisma";
import { authenticate, type AuthPayload } from "../../middleware/auth";
import { encrypt } from "../../lib/encryption";
import { setAuthCookies } from "../auth/auth.routes";
import { hasBusinessIntend } from "../../services/whatsappRule";
import { generateAccessToken, generateRefreshToken } from "../../utils/jwt.utils";
import { enqueueInstagramMessage } from "../../queues/instagram.queue";
import { whatsappQueue } from "../../queues/whatsapp.queue";

const router = Router();

// Instagram-native hosts (NOT graph.facebook.com):
//   authorize → www.instagram.com/oauth/authorize
//   code exchange → api.instagram.com/oauth/access_token (form POST)
//   long-lived + profile → graph.instagram.com
const OAUTH_SCOPES = [
  "pages_show_list",
  "pages_read_engagement",
  "instagram_basic",
  "instagram_manage_messages",
  "pages_messaging",
].join(",");

// State → userId for the OAuth round-trip (single-instance caveat shared
// with the WhatsApp embedded-signup flow; entries expire after 15 min).
const connectStates = new Map<string, { userId: string; at: number }>();

function verifyToken(): string {
  return env.IG_VERIFY_TOKEN ?? process.env.IG_VERIFIY_TOKEN ?? "";
}

// ─── Debug (authenticated) ───────────────────────────────────────────────────
// Answers "messages get no reply" in one call: is the number connected,
// did Meta deliver anything lately, and are jobs piling up / failing in
// the worker queue? Never exposes tokens.

router.get("/debug", authenticate, async (req: Request, res: Response) => {
  const userId = req.user?.userId as string;
  const row = await prisma.instagramIntegration.findUnique({
    where: { userId },
    select: {
      igUserId: true,
      igUsername: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  let queue: Record<string, number> | null = null;
  try {
    queue = (await whatsappQueue.getJobCounts(
      "waiting",
      "active",
      "delayed",
      "failed",
      "completed",
    )) as Record<string, number>;
  } catch {
    queue = null;
  }

  res.json({
    connected: !!row,
    integration: row
      ? {
          igUsername: row.igUsername,
          isActive: row.isActive,
          connectedAt: row.createdAt,
          updatedAt: row.updatedAt,
        }
      : null,
    lastWebhookHit: (row?.igUserId && webhookHits.get(row.igUserId)) ?? null,
    queue,
    metaSubscription: await getMetaSubscriptionState(),
    hints: [
      "No webhook hits + failed stays 0 → Meta isn't delivering: check the messages subscription and app mode/testers in the Meta dashboard.",
      "Webhook hits but failed grows → the worker errors: read worker logs for [Worker:INSTAGRAM].",
      "Hits grow and failed stays 0 → replies are being sent: check the IG thread (24h messaging window applies).",
    ],
  });
});

// ─── Meta webhook subscription state ─────────────────────────────────────────
// Reads what Meta thinks is subscribed (object=instagram on this app) and
// lets the user (re)subscribe the `messages` field without touching the
// Meta dashboard: POST /instagram/subscribe { callbackUrl? }.

async function getMetaSubscriptionState(): Promise<
  | { configured: false; reason: string }
  | {
      configured: true;
      callbackUrl: string | null;
      fields: string[];
      active: boolean;
    }
> {
  if (!env.IG_APP_ID || !env.IG_APP_SECRET) {
    return { configured: false, reason: "IG_APP_ID/IG_APP_SECRET missing" };
  }
  try {
    const res = await axios.get(
      `https://graph.facebook.com/v25.0/${env.IG_APP_ID}/subscriptions`,
      {
        params: { access_token: `${env.IG_APP_ID}|${env.IG_APP_SECRET}` },
        timeout: 15000,
      },
    );
    const subs = (res.data?.data ?? []) as {
      object?: string;
      callback_url?: string;
      fields?: { name?: string }[];
      active?: boolean;
    }[];
    const ig = subs.find((s) => s.object === "instagram");
    if (!ig) {
      return { configured: true, callbackUrl: null, fields: [], active: false };
    }
    return {
      configured: true,
      callbackUrl: ig.callback_url ?? null,
      fields: (ig.fields ?? []).map((f) => f.name ?? "").filter(Boolean),
      active: ig.active ?? true,
    };
  } catch (error) {
    console.warn(
      "[instagram] could not read Meta subscriptions:",
      (error as Error)?.message,
    );
    return { configured: false, reason: "Meta API unreachable" };
  }
}

function defaultCallbackUrl(): string | null {
  if (!env.IG_REDIRECT_URI) return null;
  try {
    const u = new URL(env.IG_REDIRECT_URI);
    return `${u.origin}/api/instagram/webhook`;
  } catch {
    return null;
  }
}

router.post("/subscribe", authenticate, async (req: Request, res: Response) => {
  const callbackUrl =
    (req.body?.callbackUrl as string | undefined) ?? defaultCallbackUrl();
  if (!env.IG_APP_ID || !env.IG_APP_SECRET || !callbackUrl) {
    res.status(400).json({
      error:
        "Need IG_APP_ID + IG_APP_SECRET and a callback URL (pass { callbackUrl } or set IG_REDIRECT_URI)",
    });
    return;
  }
  try {
    const subRes = await axios.post(
      `https://graph.facebook.com/v25.0/${env.IG_APP_ID}/subscriptions`,
      new URLSearchParams({
        object: "instagram",
        callback_url: callbackUrl,
        fields: "messages",
        verify_token: verifyToken(),
        access_token: `${env.IG_APP_ID}|${env.IG_APP_SECRET}`,
      }).toString(),
      {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        timeout: 15000,
      },
    );
    console.log(`[instagram] subscribed messages → ${callbackUrl}`);
    res.json({
      subscribed: true,
      callbackUrl,
      meta: subRes.data,
      note: "Meta will now verify the callback URL itself — watch API logs for 'Instagram webhook verified'.",
    });
  } catch (error) {
    const err = error as {
      response?: { status?: number; data?: unknown };
      message?: string;
    };
    console.error(
      "[instagram] subscribe failed:",
      err.response?.status,
      JSON.stringify(err.response?.data)?.slice(0, 500),
    );
    res.status(502).json({
      error: "Meta refused the subscription",
      metaStatus: err.response?.status,
      metaError: err.response?.data,
    });
  }
});

router.get("/webhook", (req: Request, res: Response) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  console.log("hello");
  if (mode === "subscribe" && token && token === verifyToken()) {
    console.log("Instagram webhook verified");
    res.status(200).send(challenge);
  } else {
    console.warn("Instagram webhook verification failed");
    res.sendStatus(403);
  }
});

// In-memory webhook hit log (per IG account) — powers GET /debug so a
// silent pipeline can be diagnosed without guessing which stage dropped it.
const webhookHits = new Map<string, { at: string; count: number }>();

function recordHit(igAccountId: string): void {
  const prev = webhookHits.get(igAccountId);
  webhookHits.set(igAccountId, {
    at: new Date().toISOString(),
    count: (prev?.count ?? 0) + 1,
  });
}

// ─── Webhook receiver (Instagram API with Instagram Login) ───────────────────
// object === "instagram": entry.id is the professional account's IG ID,
// entry.messaging[] carries sender IGSID + message/postback payloads.

router.post("/webhook", async (req: Request, res: Response) => {
  res.sendStatus(200);

  try {
    const body = req.body;
    if (body.object !== "instagram" || !Array.isArray(body.entry)) {
      console.log(`[instagram] webhook ignored: object=${body.object}`);
      return;
    }

    for (const entry of body.entry) {
      // The IG account ID that received the message.
      const igAccountId: string = String(entry.id ?? "");
      if (!igAccountId || !Array.isArray(entry.messaging)) {
        console.log("[instagram] webhook ignored: entry without id/messaging");
        continue;
      }
      recordHit(igAccountId);

      const integration = await prisma.instagramIntegration.findFirst({
        where: { igUserId: igAccountId },
        select: { userId: true, isActive: true, igUsername: true },
      });
      if (!integration) {
        console.warn(
          `[instagram] message for unknown account ${igAccountId} — connect it first`,
        );
        continue;
      }
      // Off means off: don't ingest while the user disabled Instagram.
      if (!integration.isActive) {
        console.log(
          `[instagram] message for @${integration.igUsername ?? igAccountId} skipped (integration off)`,
        );
        continue;
      }

      for (const event of entry.messaging) {
        const senderId: string = String(event.sender?.id ?? "");
        if (!senderId) {
          console.log(`[instagram:${igAccountId}] event without sender, skipped`);
          continue;
        }

        // Echoes are our own outbound messages — never process them.
        if (event.message?.is_echo) {
          console.log(`[instagram:${igAccountId}] echo from ${senderId}, skipped`);
          continue;
        }

        const postback = event.postback;
        const quickReply = event.message?.quick_reply;
        let text = "";
        let interactiveId: string | undefined;
        let messageType: "text" | "interactive" = "text";

        if (quickReply?.payload || postback?.payload) {
          interactiveId = String(quickReply?.payload ?? postback?.payload);
          text = String(
            event.message?.text ?? postback?.title ?? interactiveId,
          );
          messageType = "interactive";
        } else if (typeof event.message?.text === "string") {
          text = event.message.text;
        } else {
          // Attachments, reactions, story mentions, reads: nothing to answer.
          console.log(
            `[instagram:${igAccountId}] non-text event from ${senderId} (keys: ${Object.keys(event).join(",")}), skipped`,
          );
          continue;
        }

        if (!text && !interactiveId) continue;
        // Same cost guard as WhatsApp: plain chit-chat never reaches
        // the worker/LLM pipeline.
        if (messageType === "text" && !hasBusinessIntend(text)) {
          console.log(
            `[instagram:${igAccountId}] no business intent in "${text.slice(0, 60)}", skipped`,
          );
          continue;
        }

        const mid: string = String(
          event.message?.mid ??
            postback?.mid ??
            `${senderId}-${event.timestamp ?? Date.now()}`,
        );

        // Idempotency: Meta retries webhooks — skip mids already stored
        // (provider message ids share the unique waMessageId column).
        const seen = await prisma.message.findUnique({
          where: { waMessageId: mid },
          select: { id: true },
        });
        if (seen) {
          console.log(`[instagram:${igAccountId}] duplicate mid ${mid}, skipped`);
          continue;
        }

        await enqueueInstagramMessage({
          channel: "INSTAGRAM",
          pageId: igAccountId,
          messageId: mid,
          phoneNumberId: "",
          wabaId: "",
          customerWaId: senderId,
          // Instagram webhooks carry no display name.
          customerName: "",
          text,
          messageType,
          interactiveId,
          userId: integration.userId,
          timestamp:
            typeof event.timestamp === "number" ? event.timestamp : Date.now(),
        });
        console.log(
          `[instagram:${igAccountId}] enqueued ${messageType} from ${senderId} (mid ${mid}): "${text.slice(0, 80)}"`,
        );
      }
    }
  } catch (error) {
    console.error("Instagram webhook processing error:", error);
  }
});

// ─── OAuth connect (Instagram Login for professional accounts) ───────────────
// Business AND creator accounts work — personal accounts are rejected at
// the callback with a clear error.
//
// NOTE: this deliberately does NOT use the `authenticate` middleware.
// Connect is a full-page navigation, so the 15-minute access cookie may
// be expired while the 7-day refresh cookie is still valid (XHR callers
// get silent refresh; navigations would just 401 and strand the user on
// a backend JSON page). We rotate from the refresh cookie inline instead,
// and redirect — never JSON — on total session loss.

async function resolveConnectUser(
  req: Request,
  res: Response,
): Promise<AuthPayload | null> {
  const access = req.cookies?.access_token as string | undefined;
  if (access) {
    try {
      return jwt.verify(access, env.JWT_ACCESS_SECRET) as AuthPayload;
    } catch {
      // Fall through to the refresh cookie.
    }
  }

  const refresh = req.cookies?.refresh_token as string | undefined;
  if (!refresh) return null;
  try {
    const payload = jwt.verify(refresh, env.JWT_REFRESH_SECRET) as AuthPayload;
    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user) return null;
    setAuthCookies(
      res,
      generateAccessToken(user.id, user.email),
      generateRefreshToken(user.id, user.email),
    );
    console.log(`[instagram] session rotated for connect (user ${user.id})`);
    return { userId: user.id, email: user.email };
  } catch {
    return null;
  }
}

// Messaging needs the basic profile plus DM send/receive on the account.
const IG_OAUTH_SCOPES = [
  "instagram_business_basic",
  "instagram_business_manage_messages",
].join(",");

router.get("/connect", async (req: Request, res: Response) => {
  const frontend = env.FRONTEND_URL.replace(/\/$/, "");
  const me = await resolveConnectUser(req, res);
  if (!me) {
    // Back to the app with a message — never strand on backend JSON.
    res.redirect(`${frontend}/integrations?ig_error=session_expired`);
    return;
  }
  const userId = me.userId;

  if (!env.IG_APP_ID || !env.IG_REDIRECT_URI) {
    res.status(500).json({
      error: "Instagram login is not configured",
    });
    return;
  }

  const state = crypto.randomBytes(32).toString("hex");

  connectStates.set(state, {
    userId,
    at: Date.now(),
  });

  setTimeout(() => connectStates.delete(state), 15 * 60 * 1000);

  const params = new URLSearchParams({
    client_id: env.IG_APP_ID,
    redirect_uri: env.IG_REDIRECT_URI,
    response_type: "code",
    scope: IG_OAUTH_SCOPES,
    state,
  });

  res.redirect(
    `https://www.instagram.com/oauth/authorize?${params.toString()}`,
  );
});

router.get("/callback", async (req: Request, res: Response) => {
  const frontend = env.FRONTEND_URL.replace(/\/$/, "");
  const fail = (reason: string) =>
    res.redirect(`${frontend}/integrations?ig_error=${reason}`);

  try {
    const { code, state, error: oauthError } = req.query as {
      code?: string;
      state?: string;
      error?: string;
    };
    if (oauthError) {
      console.warn(`[instagram] Meta refused login: ${oauthError}`);
      return fail("access_denied");
    }
    const pending = (state && connectStates.get(state)) || null;
    if (!code || !pending?.userId) {
      console.warn("[instagram] callback without code or valid state");
      return fail("invalid_state");
    }
    connectStates.delete(state as string);

    if (!env.IG_APP_ID || !env.IG_APP_SECRET || !env.IG_REDIRECT_URI) {
      console.error("[instagram] IG_APP_ID/IG_APP_SECRET/IG_REDIRECT_URI missing");
      return fail("not_configured");
    }

    console.log(`[instagram] exchanging code for user ${pending.userId}`);

    // Code → 1-hour token (Instagram-native token endpoint, form-encoded).
    const tokenRes = await axios.post(
      "https://api.instagram.com/oauth/access_token",
      new URLSearchParams({
        client_id: env.IG_APP_ID,
        client_secret: env.IG_APP_SECRET,
        grant_type: "authorization_code",
        redirect_uri: env.IG_REDIRECT_URI,
        code,
      }).toString(),
      {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        timeout: 15000,
      },
    );
    const shortToken = tokenRes.data?.access_token as string | undefined;
    const tokenUserId = tokenRes.data?.user_id as number | string | undefined;
    if (!shortToken) {
      console.warn("[instagram] token exchange returned no access_token");
      return fail("token_exchange_failed");
    }

    // Extend to a 60-day token so the connection survives.
    let userToken = shortToken;
    try {
      const longRes = await axios.get("https://graph.instagram.com/access_token", {
        params: {
          grant_type: "ig_exchange_token",
          client_secret: env.IG_APP_SECRET,
          access_token: shortToken,
        },
        timeout: 15000,
      });
      if (longRes.data?.access_token) userToken = longRes.data.access_token;
    } catch (err) {
      console.warn("[instagram] long-lived exchange failed, keeping 1h token:", (err as Error)?.message);
    }

    // Who just logged in — and are they professional?
    const meRes = await axios.get("https://graph.instagram.com/me", {
      params: {
        fields: "user_id,username,account_type",
        access_token: userToken,
      },
      timeout: 15000,
    });
    const igUserId = String(meRes.data?.user_id ?? tokenUserId ?? "");
    const igUsername = String(meRes.data?.username ?? "");
    const accountType = String(meRes.data?.account_type ?? "").toUpperCase();
    console.log(`[instagram] login as @${igUsername} (${accountType || "unknown type"})`);
    if (!igUserId) {
      console.warn("[instagram] profile lookup returned no user_id");
      return fail("connect_failed");
    }
    if (accountType && !accountType.includes("BUSINESS") && !accountType.includes("CREATOR")) {
      console.warn(`[instagram] personal account @${igUsername} rejected`);
      return fail("personal_account");
    }

    await prisma.instagramIntegration.upsert({
      where: { userId: pending.userId },
      update: {
        pageId: null,
        pageName: null,
        igUserId,
        igUsername,
        accessToken: encrypt(userToken),
        isActive: true,
      },
      create: {
        userId: pending.userId,
        pageId: null,
        pageName: null,
        igUserId,
        igUsername,
        accessToken: encrypt(userToken),
        isActive: true,
      },
    });

    console.log(`[instagram] connected @${igUsername} for user ${pending.userId}`);
    res.redirect(`${frontend}/integrations?connected=instagram`);
  } catch (error) {
    console.error("Instagram OAuth callback failed:", error);
    return fail("connect_failed");
  }
});

// ─── Toggle / disconnect (mirrors the WhatsApp endpoints) ───────────────────

router.patch("/toggle", authenticate, async (req: Request, res: Response) => {
  const userId = req.user?.userId as string;
  const existing = await prisma.instagramIntegration.findUnique({
    where: { userId },
  });
  if (!existing) {
    res.status(404).json({ error: "Instagram not connected" });
    return;
  }
  const updated = await prisma.instagramIntegration.update({
    where: { userId },
    data: { isActive: !existing.isActive },
    select: { id: true, isActive: true },
  });
  res.json({
    integration: updated,
    message: `Instagram ${updated.isActive ? "activated" : "deactivated"} successfully.`,
  });
});

router.delete(
  "/disconnect",
  authenticate,
  async (req: Request, res: Response) => {
    const userId = req.user?.userId as string;
    const existing = await prisma.instagramIntegration.findUnique({
      where: { userId },
    });
    if (!existing) {
      res.status(404).json({ error: "Instagram not connected" });
      return;
    }
    await prisma.instagramIntegration.delete({ where: { userId } });
    res.json({ message: "Instagram disconnected successfully." });
  },
);

export default router;
