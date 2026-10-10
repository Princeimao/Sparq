import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { prisma } from "../../config/prisma";
import { authenticate } from "../../middleware/auth";
import { validateBody } from "../../middleware/validate";
import { ApiResponse } from "../../middleware/responseHandler";
import { assertResourceOwned, assertStaffOwned } from "../../lib/tenant";

const router = Router();

const hoursRowSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:MM"),
  endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:MM"),
  isActive: z.boolean().default(true),
});

const setHoursSchema = z.object({
  staffId: z.string().cuid().optional(),
  resourceId: z.string().cuid().optional(),
  hours: z.array(hoursRowSchema).max(28),
});

const timeOffSchema = z.object({
  staffId: z.string().cuid().optional(),
  resourceId: z.string().cuid().optional(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  reason: z.string().max(300).optional(),
}).refine((v) => v.staffId || v.resourceId, {
  message: "Either staffId or resourceId is required",
});

const setBreaksSchema = z.object({
  staffId: z.string().cuid().optional(),
  resourceId: z.string().cuid().optional(),
  breaks: z
    .array(
      z.object({
        dayOfWeek: z.number().int().min(0).max(6),
        startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:MM"),
        endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:MM"),
        label: z.string().max(100).optional(),
      }),
    )
    .max(28),
});

async function assertScope(
  userId: string,
  scope: { staffId?: string; resourceId?: string },
) {
  if (scope.staffId) await assertStaffOwned(userId, scope.staffId);
  else if (scope.resourceId) await assertResourceOwned(userId, scope.resourceId);
  else throw Object.assign(new Error("Either staffId or resourceId is required"), { statusCode: 400 });
}

// GET /availability/hours?staffId=&resourceId= — weekly schedule
router.get(
  "/hours",
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.userId as string;
      const staffId = req.query.staffId as string | undefined;
      const resourceId = req.query.resourceId as string | undefined;
      await assertScope(userId, { staffId, resourceId });
      const hours = await prisma.availability.findMany({
        where: { staffId: staffId ?? null, resourceId: resourceId ?? null },
        orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
      });
      res.json(new ApiResponse({ hours }, "Hours fetched", true));
    } catch (error) {
      next(error);
    }
  },
);

// PUT /availability/hours — replace the week's schedule for one owner
router.put(
  "/hours",
  authenticate,
  validateBody(setHoursSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.userId as string;
      const { staffId, resourceId, hours } = req.body;
      await assertScope(userId, { staffId, resourceId });
      await prisma.$transaction([
        prisma.availability.deleteMany({
          where: { staffId: staffId ?? null, resourceId: resourceId ?? null },
        }),
        prisma.availability.createMany({
          data: hours.map((h: z.infer<typeof hoursRowSchema>) => ({
            staffId: staffId ?? null,
            resourceId: resourceId ?? null,
            ...h,
          })),
        }),
      ]);
      const saved = await prisma.availability.findMany({
        where: { staffId: staffId ?? null, resourceId: resourceId ?? null },
        orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
      });
      res.json(new ApiResponse({ hours: saved }, "Hours saved", true));
    } catch (error) {
      next(error);
    }
  },
);

// GET /availability/time-off?staffId=&resourceId=
router.get(
  "/time-off",
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.userId as string;
      const staffId = req.query.staffId as string | undefined;
      const resourceId = req.query.resourceId as string | undefined;
      const upcoming = req.query.upcoming !== "false";
      const list = await prisma.timeOff.findMany({
        where: {
          userId,
          ...(staffId || resourceId
            ? { staffId: staffId ?? null, resourceId: resourceId ?? null }
            : {}),
          ...(upcoming ? { endDate: { gte: new Date() } } : {}),
        },
        orderBy: { startDate: "asc" },
        include: {
          staff: { select: { id: true, name: true } },
          resource: { select: { id: true, name: true } },
        },
      });
      res.json(new ApiResponse({ timeOff: list }, "Time off fetched", true));
    } catch (error) {
      next(error);
    }
  },
);

// POST /availability/time-off
router.post(
  "/time-off",
  authenticate,
  validateBody(timeOffSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.userId as string;
      const { staffId, resourceId, startDate, endDate, reason } = req.body;
      await assertScope(userId, { staffId, resourceId });
      const start = new Date(startDate);
      const end = new Date(endDate);
      if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) {
        res.status(422).json(new ApiResponse(null, "Invalid time-off period", false));
        return;
      }
      const entry = await prisma.timeOff.create({
        data: {
          userId,
          staffId: staffId ?? null,
          resourceId: resourceId ?? null,
          startDate: start,
          endDate: end,
          reason,
        },
      });
      res.status(201).json(new ApiResponse({ timeOff: entry }, "Time off added", true));
    } catch (error) {
      next(error);
    }
  },
);

// DELETE /availability/time-off/:id
router.delete(
  "/time-off/:id",
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const existing = await prisma.timeOff.findFirst({
        where: { id: req.params.id as string, userId: req.user?.userId as string },
      });
      if (!existing) {
        res.status(404).json(new ApiResponse(null, "Time-off entry not found", false));
        return;
      }
      await prisma.timeOff.delete({ where: { id: existing.id } });
      res.json(new ApiResponse(null, "Time off removed", true));
    } catch (error) {
      next(error);
    }
  },
);

// GET /availability/breaks?staffId=&resourceId= — recurring intraday breaks
router.get(
  "/breaks",
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.userId as string;
      const staffId = req.query.staffId as string | undefined;
      const resourceId = req.query.resourceId as string | undefined;
      await assertScope(userId, { staffId, resourceId });
      const breaks = await prisma.break.findMany({
        where: { staffId: staffId ?? null, resourceId: resourceId ?? null },
        orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
      });
      res.json(new ApiResponse({ breaks }, "Breaks fetched", true));
    } catch (error) {
      next(error);
    }
  },
);

// PUT /availability/breaks — replace breaks for one owner
router.put(
  "/breaks",
  authenticate,
  validateBody(setBreaksSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.userId as string;
      const { staffId, resourceId, breaks } = req.body as {
        staffId?: string;
        resourceId?: string;
        breaks: { dayOfWeek: number; startTime: string; endTime: string; label?: string }[];
      };
      await assertScope(userId, { staffId, resourceId });
      for (const b of breaks) {
        if (b.endTime <= b.startTime) {
          res.status(422).json(new ApiResponse(null, "Break end must be after start", false));
          return;
        }
      }
      await prisma.$transaction([
        prisma.break.deleteMany({
          where: { staffId: staffId ?? null, resourceId: resourceId ?? null },
        }),
        prisma.break.createMany({
          data: breaks.map((b) => ({
            userId,
            staffId: staffId ?? null,
            resourceId: resourceId ?? null,
            dayOfWeek: b.dayOfWeek,
            startTime: b.startTime,
            endTime: b.endTime,
            label: b.label,
          })),
        }),
      ]);
      const saved = await prisma.break.findMany({
        where: { staffId: staffId ?? null, resourceId: resourceId ?? null },
        orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
      });
      res.json(new ApiResponse({ breaks: saved }, "Breaks saved", true));
    } catch (error) {
      next(error);
    }
  },
);

export default router;
