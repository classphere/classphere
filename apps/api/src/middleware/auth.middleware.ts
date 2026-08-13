import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { createRequestAuthClient, supabaseDB } from "../lib/supabase";
import { env } from "../config/env";
import { connection as redisConnection } from "../lib/queue/redis";
import { isMaintenanceMode, MAINTENANCE_RESPONSE } from "../lib/maintenance";
import crypto from "crypto";

// Extend Express Request to carry decoded user info
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: string;
        institute_id: string | null;
      };
    }
  }
}

// The one-device lock exists for students: it stops a test being open on two
// devices at once mid-attempt (see the "Mid-test device protection" comment in
// auth.controller.ts). A test department reviewer or institute admin doing
// paper review isn't taking a test — locking them to one device just meant a
// second login (or even a second tab session) silently invalidated the first,
// and every Save after that failed with SESSION_CONFLICT for no reason tied to
// the thing it was supposedly protecting.
const ONE_DEVICE_EXEMPT_ROLES = new Set([
  "super_admin",
  "institute_admin",
  "test_department_head",
  "test_department_member",
]);

// ─── Auth context cache ───────────────────────────────────────────────────────
// The role/institute/entitlement lookups for an authenticated user rarely change
// between requests but used to cost 5 sequential DB round-trips every time.
// Cache the resolved context in Redis for 30s, keyed by user id.
const AUTH_CONTEXT_TTL_SEC = 30;

interface AuthContext {
  role: string;
  institute_id: string | null;
  active_session_token: string | null;
  faculty_active?: boolean;          // for teacher role
  test_dept_active?: boolean;        // for test_department_* roles
  institute_active?: boolean;        // for institute users
  entitled?: boolean;                // subscription check result
}

async function loadAuthContext(userId: string): Promise<AuthContext | null> {
  const cacheKey = `authctx:${userId}`;
  if (env.REDIS_URL) {
    try {
      const cached = await redisConnection.get(cacheKey);
      if (cached) return JSON.parse(cached) as AuthContext;
    } catch {
      // cache miss / corrupt — fall through to DB
    }
  }

  const { data: dbUser, error } = await supabaseDB
    .from("users")
    .select("role, institute_id, active_session_token")
    .eq("id", userId)
    .single();
  if (error || !dbUser) return null;

  const ctx: AuthContext = {
    role: dbUser.role || "student",
    institute_id: dbUser.institute_id ?? null,
    active_session_token: dbUser.active_session_token ?? null,
  };

  if (ctx.role === "teacher") {
    const { data: faculty } = await supabaseDB.from("faculty").select("is_active").eq("id", userId).maybeSingle();
    ctx.faculty_active = !!faculty?.is_active;
  }
  if (ctx.role === "test_department_head" || ctx.role === "test_department_member") {
    const { data: membership } = await supabaseDB
      .from("test_department_members")
      .select("is_active")
      .eq("user_id", userId)
      .eq("institute_id", ctx.institute_id)
      .maybeSingle();
    ctx.test_dept_active = !!membership?.is_active;
  }

  if (ctx.role !== "super_admin" && ctx.institute_id) {
    const { data: institute } = await supabaseDB
      .from("institutes")
      .select("is_active")
      .eq("id", ctx.institute_id)
      .maybeSingle();
    ctx.institute_active = institute?.is_active !== false;

    if (ctx.institute_active) {
      const { data: subscriptions } = await supabaseDB
        .from("institute_subscriptions")
        .select("status, plan_tier, current_period_end")
        .eq("institute_id", ctx.institute_id)
        .in("status", ["trialing", "active"])
        .order("current_period_end", { ascending: false, nullsFirst: false })
        .limit(5);

      const now = Date.now();
      ctx.entitled = (subscriptions ?? []).some((s: any) => {
        const endsAt = s.current_period_end ? Date.parse(s.current_period_end) : NaN;
        if (s.status === "trialing") return Number.isFinite(endsAt) && endsAt > now;
        return s.status === "active" && s.plan_tier !== "free" && (!Number.isFinite(endsAt) || endsAt > now);
      });
    }
  }

  if (env.REDIS_URL) {
    try {
      await redisConnection.set(cacheKey, JSON.stringify(ctx), "EX", AUTH_CONTEXT_TTL_SEC);
    } catch {
      // cache write failure is non-fatal
    }
  }
  return ctx;
}

/** Invalidate the cached auth context when something material changes
 *  (login, role change, subscription change). Call from auth.controller. */
export async function invalidateAuthContext(userId: string): Promise<void> {
  if (!env.REDIS_URL) return;
  try {
    await redisConnection.del(`authctx:${userId}`);
  } catch {
    // non-fatal
  }
}

