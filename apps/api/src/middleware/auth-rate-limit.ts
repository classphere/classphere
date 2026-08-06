import rateLimit from "express-rate-limit";
import { getRateLimitStore } from "./rate-limit-store";

/**
 * Stricter limiter for credential-bearing endpoints (login / signup).
 * 5 attempts per 15 minutes per IP — general brute-force hygiene regardless
 * of the credential scheme on the other side.
 *
 * Uses the shared Redis-backed store when available (counts shared across
 * replicas); falls back to in-memory otherwise (single-instance dev).
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many login attempts. Please try again after 15 minutes." },
  // An unavailable optional Redis store must not block authentication requests.
  passOnStoreError: true,
  // @ts-ignore — store is optional in the type but accepted at runtime
  store: getRateLimitStore("rl:auth:"),
});
