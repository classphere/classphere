import { Request, Response, NextFunction } from "express";
import { createRequestAuthClient, supabaseDB } from "../lib/supabase";

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

/**
 * Validates the Bearer JWT issued by Supabase Auth.
 * On success, attaches `req.user` with { id, email, role, institute_id }.
 * Enforces one-device login for all non-super_admin roles via x-session-token header.
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

  try {
    const { data: { user }, error } = await createRequestAuthClient().auth.getUser(token);

    if (error || !user) {
      res.status(401).json({ success: false, message: "Invalid or expired token. Please log in again." });
      return;
    }

    // ── Fetch role, institute_id, and active_session_token from DB ────────────
    const { data: dbUser, error: dbError } = await supabaseDB
      .from("users")
      .select("role, institute_id, active_session_token")
      .eq("id", user.id)
      .single();

    if (dbError || !dbUser) {
      res.status(401).json({ success: false, message: "User profile not found. Please contact support." });
      return;
    }

    const role: string = dbUser.role || (user.app_metadata?.role as string) || "student";
    const institute_id: string | null = dbUser.institute_id ?? null;

    req.user = { id: user.id, email: user.email ?? "", role, institute_id };

    // Service-role queries bypass RLS, so this must be enforced centrally.
    if (role !== "super_admin" && institute_id) {
      const { data: institute, error: instituteError } = await supabaseDB
        .from("institutes")
        .select("is_active")
        .eq("id", institute_id)
        .maybeSingle();
      if (instituteError || !institute || institute.is_active === false) {
        res.status(403).json({ success: false, code: "INSTITUTE_SUSPENDED", message: "This institute is suspended." });
        return;
      }

      const { data: subscriptions, error: subscriptionError } = await supabaseDB
        .from("institute_subscriptions")
        .select("status, plan_tier, current_period_end")
        .eq("institute_id", institute_id)
        .in("status", ["trialing", "active"])
        .order("current_period_end", { ascending: false, nullsFirst: false })
        .limit(5);

      if (subscriptionError) {
        res.status(503).json({ success: false, code: "ENTITLEMENT_UNAVAILABLE", message: "Institute access could not be verified. Please contact support." });
        return;
      }

      const now = Date.now();
      const entitled = (subscriptions ?? []).some((subscription: any) => {
        const endsAt = subscription.current_period_end ? Date.parse(subscription.current_period_end) : NaN;
        if (subscription.status === "trialing") return Number.isFinite(endsAt) && endsAt > now;
        return subscription.status === "active" && subscription.plan_tier !== "free" &&
          (!Number.isFinite(endsAt) || endsAt > now);
      });

      if (!entitled) {
        res.status(403).json({ success: false, code: "SUBSCRIPTION_REQUIRED", message: "This institute does not have an active trial or subscription." });
        return;
      }
    }

    // ── One-device enforcement: skip for super_admin ───────────────────────────
    if (role !== "super_admin") {
      const sessionToken = req.headers["x-session-token"] as string | undefined;

      if (!sessionToken) {
        res.status(401).json({
          success: false,
          code: "NO_SESSION_TOKEN",
          message: "Session token missing. Please log in again.",
        });
        return;
      }

      if (!dbUser.active_session_token) {
        // Auto-lock to the first device token used (e.g., right after admin creation or signup)
        await supabaseDB
          .from("users")
          .update({ active_session_token: sessionToken })
          .eq("id", user.id);
      } else if (dbUser.active_session_token !== sessionToken) {
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
