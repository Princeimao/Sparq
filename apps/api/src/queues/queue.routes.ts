import { Router, Request, Response, NextFunction } from "express";
import { whatsappQueue } from "./whatsapp.queue";
import { ApiResponse } from "../middleware/responseHandler";

const router = Router();

/**
 * GET /api/queue/stats
 * Returns aggregate counts for the WhatsApp message queue.
 */
router.get(
  "/stats",
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const counts = await whatsappQueue.getJobCounts(
        "waiting",
        "active",
        "completed",
        "failed",
        "delayed",
        "paused",
      );

      res.json(
        new ApiResponse(
          {
            queue: "whatsapp-messages",
            stats: {
              waiting: counts.waiting ?? 0,
              active: counts.active ?? 0,
              completed: counts.completed ?? 0,
              failed: counts.failed ?? 0,
              delayed: counts.delayed ?? 0,
              paused: counts.paused ?? 0,
              total:
                (counts.waiting ?? 0) +
                (counts.active ?? 0) +
                (counts.delayed ?? 0) +
                (counts.paused ?? 0),
            },
          },
          "Queue stats fetched.",
          true,
        ),
      );
    } catch (error) {
      next(error);
    }
  },
);

/**
 * GET /api/queue/jobs
 * Returns a paginated list of recent jobs from the queue.
 * Query params: status (waiting|active|completed|failed|delayed), page, limit
 */
router.get(
  "/jobs",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const status = (req.query.status as string) || "failed";
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(100, parseInt(req.query.limit as string) || 20);
      const start = (page - 1) * limit;
      const end = start + limit - 1;

      const validStatuses = [
        "waiting",
        "active",
        "completed",
        "failed",
        "delayed",
        "paused",
      ];

      if (!validStatuses.includes(status)) {
        res
          .status(400)
          .json(
            new ApiResponse(
              null,
              `Invalid status. Valid values: ${validStatuses.join(", ")}`,
              false,
            ),
          );
        return;
      }

      const jobs = await whatsappQueue.getJobs([status as any], start, end);

      const serialized = jobs.map((job) => ({
        id: job.id,
        name: job.name,
        data: {
          messageId: job.data.messageId,
          customerWaId: job.data.customerWaId,
          phoneNumberId: job.data.phoneNumberId,
          text: job.data.text?.slice(0, 80),
          messageType: job.data.messageType,
        },
        attemptsMade: job.attemptsMade,
        timestamp: job.timestamp,
        processedOn: job.processedOn,
        finishedOn: job.finishedOn,
        failedReason: (job as any).failedReason ?? null,
      }));

      res.json(
        new ApiResponse(
          { jobs: serialized, page, limit },
          "Jobs fetched.",
          true,
        ),
      );
    } catch (error) {
      next(error);
    }
  },
);

/**
 * POST /api/queue/retry/:jobId
 * Retry a specific failed job by ID.
 */
router.post(
  "/retry/:jobId",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { jobId } = req.params;
      const job = await whatsappQueue.getJob(jobId as string);

      if (!job) {
        res
          .status(404)
          .json(new ApiResponse(null, "Job not found.", false));
        return;
      }

      await job.retry();

      res.json(new ApiResponse({ jobId }, "Job queued for retry.", true));
    } catch (error) {
      next(error);
    }
  },
);

/**
 * DELETE /api/queue/jobs/:jobId
 * Remove a specific job from the queue.
 */
router.delete(
  "/jobs/:jobId",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { jobId } = req.params;
      const job = await whatsappQueue.getJob(jobId as string);

      if (!job) {
        res
          .status(404)
          .json(new ApiResponse(null, "Job not found.", false));
        return;
      }

      await job.remove();

      res.json(
        new ApiResponse({ jobId }, "Job removed from queue.", true),
      );
    } catch (error) {
      next(error);
    }
  },
);

/**
 * POST /api/queue/drain
 * Drain the queue (remove all waiting jobs). Use with caution.
 */
router.post(
  "/drain",
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      await whatsappQueue.drain();
      res.json(
        new ApiResponse(null, "Queue drained (waiting jobs cleared).", true),
      );
    } catch (error) {
      next(error);
    }
  },
);

/**
 * POST /api/queue/clean
 * Clean completed or failed jobs older than a given grace period.
 * Body: { status: "completed" | "failed", graceMs: number }
 */
router.post(
  "/clean",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { status = "completed", graceMs = 3600000 } = req.body;

      if (!["completed", "failed"].includes(status)) {
        res
          .status(400)
          .json(
            new ApiResponse(
              null,
              "status must be 'completed' or 'failed'",
              false,
            ),
          );
        return;
      }

      const removed = await whatsappQueue.clean(
        graceMs as number,
        1000,
        status as "completed" | "failed",
      );

      res.json(
        new ApiResponse(
          { removed: removed.length },
          `Cleaned ${removed.length} ${status} jobs.`,
          true,
        ),
      );
    } catch (error) {
      next(error);
    }
  },
);

export default router;
