import { Request, Response, NextFunction } from "express";

export type Role =
  | "student"
  | "teacher"
  | "institute_admin"
  | "super_admin"
  | "test_department_head"
  | "test_department_member";

/**
 * Factory: returns middleware that allows only the specified roles.
 * Must be placed after `authenticate` so `req.user` is populated.
 *
 * Usage:
 *   router.post("/", authenticate, requireRole("super_admin"), handler)
 *   router.get("/", authenticate, requireRole("teacher", "institute_admin"), handler)
 */
export const requireRole = (...roles: Role[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, message: "Authentication required" });
      return;
    }

    if (!roles.includes(req.user.role as Role)) {
      res.status(403).json({
        success: false,
        message: `Access denied. Required role(s): ${roles.join(", ")}`,
      });
      return;
    }

    next();
  };
};
