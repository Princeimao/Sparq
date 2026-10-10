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
  email: z.string().email().max(200).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
  customFields: z.record(z.unknown()).optional(),
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
                bookings: true,
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
          bookings: {
            orderBy: { startTime: "desc" },
            take: 10,
            include: {
              service: { select: { id: true, name: true } },
              allocations: {
                include: {
                  staff: { select: { id: true, name: true } },
                  resource: { select: { id: true, name: true, kind: true } },
                },
              },
            },
          },
          conversations: { orderBy: { lastMessageAt: "desc" }, take: 5 },
          messages: { orderBy: { createdAt: "desc" }, take: 20 },
          addresses: { orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }] },
          _count: {
            select: {
              orders: true,
              bookings: true,
              messages: true,
            },
          },
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

      // Whitelist updatable fields — never spread req.body (it may
      // contain ids or relations the caller must not control).
      const { name, email, notes, customFields } = req.body;
      const updatedCustomer = await prisma.customer.update({
        where: { id: customerId },
        data: {
          ...(name !== undefined && { name }),
          ...(email !== undefined && { email }),
          ...(notes !== undefined && { notes }),
          ...(customFields !== undefined && { customFields }),
        },
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

      try {
        await prisma.customer.delete({ where: { id: customerId } });
      } catch (error: unknown) {
        // P2003: still referenced by orders/bookings — refuse instead of
        // cascading away business history.
        if (
          typeof error === "object" &&
          error !== null &&
          "code" in error &&
          (error as { code: string }).code === "P2003"
        ) {
          res
            .status(409)
            .json(
              new ApiResponse(
                null,
                "Customer has linked orders or bookings and cannot be deleted",
                false,
              ),
            );
          return;
        }
        throw error;
      }

      res
        .status(200)
        .json(new ApiResponse(null, "Customer deleted successfully", true));
    } catch (error) {
      next(error);
    }
  }
);

const addressSchema = z.object({
  label: z.string().max(50).optional(),
  line1: z.string().min(5).max(500),
  line2: z.string().max(500).optional(),
  city: z.string().min(2).max(200),
  state: z.string().max(200).default(""),
  pincode: z.string().regex(/^[1-9][0-9]{5}$/, "Enter a valid 6-digit pincode"),
  country: z.string().max(100).default("India"),
  landmark: z.string().max(500).optional(),
  isDefault: z.boolean().optional(),
});

// ─── Saved addresses (explicitly selected, never auto-applied) ───────────────

// POST /customers/:customerId/addresses
router.post(
  "/:customerId/addresses",
  authenticate,
  validateBody(addressSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const customerId = req.params.customerId as string;
      const userId = req.user?.userId as string;

      const customer = await prisma.customer.findFirst({
        where: { id: customerId, userId },
      });
      if (!customer) {
        res.status(404).json(new ApiResponse(null, "Customer not found", false));
        return;
      }

      const address = await prisma.$transaction(async (tx) => {
        if (req.body.isDefault) {
          await tx.address.updateMany({
            where: { customerId },
            data: { isDefault: false },
          });
        }
        return tx.address.create({
          data: {
            customerId,
            type: "SHIPPING",
            label: req.body.label,
            line1: req.body.line1,
            line2: req.body.line2,
            city: req.body.city,
            state: req.body.state ?? "",
            pincode: req.body.pincode,
            country: req.body.country ?? "India",
            landmark: req.body.landmark,
            isDefault: req.body.isDefault ?? false,
          },
        });
      });

      res.status(201).json(new ApiResponse({ address }, "Address saved", true));
    } catch (error) {
      next(error);
    }
  },
);

// DELETE /customers/:customerId/addresses/:addressId
router.delete(
  "/:customerId/addresses/:addressId",
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { customerId, addressId } = req.params as Record<string, string>;
      const userId = req.user?.userId as string;

      const address = await prisma.address.findFirst({
        where: { id: addressId, customerId, customer: { userId } },
      });
      if (!address) {
        res.status(404).json(new ApiResponse(null, "Address not found", false));
        return;
      }

      // Refuse when the address is referenced by a live transaction so
      // history keeps its snapshot.
      const referenced =
        (await prisma.order.count({ where: { shippingAddressId: addressId } })) +
        (await prisma.booking.count({ where: { visitAddressId: addressId } }));
      if (referenced > 0) {
        res
          .status(409)
          .json(
            new ApiResponse(
              null,
              "Address is used by an order or booking and cannot be deleted",
              false,
            ),
          );
        return;
      }

      await prisma.address.delete({ where: { id: addressId } });
      res.json(new ApiResponse(null, "Address deleted", true));
    } catch (error) {
      next(error);
    }
  },
);

export default router;
