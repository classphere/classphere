import { Request, Response, NextFunction } from "express";
import { supabaseDB } from "../lib/supabase";

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
    const { supabaseAdmin } = require("../lib/supabase");
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

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
