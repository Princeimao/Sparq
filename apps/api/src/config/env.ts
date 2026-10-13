import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().default(4000),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),

  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),

  // Google OAuth
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  GOOGLE_REDIRECT_URI: z.string().url(),

  // JWT
  JWT_ACCESS_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),
  JWT_ACCESS_EXPIRES_IN: z.string().default("15m"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("7d"),

  // Encryption
  ENCRYPTION_KEY: z.string().min(16),

  // WhatsApp
  WHATSAPP_VERIFY_TOKEN: z.string().min(1),
  WHATSAPP_PHONE_NUMBER_ID: z.string().optional(),
  WHATSAPP_ACCESS_TOKEN: z.string().optional(),

  // Stripe
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),

  // Razorpay Subscriptions
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),
  RAZORPAY_PLAN_GROWTH_MONTHLY: z.string().optional(),
  RAZORPAY_PLAN_GROWTH_YEARLY: z.string().optional(),
  RAZORPAY_PLAN_PRO_MONTHLY: z.string().optional(),
  RAZORPAY_PLAN_PRO_YEARLY: z.string().optional(),

  // Frontend origin(s) allowed by CORS. Comma-separated to cover the
  // production Vercel URL plus preview deployments, e.g.
  // "https://sparq.vercel.app,https://sparq-git-main-user.vercel.app".
  FRONTEND_URL: z.string().min(1).default("http://localhost:3000"),

  // Session cookies. The hosted frontend (Vercel) and API (Catalyst) are
  // cross-site, so production cookies MUST be SameSite=None; Secure —
  // browsers drop Lax cookies on cross-site fetch, which surfaces as
  // "OAuth works but every dashboard call is 401". Localhost dev stays
  // Lax (SameSite=None without HTTPS is rejected by browsers).
  COOKIE_SAMESITE: z.enum(["lax", "none"]).optional(),
  COOKIE_SECURE: z.coerce.boolean().optional(),

  // Redis
  REDIS_URL: z.string().url(),

  // Langchain Gemini
  GEMINI_API_KEY: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment variables:");
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
