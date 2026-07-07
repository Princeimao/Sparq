import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { prisma } from "../../config/prisma";
import { authenticate, requireOrg, requireRole } from "../../middleware/auth";
import { validateBody } from "../../middleware/validate";

const router = Router();

const createProductSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  price: z.number().nonnegative(),
  sku: z.string().max(100).optional(),
  stock: z.number().int().default(0),
});

const updateProductSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  price: z.number().nonnegative().optional(),
  sku: z.string().max(100).optional(),
  stock: z.number().int().optional(),
});

// ─── GET /api/organizations/:orgId/products ─────────────────────────────────
router.get(
  "/:orgId/products",
  authenticate,
  requireOrg,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.organizationId as string;
      const search = req.query.search as string;

      const where: any = { organizationId: orgId };

      if (search) {
        where.OR = [
          { name: { contains: search, mode: "insensitive" } },
          { sku: { contains: search, mode: "insensitive" } },
        ];
      }

      const products = await prisma.product.findMany({
        where,
        orderBy: { createdAt: "desc" },
      });

      res.json({ products });
    } catch (error) {
      next(error);
    }
  }
);

// ─── POST /api/organizations/:orgId/products ────────────────────────────────
router.post(
  "/:orgId/products",
  authenticate,
  requireOrg,
  requireRole("OWNER", "ADMIN"),
  validateBody(createProductSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.organizationId as string;
      const { name, description, price, sku, stock } = req.body;

      // Check if product name already exists for this org
      const existing = await prisma.product.findUnique({
        where: {
          organizationId_name: {
            organizationId: orgId,
            name,
          },
        },
      });

      if (existing) {
        res.status(409).json({ error: "Product with this name already exists in organization" });
        return;
      }

      const product = await prisma.product.create({
        data: {
          organizationId: orgId,
          name,
          description,
          price,
          sku,
          stock,
        },
      });

      res.status(201).json({ product });
    } catch (error) {
      next(error);
    }
  }
);

// ─── PATCH /api/organizations/:orgId/products/:productId ─────────────────────
router.patch(
  "/:orgId/products/:productId",
  authenticate,
  requireOrg,
  requireRole("OWNER", "ADMIN"),
  validateBody(updateProductSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const productId = req.params.productId as string;
      const orgId = req.organizationId as string;

      const existing = await prisma.product.findFirst({
        where: { id: productId, organizationId: orgId },
      });

      if (!existing) {
        res.status(404).json({ error: "Product not found" });
        return;
      }

      const product = await prisma.product.update({
        where: { id: productId },
        data: req.body,
      });

      res.json({ product });
    } catch (error) {
      next(error);
    }
  }
);

// ─── DELETE /api/organizations/:orgId/products/:productId ────────────────────
router.delete(
  "/:orgId/products/:productId",
  authenticate,
  requireOrg,
  requireRole("OWNER", "ADMIN"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const productId = req.params.productId as string;
      const orgId = req.organizationId as string;

      const existing = await prisma.product.findFirst({
        where: { id: productId, organizationId: orgId },
      });

      if (!existing) {
        res.status(404).json({ error: "Product not found" });
        return;
      }

      await prisma.product.delete({
        where: { id: productId },
      });

      res.json({ message: "Product deleted successfully" });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
