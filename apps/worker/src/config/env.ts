import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  REDIS_URL: z.string().url().default("redis://127.0.0.1:6379"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),

  ENCRYPTION_KEY: z.string().min(16),
  WHATSAPP_VERIFY_TOKEN: z.string().min(1),
  WHATSAPP_PHONE_NUMBER_ID: z.string().optional(),
  WHATSAPP_ACCESS_TOKEN: z.string().optional(),

  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),

  FRONTEND_URL: z.string().url().default("http://localhost:3000"),

  GEMINI_API_KEY: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment variables:");
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
