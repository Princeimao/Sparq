import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { prisma } from "../../config/prisma";
import { authenticate, requireOrg } from "../../middleware/auth";
import { validateBody } from "../../middleware/validate";

const router = Router();

// ─── Schemas ─────────────────────────────────────────────────────────────────

const createCustomerSchema = z.object({
  phone: z
    .string()
    .min(10)
    .max(15)
    .regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone number format (E.164)"),
  name: z.string().max(200).optional(),
  externalId: z.string().max(200).optional(),
  address: z.string().max(500).optional(),
  optedIn: z.boolean().default(true),
});

const updateCustomerSchema = z.object({
  name: z.string().max(200).optional(),
  address: z.string().max(500).optional(),
  optedIn: z.boolean().optional(),
  externalId: z.string().max(200).optional(),
});

// ─── POST /api/organizations/:orgId/customers ────────────────────────────────
router.post(
  "/:orgId/customers",
  authenticate,
  requireOrg,
  validateBody(createCustomerSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { phone, name, externalId, address, optedIn } = req.body;

      // Check if phone already exists for this org
      const existing = await prisma.customer.findUnique({
        where: {
          organizationId_phone: {
            organizationId: req.organizationId!,
            phone,
          },
        },
      });

      if (existing) {
        res.status(409).json({ error: "Customer with this phone already exists" });
        return;
      }

      const customer = await prisma.customer.create({
        data: {
          organizationId: req.organizationId!,
          phone,
          name,
          externalId,
          address,
          optedIn,
        },
      });

      res.status(201).json({ customer });
    } catch (error) {
      next(error);
    }
  }
);

// ─── GET /api/organizations/:orgId/customers ─────────────────────────────────
router.get(
  "/:orgId/customers",
  authenticate,
  requireOrg,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
      const search = req.query.search as string;

      const orgId = req.organizationId as string;
      const where: Record<string, unknown> = {
        organizationId: orgId,
      };

      if (search) {
        where.OR = [
          { name: { contains: search as string, mode: "insensitive" } },
          { phone: { contains: search as string } },
        ];
      }

      const [customers, total] = await Promise.all([
        prisma.customer.findMany({
          where,
          include: {
            _count: { select: { orders: true, conversations: true } },
          },
          orderBy: { createdAt: "desc" },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.customer.count({ where }),
      ]);

      res.json({
        customers,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// ─── GET /api/organizations/:orgId/customers/:customerId ─────────────────────
router.get(
  "/:orgId/customers/:customerId",
  authenticate,
  requireOrg,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const customerId = req.params.customerId as string;
      const customer = await prisma.customer.findFirst({
        where: {
          id: customerId,
          organizationId: req.organizationId,
        },
        include: {
          orders: { orderBy: { purchaseDate: "desc" }, take: 10 },
          conversations: { orderBy: { lastMessageAt: "desc" }, take: 5 },
          messages: { orderBy: { createdAt: "desc" }, take: 20 },
        },
      });

      if (!customer) {
        res.status(404).json({ error: "Customer not found" });
        return;
      }

      res.json({ customer });
    } catch (error) {
      next(error);
    }
  }
);

// ─── PATCH /api/organizations/:orgId/customers/:customerId ───────────────────
router.patch(
  "/:orgId/customers/:customerId",
  authenticate,
  requireOrg,
  validateBody(updateCustomerSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const customerId = req.params.customerId as string;
      const existing = await prisma.customer.findFirst({
        where: { id: customerId, organizationId: req.organizationId },
      });

      if (!existing) {
        res.status(404).json({ error: "Customer not found" });
        return;
      }

      const customer = await prisma.customer.update({
        where: { id: customerId },
        data: req.body,
      });
      res.json({ customer });
    } catch (error) {
      next(error);
    }
  }
);

// ─── DELETE /api/organizations/:orgId/customers/:customerId ──────────────────
router.delete(
  "/:orgId/customers/:customerId",
  authenticate,
  requireOrg,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const customerId = req.params.customerId as string;
      const existing = await prisma.customer.findFirst({
        where: { id: customerId, organizationId: req.organizationId },
      });

      if (!existing) {
        res.status(404).json({ error: "Customer not found" });
        return;
      }

      await prisma.customer.delete({ where: { id: customerId } });
      res.json({ message: "Customer deleted" });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
