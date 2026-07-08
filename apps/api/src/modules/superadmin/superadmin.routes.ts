import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware";
import { requireRole } from "../../middleware/rbac.middleware";
import { uploadQuestions, getPlatformStats, listInstitutes } from "./superadmin.controller";

const router = Router();

// All superadmin routes require authentication + super_admin role
router.use(authenticate, requireRole("super_admin"));

/**
 * GET /api/v1/superadmin/stats
 * Real-time platform-wide stats for the superadmin dashboard.
 */
router.get("/stats", getPlatformStats);

/**
 * GET /api/v1/superadmin/institutes
 * List all institutes with owner info and student counts.
 */
router.get("/institutes", listInstitutes);

/**
 * POST /api/v1/superadmin/upload-questions
 * Upload a JSON question bank with full metadata tagging.
 * Body: { exam, test_type, title, subject, chapter, year, shift, duration, marks, difficulty, questions[] }
 */
router.post("/upload-questions", uploadQuestions);

export default router;

