import { Router, Request, Response, NextFunction } from "express";
import { availabilityQuerySchema, createBookingSchema } from "@sparq/booking";
import { z } from "zod";
import { prisma } from "../../config/prisma";
import { authenticate } from "../../middleware/auth";
import { validateBody, validateQuery } from "../../middleware/validate";
import { ApiResponse } from "../../middleware/responseHandler";
import { bookingLimiter } from "../../middleware/rateLimit";
import {
  createBooking,
  dayAvailability,
  reassignBooking,
  setBookingStatus,
  type BookingInput,
} from "./booking.service";

const router = Router();

const statusSchema = z.object({
  status: z.enum(["PENDING", "CONFIRMED", "CANCELLED", "COMPLETED", "NO_SHOW", "CHECKED_IN"]),
});

const reassignSchema = z.object({
  staffId: z.string().cuid().optional(),
  resourceId: z.string().cuid().optional(),
});

function pick(v: unknown): string | undefined {
  return Array.isArray(v) ? (v[0] as string | undefined) : (v as string | undefined);
}

// GET /bookings — paginated, filterable, with allocations
router.get(
  "/",
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const page = Math.max(parseInt(req.query.page as string) || 1, 1);
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
      const status = pick(req.query.status);
      const serviceId = pick(req.query.serviceId);
      const staffId = pick(req.query.staffId);
      const resourceId = pick(req.query.resourceId);
      const customerId = pick(req.query.customerId);
      const from = pick(req.query.from);
      const to = pick(req.query.to);

      const where: Record<string, unknown> = { userId };
      if (status) where.status = status;
      if (serviceId) where.serviceId = serviceId;
      if (customerId) where.customerId = customerId;
      if (staffId || resourceId) {
        where.allocations = {
          some: {
            ...(staffId ? { staffId } : {}),
            ...(resourceId ? { resourceId } : {}),
          },
        };
      }
      if (from || to) {
        where.startTime = {
          ...(from && { gte: new Date(from) }),
          ...(to && { lte: new Date(to) }),
        };
      }

      const [bookings, total] = await Promise.all([
        prisma.booking.findMany({
          where,
          include: {
            service: { select: { id: true, name: true, duration: true, requiresPartySize: true } },
            customer: { select: { id: true, name: true, phone: true } },
            visitAddress: true,
            allocations: {
              include: {
                staff: { select: { id: true, name: true, color: true } },
                resource: { select: { id: true, name: true, kind: true, color: true } },
              },
            },
          },
          orderBy: { startTime: "asc" },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.booking.count({ where }),
      ]);

      res.json(
        new ApiResponse(
          { bookings, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } },
          "Bookings fetched successfully",
          true,
        ),
      );
    } catch (error) {
      next(error);
    }
  },
);

// GET /bookings/availability?serviceId&date&partySize — bookable slots + options
router.get(
  "/availability",
  authenticate,
  validateQuery(availabilityQuerySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const q = req.query as unknown as {
        serviceId: string;
        date: string;
        partySize?: number;
        staffId?: string;
        resourceId?: string;
      };
      const onlyOwnerId = (q.staffId ?? q.resourceId) as string | undefined;
      // Ownership of a narrowed choice is verified inside the service.
      if (onlyOwnerId) {
        const [s, r] = await Promise.all([
          q.staffId
            ? prisma.staff.findFirst({ where: { id: q.staffId, userId }, select: { id: true } })
            : null,
          q.resourceId
            ? prisma.resource.findFirst({ where: { id: q.resourceId, userId }, select: { id: true } })
            : null,
        ]);
        if ((q.staffId && !s) || (q.resourceId && !r)) {
          res.status(404).json(new ApiResponse(null, "Provider or resource not found", false));
          return;
        }
      }
      const result = await dayAvailability(userId, q.serviceId, q.date, q.partySize, onlyOwnerId);
      res.json(new ApiResponse(result, "Availability fetched", true));
    } catch (error) {
      next(error);
    }
  },
);

// POST /bookings — server-validated creation with allocation
router.post(
  "/",
  authenticate,
  bookingLimiter,
  validateBody(createBookingSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const booking = await createBooking(req.user!.userId, {
        ...(req.body as object),
        source: "DASHBOARD",
      } as BookingInput);
      res.status(201).json(new ApiResponse({ booking }, "Booking created successfully", true));
    } catch (error) {
      next(error);
    }
  },
);

// GET /bookings/:id
router.get(
  "/:id",
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const booking = await prisma.booking.findFirst({
        where: { id: req.params.id as string, userId: req.user!.userId },
        include: {
          service: { select: { id: true, name: true, duration: true, requiresPartySize: true } },
          customer: { select: { id: true, name: true, phone: true, email: true } },
          visitAddress: true,
          allocations: {
            include: {
              staff: { select: { id: true, name: true, color: true } },
              resource: { select: { id: true, name: true, kind: true, color: true } },
            },
          },
        },
      });
      if (!booking) {
        res.status(404).json(new ApiResponse(null, "Booking not found", false));
        return;
      }
      res.json(new ApiResponse({ booking }, "Booking fetched", true));
    } catch (error) {
      next(error);
    }
  },
);

// PATCH /bookings/:id/status
router.patch(
  "/:id/status",
  authenticate,
  validateBody(statusSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const booking = await setBookingStatus(req.user!.userId, req.params.id as string, req.body.status);
      res.json(new ApiResponse({ booking }, "Booking status updated", true));
    } catch (error) {
      next(error);
    }
  },
);

// PATCH /bookings/:id/reassign — move PRIMARY allocation
router.patch(
  "/:id/reassign",
  authenticate,
  validateBody(reassignSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const booking = await reassignBooking(req.user!.userId, req.params.id as string, req.body);
      res.json(new ApiResponse({ booking }, "Booking reassigned", true));
    } catch (error) {
      next(error);
    }
  },
);

// DELETE /bookings/:id — history-preserving: only PENDING bookings are removed
router.delete(
  "/:id",
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const existing = await prisma.booking.findFirst({
        where: { id: req.params.id as string, userId: req.user!.userId },
      });
      if (!existing) {
        res.status(404).json(new ApiResponse(null, "Booking not found", false));
        return;
      }
      if (existing.status !== "PENDING") {
        res
          .status(409)
          .json(
            new ApiResponse(
              null,
              "Only pending bookings can be deleted — cancel confirmed ones instead",
              false,
            ),
          );
        return;
      }
      await prisma.booking.delete({ where: { id: existing.id } });
      res.json(new ApiResponse(null, "Booking deleted", true));
    } catch (error) {
      next(error);
    }
  },
);

export default router;
