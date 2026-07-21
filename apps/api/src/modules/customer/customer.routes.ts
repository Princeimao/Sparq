import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { prisma } from "../../config/prisma";
import { authenticate } from "../../middleware/auth";
import { validateBody } from "../../middleware/validate";
import { ApiResponse, ErrorResponse } from "../../middleware/responseHandler";

const router = Router();

// ─── Schemas ─────────────────────────────────────────────────────────────────

const createCustomerSchema = z.object({
  phone: z.string().max(15),
  name: z.string().max(200),
  email: z.string().max(200),
  customFields: z.object({}).optional(),
  address: z.object({}).optional(),
});

const updateCustomerSchema = z.object({
  name: z.string().max(200).optional(),
  address: z.string().max(500).optional(),
  optedIn: z.boolean().optional(),
  externalId: z.string().max(200).optional(),
});

// ─── POST /api/organizations/:orgId/customers ────────────────────────────────
router.post(
  "/customers",
  authenticate,
  validateBody(createCustomerSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { phone, name, email, customFields, address } = req.body;
      const userId = req.user?.userId as string;

      const existing = await prisma.customer.findFirst({
        where: {
          userId: userId,
          phone: phone
        }
      })

      if (!userId) {
        res.status(401).json({ error: "Unauthorized" });
        return
      }

      if (existing) {
        res.status(409).json({ error: "Customer with this phone already exists" });
        return;
      }

      const result = await prisma.$transaction(async (tx) => {
        const customer = await tx.customer.create({
          data: {
            userId,
            phone,
            name,
            email,
            customFields
          }
        })

        if (address) {
          await tx.address.create({
            data: {
              customerId: customer.id,
              ...address
            }
          })
        }

        return {
          customer: customer
        }
      })

      res.status(201).json(new ApiResponse(result, "customer created successfully", true));
    } catch (error) {
      res.status(500).json(new ErrorResponse(error, "Internal server error", false, 500));
      // next(error);
    }
  }
);

router.get(
  "/customers",
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const page = Number(req.query.page) || 1;
      const limit = Math.min(Number(req.query.limit) || 20, 100);
      const search = req.query.search as string | undefined;

      const userId = req.user?.userId;

      if (!userId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const where = {
        userId,
        ...(search && {
          OR: [
            {
              name: {
                contains: search,
                mode: "insensitive" as const,
              },
            },
            {
              phone: {
                contains: search,
              },
            },
          ],
        }),
      };

      const [customers, total] = await prisma.$transaction([
        prisma.customer.findMany({
          where,
          include: {
            _count: {
              select: {
                orders: true,
                conversations: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
          skip: (page - 1) * limit,
          take: limit,
        }),

        prisma.customer.count({
          where,
        }),
      ]);

      res.status(200).json(new ApiResponse({
        customers,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        }
      }, "customers fetched successfully", true));

    } catch (error) {
      next(error);
    }
  }
);


// ─── GET /api/organizations/:orgId/customers/:customerId ─────────────────────
router.get(
  "/customer/:customerId",
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const customerId = req.params.customerId as string;
      const userId = req.user?.userId as string;

      const customer = await prisma.customer.findFirst({
        where: {
          id: customerId,
          userId: userId,
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
  "/customer/:customerId",
  authenticate,
  validateBody(updateCustomerSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user?.userId as string;

    try {
      const customerId = req.params.customerId as string;
      const existing = await prisma.customer.findFirst({
        where: { id: customerId, userId: userId },
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
  "/customer/:customerId",
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user?.userId as string;

    try {
      const customerId = req.params.customerId as string;
      const existing = await prisma.customer.findFirst({
        where: { id: customerId, userId: userId },
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
