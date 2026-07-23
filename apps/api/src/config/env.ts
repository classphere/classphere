import dotenv from "dotenv";
import { z } from "zod";

// This module must be imported by every process before clients are constructed.
// `override: false` intentionally preserves platform-provided production values.
dotenv.config({ override: false });

/**
 * Centralized, fail-fast environment validation.
 *
 * Required vars throw at startup if missing/invalid — no more silent localhost
 * fallbacks that only blow up in production. Optional vars are typed and have
 * safe defaults.
 *
 * Import `env` from here instead of reading `process.env` directly elsewhere.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(3001),

  // Supabase
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_KEY: z.string().min(1),
  // Used to verify Supabase JWTs locally (avoids a network round-trip per request).
  // Optional: when absent, auth middleware falls back to supabase.auth.getUser().
  SUPABASE_JWT_SECRET: z.string().min(1).optional(),

  // Redis (BullMQ + rate limiting). Optional in dev; required in production.
  REDIS_URL: z.string().optional(),

  // R2 (file storage). Optional in dev; required in production.
  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET_NAME: z.string().optional(),

  // Web origins / multi-tenant base domain
  APP_BASE_DOMAIN: z.string().default("classphere.com"),
  ALLOWED_WEB_ORIGINS: z.string().default(""),

  // Internal cron auth
  INTERNAL_API_KEY: z.string().min(1).optional(),

  // HMAC key used to bind the one-device session token to the Supabase JWT.
  // Optional but strongly recommended; when absent, session binding is skipped
  // (legacy behavior) with a startup warning in production.
  SESSION_BINDING_SECRET: z.string().min(16).optional(),

  // Datalab Marker webhook orchestration. BASE_URL is the public callback
  // prefix without /:jobId, e.g.
  // https://api.classphere.com/api/v1/webhooks/datalab/marker
  DATALAB_API_KEY: z.string().min(1).optional(),
  DATALAB_WEBHOOK_BASE_URL: z.string().url().optional(),
  DATALAB_WEBHOOK_SECRET: z.string().min(16).optional(),

  // Observability
  SENTRY_DSN: z.string().url().optional(),

  // Misc integrations (all optional — features degrade gracefully if absent)
  FIREBASE_SERVICE_ACCOUNT_JSON: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
});

function parseEnv() {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("\n");
    throw new Error(`[config] Invalid environment configuration:\n${issues}`);
  }
  const e = parsed.data;

  // Production-specific hardening: warn (not throw) on recommended-but-missing
  // keys so a misconfigured deploy is loud but doesn't brick the process.
  if (e.NODE_ENV === "production") {
    if (!e.REDIS_URL) console.warn("[config] REDIS_URL missing in production — rate limiting & queues will not work.");
    if (!e.SUPABASE_JWT_SECRET) console.warn("[config] SUPABASE_JWT_SECRET missing — auth will make a network round-trip per request.");
    if (!e.SESSION_BINDING_SECRET) console.warn("[config] SESSION_BINDING_SECRET missing — session token is not cryptographically bound to the JWT.");
    if (!e.INTERNAL_API_KEY) console.warn("[config] INTERNAL_API_KEY missing — internal cron routes will reject all calls.");
    if (e.DATALAB_API_KEY && (!e.DATALAB_WEBHOOK_BASE_URL || !e.DATALAB_WEBHOOK_SECRET)) {
      console.warn("[config] Datalab is configured without webhook URL/secret — Marker will use legacy synchronous polling.");
    }
  }

  return e;
}

export const env = parseEnv();

/** Back-compat helper for callers that still read a single required var. */
export function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`[config] Missing required environment variable: ${name}`);
  return value;
}
