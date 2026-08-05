import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { prisma } from "../../config/prisma";
import { validateBody } from "../../middleware/validate";
import { encryptJson, decryptJson } from "../../lib/encryption";
import { $Enums } from "@sparq/database";
import { ApiResponse } from "../../middleware/responseHandler";

const router = Router();

const updateIntegrationSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  credentials: z.record(z.unknown()).optional(),
  isActive: z.boolean().optional(),
});

const stripeConnectSchema = z.object({
  publishableKey: z.string().min(1, "Publishable key is required"),
  secretKey: z.string().min(1, "Secret key is required"),
  activate: z.boolean().default(true),
});

const razorpayConnectSchema = z.object({
  keyId: z.string().min(1, "Key ID is required"),
  keySecret: z.string().min(1, "Key secret is required"),
  activate: z.boolean().default(true),
});

const calcomConnectSchema = z.object({
  apiKey: z.string().min(1, "Cal.com API key is required"),
  bookingUrl: z.string().url().optional().or(z.literal("")),
  activate: z.boolean().default(true),
});

const woocommerceConnectSchema = z.object({
  storeUrl: z.string().url("Store URL must be a valid URL"),
  consumerKey: z.string().min(1, "Consumer key is required"),
  consumerSecret: z.string().min(1, "Consumer secret is required"),
  activate: z.boolean().default(true),
});

async function deactivateSiblingPayment(
  userId: string,
  currentType: "STRIPE" | "RAZORPAY",
) {
  const sibling: $Enums.IntegrationType =
    currentType === "STRIPE" ? "RAZORPAY" : "STRIPE";
  await prisma.integration.updateMany({
    where: { userId, type: sibling, isActive: true },
    data: { isActive: false },
  });
}

router.get(
  "/status",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.userId as string;
      const [integrations, whatsappIntegration] = await Promise.all([
        prisma.integration.findMany({
          where: { userId },
          select: {
            id: true,
            type: true,
            name: true,
            isActive: true,
            createdAt: true,
            updatedAt: true,
          },
          orderBy: { createdAt: "asc" },
        }),

        prisma.whatsappIntegration.findFirst({
          where: {
            userId,
          },
          select: {
            id: true,
            isActive: true,
            createdAt: true,
            updatedAt: true,
          },
        }),
      ]);

      res.json(
        new ApiResponse(
          {
            integrations,
            whatsappIntegration,
          },
          "Integrations fetched successfully",
          true,
        ),
      );
    } catch (error) {
      next(error);
    }
  },
);

router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId as string;
    const integrations = await prisma.integration.findMany({
      where: { userId },
      select: { id: true, type: true, name: true, isActive: true },
    });
    res.json({ integrations });
  } catch (error) {
    next(error);
  }
});

router.get(
  "/:integrationId",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const integrationId = req.params.integrationId as string;
      const userId = req.user?.userId as string;

      const integration = await prisma.integration.findFirst({
        where: { id: integrationId, userId },
      });

      if (!integration) {
        res.status(404).json({ error: "Integration not found" });
        return;
      }

      let decryptedCreds = null;
      if (
        integration.credentials &&
        typeof integration.credentials === "string"
      ) {
        try {
          decryptedCreds = decryptJson(integration.credentials as string);
        } catch {
          decryptedCreds = null;
        }
      }

      res.json({
        integration: { ...integration, credentials: decryptedCreds },
      });
    } catch (error) {
      next(error);
    }
  },
);

router.patch(
  "/:integrationId",
  validateBody(updateIntegrationSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const integrationId = req.params.integrationId as string;
      const { name, credentials, isActive } = req.body;
      const data: Record<string, unknown> = {};
      if (name !== undefined) data.name = name;
      if (isActive !== undefined) data.isActive = isActive;
      if (credentials !== undefined)
        data.credentials = encryptJson(credentials);

      const integration = await prisma.integration.update({
        where: { id: integrationId },
        data,
      });

      res.json({ integration: { ...integration, credentials: "••••••••" } });
    } catch (error) {
      next(error);
    }
  },
);

