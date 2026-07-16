import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { prisma } from "../../config/prisma";
import { authenticate, requireOrg } from "../../middleware/auth";
import { validateBody } from "../../middleware/validate";

const router = Router();

const createWorkflowSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  triggerType: z.string().min(1),
  steps: z.array(z.record(z.unknown())),
  isActive: z.boolean().default(true),
});

const updateWorkflowSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  triggerType: z.string().optional(),
  steps: z.array(z.record(z.unknown())).optional(),
  isActive: z.boolean().optional(),
});

// ─── GET /api/organizations/:orgId/workflows ─────────────────────────────────
router.get(
  "/:orgId/workflows",
  authenticate,
  requireOrg,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.organizationId as string;

      const workflows = await prisma.workflow.findMany({
        where: { organizationId: orgId },
        orderBy: { createdAt: "desc" },
      });

      res.json({ workflows });
    } catch (error) {
      next(error);
    }
  }
);

// ─── GET /api/organizations/:orgId/workflows/:workflowId ───────────────────
router.get(
  "/:orgId/workflows/:workflowId",
  authenticate,
  requireOrg,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.organizationId as string;
      const workflowId = req.params.workflowId as string;

      const workflow = await prisma.workflow.findFirst({
        where: { id: workflowId, organizationId: orgId },
      });

      if (!workflow) {
        res.status(404).json({ error: "Workflow not found" });
        return;
      }

      res.json({ workflow });
    } catch (error) {
      next(error);
    }
  }
);

// ─── POST /api/organizations/:orgId/workflows ────────────────────────────────
router.post(
  "/:orgId/workflows",
  authenticate,
  requireOrg,
  validateBody(createWorkflowSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.organizationId as string;
      const { name, description, triggerType, steps, isActive } = req.body;

      const workflow = await prisma.workflow.create({
        data: {
          organizationId: orgId,
          name,
          description,
          triggerType,
          steps,
          isActive,
        },
      });

      res.status(201).json({ workflow });
    } catch (error) {
      next(error);
    }
  }
);

// ─── PATCH /api/organizations/:orgId/workflows/:workflowId ───────────────────
router.patch(
  "/:orgId/workflows/:workflowId",
  authenticate,
  requireOrg,
  validateBody(updateWorkflowSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const workflowId = req.params.workflowId as string;
      const existing = await prisma.workflow.findFirst({
        where: { id: workflowId, organizationId: req.organizationId },
      });

      if (!existing) {
        res.status(404).json({ error: "Workflow not found" });
        return;
      }

      const workflow = await prisma.workflow.update({
        where: { id: workflowId },
        data: req.body,
      });

      res.json({ workflow });
    } catch (error) {
      next(error);
    }
  }
);

// ─── DELETE /api/organizations/:orgId/workflows/:workflowId ──────────────────
router.delete(
  "/:orgId/workflows/:workflowId",
  authenticate,
  requireOrg,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const workflowId = req.params.workflowId as string;
      const existing = await prisma.workflow.findFirst({
        where: { id: workflowId, organizationId: req.organizationId },
      });

      if (!existing) {
        res.status(404).json({ error: "Workflow not found" });
        return;
      }

      await prisma.workflow.delete({
        where: { id: workflowId },
      });

      res.json({ message: "Workflow deleted successfully" });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
