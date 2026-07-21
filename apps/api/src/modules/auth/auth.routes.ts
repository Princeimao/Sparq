import { Router } from "express";
import { OAuth2Client } from "google-auth-library";
import jwt from "jsonwebtoken";
import { env } from "../../config/env";
import { prisma } from "../../config/prisma";
import { authenticate, AuthPayload } from "../../middleware/auth";
import { exchangeToken, getGoogleAuthUrl, getUserInfo } from "../../lib/auth";
import { generateAccessToken, generateRefreshToken } from "../../utils/jwt.utils";

const codeVerifierStore = new Map<string, string>();

const router = Router();

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

    res.cookie("access_token", accessToken, {
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 15 * 60 * 1000,
    });

    res.cookie("refresh_token", refreshToken, {
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.redirect(
      `${env.FRONTEND_URL}/auth/callback?access_token=${accessToken}&refresh_token=${refreshToken}`
    );
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

    res.json({
      accessToken,
      refreshToken,
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
    const token = req.body.refreshToken || req.cookies?.refresh_token;
    if (!token) {
      res.status(401).json({ error: "Refresh token is required" });
      return;
    }

    const payload = jwt.verify(token, env.JWT_REFRESH_SECRET) as AuthPayload;

    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user) {
      res.status(401).json({ error: "User not found" });
      return;
    }

    const accessToken = generateAccessToken(user.id, user.email);
    const refreshToken = generateRefreshToken(user.id, user.email);

    res.cookie("access_token", accessToken, {
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 15 * 60 * 1000,
    });

    res.cookie("refresh_token", refreshToken, {
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({ accessToken, refreshToken });
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

router.post("/logout", (_req, res) => {
  res.clearCookie("access_token");
  res.clearCookie("refresh_token");
  res.json({ message: "Logged out" });
});

// Test route
router.get("/test", async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      res.status(400).json({ error: "Email and name are required" });
      return;
    }

    const user = await prisma.user.findFirst({
      where: {
        email,
      },
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

    const accessToken = generateAccessToken(user.id, user.email);
    const refreshToken = generateRefreshToken(user.id, user.email);

    res.cookie("access_token", accessToken, {
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 15 * 60 * 1000, // 15 minutes
    });

    res.cookie("refresh_token", refreshToken, {
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.json({ accessToken, refreshToken });
  } catch (error) {
    next(error);
  }
});

export default router;


