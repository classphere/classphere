import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware";
import { requireRole } from "../../middleware/rbac.middleware";
import { signup, login, getMe, updateMe, createStudent } from "./auth.controller";

const router = Router();

// ── Public routes — no authentication required ────────────────────────────────
router.post("/login", login);
router.post("/signup", signup);

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
