import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { prisma } from "../../config/prisma";
import { authenticate } from "../../middleware/auth";
import { validateBody } from "../../middleware/validate";
import { ApiResponse } from "../../middleware/responseHandler";
import { assertStaffOwned } from "../../lib/tenant";

const router = Router();

const staffProfileSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email().max(200).nullable().optional(),
  phone: z.string().max(20).nullable().optional(),
  role: z.string().max(100).nullable().optional(),
  specialty: z.string().max(200).nullable().optional(),
  image: z.string().url().max(500).nullable().optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Use a #RRGGBB color").nullable().optional(),
  isActive: z.boolean().optional(),
  serviceIds: z.array(z.string().cuid()).max(100).optional(),
});

const staffUpdateSchema = staffProfileSchema.partial().omit({ name: true }).extend({
  name: z.string().min(1).max(200).optional(),
});

const staffInclude = {
  services: { select: { id: true, name: true } },
  availability: { orderBy: [{ dayOfWeek: "asc" as const }, { startTime: "asc" as const }] },
  _count: { select: { allocations: true } },
};

// GET /staff — providers with services + hours
router.get(
  "/",
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.userId as string;
      const active = req.query.active as string | undefined;
      const staff = await prisma.staff.findMany({
        where: {
          userId,
          ...(active === "true" ? { isActive: true } : {}),
          ...(active === "false" ? { isActive: false } : {}),
        },
        orderBy: { name: "asc" },
        include: staffInclude,
      });
      res.json(new ApiResponse({ staff }, "Staff fetched successfully", true));
    } catch (error) {
      next(error);
    }
  },
);

// POST /staff — create provider profile (a resource profile, NOT a login)
router.post(
  "/",
  authenticate,
  validateBody(staffProfileSchema),
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

      const member = await prisma.staff.create({
        data: {
          userId,
          ...fields,
          ...(serviceIds?.length && {
            services: { connect: serviceIds.map((id: string) => ({ id })) },
          }),
        },
        include: staffInclude,
      });
      res.status(201).json(new ApiResponse({ staff: member }, "Provider created", true));
    } catch (error) {
      next(error);
    }
  },
);

// GET /staff/:staffId — provider workspace detail
router.get(
  "/:staffId",
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const staffId = req.params.staffId as string;
      const userId = req.user?.userId as string;
      await assertStaffOwned(userId, staffId);

      const [member, upcoming, pastCount] = await Promise.all([
        prisma.staff.findUnique({
          where: { id: staffId },
          include: {
            services: { select: { id: true, name: true, duration: true } },
            availability: {
              orderBy: [{ dayOfWeek: "asc" as const }, { startTime: "asc" as const }],
            },
            timeOffs: {
              where: { endDate: { gte: new Date() } },
              orderBy: { startDate: "asc" },
            },
            breaks: {
              orderBy: [{ dayOfWeek: "asc" as const }, { startTime: "asc" as const }],
            },
            _count: { select: { allocations: true } },
          },
        }),
        prisma.booking.findMany({
          where: {
            userId,
            startTime: { gte: new Date() },
            status: { notIn: ["CANCELLED"] },
            allocations: { some: { staffId } },
          },
          orderBy: { startTime: "asc" },
          take: 25,
          include: {
            service: { select: { id: true, name: true, duration: true } },
            customer: { select: { id: true, name: true, phone: true } },
          },
        }),
        prisma.booking.count({
          where: {
            userId,
            startTime: { lt: new Date() },
            allocations: { some: { staffId } },
          },
        }),
      ]);

      if (!member) {
        res.status(404).json(new ApiResponse(null, "Provider not found", false));
        return;
      }

      res.json(
        new ApiResponse(
          { staff: member, upcomingBookings: upcoming, pastBookings: pastCount },
          "Provider fetched successfully",
          true,
        ),
      );
    } catch (error) {
      next(error);
    }
  },
);

// PATCH /staff/:staffId
router.patch(
  "/:staffId",
  authenticate,
  validateBody(staffUpdateSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const staffId = req.params.staffId as string;
      const userId = req.user?.userId as string;
      await assertStaffOwned(userId, staffId);

      const { serviceIds, ...fields } = req.body as Record<string, unknown>;
      if (Array.isArray(serviceIds)) {
        const ids = serviceIds as string[];
        const n = await prisma.service.count({ where: { id: { in: ids }, userId } });
        if (n !== ids.length) {
          res.status(422).json(new ApiResponse(null, "One or more services are invalid", false));
          return;
        }
        await prisma.staff.update({
          where: { id: staffId },
          data: { services: { set: ids.map((id) => ({ id })) } },
        });
      }
      const member = await prisma.staff.update({
        where: { id: staffId },
        data: { ...fields },
        include: staffInclude,
      });
      res.json(new ApiResponse({ staff: member }, "Provider updated", true));
    } catch (error) {
      next(error);
    }
  },
);

// DELETE /staff/:staffId — archive when future bookings reference them
router.delete(
  "/:staffId",
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const staffId = req.params.staffId as string;
      const userId = req.user?.userId as string;
      await assertStaffOwned(userId, staffId);

      const upcoming = await prisma.bookingAllocation.count({
        where: {
          staffId,
          booking: {
            userId,
            startTime: { gte: new Date() },
            status: { notIn: ["CANCELLED", "COMPLETED", "NO_SHOW"] },
          },
        },
      });
      if (upcoming > 0) {
        await prisma.staff.update({ where: { id: staffId }, data: { isActive: false } });
        res.json(
          new ApiResponse(
            { archived: true },
            "Provider has upcoming bookings — deactivated instead of deleted",
            true,
          ),
        );
        return;
      }
      await prisma.staff.delete({ where: { id: staffId } });
      res.json(new ApiResponse(null, "Provider deleted", true));
    } catch (error) {
      next(error);
    }
  },
);

export default router;
