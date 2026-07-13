import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware";
import { requireRole } from "../../middleware/rbac.middleware";
import {
  createInstitute,
  getMyInstitute,
  updateInstitute,
  getInstituteStats,
  getInstituteBySlug,
} from "./institutes.controller";

const router = Router();

// All institute routes require authentication (applied per-route, not as blanket middleware)

// ⚠️  Public route — no auth — must come FIRST before /:id wildcard
router.get("/by-slug/:slug", getInstituteBySlug);

// ⚠️  ORDER MATTERS: "/me" must come before "/:id"
router.get("/me", authenticate, requireRole("institute_admin", "super_admin"), getMyInstitute);
router.post("/", authenticate, requireRole("super_admin"), createInstitute);
router.patch("/:id", authenticate, requireRole("institute_admin", "super_admin"), updateInstitute);
router.get("/:id/stats", authenticate, requireRole("institute_admin", "super_admin"), getInstituteStats);

export default router;
