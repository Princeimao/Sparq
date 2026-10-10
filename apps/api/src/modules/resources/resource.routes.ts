import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { prisma } from "../../config/prisma";
import { authenticate } from "../../middleware/auth";
import { validateBody } from "../../middleware/validate";
import { ApiResponse } from "../../middleware/responseHandler";
import { assertResourceOwned } from "../../lib/tenant";

const router = Router();

const resourceSchema = z.object({
  name: z.string().min(1).max(200),
  kind: z.enum(["TABLE", "ROOM", "EQUIPMENT", "OTHER"]).default("OTHER"),
  description: z.string().max(1000).nullable().optional(),
  image: z.string().url().max(500).nullable().optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Use a #RRGGBB color").nullable().optional(),
  capacity: z.number().int().positive().max(10000).nullable().optional(),
  isActive: z.boolean().optional(),
  locationMode: z.enum(["AT_BUSINESS", "AT_CUSTOMER", "BOTH"]).nullable().optional(),
  serviceIds: z.array(z.string().cuid()).max(100).optional(),
});

const resourceUpdateSchema = resourceSchema.partial().omit({ kind: true }).extend({
  kind: z.enum(["TABLE", "ROOM", "EQUIPMENT", "OTHER"]).optional(),
});

const resourceInclude = {
  serviceLinks: {
    include: { service: { select: { id: true, name: true } } },
  },
  availability: { orderBy: [{ dayOfWeek: "asc" as const }, { startTime: "asc" as const }] },
  _count: { select: { allocations: true } },
};

// GET /resources — spaces & equipment (people live under /staff)
router.get(
  "/",
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.userId as string;
      const kind = req.query.kind as string | undefined;
      const resources = await prisma.resource.findMany({
        where: {
          userId,
          ...(kind ? { kind: kind as never } : {}),
        },
        orderBy: [{ kind: "asc" }, { name: "asc" }],
        include: resourceInclude,
      });
      res.json(new ApiResponse({ resources }, "Resources fetched successfully", true));
    } catch (error) {
      next(error);
    }
  },
);

// POST /resources
router.post(
  "/",
  authenticate,
  validateBody(resourceSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.userId as string;
      const { serviceIds, ...fields } = req.body;

      if (serviceIds?.length) {
        const n = await prisma.service.count({ where: { id: { in: serviceIds }, userId } });
        if (n !== serviceIds.length) {
          res.status(422).json(new ApiResponse(null, "One or more services are invalid", false));
          return;
        }
      }

      const resource = await prisma.resource.create({
        data: {
          userId,
          ...fields,
          ...(serviceIds?.length && {
            serviceLinks: { create: serviceIds.map((serviceId: string) => ({ serviceId })) },
          }),
        },
        include: resourceInclude,
      });
      res.status(201).json(new ApiResponse({ resource }, "Resource created", true));
    } catch (error) {
      next(error);
    }
  },
);

// PATCH /resources/:resourceId
router.patch(
  "/:resourceId",
  authenticate,
  validateBody(resourceUpdateSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const resourceId = req.params.resourceId as string;
      const userId = req.user?.userId as string;
      await assertResourceOwned(userId, resourceId);

      const { serviceIds, ...fields } = req.body as Record<string, unknown>;
      if (Array.isArray(serviceIds)) {
        const ids = serviceIds as string[];
        const n = await prisma.service.count({ where: { id: { in: ids }, userId } });
        if (n !== ids.length) {
          res.status(422).json(new ApiResponse(null, "One or more services are invalid", false));
          return;
        }
        await prisma.$transaction([
          prisma.serviceResource.deleteMany({ where: { resourceId } }),
          prisma.serviceResource.createMany({
            data: ids.map((serviceId) => ({ serviceId, resourceId })),
          }),
        ]);
      }
      const resource = await prisma.resource.update({
        where: { id: resourceId },
        data: { ...fields },
        include: resourceInclude,
      });
      res.json(new ApiResponse({ resource }, "Resource updated", true));
    } catch (error) {
      next(error);
    }
  },
);

// DELETE /resources/:resourceId — archive when future bookings reference it
router.delete(
  "/:resourceId",
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const resourceId = req.params.resourceId as string;
      const userId = req.user?.userId as string;
      await assertResourceOwned(userId, resourceId);

      const upcoming = await prisma.bookingAllocation.count({
        where: {
          resourceId,
          booking: {
            userId,
            startTime: { gte: new Date() },
            status: { notIn: ["CANCELLED", "COMPLETED", "NO_SHOW"] },
          },
        },
      });
      if (upcoming > 0) {
        await prisma.resource.update({ where: { id: resourceId }, data: { isActive: false } });
        res.json(
          new ApiResponse(
            { archived: true },
            "Resource has upcoming bookings — deactivated instead of deleted",
            true,
          ),
        );
        return;
      }
      await prisma.resource.delete({ where: { id: resourceId } });
      res.json(new ApiResponse(null, "Resource deleted", true));
    } catch (error) {
      next(error);
    }
  },
);

export default router;
