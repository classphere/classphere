import { Request, Response, NextFunction } from "express";

/**
 * Validates the `x-internal-api-key` header for internal cron routes.
 * GCP Cloud Scheduler is configured to send this header on every call.
 * This is intentionally separate from JWT auth.
 */
export const requireInternalApiKey = (req: Request, res: Response, next: NextFunction): void => {
  const apiKey = req.headers["x-internal-api-key"];
  const expectedKey = process.env.INTERNAL_API_KEY;

  if (!expectedKey) {
    res.status(500).json({ success: false, message: "Server misconfiguration: missing INTERNAL_API_KEY" });
    return;
  }

  if (!apiKey || apiKey !== expectedKey) {
    res.status(401).json({ success: false, message: "Invalid or missing internal API key" });
    return;
  }

  next();
};
