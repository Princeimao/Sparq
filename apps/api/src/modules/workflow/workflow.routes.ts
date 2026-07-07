import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { prisma } from "../../config/prisma";
import { authenticate, requireOrg } from "../../middleware/auth";
import { validateBody } from "../../middleware/validate";

const router = Router();

const createWorkflowSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  triggerType: z.string().min(1),
  steps: z.array(z.record(z.unknown())),
  isActive: z.boolean().default(true),
});

const updateWorkflowSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  triggerType: z.string().optional(),
  steps: z.array(z.record(z.unknown())).optional(),
  isActive: z.boolean().optional(),
});

// Pre-created workflow templates
const DEFAULT_WORKFLOWS = (orgId: string) => [
  {
    organizationId: orgId,
    name: "WhatsApp to Product Purchase Flow",
    description: "Guides customers from product catalog selection to payment checkout via automated WhatsApp conversation steps.",
    triggerType: "WHATSAPP_MESSAGE",
    isActive: true,
    steps: [
      {
        id: "step_1",
        type: "send_message",
        label: "Send Welcome & Catalog",
        config: {
          message: "Welcome! Here is our latest catalog. Respond with the product name you'd like to buy.",
        },
      },
      {
        id: "step_2",
        type: "wait_reply",
        label: "Wait for Product Selection",
        config: { timeoutMinutes: 60 },
      },
      {
        id: "step_3",
        type: "request_address",
        label: "Request Shipping Address",
        config: { message: "Great choice! Please reply with your shipping address." },
      },
      {
        id: "step_4",
        type: "generate_payment_link",
        label: "Generate Stripe Link & Send",
        config: { message: "Thank you! Here is your secure checkout link: {{payment_link}}" },
      },
    ],
  },
  {
    organizationId: orgId,
    name: "WhatsApp Appointment Booking",
    description: "Allows leads to select schedules and book time slots that instantly sync with the Sparq Calendar and Cal.com.",
    triggerType: "WHATSAPP_MESSAGE",
    isActive: true,
    steps: [
      {
        id: "step_1",
        type: "send_message",
        label: "Send Appointment Options",
        config: { message: "Hello! Would you like to schedule an appointment? Please reply with 'Yes' or 'Book'." },
      },
      {
        id: "step_2",
        type: "wait_reply",
        label: "Wait for confirmation",
        config: { timeoutMinutes: 30 },
      },
      {
        id: "step_3",
        type: "offer_slots",
        label: "Send Calendar Slots",
        config: { message: "Here are our available slots for tomorrow:\n1. 10:00 AM\n2. 2:00 PM\n3. 4:00 PM\nReply with a number." },
      },
      {
        id: "step_4",
        type: "create_appointment",
        label: "Confirm Appointment & Sync",
        config: { message: "Perfect! Your appointment has been booked and synchronized." },
      },
    ],
  },
  {
    organizationId: orgId,
    name: "Abandoned Cart Reminder",
    description: "Tracks incomplete checkouts and follow up 30 minutes later with a friendly coupon code.",
    triggerType: "PRODUCT_PURCHASE",
    isActive: false,
    steps: [
      {
        id: "step_1",
        type: "delay",
        label: "Wait 30 minutes",
        config: { durationMinutes: 30 },
      },
      {
        id: "step_2",
        type: "condition",
        label: "Check payment status",
        config: { field: "status", equals: "PENDING" },
      },
      {
        id: "step_3",
        type: "send_message",
        label: "Send checkout reminder",
        config: { message: "Hi! We noticed you left items in your cart. Use code SPARQ10 for 10% off: {{checkout_url}}" },
      },
    ],
  },
];

// ─── GET /api/organizations/:orgId/workflows ─────────────────────────────────
router.get(
  "/:orgId/workflows",
  authenticate,
  requireOrg,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.organizationId as string;

      let workflows = await prisma.workflow.findMany({
        where: { organizationId: orgId },
        orderBy: { createdAt: "desc" },
      });

      // Seed default workflows if none exist
      if (workflows.length === 0) {
        const defaults = DEFAULT_WORKFLOWS(orgId);
        await prisma.workflow.createMany({
          data: defaults,
        });

        workflows = await prisma.workflow.findMany({
          where: { organizationId: orgId },
          orderBy: { createdAt: "desc" },
        });
      }

      res.json({ workflows });
    } catch (error) {
      next(error);
    }
  }
);

// ─── POST /api/organizations/:orgId/workflows ────────────────────────────────
router.post(
  "/:orgId/workflows",
  authenticate,
  requireOrg,
  validateBody(createWorkflowSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.organizationId as string;
      const { name, description, triggerType, steps, isActive } = req.body;

      const workflow = await prisma.workflow.create({
        data: {
          organizationId: orgId,
          name,
          description,
          triggerType,
          steps,
          isActive,
        },
      });

      res.status(201).json({ workflow });
    } catch (error) {
      next(error);
    }
  }
);

// ─── PATCH /api/organizations/:orgId/workflows/:workflowId ───────────────────
router.patch(
  "/:orgId/workflows/:workflowId",
  authenticate,
  requireOrg,
  validateBody(updateWorkflowSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const workflowId = req.params.workflowId as string;
      const existing = await prisma.workflow.findFirst({
        where: { id: workflowId, organizationId: req.organizationId },
      });

      if (!existing) {
        res.status(404).json({ error: "Workflow not found" });
        return;
      }

      const workflow = await prisma.workflow.update({
        where: { id: workflowId },
        data: req.body,
      });

      res.json({ workflow });
    } catch (error) {
      next(error);
    }
  }
);

// ─── DELETE /api/organizations/:orgId/workflows/:workflowId ──────────────────
router.delete(
  "/:orgId/workflows/:workflowId",
  authenticate,
  requireOrg,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const workflowId = req.params.workflowId as string;
      const existing = await prisma.workflow.findFirst({
        where: { id: workflowId, organizationId: req.organizationId },
      });

      if (!existing) {
        res.status(404).json({ error: "Workflow not found" });
        return;
      }

      await prisma.workflow.delete({
        where: { id: workflowId },
      });

      res.json({ message: "Workflow deleted successfully" });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
