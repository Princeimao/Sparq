import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { prisma } from "../../config/prisma";
import { authenticate, requireOrg } from "../../middleware/auth";
import { validateBody } from "../../middleware/validate";

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

// ─── POST /api/organizations/:orgId/orders ───────────────────────────────────
router.post(
  "/:orgId/orders",
  authenticate,
  requireOrg,
  validateBody(createOrderSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const customer = await prisma.customer.findFirst({
        where: {
          id: req.body.customerId,
          organizationId: req.organizationId,
        },
      });

      if (!customer) {
        res.status(404).json({ error: "Customer not found" });
        return;
      }

      const order = await prisma.order.create({
        data: {
          organizationId: req.organizationId!,
          ...req.body,
        },
        include: {
          customer: { select: { id: true, phone: true, name: true } },
        },
      });
      res.status(201).json({ order });
    } catch (error) {
      next(error);
    }
  }
);

// ─── GET /api/organizations/:orgId/orders ────────────────────────────────────
router.get(
  "/:orgId/orders",
  authenticate,
  requireOrg,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
      const orgId = req.organizationId as string;
      const status = req.query.status as string | undefined;

      const where: Record<string, unknown> = {
        organizationId: orgId,
      };
      if (status) where.status = status;

      const [orders, total] = await Promise.all([
        prisma.order.findMany({
          where,
          include: {
            customer: { select: { id: true, phone: true, name: true } },
            campaign: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: "desc" },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.order.count({ where }),
      ]);

      res.json({
        orders,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      });
    } catch (error) {
      next(error);
    }
  }
);

// ─── GET /api/organizations/:orgId/orders/:orderId ───────────────────────────
router.get(
  "/:orgId/orders/:orderId",
  authenticate,
  requireOrg,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orderId = req.params.orderId as string;
      const order = await prisma.order.findFirst({
        where: {
          id: orderId,
          organizationId: req.organizationId,
        },
        include: {
          customer: true,
          campaign: true,
          conversation: true,
        },
      });

      if (!order) {
        res.status(404).json({ error: "Order not found" });
        return;
      }

      res.json({ order });
    } catch (error) {
      next(error);
    }
  }
);

// ─── PATCH /api/organizations/:orgId/orders/:orderId ─────────────────────────
router.patch(
  "/:orgId/orders/:orderId",
  authenticate,
  requireOrg,
  validateBody(updateOrderSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orderId = req.params.orderId as string;
      const existing = await prisma.order.findFirst({
        where: {
          id: orderId,
          organizationId: req.organizationId,
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
      res.json({ order });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
