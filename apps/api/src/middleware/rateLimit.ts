import { Request, Response, NextFunction } from "express";
import { redis } from "../config/redis";

interface RateLimitOptions {
  /** Window size in seconds. */
  windowSec: number;
  /** Max requests per window per key. */
  max: number;
  /** Route prefix for the Redis key namespace. */
  namespace: string;
}

/**
 * Redis fixed-window rate limiter. Keys on the authenticated user when
 * present, otherwise the client IP. Fails OPEN (lets traffic through) if
 * Redis is unavailable, so a cache outage can't take down the API — abuse
 * prevention is best-effort, availability is guaranteed.
 */
export function rateLimit(options: RateLimitOptions) {
  const { windowSec, max, namespace } = options;
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const identity = req.user?.userId ?? req.ip ?? "unknown";
    const key = `ratelimit:${namespace}:${identity}`;
    try {
      const count = await redis.incr(key);
      if (count === 1) {
        await redis.expire(key, windowSec);
      }
      const ttl = await redis.ttl(key);
      res.setHeader("X-RateLimit-Limit", String(max));
      res.setHeader("X-RateLimit-Remaining", String(Math.max(0, max - count)));
      if (ttl > 0) res.setHeader("X-RateLimit-Reset", String(ttl));
      if (count > max) {
        res.status(429).json({
          error: "Too many requests. Please slow down and try again.",
          retryAfterSec: ttl > 0 ? ttl : windowSec,
        });
        return;
      }
      next();
    } catch (err) {
      console.warn("[rateLimit] Redis unavailable, failing open:", err);
      next();
    }
  };
}

export const strictAuthLimiter = rateLimit({
  windowSec: 60,
  max: 20,
  namespace: "auth",
});

export const webhookLimiter = rateLimit({
  windowSec: 60,
  max: 300,
  namespace: "webhook",
});

export const bookingLimiter = rateLimit({
  windowSec: 60,
  max: 30,
  namespace: "booking",
});
