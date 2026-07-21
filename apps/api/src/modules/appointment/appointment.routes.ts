import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { prisma } from "../../config/prisma";
import { authenticate, requireOrg } from "../../middleware/auth";
import { validateBody } from "../../middleware/validate";

const router = Router();

const createAppointmentSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  customerName: z.string().max(200).optional(),
  customerEmail: z.string().email().optional().or(z.literal("")),
  customerPhone: z.string().max(30).optional(),
  status: z.enum(["PENDING", "CONFIRMED", "CANCELLED"]).default("PENDING"),
});

const updateAppointmentSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
  customerName: z.string().max(200).optional(),
  customerEmail: z.string().email().optional().or(z.literal("")),
  customerPhone: z.string().max(30).optional(),
  status: z.enum(["PENDING", "CONFIRMED", "CANCELLED"]).optional(),
});

// ─── GET /api/organizations/:orgId/appointments ──────────────────────────────
router.get(
  "/:orgId/appointments",
  authenticate,
  requireOrg,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.organizationId as string;
      const includeExternal = req.query.includeExternal === "true";

      // 1. Fetch internal appointments
      const appointments = await prisma.appointment.findMany({
        where: { organizationId: orgId },
        orderBy: { startTime: "asc" },
      });

      // 2. Fetch active integrations to see if Google/Cal.com are enabled
      const integrations = await prisma.integration.findMany({
        where: { organizationId: orgId, isActive: true },
      });

      const isGoogleConnected = integrations.some(
        (i) => i.name.toLowerCase().includes("google") || (i.type as string) === "CUSTOM_API"
      );
      const isCalConnected = integrations.some(
        (i) => i.name.toLowerCase().includes("cal.com") || i.name.toLowerCase().includes("cal")
      );

      let mergedEvents = appointments.map((appt) => ({
        id: appt.id,
        title: appt.title,
        description: appt.description,
        startTime: appt.startTime.toISOString(),
        endTime: appt.endTime.toISOString(),
        customerName: appt.customerName,
        customerEmail: appt.customerEmail,
        customerPhone: appt.customerPhone,
        status: appt.status,
        source: "sparq",
      }));

      // 3. Inject mock external events if integrated
      if (includeExternal) {
        if (isGoogleConnected) {
          const now = new Date();
          const googleEvent1 = new Date(now);
          googleEvent1.setHours(now.getHours() + 2);
          const googleEvent1End = new Date(googleEvent1);
          googleEvent1End.setHours(googleEvent1.getHours() + 1);

          mergedEvents.push({
            id: "external-google-1",
            title: "🔵 [Google Cal] Team sync & Standup",
            description: "Synchronized from connected Google Account",
            startTime: googleEvent1.toISOString(),
            endTime: googleEvent1End.toISOString(),
            customerName: "Engineering Team",
            customerEmail: "team@company.com",
            customerPhone: "",
            status: "CONFIRMED",
            source: "google-calendar",
          } as any);
        }

        if (isCalConnected) {
          const now = new Date();
          const calEvent1 = new Date(now);
          calEvent1.setDate(now.getDate() + 1);
          calEvent1.setHours(15, 0, 0, 0);
          const calEvent1End = new Date(calEvent1);
          calEvent1End.setHours(16, 0, 0, 0);

          mergedEvents.push({
            id: "external-cal-1",
            title: "🗓️ [Cal.com] Product Demo: WhatsApp Automation",
            description: "Scheduled via Cal.com booking link",
            startTime: calEvent1.toISOString(),
            endTime: calEvent1End.toISOString(),
            customerName: "Sarah Jenkins (Potential Lead)",
            customerEmail: "sarah.j@example.com",
            customerPhone: "+15550199",
            status: "CONFIRMED",
            source: "cal-com",
          } as any);
        }
      }

      res.json({
        appointments: mergedEvents,
        integrations: {
          googleCalendar: isGoogleConnected,
          calCom: isCalConnected,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// ─── POST /api/organizations/:orgId/appointments ─────────────────────────────
router.post(
  "/:orgId/appointments",
  authenticate,
  requireOrg,
  validateBody(createAppointmentSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.organizationId as string;
      const { title, description, startTime, endTime, customerName, customerEmail, customerPhone, status } = req.body;
      const start = new Date(startTime);
      const end = new Date(endTime);

      if (end <= start) {
        res.status(400).json({ error: "Appointment end time must be after start time" });
        return;
      }

      const appointment = await prisma.appointment.create({
        data: {
          organizationId: orgId,
          title,
          description,
          startTime: start,
          endTime: end,
          customerName,
          customerEmail,
          customerPhone,
          status,
        },
      });

      res.status(201).json({ appointment });
    } catch (error) {
      next(error);
    }
  }
);

// ─── PATCH /api/organizations/:orgId/appointments/:appointmentId ──────────────
router.patch(
  "/:orgId/appointments/:appointmentId",
  authenticate,
  requireOrg,
  validateBody(updateAppointmentSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const appointmentId = req.params.appointmentId as string;
      const existing = await prisma.appointment.findFirst({
        where: { id: appointmentId, organizationId: req.organizationId },
      });

      if (!existing) {
        res.status(404).json({ error: "Appointment not found" });
        return;
      }

      const updateData: any = { ...req.body };

      if (updateData.startTime) {
        updateData.startTime = new Date(updateData.startTime);
      }
      if (updateData.endTime) {
        updateData.endTime = new Date(updateData.endTime);
      }

      const start = updateData.startTime || existing.startTime;
      const end = updateData.endTime || existing.endTime;
      if (end <= start) {
        res.status(400).json({ error: "Appointment end time must be after start time" });
        return;
      }

      const appointment = await prisma.appointment.update({
        where: { id: appointmentId },
        data: updateData,
      });

      res.json({ appointment });
    } catch (error) {
      next(error);
    }
  }
);

// ─── DELETE /api/organizations/:orgId/appointments/:appointmentId ────────────
router.delete(
  "/:orgId/appointments/:appointmentId",
  authenticate,
  requireOrg,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const appointmentId = req.params.appointmentId as string;
      const existing = await prisma.appointment.findFirst({
        where: { id: appointmentId, organizationId: req.organizationId },
      });

      if (!existing) {
        res.status(404).json({ error: "Appointment not found" });
        return;
      }

      await prisma.appointment.delete({
        where: { id: appointmentId },
      });

      res.json({ message: "Appointment deleted successfully" });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
