import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware";
import { requireRole } from "../../middleware/rbac.middleware";
import { authLimiter } from "../../middleware/auth-rate-limit";
import { signup, login, getMe, updateMe, createStudent } from "./auth.controller";

const router = Router();

// ── Public routes — no authentication required ────────────────────────────────
// Tighter rate limit on credential endpoints (5 / 15 min / IP) for brute-force
// hygiene. Applied before the controller so a flood of attempts is rejected
// before any Supabase Auth call is made.
router.post("/login", authLimiter, login);
router.post("/signup", authLimiter, signup);

// ── Authenticated routes ──────────────────────────────────────────────────────
router.get("/me", authenticate, getMe);
router.patch("/me", authenticate, updateMe);

// ── Admin-only: create a student account with phone+DOB shadow email ──────────
router.post(
  "/create-student",
  authenticate,
  requireRole("institute_admin", "super_admin"),
  createStudent
);

export default router;
