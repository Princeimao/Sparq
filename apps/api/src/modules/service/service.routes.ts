import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { prisma } from "../../config/prisma";
import { authenticate } from "../../middleware/auth";
import { validateBody } from "../../middleware/validate";
import { ApiResponse } from "../../middleware/responseHandler";

const router = Router();

const createServiceSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  price: z.number().min(0).optional(),
  duration: z.number().int().positive().default(60),
  bookingMode: z.enum(["ANY_STAFF", "SELECT_STAFF"]).default("ANY_STAFF"),
});

const updateServiceSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  price: z.number().min(0).optional(),
  duration: z.number().int().positive().optional(),
  bookingMode: z.enum(["ANY_STAFF", "SELECT_STAFF"]).optional(),
});

// GET /services
router.get(
  "/",
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.userId as string;

      const services = await prisma.service.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        include: {
          staff: {
            select: { id: true, name: true, email: true, phone: true, isActive: true },
          },
          _count: { select: { appointments: true } },
        },
      });

      res
        .status(200)
        .json(
          new ApiResponse({ services }, "Services fetched successfully", true),
        );
    } catch (error) {
      next(error);
    }
  },
);

// GET /services/:serviceId
router.get(
  "/:serviceId",
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const serviceId = req.params.serviceId as string;
      const userId = req.user?.userId as string;

      const service = await prisma.service.findFirst({
        where: { id: serviceId, userId },
        include: {
          staff: true,
          appointments: {
            take: 5,
            orderBy: { startTime: "desc" },
          },
        },
      });

      if (!service) {
        res.status(404).json(new ApiResponse(null, "Service not found", false));
        return;
      }

      res
        .status(200)
        .json(
          new ApiResponse({ service }, "Service fetched successfully", true),
        );
    } catch (error) {
      next(error);
    }
  },
);

// POST /services
router.post(
  "/",
  authenticate,
  validateBody(createServiceSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.userId as string;
      const { name, description, price, duration, bookingMode } = req.body;

      const service = await prisma.service.create({
        data: {
          userId,
          name,
          description,
          price,
          duration: duration ?? 60,
          bookingMode: bookingMode ?? "ANY_STAFF",
        },
        include: {
          staff: { select: { id: true, name: true, email: true } },
        },
      });

      res
        .status(201)
        .json(
          new ApiResponse({ service }, "Service created successfully", true),
        );
    } catch (error) {
      next(error);
    }
  },
);

// PATCH /services/:serviceId
router.patch(
  "/:serviceId",
  authenticate,
  validateBody(updateServiceSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const serviceId = req.params.serviceId as string;
      const userId = req.user?.userId as string;

      const existing = await prisma.service.findFirst({
        where: { id: serviceId, userId },
      });

      if (!existing) {
        res.status(404).json(new ApiResponse(null, "Service not found", false));
        return;
      }

      const service = await prisma.service.update({
        where: { id: serviceId },
        data: { ...req.body },
        include: {
          staff: { select: { id: true, name: true, email: true } },
        },
      });

      res
        .status(200)
        .json(
          new ApiResponse({ service }, "Service updated successfully", true),
        );
    } catch (error) {
      next(error);
    }
  },
);

// DELETE /services/:serviceId
router.delete(
  "/:serviceId",
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const serviceId = req.params.serviceId as string;
      const userId = req.user?.userId as string;

      const existing = await prisma.service.findFirst({
        where: { id: serviceId, userId },
      });

      if (!existing) {
        res.status(404).json(new ApiResponse(null, "Service not found", false));
        return;
      }

      await prisma.service.delete({
        where: { id: serviceId },
      });

      res
        .status(200)
        .json(new ApiResponse(null, "Service deleted successfully", true));
    } catch (error) {
      next(error);
    }
  },
);

// ─── Staff for a service ──────────────────────────────────────────────────────

// POST /services/:serviceId/staff — assign staff to service
router.post(
  "/:serviceId/staff",
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const serviceId = req.params.serviceId as string;
      const userId = req.user?.userId as string;
      const { staffId } = req.body;

      const existing = await prisma.service.findFirst({ where: { id: serviceId, userId } });
      if (!existing) {
        res.status(404).json(new ApiResponse(null, "Service not found", false));
        return;
      }

      const service = await prisma.service.update({
        where: { id: serviceId },
        data: { staff: { connect: { id: staffId } } },
        include: { staff: true },
      });

      res.status(200).json(new ApiResponse({ service }, "Staff assigned", true));
    } catch (error) {
      next(error);
    }
  },
);

// GET /services/staff-list — Get all staff for the user
router.get(
  "/staff-list/all",
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.userId as string;
      const staffList = await prisma.staff.findMany({
        where: { userId },
        orderBy: { name: "asc" },
      });
      res.status(200).json(new ApiResponse({ staffList }, "Staff fetched", true));
    } catch (error) {
      next(error);
    }
  },
);

// POST /services/staff — Create new staff member
router.post(
  "/staff/create",
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.userId as string;
      const { name, email, phone } = req.body;

      const staff = await prisma.staff.create({
        data: { userId, name, email: email || null, phone: phone || null },
      });

      res.status(201).json(new ApiResponse({ staff }, "Staff created", true));
    } catch (error) {
      next(error);
    }
  },
);

export default router;
