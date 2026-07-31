import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";

import { env } from "./config/env";
import { prisma } from "./config/prisma";
import { errorHandler } from "./middleware/errorHandler";
import { authenticate } from "./middleware/auth";

import authRoutes from "./modules/auth/auth.routes";
import integrationRoutes from "./modules/integration/integration.routes";
import customerRoutes from "./modules/customer/customer.routes";
import orderRoutes from "./modules/order/order.routes";
import whatsappRoutes from "./modules/whatsapp/whatsapp.routes";
import dashboardRoutes from "./modules/dashboard/dashboard.routes";
import productRoutes from "./modules/product/product.routes";
import workflowRoutes from "./modules/workflow/workflow.routes";

import { startWhatsAppWorker } from "./workers/whatsapp.worker";

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

// whatsapp route
app.use("/api/whatsapp", whatsappRoutes);

// authenticated routes
app.use("/api/integrations", authenticate, integrationRoutes);
app.use("/api/customers", authenticate, customerRoutes);
app.use("/api/orders", authenticate, orderRoutes);
app.use("/api/dashboard", authenticate, dashboardRoutes);
app.use("/api/products", authenticate, productRoutes);
app.use("/api/workflows", authenticate, workflowRoutes);

app.use(errorHandler);

async function main() {
  try {
    await prisma.$connect();
    console.log("Database connected");

    startWhatsAppWorker();

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
