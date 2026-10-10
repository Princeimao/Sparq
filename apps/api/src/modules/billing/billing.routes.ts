import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { authenticate } from "../../middleware/auth";
import { validateBody } from "../../middleware/validate";
import { ApiResponse } from "../../middleware/responseHandler";
import { verifyRazorpayPaymentSignature } from "@sparq/subscription";
import { env } from "../../config/env";
import { prisma } from "../../config/prisma";
import {
  cancelSubscription,
  changePlan,
  createSubscription,
  getCurrentSubscription,
  listPayments,
  listPlans,
} from "./billing.service";
import { processRazorpayWebhook } from "./billing.webhook";

const router = Router();

const createSchema = z.object({
  plan: z.enum(["GROWTH", "PRO"]),
  interval: z.enum(["MONTHLY", "YEARLY"]).default("MONTHLY"),
});

const changeSchema = z.object({
  plan: z.enum(["FREE", "GROWTH", "PRO"]),
  interval: z.enum(["MONTHLY", "YEARLY"]).default("MONTHLY"),
});

const cancelSchema = z.object({
  atPeriodEnd: z.boolean().default(true),
});

const verifySchema = z.object({
  razorpay_payment_id: z.string().min(1),
  razorpay_subscription_id: z.string().min(1),
  razorpay_signature: z.string().min(1),
});

// ─── Authenticated billing APIs ─────────────────────────────────────────────

router.get("/plans", authenticate, (_req, res) => {
  res.json(new ApiResponse(listPlans(), "Plans fetched successfully", true));
});

router.get(
  "/subscription",
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await getCurrentSubscription(req.user!.userId);
      res.json(
        new ApiResponse(data, "Subscription fetched successfully", true),
      );
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  "/subscriptions",
  authenticate,
  validateBody(createSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user!.userId },
        select: { email: true, name: true },
      });
      const data = await createSubscription(req.user!.userId, {
        ...req.body,
        email: user?.email,
        name: user?.name ?? undefined,
      });
      res
        .status(201)
        .json(new ApiResponse(data, "Subscription created", true));
    } catch (error) {
      next(error);
    }
  },
);

router.patch(
  "/subscriptions",
  authenticate,
  validateBody(changeSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user!.userId },
        select: { email: true, name: true },
      });
      const data = await changePlan(req.user!.userId, {
        ...req.body,
        email: user?.email,
        name: user?.name ?? undefined,
      });
      // changePlan may return a cancel result (PublicSubscription) or a
      // create result ({ subscription, razorpay* }). Normalize the shape.
      if ("subscription" in (data as object)) {
        res.json(new ApiResponse(data, "Plan changed", true));
      } else {
        res.json(
          new ApiResponse(
            { subscription: data },
            "Plan changed. Downgrade takes effect at period end.",
            true,
          ),
        );
      }
    } catch (error) {
      next(error);
    }
  },
);

router.delete(
  "/subscriptions",
  authenticate,
  validateBody(cancelSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await cancelSubscription(
        req.user!.userId,
        req.body.atPeriodEnd,
      );
      res.json(
        new ApiResponse(
          { subscription: data },
          "Subscription cancelled",
          true,
        ),
      );
    } catch (error) {
      next(error);
    }
  },
);

/** Confirm a Razorpay Checkout payment for a subscription (post-checkout). */
router.post(
  "/subscriptions/verify",
  authenticate,
  validateBody(verifySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const {
        razorpay_payment_id,
        razorpay_subscription_id,
        razorpay_signature,
      } = req.body;
      if (!env.RAZORPAY_KEY_SECRET) {
        res.status(503).json({ error: "Billing is not configured." });
        return;
      }
      const valid = verifyRazorpayPaymentSignature(
        razorpay_payment_id,
        razorpay_subscription_id,
        razorpay_signature,
        env.RAZORPAY_KEY_SECRET,
      );
      if (!valid) {
        res.status(400).json({ error: "Payment verification failed." });
        return;
      }
      const data = await getCurrentSubscription(req.user!.userId);
      res.json(
        new ApiResponse(
          { subscription: data, verified: true },
          "Payment verified",
          true,
        ),
      );
    } catch (error) {
      next(error);
    }
  },
);

router.get(
  "/payments",
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const limit = Math.min(
        parseInt(req.query.limit as string) || 20,
        100,
      );
      const data = await listPayments(req.user!.userId, limit);
      res.json(new ApiResponse(data, "Payments fetched successfully", true));
    } catch (error) {
      next(error);
    }
  },
);

// ─── Public Razorpay webhook (signature-verified, idempotent) ────────────────

router.post(
  "/webhooks/razorpay",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Raw body is captured in app.ts (express.json verify callback).
      const rawBody: string | undefined = (req as Request & { rawBody?: string })
        .rawBody;
      const signature = req.headers["x-razorpay-signature"] as
        | string
        | undefined;
      if (!rawBody) {
        res.status(400).json({ error: "Missing raw body" });
        return;
      }
      await processRazorpayWebhook(rawBody, signature);
      res.json({ status: "ok" });
    } catch (error) {
      next(error);
    }
  },
);

export default router;
