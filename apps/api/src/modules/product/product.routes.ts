import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { prisma } from "../../config/prisma";
import { authenticate } from "../../middleware/auth";
import { validateBody } from "../../middleware/validate";
import { ApiResponse } from "../../middleware/responseHandler";

const router = Router();

const createProductSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  price: z.number().nonnegative(),
  stock: z.number().int().default(0),
  imageUrl: z.string().url().optional(),
});

const updateProductSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  price: z.number().nonnegative().optional(),
  stock: z.number().int().optional(),
});

// ─── GET /api/organizations/:orgId/products ─────────────────────────────────
router.get(
  "/products",
  authenticate,

  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.userId as string;
      const search = req.query.search as string;

      const products = await prisma.product.findMany({
        where: {
          userId,
          name: {
            contains: search,
            mode: "insensitive"
          }
        },
        orderBy: { createdAt: "desc" },
      });

      res.status(200).json(new ApiResponse(products, 'Products fetched successfully', true))
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  "/products",
  authenticate,
  validateBody(createProductSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.userId as string;
      const { name, description, price, stock, imageUrl } = req.body;

      const product = await prisma.product.create({
        data: {
          userId,
          name,
          description,
          price,
          stock,
          image: imageUrl
        },
      });

      res.status(201).json(new ApiResponse(product, 'Product created successfully', true))
    } catch (error) {
      next(error);
    }
  }
);

router.patch(
  "/products/:productId",
  authenticate,
  validateBody(updateProductSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const productId = req.params.productId as string;
      const userId = req.user?.userId as string;

      const existing = await prisma.product.findFirst({
        where: {
          id: productId,
          userId
        },
      });

      if (!existing) {
        res.status(404).json(new ApiResponse(null, 'Product not found', false));
        return;
      }

      const product = await prisma.product.update({
        where: { id: productId },
        data: req.body,
      });

      res.status(200).json(new ApiResponse(product, 'Product updated successfully', true))
    } catch (error) {
      next(error);
    }
  }
);

router.delete(
  "/products/:productId",
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const productId = req.params.productId as string;
      const userId = req.user?.userId as string;

      const existing = await prisma.product.findFirst({
        where: { id: productId, userId },
      });

      if (!existing) {
        res.status(404).json(new ApiResponse(null, 'Product not found', false));
        return;
      }

      await prisma.product.delete({
        where: { id: productId },
      });

      res.status(200).json(new ApiResponse(null, 'Product deleted successfully', true))
    } catch (error) {
      next(error);
    }
  }
);

export default router;
