import rateLimit from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import { env } from "../config/env";
import { connection as redisConnection } from "../lib/queue/redis";

// Shared Redis-backed store (same one used by the global limiter in index.ts).
// Falls back to in-memory when Redis is not configured (dev only).
const rateLimitStore = env.REDIS_URL
  ? new RedisStore({
      sendCommand: (command: string, ...args: string[]) =>
        redisConnection.call(command, ...args) as Promise<number>,
    })
  : undefined;

/**
 * Stricter limiter for credential-bearing endpoints (login / signup).
 * 5 attempts per 15 minutes per IP — general brute-force hygiene regardless
 * of the credential scheme on the other side.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many login attempts. Please try again after 15 minutes." },
  // @ts-ignore — store is optional in the type but accepted at runtime
  store: rateLimitStore,
});
