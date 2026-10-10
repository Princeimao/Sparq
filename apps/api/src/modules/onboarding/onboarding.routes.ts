import { Router, Request, Response, NextFunction } from "express";
import { prisma } from "../../config/prisma";
import { redis } from "../../config/redis";
import { authenticate } from "../../middleware/auth";
import { validateBody } from "../../middleware/validate";
import { ApiResponse } from "../../middleware/responseHandler";
import {
  missingFields,
  normalizeModules,
  onboardingDraftSchema,
} from "./onboarding.validation";

const router = Router();

function toPublic(profile: Record<string, unknown>) {
  return profile;
}

async function getOrCreateProfile(userId: string) {
  const existing = await prisma.businessProfile.findUnique({
    where: { userId },
  });
  if (existing) return existing;
  return prisma.businessProfile.create({
    data: { userId, onboardingStatus: "NOT_STARTED", onboardingStep: 0 },
  });
}

// GET /onboarding — current profile + resume point
router.get(
  "/",
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const profile = await getOrCreateProfile(req.user!.userId);
      res.json(new ApiResponse(toPublic(profile), "Onboarding profile fetched", true));
    } catch (error) {
      next(error);
    }
  },
);

// PUT /onboarding — save draft progress (partial, resumable)
router.put(
  "/",
  authenticate,
  validateBody(onboardingDraftSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const { step, ...fields } = req.body as Record<string, unknown> & { step?: number };
      // Drop empty-string placeholders so they don't count as "filled".
      for (const [k, v] of Object.entries(fields)) {
        if (v === "") delete (fields as Record<string, unknown>)[k];
      }
      // Normalize legacy module ids (orders/appointments/reservations).
      if ("enabledModules" in fields) {
        fields.enabledModules = normalizeModules(fields.enabledModules);
      }
      const current = await getOrCreateProfile(userId);
      const draft = {
        ...((current.onboardingDraft as Record<string, unknown> | null) ?? {}),
        ...fields,
      };
      const profile = await prisma.businessProfile.update({
        where: { userId },
        data: {
          ...fields,
          onboardingDraft: draft,
          onboardingStep: typeof step === "number" ? step : current.onboardingStep,
          onboardingStatus:
            current.onboardingStatus === "COMPLETED" ? "COMPLETED" : "IN_PROGRESS",
        } as never,
      });
      res.json(new ApiResponse(toPublic(profile), "Progress saved", true));
    } catch (error) {
      next(error);
    }
  },
);

// POST /onboarding/complete — validate + finalize
router.post(
  "/complete",
  authenticate,
  validateBody(onboardingDraftSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const fields = { ...(req.body as Record<string, unknown>) };
      delete fields.step;
      for (const [k, v] of Object.entries(fields)) {
        if (v === "") delete (fields as Record<string, unknown>)[k];
      }
      if ("enabledModules" in fields) {
        fields.enabledModules = normalizeModules(fields.enabledModules);
      }
      const current = await getOrCreateProfile(userId);
      const merged = {
        ...((current.onboardingDraft as Record<string, unknown> | null) ?? {}),
        ...fields,
      };
      const missing = missingFields(merged as never);
      if (missing.length > 0) {
        res
          .status(422)
          .json(
            new ApiResponse(
              { missing },
              `Please complete the required fields: ${missing.join(", ")}`,
              false,
            ),
          );
        return;
      }
      const profile = await prisma.businessProfile.update({
        where: { userId },
        data: {
          ...fields,
          onboardingDraft: merged,
          onboardingStatus: "COMPLETED",
          completedAt: new Date(),
        } as never,
      });
      // Refresh the worker's cached capabilities (same Redis).
      try {
        await redis.del(`sparq:capabilities:${userId}`);
      } catch (err) {
        console.warn("[onboarding] capabilities cache clear failed:", err);
      }
      res.json(new ApiResponse(toPublic(profile), "Onboarding completed", true));
    } catch (error) {
      next(error);
    }
  },
);

export default router;