router.delete(
  "/:integrationId",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const integrationId = req.params.integrationId as string;
      await prisma.integration.delete({ where: { id: integrationId } });
      res.json({ message: "Integration deleted" });
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  "/stripe/connect",
  validateBody(stripeConnectSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { publishableKey, secretKey, activate } = req.body;
      const userId = req.user?.userId as string;

      const credentials = { publishableKey, secretKey };
      const encryptedCreds = encryptJson(credentials);

      // Upsert: update if Stripe integration already exists, else create
      const existing = await prisma.integration.findFirst({
        where: { userId, name: "Stripe" },
      });

      let integration;
      if (existing) {
        integration = await prisma.integration.update({
          where: { id: existing.id },
          data: { credentials: encryptedCreds, isActive: activate },
        });
      } else {
        integration = await prisma.integration.create({
          data: {
            userId,
            type: "STRIPE",
            name: "Stripe",
            credentials: encryptedCreds,
            isActive: activate,
          },
        });
      }

      // Deactivate Razorpay if activating Stripe
      if (activate) {
        await deactivateSiblingPayment(userId, "STRIPE");
      }

      res.status(200).json({
        integration: { ...integration, credentials: "••••••••" },
        message: activate
          ? "Stripe connected and activated. Razorpay has been deactivated."
          : "Stripe connected.",
      });
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  "/razorpay/connect",
  validateBody(razorpayConnectSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { keyId, keySecret, activate } = req.body;
      const userId = req.user?.userId as string;

      const credentials = { keyId, keySecret };
      const encryptedCreds = encryptJson(credentials);

      const existing = await prisma.integration.findFirst({
        where: { userId, name: "Razorpay" },
      });

      let integration;
      if (existing) {
        integration = await prisma.integration.update({
          where: { id: existing.id },
          data: { credentials: encryptedCreds, isActive: activate },
        });
      } else {
        integration = await prisma.integration.create({
          data: {
            userId,
            type: "RAZORPAY",
            name: "Razorpay",
            credentials: encryptedCreds,
            isActive: activate,
          },
        });
      }

      // Deactivate Stripe if activating Razorpay
      if (activate) {
        await deactivateSiblingPayment(userId, "RAZORPAY");
      }

      res.status(200).json({
        integration: { ...integration, credentials: "••••••••" },
        message: activate
          ? "Razorpay connected and activated. Stripe has been deactivated."
          : "Razorpay connected.",
      });
    } catch (error) {
      next(error);
    }
  },
);

// POST /integrations/calcom/connect
router.post(
  "/calcom/connect",
  validateBody(calcomConnectSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { apiKey, bookingUrl, activate } = req.body;
      const userId = req.user?.userId as string;

      const credentials = { apiKey, ...(bookingUrl ? { bookingUrl } : {}) };
      const encryptedCreds = encryptJson(credentials);

      const existing = await prisma.integration.findFirst({
        where: { userId, name: "Cal.com" },
      });

      let integration;
      if (existing) {
        integration = await prisma.integration.update({
          where: { id: existing.id },
          data: { credentials: encryptedCreds, isActive: activate },
        });
      } else {
        integration = await prisma.integration.create({
          data: {
            userId,
            type: "CALCOM",
            name: "Cal.com",
            credentials: encryptedCreds,
            isActive: activate,
          },
        });
      }

      res.status(200).json({
        integration: { ...integration, credentials: "••••••••" },
        message: "Cal.com connected successfully.",
      });
    } catch (error) {
      next(error);
    }
  },
);

// POST /integrations/woocommerce/connect
router.post(
  "/woocommerce/connect",
  validateBody(woocommerceConnectSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { storeUrl, consumerKey, consumerSecret, activate } = req.body;
      const userId = req.user?.userId as string;

      const credentials = { storeUrl, consumerKey, consumerSecret };
      const encryptedCreds = encryptJson(credentials);

      const existing = await prisma.integration.findFirst({
        where: { userId, name: "WooCommerce" },
      });

      let integration;
      if (existing) {
        integration = await prisma.integration.update({
          where: { id: existing.id },
          data: { credentials: encryptedCreds, isActive: activate },
        });
      } else {
        integration = await prisma.integration.create({
          data: {
            userId,
            type: "WOOCOMMERCE",
            name: "WooCommerce",
            credentials: encryptedCreds,
            isActive: activate,
          },
        });
      }

      res.status(200).json({
        integration: { ...integration, credentials: "••••••••" },
        message: "WooCommerce connected successfully.",
      });
    } catch (error) {
      next(error);
    }
  },
);

// ─── Toggle Active/Inactive ───────────────────────────────────────────────────

// PATCH /integrations/:integrationId/toggle
router.patch(
  "/:integrationId/toggle",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const integrationId = req.params.integrationId as string;
      const userId = req.user?.userId as string;

      const integration = await prisma.integration.findFirst({
        where: { id: integrationId, userId },
      });

      if (!integration) {
        res.status(404).json({ error: "Integration not found" });
        return;
      }

      const newActiveState = !integration.isActive;

      // Payment exclusivity: if activating a payment provider, deactivate sibling
      if (
        newActiveState &&
        (integration.type === "STRIPE" || integration.type === "RAZORPAY")
      ) {
        await deactivateSiblingPayment(
          userId,
          integration.type as "STRIPE" | "RAZORPAY",
        );
      }

      const updated = await prisma.integration.update({
        where: { id: integrationId },
        data: { isActive: newActiveState },
        select: { id: true, name: true, type: true, isActive: true },
      });

      res.json({
        integration: updated,
        message: `${integration.name} ${newActiveState ? "activated" : "deactivated"} successfully.`,
      });
    } catch (error) {
      next(error);
    }
  },
);

// DELETE /integrations/:integrationId/disconnect — remove credentials & deactivate
router.delete(
  "/:integrationId/disconnect",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const integrationId = req.params.integrationId as string;
      const userId = req.user?.userId as string;

      const integration = await prisma.integration.findFirst({
        where: { id: integrationId, userId },
      });

      if (!integration) {
        res.status(404).json({ error: "Integration not found" });
        return;
      }

      await prisma.integration.delete({ where: { id: integrationId } });

      res.json({ message: `${integration.name} disconnected successfully.` });
    } catch (error) {
      next(error);
    }
  },
);

export default router;
