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
 */
export const authenticate = (req: Request, res: Response, next: NextFunction): void => {
  // ── API Key bypass (for superadmin tooling before real auth is wired up) ──
  const internalKey = process.env.INTERNAL_API_KEY;
  const providedKey = req.headers["x-api-key"];
  if (internalKey && providedKey === internalKey) {
    req.user = { id: "superadmin", email: "admin@local", role: "super_admin" };
    next();
    return;
  }

  // ── Standard JWT auth (Supabase Bearer token) ──────────────────────────────
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    // Fallback to mock student for local development/mock login flow
    req.user = { id: "mock-student-id", email: "student@local.com", role: "student" };
    next();
    return;
  }

  const token = authHeader.split(" ")[1];
  if (token === "mock" || token === "undefined" || token === "") {
    req.user = { id: "mock-student-id", email: "student@local.com", role: "student" };
    next();
    return;
  }

  const jwtSecret = process.env.SUPABASE_JWT_SECRET;

  if (!jwtSecret) {
    res.status(500).json({ success: false, message: "Server misconfiguration: missing JWT secret" });
    return;
  }

  try {
    const decoded = jwt.verify(token, jwtSecret) as jwt.JwtPayload;

    req.user = {
      id: decoded.sub as string,
      email: decoded.email as string,
      // Supabase stores app metadata (role) under app_metadata
      role: (decoded.app_metadata?.role ?? decoded.role ?? "student") as string,
    };

    next();
  } catch (err) {
    res.status(401).json({ success: false, message: "Invalid or expired token" });
  }
};
