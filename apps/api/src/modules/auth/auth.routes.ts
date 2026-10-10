import { Router, Response } from "express";
import { OAuth2Client } from "google-auth-library";
import jwt from "jsonwebtoken";
import { env } from "../../config/env";
import { prisma } from "../../config/prisma";
import { authenticate, AuthPayload } from "../../middleware/auth";
import { exchangeToken, getGoogleAuthUrl, getUserInfo } from "../../lib/auth";
import { generateAccessToken, generateRefreshToken } from "../../utils/jwt.utils";

const codeVerifierStore = new Map<string, string>();

const router = Router();

// ─── Secure cookie helpers ──────────────────────────────────────────────────
// Tokens live ONLY in httpOnly cookies — they are never returned in response
// bodies and never placed in redirect URLs. JS (and XSS) cannot read them.

const ACCESS_COOKIE = "access_token";
const REFRESH_COOKIE = "refresh_token";
// Scoped so the long-lived refresh token is only sent to auth endpoints.
const REFRESH_COOKIE_PATH = "/api/auth";

function setAuthCookies(res: Response, accessToken: string, refreshToken: string): void {
  res.cookie(ACCESS_COOKIE, accessToken, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 15 * 60 * 1000, // 15 minutes
  });
  res.cookie(REFRESH_COOKIE, refreshToken, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    path: REFRESH_COOKIE_PATH,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
}

function clearAuthCookies(res: Response): void {
  res.clearCookie(ACCESS_COOKIE, { path: "/" });
  res.clearCookie(REFRESH_COOKIE, { path: REFRESH_COOKIE_PATH });
}

const googleClient = new OAuth2Client(
  env.GOOGLE_CLIENT_ID,
  env.GOOGLE_CLIENT_SECRET,
  env.GOOGLE_REDIRECT_URI
);

router.get("/google", (_req, res) => {
  const { url, codeVerifier, state } = getGoogleAuthUrl();
  codeVerifierStore.set(state, codeVerifier);
  res.redirect(url);
});

router.get("/google/callback", async (req, res, next) => {
  try {
    const { code, state } = req.query as { code: string, state: string };
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

    const accessToken = generateAccessToken(user.id, user.email);
    const refreshToken = generateRefreshToken(user.id, user.email);

    setAuthCookies(res, accessToken, refreshToken);

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl
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

    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
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

export default router;


