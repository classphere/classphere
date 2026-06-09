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
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ success: false, message: "Missing or malformed Authorization header" });
    return;
  }

  const token = authHeader.split(" ")[1];
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
