import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

// Extend Express Request to carry decoded user info
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: string;
      };
    }
  }
}

/**
 * Validates the Bearer JWT issued by Supabase Auth.
 * On success, attaches `req.user` with { id, email, role }.
 * On failure, returns 401.
 *
 * Two valid paths:
 * 1. x-api-key header matching INTERNAL_API_KEY → superadmin access for internal tooling
 * 2. Authorization: Bearer <supabase_jwt> → standard user auth
 */
export const authenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  // ── Internal API Key bypass (super admin tooling & cron jobs) ────────────────
  const internalKey = process.env.INTERNAL_API_KEY;
  const providedKey = req.headers["x-api-key"];
  if (internalKey && providedKey === internalKey) {
    req.user = { id: "superadmin", email: "admin@examprep.in", role: "super_admin" };
    next();
    return;
  }

  // ── Standard JWT auth (Supabase Bearer token) ─────────────────────────────
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ success: false, message: "Authentication required. Please log in." });
    return;
  }

  const token = authHeader.split(" ")[1];
  if (!token) {
    res.status(401).json({ success: false, message: "Malformed authorization header." });
    return;
  }

  const jwtSecret = process.env.SUPABASE_JWT_SECRET;
  if (!jwtSecret) {
    res.status(500).json({ success: false, message: "Server misconfiguration: missing JWT secret" });
    return;
  }

  try {
    const { supabaseAdmin } = require("../lib/supabase");
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      res.status(401).json({ success: false, message: "Invalid or expired token. Please log in again." });
      return;
    }

    // ── Role: prefer public.users (source of truth) over app_metadata ─────────
    // app_metadata.role is only set when users are created via the admin API.
    // Most users only have a role in the public.users table.
    let role = (user.app_metadata?.role as string) ?? null;

    if (!role || role === "authenticated") {
      // Look up the actual role from the DB
      const { data: dbUser } = await supabaseAdmin
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single();

      role = dbUser?.role ?? "student";
    }

    req.user = {
      id: user.id,
      email: user.email ?? "",
      role,
    };

    next();
  } catch (err) {
    res.status(401).json({ success: false, message: "Invalid or expired token. Please log in again." });
  }
};
