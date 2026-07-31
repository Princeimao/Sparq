import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { prisma } from "../../config/prisma";
import { authenticate } from "../../middleware/auth";
import { validateBody } from "../../middleware/validate";
import { ApiResponse } from "../../middleware/responseHandler";
import { FlowPublishService } from "../../services/flow-publish.service";
import { FlowStatus } from "@prisma/client";

const router = Router();
const flowPublishService = new FlowPublishService();

const flowBlockSchema = z.object({
  id: z.string().min(1),
  type: z.string().min(1),
  label: z.string().optional(),
  required: z.boolean().default(false),
  options: z.array(z.union([z.string(), z.object({ id: z.string(), title: z.string() })])).optional(),
  placeholder: z.string().optional(),
  description: z.string().optional(),
});

export const createFlowSchema = z.object({
  name: z.string().min(1).max(200),
  endpointUrl: z.string().url().optional().or(z.string().length(0)),
  status: z.nativeEnum(FlowStatus).optional(),
  flowSchema: z.object({
    version: z.number().default(1),
    blocks: z.array(flowBlockSchema),
  }),
});

export const updateFlowSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  endpointUrl: z.string().url().optional().or(z.string().length(0)),
  status: z.nativeEnum(FlowStatus).optional(),
  flowSchema: z
    .object({
      version: z.number().default(1),
      blocks: z.array(flowBlockSchema),
    })
    .optional(),
});

// GET /flows - List user flows
router.get(
  "/flows",
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.userId as string;

      const flows = await prisma.flow.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
      });

      res
        .status(200)
        .json(new ApiResponse({ flows }, "Flows fetched successfully.", true));
    } catch (error) {
      next(error);
    }
  }
);

// GET /flows/:id - Get flow details
router.get(
  "/flows/:id",
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.userId as string;
      const { id } = req.params;

      const flow = await prisma.flow.findFirst({
        where: { id: id as string, userId },
      });

      if (!flow) {
        res
          .status(404)
          .json(new ApiResponse(null, "Flow not found.", false));
        return;
      }

      res
        .status(200)
        .json(new ApiResponse({ flow }, "Flow fetched successfully.", true));
    } catch (error) {
      next(error);
    }
  }
);

// POST /flows - Create new flow
router.post(
  "/flows",
  authenticate,
  validateBody(createFlowSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.userId as string;
      const { name, endpointUrl, flowSchema, status } = req.body;

      const flow = await prisma.flow.create({
        data: {
          userId,
          name,
          endpointUrl: endpointUrl || null,
          flowSchema,
          status: status || FlowStatus.DRAFT,
        },
      });

      res
        .status(201)
        .json(new ApiResponse({ flow }, "Flow created successfully.", true));
    } catch (error) {
      next(error);
    }
  }
);

// PATCH /flows/:id - Update flow
router.patch(
  "/flows/:id",
  authenticate,
  validateBody(updateFlowSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.userId as string;
      const { id } = req.params;

      const existing = await prisma.flow.findFirst({
        where: { id: id as string, userId },
      });

      if (!existing) {
        res
          .status(404)
          .json(new ApiResponse(null, "Flow not found.", false));
        return;
      }

      const updatedFlow = await prisma.flow.update({
        where: { id: id as string },
        data: req.body,
      });

      res
        .status(200)
        .json(
          new ApiResponse({ flow: updatedFlow }, "Flow updated successfully.", true)
        );
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /flows/:id - Delete flow
router.delete(
  "/flows/:id",
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.userId as string;
      const { id } = req.params;

      const existing = await prisma.flow.findFirst({
        where: { id: id as string, userId },
      });

      if (!existing) {
        res
          .status(404)
          .json(new ApiResponse(null, "Flow not found.", false));
        return;
      }

      await prisma.flow.delete({
        where: { id: id as string },
      });

      res
        .status(200)
        .json(new ApiResponse(null, "Flow deleted successfully.", true));
    } catch (error) {
      next(error);
    }
  }
);

// POST /flows/:id/publish - Publish flow to Meta WhatsApp
router.post(
  "/flows/:id/publish",
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.userId as string;
      const { id } = req.params;

      const result = await flowPublishService.publishFlow(id as string, userId);

      res
        .status(200)
        .json(
          new ApiResponse(
            result,
            "Flow published to WhatsApp successfully.",
            true
          )
        );
    } catch (error: any) {
      res
        .status(400)
        .json(
          new ApiResponse(
            null,
            error.message || "Failed to publish flow to WhatsApp.",
            false
          )
        );
    }
  }
);

export default router;