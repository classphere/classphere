import { supabaseDB } from "./supabase";
import { env } from "../config/env";
import { connection as redisConnection } from "./queue/redis";

/**
 * Platform-wide maintenance mode.
 *
 * Drain semantics, deliberately: switching it on stops new sessions and new
 * test attempts, but an attempt already in progress runs to completion. A
 * student ninety minutes into a three-hour mock does not lose the paper
 * because someone needed to deploy — see MAINTENANCE_DRAIN_ALLOWED in
 * auth.middleware.ts for the exact set of calls that stay open.
 *
 * super_admin is never blocked, so whoever switched it on can verify the fix
 * and switch it back off from inside the app.
 */

const CACHE_KEY = "system:maintenance_mode";

/**
 * Ten seconds. Short because this is read on the authenticated path of every
 * request and the operator expects the switch to bite promptly; the write path
 * clears the key anyway, so this only bounds staleness if that clear fails or
 * another replica wrote the row.
 */
const CACHE_TTL_SEC = 10;

/** Process-local fallback for deployments with no Redis (dev). */
let localValue: { enabled: boolean; readAt: number } | null = null;

function parse(value: unknown): boolean {
  // The column is JSONB, so a `true` literal arrives as a boolean, but a row
  // written by hand in the SQL editor can arrive as the string "true".
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return value.trim().toLowerCase() === "true";
  return false;
}

/**
 * Whether the platform is currently in maintenance.
 *
 * Fails OPEN. If the setting cannot be read — Redis down, Postgres blipping,
 * the row missing — this returns false and traffic is served. The alternative
 * fails closed, which turns a transient database error into a total outage
 * that cannot be cleared from the admin UI, because the admin UI is also
 * behind this check.
 */
export async function isMaintenanceMode(): Promise<boolean> {
  if (env.REDIS_URL) {
    try {
      const cached = await redisConnection.get(CACHE_KEY);
      if (cached !== null) return cached === "1";
    } catch {
      // fall through to the database
    }
  } else if (localValue && Date.now() - localValue.readAt < CACHE_TTL_SEC * 1000) {
    return localValue.enabled;
  }

  let enabled = false;
  try {
    const { data, error } = await supabaseDB
      .from("system_settings")
      .select("value")
      .eq("key", "maintenance_mode")
      .maybeSingle();
    if (error) throw error;
    enabled = parse(data?.value);
  } catch (error: any) {
    console.error("[maintenance] could not read setting, serving traffic:", error?.message ?? error);
    return false;
  }

  if (env.REDIS_URL) {
    try {
      await redisConnection.set(CACHE_KEY, enabled ? "1" : "0", "EX", CACHE_TTL_SEC);
    } catch {
      // cache write failure is non-fatal
    }
  } else {
    localValue = { enabled, readAt: Date.now() };
  }
  return enabled;
}

/** Drop the cached value so a toggle takes effect on the next request. */
export async function invalidateMaintenanceCache(): Promise<void> {
  localValue = null;
  if (!env.REDIS_URL) return;
  try {
    await redisConnection.del(CACHE_KEY);
  } catch {
    // non-fatal — the TTL bounds staleness to CACHE_TTL_SEC anyway
  }
}

/** The single body every blocked caller receives, so clients can branch on `code`. */
export const MAINTENANCE_RESPONSE = {
  success: false,
  code: "MAINTENANCE_MODE",
  message:
    "Classphere is under maintenance right now. Tests already in progress can be finished and submitted. Please try again shortly.",
} as const;
