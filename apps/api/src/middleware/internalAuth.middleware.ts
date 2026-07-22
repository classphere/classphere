import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { env } from "../config/env";

/**
 * Validates the `x-internal-api-key` header for internal cron routes.
 * GCP Cloud Scheduler is configured to send this header on every call.
 * This is intentionally separate from JWT auth.
 *
 * The expected and provided keys are SHA-256 hashed before comparison so the
 * buffers are always the same length — this removes the length side-channel
 * that a plain `length === length` pre-check before timingSafeEqual would
 * leak.
 */
export const requireInternalApiKey = (req: Request, res: Response, next: NextFunction): void => {
  const apiKey = req.headers["x-internal-api-key"];
  const expectedKey = env.INTERNAL_API_KEY;

  if (!expectedKey) {
    res.status(500).json({ success: false, message: "Server misconfiguration: missing INTERNAL_API_KEY" });
    return;
  }

  if (typeof apiKey === "string" && apiKey.length > 0) {
    const providedHash = crypto.createHash("sha256").update(apiKey).digest();
    const expectedHash = crypto.createHash("sha256").update(expectedKey).digest();
    // Both hashes are 32 bytes, so timingSafeEqual is safe and length is not leaked.
    if (crypto.timingSafeEqual(providedHash, expectedHash)) {
      next();
      return;
    }
  }

  res.status(401).json({ success: false, message: "Invalid or missing internal API key" });
};
