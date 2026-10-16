import { Router, Response } from "express";
import { OAuth2Client } from "google-auth-library";
import jwt from "jsonwebtoken";
import { env } from "../../config/env";
import { prisma } from "../../config/prisma";
import { authenticate, AuthPayload } from "../../middleware/auth";
import { exchangeToken, getGoogleAuthUrl, getUserInfo } from "../../lib/auth";
import { mirrorAvatarToBucket } from "../../lib/avatar-mirror";
import {
  generateAccessToken,
  generateRefreshToken,
} from "../../utils/jwt.utils";

const codeVerifierStore = new Map<string, string>();

const router = Router();

const ACCESS_COOKIE = "access_token";
const REFRESH_COOKIE = "refresh_token";
const REFRESH_COOKIE_PATH = "/api/auth";

const COOKIE_SAMESITE = (env.COOKIE_SAMESITE ??
  (env.NODE_ENV === "production" ? "none" : "lax")) as "lax" | "none";
const COOKIE_SECURE = env.COOKIE_SECURE ?? env.NODE_ENV === "production";

export function setAuthCookies(
  res: Response,
  accessToken: string,
  refreshToken: string,
): void {
  res.cookie(ACCESS_COOKIE, accessToken, {
    httpOnly: true,
    secure: COOKIE_SECURE,
    sameSite: COOKIE_SAMESITE,
    path: "/",
    maxAge: 15 * 60 * 1000, // 15 minutes
  });
  res.cookie(REFRESH_COOKIE, refreshToken, {
    httpOnly: true,
    secure: COOKIE_SECURE,
    sameSite: COOKIE_SAMESITE,
    path: REFRESH_COOKIE_PATH,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
}

function clearAuthCookies(res: Response): void {
  // Clearing must mirror the original attributes — otherwise the browser
  // treats it as a different cookie and the session survives logout.
  const base = { secure: COOKIE_SECURE, sameSite: COOKIE_SAMESITE } as const;
  res.clearCookie(ACCESS_COOKIE, { ...base, path: "/" });
  res.clearCookie(REFRESH_COOKIE, { ...base, path: REFRESH_COOKIE_PATH });
}

const googleClient = new OAuth2Client(
  env.GOOGLE_CLIENT_ID,
  env.GOOGLE_CLIENT_SECRET,
  env.GOOGLE_REDIRECT_URI,
);

router.get("/google", (_req, res) => {
  const { url, codeVerifier, state } = getGoogleAuthUrl();
  codeVerifierStore.set(state, codeVerifier);
  res.redirect(url);
});

router.get("/google/callback", async (req, res, next) => {
  try {
    const { code, state } = req.query as { code: string; state: string };
    if (!code) {
      res.status(400).json({ error: "Authorization code is required" });
      return;
    }

    if (!state) {
      res.status(400).json({ error: "State is required" });
      return;
    }

    const codeVerifier = codeVerifierStore.get(state);
    if (!codeVerifier) {
      res.status(400).json({ error: "Code verifier not found for state" });
      return;
    }
    codeVerifierStore.delete(state);

    const idToken = await exchangeToken(code, codeVerifier);
    const payload = getUserInfo(idToken);

    const user = await prisma.user.upsert({
      where: { email: payload.email },
      update: {
        name: payload.name,
        avatarUrl: payload.picture.toString(),
        googleId: payload.sub,
      },
      create: {
        email: payload.email,
        name: payload.name,
        avatarUrl: payload.picture.toString(),
        googleId: payload.sub,
      },
    });

    // Serve the avatar from our own bucket from now on (best-effort).
    const mirrored = await mirrorAvatarToBucket(user.id, payload.picture?.toString());
    const avatarUrl = mirrored ?? user.avatarUrl;
    if (mirrored && mirrored !== user.avatarUrl) {
      await prisma.user.update({
        where: { id: user.id },
        data: { avatarUrl: mirrored },
      });
    }

    const accessToken = generateAccessToken(user.id, user.email);
    const refreshToken = generateRefreshToken(user.id, user.email);

    setAuthCookies(res, accessToken, refreshToken);

    // Cookies carry the session — tokens never go in the URL (they would
    // leak via history, logs and Referer headers).
    res.redirect(`${env.FRONTEND_URL}/auth/callback`);
  } catch (error) {
    next(error);
  }
});

router.post("/google/token", async (req, res, next) => {
  try {
    const { idToken } = req.body;
    if (!idToken) {
      res.status(400).json({ error: "idToken is required" });
      return;
    }

    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      res.status(400).json({ error: "Invalid Google token" });
      return;
    }

    const user = await prisma.user.upsert({
      where: { email: payload.email },
      update: {
        name: payload.name,
        avatarUrl: payload.picture,
        googleId: payload.sub,
      },
      create: {
        email: payload.email,
        name: payload.name,
        avatarUrl: payload.picture,
        googleId: payload.sub,
      },
    });

    // Serve the avatar from our own bucket from now on (best-effort).
    const mirroredTokenAvatar = await mirrorAvatarToBucket(user.id, payload.picture);
    const tokenAvatarUrl = mirroredTokenAvatar ?? user.avatarUrl;
    if (mirroredTokenAvatar && mirroredTokenAvatar !== user.avatarUrl) {
      await prisma.user.update({
        where: { id: user.id },
        data: { avatarUrl: mirroredTokenAvatar },
      });
    }

    const accessToken = generateAccessToken(user.id, user.email);
    const refreshToken = generateRefreshToken(user.id, user.email);

    setAuthCookies(res, accessToken, refreshToken);

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: tokenAvatarUrl,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.post("/refresh", async (req, res, next) => {
  try {
    // Refresh token comes ONLY from the httpOnly cookie — never from the
    // request body, so JS cannot touch it.
    const token = req.cookies?.refresh_token;
    if (!token) {
      res.status(401).json({ error: "Session expired. Please sign in again." });
      return;
    }

    let payload: AuthPayload;
    try {
      payload = jwt.verify(token, env.JWT_REFRESH_SECRET) as AuthPayload;
    } catch {
      clearAuthCookies(res);
      res.status(401).json({ error: "Session expired. Please sign in again." });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    });
    if (!user) {
      clearAuthCookies(res);
      res.status(401).json({ error: "User not found" });
      return;
    }

    // Rotate: every refresh issues a fresh pair.
    const accessToken = generateAccessToken(user.id, user.email);
    const refreshToken = generateRefreshToken(user.id, user.email);

    setAuthCookies(res, accessToken, refreshToken);

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
      },
    });
  } catch {
    res.status(401).json({ error: "Invalid refresh token" });
  }
});

