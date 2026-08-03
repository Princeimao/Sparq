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
  image: z.string().url().optional().or(z.string().length(0)),
});

const updateProductSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  price: z.number().nonnegative().optional(),
  stock: z.number().int().optional(),
  image: z.string().url().optional().or(z.string().length(0)),
});

// GET /products
router.get(
  "/",
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.userId as string;
      const search = req.query.search as string | undefined;

      const products = await prisma.product.findMany({
        where: {
          userId,
          ...(search && {
            name: {
              contains: search,
              mode: "insensitive",
            },
          }),
        },
        orderBy: { createdAt: "desc" },
      });

      res
        .status(200)
        .json(
          new ApiResponse({ products }, "Products fetched successfully", true),
        );
    } catch (error) {
      next(error);
    }
  },
);

// GET /products/:productId
router.get(
  "/:productId",
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const productId = req.params.productId as string;
      const userId = req.user?.userId as string;

      const product = await prisma.product.findFirst({
        where: { id: productId, userId },
      });

      if (!product) {
        res.status(404).json(new ApiResponse(null, "Product not found", false));
        return;
      }

      res
        .status(200)
        .json(
          new ApiResponse({ product }, "Product fetched successfully", true),
        );
    } catch (error) {
      next(error);
    }
  },
);

// POST /products
router.post(
  "/",
  authenticate,
  validateBody(createProductSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.userId as string;
      const { name, description, price, stock, image, imageUrl } = req.body;

      const product = await prisma.product.create({
        data: {
          userId,
          name,
          description,
          price,
          stock,
          image: image || imageUrl || null,
        },
      });

      res
        .status(201)
        .json(
          new ApiResponse({ product }, "Product created successfully", true),
        );
    } catch (error) {
      next(error);
    }
  },
);

// PATCH /products/:productId
router.patch(
  "/:productId",
  authenticate,
  validateBody(updateProductSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const productId = req.params.productId as string;
      const userId = req.user?.userId as string;

      const existing = await prisma.product.findFirst({
        where: { id: productId, userId },
      });

      if (!existing) {
        res.status(404).json(new ApiResponse(null, "Product not found", false));
        return;
      }

      const updateData: Record<string, unknown> = { ...req.body };
      if (updateData.imageUrl && !updateData.image) {
        updateData.image = updateData.imageUrl;
      }
      delete updateData.imageUrl;

      const product = await prisma.product.update({
        where: { id: productId },
        data: updateData,
      });

      res
        .status(200)
        .json(
          new ApiResponse({ product }, "Product updated successfully", true),
        );
    } catch (error) {
      next(error);
    }
  },
);

// DELETE /products/:productId
router.delete(
  "/:productId",
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const productId = req.params.productId as string;
      const userId = req.user?.userId as string;

      const existing = await prisma.product.findFirst({
        where: { id: productId, userId },
      });

      if (!existing) {
        res.status(404).json(new ApiResponse(null, "Product not found", false));
        return;
      }

      await prisma.product.delete({
        where: { id: productId },
      });

      res
        .status(200)
        .json(new ApiResponse(null, "Product deleted successfully", true));
    } catch (error) {
      next(error);
    }
  },
);

export default router;
