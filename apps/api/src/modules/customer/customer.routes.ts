import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { prisma } from "../../config/prisma";
import { authenticate } from "../../middleware/auth";
import { validateBody } from "../../middleware/validate";
import { ApiResponse } from "../../middleware/responseHandler";

const router = Router();

const createCustomerSchema = z.object({
  phone: z.string().min(1).max(20),
  name: z.string().max(200).optional(),
  email: z.string().max(200).optional(),
  customFields: z.record(z.unknown()).optional(),
  address: z.object({
    line1: z.string().optional(),
    line2: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    pincode: z.string().optional(),
    country: z.string().optional(),
  }).optional(),
});

const updateCustomerSchema = z.object({
  name: z.string().max(200).optional(),
  email: z.string().max(200).optional(),
  address: z.string().max(500).optional(),
  optedIn: z.boolean().optional(),
  externalId: z.string().max(200).optional(),
});

// GET /customers - List customers
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
        res.status(401).json(new ApiResponse(null, "Unauthorized", false));
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
        prisma.customer.count({ where }),
      ]);

      res.status(200).json(
        new ApiResponse(
          {
            customers,
            pagination: {
              page,
              limit,
              total,
              totalPages: Math.ceil(total / limit),
            },
          },
          "Customers fetched successfully",
          true
        )
      );
    } catch (error) {
      next(error);
    }
  }
);

// POST /customers - Create customer
router.post(
  "/customers",
  authenticate,
  validateBody(createCustomerSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { phone, name, email, customFields, address } = req.body;
      const userId = req.user?.userId as string;

      if (!userId) {
        res.status(401).json(new ApiResponse(null, "Unauthorized", false));
        return;
      }

      const existing = await prisma.customer.findFirst({
        where: { userId, phone },
      });

      if (existing) {
        res
          .status(409)
          .json(
            new ApiResponse(null, "Customer with this phone already exists", false)
          );
        return;
      }

      const customer = await prisma.$transaction(async (tx) => {
        const createdCustomer = await tx.customer.create({
          data: {
            userId,
            phone,
            name,
            email,
            customFields,
          },
        });

        if (address && address.line1) {
          await tx.address.create({
            data: {
              customerId: createdCustomer.id,
              line1: address.line1,
              line2: address.line2,
              city: address.city || "Unknown",
              state: address.state || "Unknown",
              pincode: address.pincode || "000000",
              country: address.country || "India",
            },
          });
        }

        return createdCustomer;
      });

      res
        .status(201)
        .json(
          new ApiResponse({ customer }, "Customer created successfully", true)
        );
    } catch (error) {
      next(error);
    }
  }
);

// GET /customers/:customerId - Get customer detail
router.get(
  "/customers/:customerId",
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const customerId = req.params.customerId as string;
      const userId = req.user?.userId as string;

      const customer = await prisma.customer.findFirst({
        where: { id: customerId, userId },
        include: {
          orders: { orderBy: { purchaseDate: "desc" }, take: 10 },
          conversations: { orderBy: { lastMessageAt: "desc" }, take: 5 },
          messages: { orderBy: { createdAt: "desc" }, take: 20 },
          addresses: true,
        },
      });

      if (!customer) {
        res
          .status(404)
          .json(new ApiResponse(null, "Customer not found", false));
        return;
      }

      res
        .status(200)
        .json(
          new ApiResponse({ customer }, "Customer fetched successfully", true)
        );
    } catch (error) {
      next(error);
    }
  }
);

// PATCH /customers/:customerId - Update customer
router.patch(
  "/customers/:customerId",
  authenticate,
  validateBody(updateCustomerSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const customerId = req.params.customerId as string;
      const userId = req.user?.userId as string;

      const existing = await prisma.customer.findFirst({
        where: { id: customerId, userId },
      });

      if (!existing) {
        res
          .status(404)
          .json(new ApiResponse(null, "Customer not found", false));
        return;
      }

      const updatedCustomer = await prisma.customer.update({
        where: { id: customerId },
        data: req.body,
      });

      res
        .status(200)
        .json(
          new ApiResponse(
            { customer: updatedCustomer },
            "Customer updated successfully",
            true
          )
        );
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /customers/:customerId - Delete customer
router.delete(
  "/customers/:customerId",
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const customerId = req.params.customerId as string;
      const userId = req.user?.userId as string;

      const existing = await prisma.customer.findFirst({
        where: { id: customerId, userId },
      });

      if (!existing) {
        res
          .status(404)
          .json(new ApiResponse(null, "Customer not found", false));
        return;
      }

      await prisma.customer.delete({ where: { id: customerId } });

      res
        .status(200)
        .json(new ApiResponse(null, "Customer deleted successfully", true));
    } catch (error) {
      next(error);
    }
  }
);

export default router;
