import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";

import { env } from "./config/env";
import { prisma } from "./config/prisma";
import { errorHandler } from "./middleware/errorHandler";
import { authenticate } from "./middleware/auth";
import { strictAuthLimiter, webhookLimiter } from "./middleware/rateLimit";

import authRoutes from "./modules/auth/auth.routes";
import integrationRoutes from "./modules/integration/integration.routes";
import customerRoutes from "./modules/customer/customer.routes";
import orderRoutes from "./modules/order/order.routes";
import bookingRoutes from "./modules/bookings/booking.routes";
import onboardingRoutes from "./modules/onboarding/onboarding.routes";
import whatsappRoutes from "./modules/whatsapp/whatsapp.routes";
import dashboardRoutes from "./modules/dashboard/dashboard.routes";
import productRoutes from "./modules/product/product.routes";
import flowRoutes from "./modules/flow/flow.routes";
import queueRoutes from "./queues/queue.routes";
import serviceRoutes from "./modules/service/service.routes";
import staffRoutes from "./modules/staff/staff.routes";
import resourceRoutes from "./modules/resources/resource.routes";
import availabilityRoutes from "./modules/availability/availability.routes";
import billingRoutes from "./modules/billing/billing.routes";
import uploadRoutes from "./modules/upload/upload.routes";

const app = express();

app.use(helmet());
app.use(cors({ origin: env.FRONTEND_URL, credentials: true }));
// Capture the raw body for HMAC-verified webhooks (Razorpay).
// `req.rawBody` is set via the Express Request extension in billing routes.
app.use(
  express.json({
    verify: (req, _res, buf) => {
      (req as unknown as Record<string, unknown>)["rawBody"] =
        buf.toString("utf8");
    },
  }),
);
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan("dev"));

app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "sparq-api",
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV,
  });
});

// Auth (public, rate-limited against credential stuffing)
app.use("/api/auth", strictAuthLimiter, authRoutes);

// whatsapp route (public webhook, rate-limited)
app.use("/api/whatsapp", webhookLimiter, whatsappRoutes);

// Billing: authenticated APIs + public Razorpay webhook
// (webhook authenticity is proven via HMAC signature, not JWT).
app.use("/api/billing", billingRoutes);

// authenticated routes
app.use("/api/integrations", authenticate, integrationRoutes);
app.use("/api/customers", authenticate, customerRoutes);
app.use("/api/orders", authenticate, orderRoutes);
app.use("/api/bookings", authenticate, bookingRoutes);
app.use("/api/onboarding", authenticate, onboardingRoutes);
app.use("/api/dashboard", authenticate, dashboardRoutes);
app.use("/api/products", authenticate, productRoutes);
app.use("/api", authenticate, flowRoutes); // /api/flows
app.use("/api/queue", authenticate, queueRoutes); // /api/queue/stats, /api/queue/jobs
app.use("/api/services", authenticate, serviceRoutes);
app.use("/api/staff", authenticate, staffRoutes);
app.use("/api/resources", authenticate, resourceRoutes);
app.use("/api/availability", authenticate, availabilityRoutes);
app.use("/api/upload", authenticate, uploadRoutes);

app.use(errorHandler);

async function main() {
  try {
    await prisma.$connect();
    console.log("Database connected");

    // Note: WhatsApp worker is started in apps/worker — not in the API process.
    // Uncomment the line below only if running in a monolith mode:
    // startWhatsAppWorker();

    app.listen(env.PORT, () => {
      console.log(`Sparq API running on http://localhost:${env.PORT}`);
      console.log(`Environment: ${env.NODE_ENV}`);
      console.log(`Health check: http://localhost:${env.PORT}/api/health\n`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

main();

// Graceful shutdown
process.on("SIGINT", async () => {
  await prisma.$disconnect();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await prisma.$disconnect();
  process.exit(0);
});