// ─── Session-token binding ─────────────────────────────────────────────────────
// The one-device `x-session-token` is only meaningful if it can't be forged
// from the JWT alone. Bind it: the DB stores `active_session_token` as before,
// but the middleware recomputes a binding signature from (userId, sessionToken)
// and the server-side HMAC key, and requires the stored token to match.
//
// When SESSION_BINDING_SECRET is unset (legacy), we fall back to the original
// plain-string comparison so existing sessions keep working — but emit a
// startup warning (handled in env.ts).
function expectedBoundToken(userId: string, sessionToken: string): string {
  if (!env.SESSION_BINDING_SECRET) return sessionToken; // legacy: plain token
  return crypto
    .createHmac("sha256", env.SESSION_BINDING_SECRET)
    .update(`${userId}|${sessionToken}`)
    .digest("hex");
}

/** Public alias used by the login controller to compute the bound token to
 *  store at login time. The client keeps the plain token; only the server
 *  stores/compares the bound form. */
export const expectedBoundSessionToken = expectedBoundToken;

// ─── Maintenance drain list ───────────────────────────────────────────────────
// The calls a student already sitting a paper must still be able to make while
// the platform is in maintenance. Everything else is refused for non-superadmin.
//
// /auth/me is included because the client re-reads its own profile whenever the
// Supabase session refreshes, and a test running for three hours will refresh at
// least once.
//
// POST /attempts is here despite being the "start a test" call, because the test
// page issues it on *every* load — that is how it resumes, and the controller
// returns the existing in-progress attempt rather than a new one. Blocking it
// would strand a mid-paper student the moment they refreshed or their phone
// re-woke the tab. It is gated inside startAttempt instead, which can tell a
// resume from a genuinely new attempt; only the latter is refused.
//
// GET /analysis/:id keeps the post-submit redirect from dead-ending: the test
// page sends the student straight to their result the instant they submit.
const MAINTENANCE_DRAIN_ALLOWED: Array<{ method: string; pattern: RegExp }> = [
  { method: "GET", pattern: /^\/auth\/me$/ },
  { method: "GET", pattern: /^\/tests\/[^/]+$/ },
  { method: "POST", pattern: /^\/attempts$/ },
  { method: "GET", pattern: /^\/attempts\/[^/]+$/ },
  { method: "PATCH", pattern: /^\/attempts\/[^/]+$/ },
  { method: "POST", pattern: /^\/attempts\/[^/]+\/submit$/ },
  { method: "GET", pattern: /^\/analysis\/[^/]+$/ },
];

/**
 * Match against `req.originalUrl`, not `req.path`.
 *
 * Express rewrites `req.url` as a request descends through mounted routers, so
 * by the time this middleware runs inside attempts.routes the path has been
 * stripped to `/:id` and the patterns above would never match. originalUrl is
 * the one value that is still the whole path.
 */
function allowedWhileDraining(method: string, originalUrl: string): boolean {
  const path = originalUrl.split("?")[0].replace(/^\/api\/v1/, "");
  return MAINTENANCE_DRAIN_ALLOWED.some(
    (entry) => entry.method === method.toUpperCase() && entry.pattern.test(path),
  );
}

/**
 * Validates the Bearer JWT issued by Supabase Auth.
 * On success, attaches `req.user` with { id, email, role, institute_id }.
 * Enforces one-device login for all non-super_admin roles via x-session-token.
 * Refuses non-superadmin traffic while the platform is in maintenance, except
 * for the in-flight test calls listed above.
 */
