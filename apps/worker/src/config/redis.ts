import Redis from "ioredis";
import { env } from "./env";

const redisUrl = env.REDIS_URL;

// Log only host:port (never credentials) so env mismatches are visible at boot.
try {
  const u = new URL(redisUrl);
  console.log(`Redis connecting to ${u.hostname}:${u.port || "6379"}`);
} catch {
  console.log("Redis connecting (REDIS_URL is not a parseable URL)");
}

export const redis = new Redis(redisUrl, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,

  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    console.log(`Retrying Redis connection in ${delay}ms...`);
    return delay;
  },

  reconnectOnError(err) {
    const targetError = "READONLY";

    if (err.message.includes(targetError)) {
      console.log("Redis connection lost, attempting to reconnect...");
      return true;
    }

    return false;
  },
});

redis.on("connect", () => console.log("Redis connected"));
redis.on("ready", () => console.log("Redis ready"));
redis.on("error", (err) => console.error("Redis error:", err));
redis.on("reconnecting", () => console.log("Redis reconnecting"));
redis.on("end", () => console.log("Redis connection closed"));
