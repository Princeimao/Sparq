import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { prisma } from "../../config/prisma";
import { authenticate, requireOrg, requireRole } from "../../middleware/auth";
import { validateBody } from "../../middleware/validate";
import { encryptJson, decryptJson } from "../../lib/encryption";

const router = Router();

const createIntegrationSchema = z.object({
  type: z.enum(["WHATSAPP", "PAYMENT", "STORE", "CUSTOM_API"]),
  name: z.string().min(1).max(100),
  credentials: z.record(z.unknown()).optional(),
  isActive: z.boolean().default(true),
});

const updateIntegrationSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  credentials: z.record(z.unknown()).optional(),
  isActive: z.boolean().optional(),
});

router.post(
  "/:orgId/integrations",
  authenticate,
  requireOrg,
  requireRole("OWNER", "ADMIN"),
  validateBody(createIntegrationSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { type, name, credentials, isActive } = req.body;

      const encryptedCreds = encryptJson(credentials)

      const integration = await prisma.integration.create({
        data: {
          organizationId: req.organizationId!,
          type,
          name,
          credentials: encryptedCreds,
          isActive,
        },
      });

      res.status(201).json({
        integration: {
          ...integration,
          credentials: credentials ? "••••••••••••••••" : null,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  "/:orgId/integrations",
  authenticate,
  requireOrg,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.organizationId as string;
      const integrations = await prisma.integration.findMany({
        where: { organizationId: orgId },
        select: {
          id: true,
          type: true,
          name: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      res.json({ integrations });
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  "/:orgId/integrations/:integrationId",
  authenticate,
  requireOrg,
  requireRole("OWNER", "ADMIN"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const integrationId = req.params.integrationId as string;
      const orgId = req.organizationId as string;
      const integration = await prisma.integration.findFirst({
        where: {
          id: integrationId,
          organizationId: orgId,
        },
      });

      if (!integration) {
        res.status(404).json({ error: "Integration not found" });
        return;
      }

      // Decrypt credentials for owner/admin
      let decryptedCreds = null;
      if (integration.credentials && typeof integration.credentials === "string") {
        try {
          decryptedCreds = decryptJson(integration.credentials as string);
        } catch {
          decryptedCreds = null;
        }
      }

      res.json({
        integration: {
          ...integration,
          credentials: decryptedCreds,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

router.patch(
  "/:orgId/integrations/:integrationId",
  authenticate,
  requireOrg,
  requireRole("OWNER", "ADMIN"),
  validateBody(updateIntegrationSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, credentials, isActive } = req.body;

      const integrationId = req.params.integrationId as string;
      const data: Record<string, unknown> = {};
      if (name !== undefined) data.name = name;
      if (isActive !== undefined) data.isActive = isActive;
      if (credentials !== undefined) {
        data.credentials = encryptJson(credentials);
      }

      const integration = await prisma.integration.update({
        where: { id: integrationId },
        data,
      });

      res.json({
        integration: {
          ...integration,
          credentials: "••••••••",
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

router.delete(
  "/:orgId/integrations/:integrationId",
  authenticate,
  requireOrg,
  requireRole("OWNER"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const integrationId = req.params.integrationId as string;
      await prisma.integration.delete({
        where: { id: integrationId },
      });
      res.json({ message: "Integration deleted" });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
