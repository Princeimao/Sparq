import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { prisma } from "../../config/prisma";
import { authenticate } from "../../middleware/auth";
import { validateBody } from "../../middleware/validate";
import { ApiResponse } from "../../middleware/responseHandler";

const router = Router();

// ─── Schemas ─────────────────────────────────────────────────────────────────

const createOrderSchema = z.object({
  customerId: z.string().min(1),
  campaignId: z.string().optional(),
  productName: z.string().min(1).max(200),
  amount: z.number().positive().optional(),
  currency: z.string().default("INR"),
  status: z.enum(["PENDING", "PAID", "COMPLETED", "CANCELLED"]).default("PENDING"),
});

const updateOrderSchema = z.object({
  status: z.enum(["PENDING", "PAID", "COMPLETED", "CANCELLED"]).optional(),
  paymentId: z.string().optional(),
  paymentLink: z.string().optional(),
});

router.post(
  "/orders",
  authenticate,
  validateBody(createOrderSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user?.userId
    try {
      const result = await prisma.$transaction(async () => {
        const customer = await prisma.customer.findFirst({
          where: {
            id: req.body.customerId,
            userId
          },
        });

        const order = await prisma.order.create({
          data: {
            userId,
            ...req.body,
          },
          include: {
            customer: { select: { id: true, phone: true, name: true } },
          },
        });

        return {
          customer, order
        }
      })
      res.status(201).json(new ApiResponse({
        result,
      }, "Order created successfully", true));
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  "/orders",
  authenticate,

  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
      const userId = req.user?.userId as string;
      const status = req.query.status as string | undefined;

      const where: Record<string, unknown> = {
        userId
      };
      if (status) where.status = status;

      const [orders, total] = await Promise.all([
        prisma.order.findMany({
          where,
          include: {
            customer: { select: { id: true, phone: true, name: true } },
          },
          orderBy: { createdAt: "desc" },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.order.count({ where }),
      ]);

      res.json(new ApiResponse({
        orders,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      }, "Orders fetched successfully", true));
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  "/orders/:orderId",
  authenticate,

  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orderId = req.params.orderId as string;
      const userId = req.user?.userId as string;

      const order = await prisma.order.findFirst({
        where: {
          id: orderId,
          userId,
        },
        include: {
          customer: true,
        },
      });

      if (!order) {
        res.status(404).json(new ApiResponse(null, "Order not found", false));
        return;
      }

      res.json(new ApiResponse(order, "Order fetched successfully", true));
    } catch (error) {
      next(error);
    }
  }
);

router.patch(
  "/orders/:orderId",
  authenticate,

  validateBody(updateOrderSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orderId = req.params.orderId as string;
      const userId = req.user?.userId as string;

      const existing = await prisma.order.findFirst({
        where: {
          id: orderId,
          userId,
        },
      });

      if (!existing) {
        res.status(404).json({ error: "Order not found" });
        return;
      }

      const order = await prisma.order.update({
        where: { id: orderId },
        data: req.body,
        include: {
          customer: { select: { id: true, phone: true, name: true } },
        },
      });
      res.json(new ApiResponse(order, "Order updated successfully", true));
    } catch (error) {
      next(error);
    }
  }
);

export default router;
