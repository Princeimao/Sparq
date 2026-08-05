import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { prisma } from "../../config/prisma";
import { authenticate } from "../../middleware/auth";
import { validateBody } from "../../middleware/validate";
import { ApiResponse } from "../../middleware/responseHandler";

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

router.get(
  "/",
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.userId as string;

      const workflows = await prisma.workflow.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
      });

      res.status(200).json(new ApiResponse(workflows, 'Workflows fetched successfully', true));
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  "/:workflowId",
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const workflowId = req.params.workflowId as string;
      const userId = req.user?.userId as string;

      const workflow = await prisma.workflow.findFirst({
        where: { id: workflowId, userId },
      });

      if (!workflow) {
        res.status(404).json(new ApiResponse(null, 'Workflow not found', false));
        return;
      }

      res.status(200).json(new ApiResponse(workflow, 'Workflow fetched successfully', true));
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  "/",
  authenticate,
  validateBody(createWorkflowSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.userId as string;
      const { name, description, triggerType, steps, isActive } = req.body;

      const workflow = await prisma.workflow.create({
        data: {
          userId,
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

router.patch(
  "/:workflowId",
  authenticate,
  validateBody(updateWorkflowSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const workflowId = req.params.workflowId as string;
      const userId = req.user?.userId as string;

      const existing = await prisma.workflow.findFirst({
        where: {
          id: workflowId,
          userId
        },
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

router.delete(
  "/:workflowId",
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const workflowId = req.params.workflowId as string;
      const userId = req.user?.userId as string;

      const existing = await prisma.workflow.findFirst({
        where: {
          id: workflowId,
          userId
        },
      });

      if (!existing) {
        res.status(404).json(new ApiResponse(null, 'Workflow not found', false));
        return;
      }

      await prisma.workflow.delete({
        where: { id: workflowId },
      });

      res.status(200).json(new ApiResponse(null, 'Workflow deleted successfully', true));
    } catch (error) {
      next(error);
    }
  }
);

export default router;
