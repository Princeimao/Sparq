import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { prisma } from "../../config/prisma";
import { authenticate } from "../../middleware/auth";
import { validateBody } from "../../middleware/validate";
import { ApiResponse } from "../../middleware/responseHandler";

const router = Router();

const createReservationSlotSchema = z.object({
  name: z.string().min(1).max(200),
  type: z.enum(["HOTEL_ROOM", "RESTAURANT_TABLE", "MEETING_ROOM", "EVENT_SPACE", "OTHER"]),
  description: z.string().max(1000).optional(),
  capacity: z.number().int().positive().optional(),
  pricePerUnit: z.number().nonnegative().optional(),
  priceUnit: z.string().max(50).optional(), // "per night", "per hour", etc.
  image: z.string().url().optional().or(z.string().length(0)),
  amenities: z.array(z.string()).optional(),
  isActive: z.boolean().default(true),
});

const updateReservationSlotSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  type: z.enum(["HOTEL_ROOM", "RESTAURANT_TABLE", "MEETING_ROOM", "EVENT_SPACE", "OTHER"]).optional(),
  description: z.string().max(1000).optional(),
  capacity: z.number().int().positive().optional(),
  pricePerUnit: z.number().nonnegative().optional(),
  priceUnit: z.string().max(50).optional(),
  image: z.string().url().optional().or(z.string().length(0)),
  amenities: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
});

const createBookingSchema = z.object({
  slotId: z.string().cuid(),
  customerName: z.string().min(1).max(200),
  customerPhone: z.string().max(20).optional(),
  customerEmail: z.string().email().optional(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  guestCount: z.number().int().positive().optional(),
  specialRequests: z.string().max(500).optional(),
  totalAmount: z.number().min(0).optional(),
});

// ─── Reservation Slots ────────────────────────────────────────────────────────

// GET /reservations/slots
router.get(
  "/slots",
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.userId as string;
      const type = req.query.type as string | undefined;

      const slots = await prisma.reservationSlot.findMany({
        where: { userId, ...(type && { type: type as any }) },
        orderBy: { createdAt: "desc" },
        include: {
          _count: { select: { bookings: true } },
        },
      });

      res
        .status(200)
        .json(new ApiResponse({ slots }, "Slots fetched successfully", true));
    } catch (error) {
      next(error);
    }
  },
);

// POST /reservations/slots
router.post(
  "/slots",
  authenticate,
  validateBody(createReservationSlotSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.userId as string;
      const { name, type, description, capacity, pricePerUnit, priceUnit, image, amenities, isActive } = req.body;

      const slot = await prisma.reservationSlot.create({
        data: {
          userId,
          name,
          type,
          description,
          capacity,
          pricePerUnit,
          priceUnit: priceUnit || null,
          image: image || null,
          amenities: amenities || [],
          isActive: isActive ?? true,
        },
      });

      res
        .status(201)
        .json(new ApiResponse({ slot }, "Slot created successfully", true));
    } catch (error) {
      next(error);
    }
  },
);

// PATCH /reservations/slots/:slotId
router.patch(
  "/slots/:slotId",
  authenticate,
  validateBody(updateReservationSlotSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const slotId = req.params.slotId as string;
      const userId = req.user?.userId as string;

      const existing = await prisma.reservationSlot.findFirst({
        where: { id: slotId, userId },
      });

      if (!existing) {
        res.status(404).json(new ApiResponse(null, "Slot not found", false));
        return;
      }

      const slot = await prisma.reservationSlot.update({
        where: { id: slotId },
        data: { ...req.body },
      });

      res
        .status(200)
        .json(new ApiResponse({ slot }, "Slot updated successfully", true));
    } catch (error) {
      next(error);
    }
  },
);

// DELETE /reservations/slots/:slotId
router.delete(
  "/slots/:slotId",
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const slotId = req.params.slotId as string;
      const userId = req.user?.userId as string;

      const existing = await prisma.reservationSlot.findFirst({
        where: { id: slotId, userId },
      });

      if (!existing) {
        res.status(404).json(new ApiResponse(null, "Slot not found", false));
        return;
      }

      await prisma.reservationSlot.delete({ where: { id: slotId } });

      res.status(200).json(new ApiResponse(null, "Slot deleted successfully", true));
    } catch (error) {
      next(error);
    }
  },
);