export const authenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {

  // ── Standard JWT auth (Supabase Bearer token) ─────────────────────────────
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ success: false, message: "Authentication required. Please log in." });
    return;
  }

  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) {
    res.status(401).json({ success: false, message: "Malformed authorization header." });
    return;
  }

  let userId: string;
  let userEmail: string;

  // Fast path: verify the JWT locally with the Supabase JWT secret. This avoids
  // a network round-trip to supabase.auth.getUser() on every request.
  if (env.SUPABASE_JWT_SECRET) {
    try {
      const payload = jwt.verify(token, env.SUPABASE_JWT_SECRET, {
        algorithms: ["HS256"],
        // Supabase access tokens are JWTs with the standard claims; audience is
        // "authenticated" for user sessions.
        // (Do not enforce audience — Supabase tokens use the project ref, which
        //  we don't know here; exp + signature is sufficient.)
      }) as any;
      if (!payload?.sub) {
        res.status(401).json({ success: false, message: "Invalid or expired token. Please log in again." });
        return;
      }
      userId = payload.sub;
      userEmail = payload.email ?? "";
    } catch {
      // Local verify failed — fall back to the network call so refresh-token
      // rotations and any custom claims still work correctly.
      const { data: { user }, error } = await createRequestAuthClient().auth.getUser(token);
      if (error || !user) {
        res.status(401).json({ success: false, message: "Invalid or expired token. Please log in again." });
        return;
      }
      userId = user.id;
      userEmail = user.email ?? "";
    }
  } else {
    // No JWT secret configured — use the original network verification path.
    const { data: { user }, error } = await createRequestAuthClient().auth.getUser(token);
    if (error || !user) {
      res.status(401).json({ success: false, message: "Invalid or expired token. Please log in again." });
      return;
    }
    userId = user.id;
    userEmail = user.email ?? "";
  }

  try {
    const ctx = await loadAuthContext(userId);
    if (!ctx) {
      res.status(401).json({ success: false, message: "User profile not found. Please contact support." });
      return;
    }

    const role = ctx.role;
    const institute_id = ctx.institute_id;

    if (role === "teacher" && !ctx.faculty_active) {
      res.status(403).json({ success: false, code: "FACULTY_INACTIVE", message: "This faculty account is no longer active." });
      return;
    }
    if ((role === "test_department_head" || role === "test_department_member") && !ctx.test_dept_active) {
      res.status(403).json({ success: false, code: "TEST_DEPARTMENT_INACTIVE", message: "This Test Department account is no longer active." });
      return;
    }

    req.user = { id: userId, email: userEmail, role, institute_id };

    // Maintenance drain. Checked before entitlement so a suspended-institute or
    // expired-subscription message never masks the real reason the call failed.
    // super_admin is exempt — otherwise the switch could not be turned back off.
    if (role !== "super_admin" && !allowedWhileDraining(req.method, req.originalUrl)) {
      if (await isMaintenanceMode()) {
        res.status(503).json(MAINTENANCE_RESPONSE);
        return;
      }
    }

    // Service-role queries bypass RLS, so entitlement must be enforced centrally.
    if (role !== "super_admin" && institute_id) {
      if (!ctx.institute_active) {
        res.status(403).json({ success: false, code: "INSTITUTE_SUSPENDED", message: "This institute is suspended." });
        return;
      }
      if (!ctx.entitled) {
        res.status(403).json({ success: false, code: "SUBSCRIPTION_REQUIRED", message: "This institute does not have an active trial or subscription." });
        return;
      }
    }

    // ── One-device enforcement: skip for super_admin and other staff roles ─────
    if (!ONE_DEVICE_EXEMPT_ROLES.has(role)) {
      const sessionToken = req.headers["x-session-token"] as string | undefined;

      if (!sessionToken) {
        res.status(401).json({
          success: false,
          code: "NO_SESSION_TOKEN",
          message: "Session token missing. Please log in again.",
        });
        return;
      }

      const bound = expectedBoundToken(userId, sessionToken);

      if (!ctx.active_session_token) {
        // Auto-lock to the first device token used (e.g., right after admin
        // creation or signup). Single conditional update avoids the TOCTOU race
        // that a read-then-write introduced: only the first concurrent request
        // that sees NULL wins the lock; the rest re-read and compare.
        const { data: updated, error: updErr } = await supabaseDB
          .from("users")
          .update({ active_session_token: bound })
          .eq("id", userId)
          .is("active_session_token", null)
          .select("active_session_token")
          .maybeSingle();

        if (updErr) {
          res.status(503).json({ success: false, code: "SESSION_UNAVAILABLE", message: "Could not establish a session. Please try again." });
          return;
        }
        if (!updated) {
          // Another request already locked the token between our read and write.
          // Re-read and compare strictly now.
          const { data: reloaded } = await supabaseDB
            .from("users")
            .select("active_session_token")
            .eq("id", userId)
            .maybeSingle();
          if (reloaded?.active_session_token !== bound) {
            res.status(401).json({ success: false, code: "SESSION_CONFLICT", message: "Your account was opened on another device. Please log in again." });
            return;
          }
        }
        // Token now locked to this device. Invalidate cache so subsequent
        // requests see the locked value immediately.
        await invalidateAuthContext(userId);
      } else if (ctx.active_session_token !== bound) {
        res.status(401).json({
          success: false,
          code: "SESSION_CONFLICT",
          message: "Your account was opened on another device. Please log in again.",
        });
        return;
      }
    }

    next();
  } catch (err) {
    res.status(401).json({ success: false, message: "Invalid or expired token. Please log in again." });
  }
};
