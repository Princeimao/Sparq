import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { prisma } from "../../config/prisma";
import { authenticate, requireOrg, requireRole } from "../../middleware/auth";
import { validateBody } from "../../middleware/validate";

const router = Router();

// ─── Schemas ─────────────────────────────────────────────────────────────────

const createCampaignSchema = z.object({
  name: z.string().min(1).max(200),
  productName: z.string().min(1).max(200).optional(),
  reorderAfterDays: z.number().int().min(1).max(365),
  messageTemplate: z.string().max(1024).optional(),
  isActive: z.boolean().default(true),
});

const updateCampaignSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  productName: z.string().min(1).max(200).optional(),
  reorderAfterDays: z.number().int().min(1).max(365).optional(),
  messageTemplate: z.string().max(1024).optional(),
  isActive: z.boolean().optional(),
});

// ─── POST /api/organizations/:orgId/campaigns ────────────────────────────────
router.post(
  "/:orgId/campaigns",
  authenticate,
  requireOrg,
  requireRole("OWNER", "ADMIN"),
  validateBody(createCampaignSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const campaign = await prisma.campaign.create({
        data: {
          organizationId: req.organizationId!,
          ...req.body,
        },
      });
      res.status(201).json({ campaign });
    } catch (error) {
      next(error);
    }
  }
);

// ─── GET /api/organizations/:orgId/campaigns ─────────────────────────────────
router.get(
  "/:orgId/campaigns",
  authenticate,
  requireOrg,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const campaigns = await prisma.campaign.findMany({
        where: { organizationId: req.organizationId },
        include: {
          _count: { select: { orders: true } },
        },
        orderBy: { createdAt: "desc" },
      });
      res.json({ campaigns });
    } catch (error) {
      next(error);
    }
  }
);

// ─── GET /api/organizations/:orgId/campaigns/:campaignId ─────────────────────
router.get(
  "/:orgId/campaigns/:campaignId",
  authenticate,
  requireOrg,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const campaignId = req.params.campaignId as string;
      const campaign = await prisma.campaign.findFirst({
        where: {
          id: campaignId,
          organizationId: req.organizationId,
        },
        include: {
          _count: { select: { orders: true } },
        },
      });

      if (!campaign) {
        res.status(404).json({ error: "Campaign not found" });
        return;
      }

      res.json({ campaign });
    } catch (error) {
      next(error);
    }
  }
);

// ─── PATCH /api/organizations/:orgId/campaigns/:campaignId ───────────────────
router.patch(
  "/:orgId/campaigns/:campaignId",
  authenticate,
  requireOrg,
  requireRole("OWNER", "ADMIN"),
  validateBody(updateCampaignSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const campaignId = req.params.campaignId as string;
      const campaign = await prisma.campaign.update({
        where: { id: campaignId },
        data: req.body,
      });
      res.json({ campaign });
    } catch (error) {
      next(error);
    }
  }
);

// ─── DELETE /api/organizations/:orgId/campaigns/:campaignId ──────────────────
router.delete(
  "/:orgId/campaigns/:campaignId",
  authenticate,
  requireOrg,
  requireRole("OWNER"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const campaignId = req.params.campaignId as string;
      await prisma.campaign.delete({ where: { id: campaignId } });
      res.json({ message: "Campaign deleted" });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