// ─── Bookings ─────────────────────────────────────────────────────────────────

// GET /reservations/bookings
router.get(
  "/bookings",
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.userId as string;
      const status = req.query.status as string | undefined;

      const bookings = await prisma.reservationBooking.findMany({
        where: {
          userId,
          ...(status && { status: status as any }),
        },
        orderBy: { startDate: "asc" },
        include: { slot: { select: { name: true, type: true } } },
      });

      res
        .status(200)
        .json(new ApiResponse({ bookings }, "Bookings fetched successfully", true));
    } catch (error) {
      next(error);
    }
  },
);

// POST /reservations/bookings
router.post(
  "/bookings",
  authenticate,
  validateBody(createBookingSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.userId as string;
      const { slotId, customerName, customerPhone, customerEmail, startDate, endDate, guestCount, specialRequests, totalAmount } = req.body;

      // Validate slot belongs to user
      const slot = await prisma.reservationSlot.findFirst({
        where: { id: slotId, userId },
      });

      if (!slot) {
        res.status(404).json(new ApiResponse(null, "Slot not found", false));
        return;
      }

      // Check for conflicts
      const conflict = await prisma.reservationBooking.findFirst({
        where: {
          slotId,
          status: { notIn: ["CANCELLED"] },
          OR: [
            { startDate: { lte: new Date(endDate) }, endDate: { gte: new Date(startDate) } },
          ],
        },
      });

      if (conflict) {
        res.status(409).json(new ApiResponse(null, "This slot is already booked for the selected period", false));
        return;
      }

      const booking = await prisma.reservationBooking.create({
        data: {
          userId,
          slotId,
          customerName,
          customerPhone: customerPhone || null,
          customerEmail: customerEmail || null,
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          guestCount: guestCount || null,
          specialRequests: specialRequests || null,
          totalAmount: totalAmount || null,
          status: "PENDING",
        },
        include: { slot: { select: { name: true, type: true } } },
      });

      res
        .status(201)
        .json(new ApiResponse({ booking }, "Booking created successfully", true));
    } catch (error) {
      next(error);
    }
  },
);

// PATCH /reservations/bookings/:bookingId/status
router.patch(
  "/bookings/:bookingId/status",
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const bookingId = req.params.bookingId as string;
      const userId = req.user?.userId as string;
      const { status } = req.body;

      const validStatuses = ["PENDING", "CONFIRMED", "CHECKED_IN", "COMPLETED", "CANCELLED"];
      if (!validStatuses.includes(status)) {
        res.status(400).json(new ApiResponse(null, "Invalid status", false));
        return;
      }

      const existing = await prisma.reservationBooking.findFirst({
        where: { id: bookingId, userId },
      });

      if (!existing) {
        res.status(404).json(new ApiResponse(null, "Booking not found", false));
        return;
      }

      const booking = await prisma.reservationBooking.update({
        where: { id: bookingId },
        data: { status },
        include: { slot: { select: { name: true, type: true } } },
      });

      res
        .status(200)
        .json(new ApiResponse({ booking }, "Booking status updated successfully", true));
    } catch (error) {
      next(error);
    }
  },
);

// DELETE /reservations/bookings/:bookingId
router.delete(
  "/bookings/:bookingId",
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const bookingId = req.params.bookingId as string;
      const userId = req.user?.userId as string;

      const existing = await prisma.reservationBooking.findFirst({
        where: { id: bookingId, userId },
      });

      if (!existing) {
        res.status(404).json(new ApiResponse(null, "Booking not found", false));
        return;
      }

      await prisma.reservationBooking.delete({ where: { id: bookingId } });

      res.status(200).json(new ApiResponse(null, "Booking deleted successfully", true));
    } catch (error) {
      next(error);
    }
  },
);

export default router;
