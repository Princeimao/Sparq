import { Router, Request, Response, NextFunction } from "express";
import { prisma } from "../../config/prisma";
import { authenticate, requireOrg } from "../../middleware/auth";
import { initiateReorderConversation } from "../../services/conversation-engine";
import { validateBody } from "../../middleware/validate";
import { z } from "zod";

const router = Router();

// ─── Schemas ─────────────────────────────────────────────────────────────────

const triggerReorderSchema = z.object({
  customerId: z.string().min(1),
  productName: z.string().min(1),
  amount: z.number().positive().optional(),
  campaignId: z.string().optional(),
});

// ─── GET /api/organizations/:orgId/conversations ─────────────────────────────
// List active conversations
router.get(
  "/:orgId/conversations",
  authenticate,
  requireOrg,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
      const step = req.query.step as string;

      const where: Record<string, unknown> = {
        customer: { organizationId: req.organizationId },
      };
      if (step) where.step = step;

      const [conversations, total] = await Promise.all([
        prisma.conversationState.findMany({
          where,
          include: {
            customer: { select: { id: true, phone: true, name: true } },
            order: {
              select: { id: true, productName: true, amount: true, status: true },
            },
          },
          orderBy: { lastMessageAt: "desc" },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.conversationState.count({ where }),
      ]);

      res.json({
        conversations,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      });
    } catch (error) {
      next(error);
    }
  }
);

// ─── POST /api/organizations/:orgId/conversations/trigger ────────────────────
// Manually trigger a reorder conversation (simulated trigger for MVP)
router.post(
  "/:orgId/conversations/trigger",
  authenticate,
  requireOrg,
  validateBody(triggerReorderSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { customerId, productName, amount, campaignId } = req.body;

      // Verify customer belongs to this org
      const customer = await prisma.customer.findFirst({
        where: {
          id: customerId,
          organizationId: req.organizationId,
        },
      });

      if (!customer) {
        res.status(404).json({ error: "Customer not found in this organization" });
        return;
      }

      if (!customer.optedIn) {
        res.status(400).json({ error: "Customer has not opted in to messages" });
        return;
      }

      // Check for active conversation
      const activeConversation = await prisma.conversationState.findFirst({
        where: {
          customerId,
          step: { notIn: ["COMPLETED", "CANCELLED"] },
        },
      });

      if (activeConversation) {
        res.status(409).json({
          error: "Customer already has an active conversation",
          conversation: activeConversation,
        });
        return;
      }

      // Create the order
      const order = await prisma.order.create({
        data: {
          organizationId: req.organizationId!,
          customerId,
          campaignId,
          productName,
          amount,
          status: "PENDING",
        },
      });

      // Initiate conversation
      await initiateReorderConversation(customerId, order.id, productName);

      res.status(201).json({
        message: "Reorder conversation initiated",
        orderId: order.id,
      });
    } catch (error) {
      next(error);
    }
  }
);

// ─── GET /api/organizations/:orgId/conversations/:conversationId ─────────────
router.get(
  "/:orgId/conversations/:conversationId",
  authenticate,
  requireOrg,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const conversationId = req.params.conversationId as string;
      const conversation = await prisma.conversationState.findUnique({
        where: { id: conversationId },
        include: {
          customer: true,
          order: true,
        },
      });

      if (!conversation) {
        res.status(404).json({ error: "Conversation not found" });
        return;
      }

      // Get message history for this customer
      const messages = await prisma.message.findMany({
        where: { customerId: conversation.customerId },
        orderBy: { createdAt: "asc" },
        take: 50,
      });

      res.json({ conversation, messages });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