router.get("/me", authenticate, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        createdAt: true,
      },
    });

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.json({ user });
  } catch (error) {
    next(error);
  }
});

router.patch("/me", authenticate, async (req, res, next) => {
  try {
    const { name, avatarUrl } = req.body;
    const user = await prisma.user.update({
      where: { id: req.user!.userId },
      data: {
        ...(name && { name }),
        ...(avatarUrl !== undefined && { avatarUrl }),
      },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        createdAt: true,
      },
    });

    res.json({ user, message: "Profile updated successfully" });
  } catch (error) {
    next(error);
  }
});

router.post("/logout", (_req, res) => {
  clearAuthCookies(res);
  res.json({ message: "Logged out" });
});

// GET /api/auth/session-debug — no auth required. Tells a hosted frontend
// exactly what the browser sent and what cookie policy this deploy runs,
// so "login works but dashboard 401s" can be diagnosed without guessing.
// Safe: reports presence of cookies, never their values.
router.get("/session-debug", (req, res) => {
  const cookies = (req as { cookies?: Record<string, unknown> }).cookies ?? {};
  res.json({
    received: {
      hasAccessCookie: !!cookies[ACCESS_COOKIE],
      hasRefreshCookie: !!cookies[REFRESH_COOKIE],
      cookieNames: Object.keys(cookies),
    },
    effectiveCookiePolicy: {
      sameSite: COOKIE_SAMESITE,
      secure: COOKIE_SECURE,
      refreshPath: REFRESH_COOKIE_PATH,
    },
    request: {
      origin: req.headers.origin ?? null,
      host: req.headers.host ?? null,
      protocol: req.protocol,
      ip: req.ip,
    },
    server: {
      nodeEnv: env.NODE_ENV,
      frontendUrl: env.FRONTEND_URL,
    },
  });
});

export default router;
