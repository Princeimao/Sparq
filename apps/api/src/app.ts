import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";

import { env } from "./config/env";
import { prisma } from "./config/prisma";
import { errorHandler } from "./middleware/errorHandler";
import { startCampaignEngine, triggerCampaignEngine } from "./services/campaign-engine";
import { authenticate, requireOrg, requireRole } from "./middleware/auth";

import authRoutes from "./modules/auth/auth.routes";
import organizationRoutes from "./modules/organization/organization.routes";
import integrationRoutes from "./modules/integration/integration.routes";
import campaignRoutes from "./modules/campaign/campaign.routes";
import customerRoutes from "./modules/customer/customer.routes";
import orderRoutes from "./modules/order/order.routes";
import whatsappRoutes from "./modules/whatsapp/whatsapp.routes";
import paymentRoutes from "./modules/payment/payment.routes";
import conversationRoutes from "./modules/conversation/conversation.routes";
import dashboardRoutes from "./modules/dashboard/dashboard.routes";
import productRoutes from "./modules/product/product.routes";
import appointmentRoutes from "./modules/appointment/appointment.routes";
import workflowRoutes from "./modules/workflow/workflow.routes";

const app = express();

app.use(helmet());
app.use(cors({ origin: env.FRONTEND_URL, credentials: true }));
app.use(express.json());
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

// Auth (public)
app.use("/api/auth", authRoutes);

// WhatsApp webhook (public — verified by token)
app.use("/api/whatsapp", whatsappRoutes);

// Organization-scoped routes
app.use("/api/organizations", organizationRoutes);
app.use("/api/organizations", integrationRoutes);
app.use("/api/organizations", campaignRoutes);
app.use("/api/organizations", customerRoutes);
app.use("/api/organizations", orderRoutes);
app.use("/api/organizations", conversationRoutes);
app.use("/api/organizations", dashboardRoutes);
app.use("/api/organizations", productRoutes);
app.use("/api/organizations", appointmentRoutes);
app.use("/api/organizations", workflowRoutes);

// Payment 
app.use("/api/payments", paymentRoutes);

// ─── Admin: Manually trigger campaign engine ─────────────────────────────────
app.post(
  "/api/admin/trigger-campaigns",
  authenticate,
  async (req, res, next) => {
    try {
      const result = await triggerCampaignEngine();
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

app.use(errorHandler);

async function main() {
  try {
    await prisma.$connect();
    console.log("Database connected");

    // Start the campaign engine
    // if (env.NODE_ENV !== "test") {
    //   startCampaignEngine();
    // }

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
