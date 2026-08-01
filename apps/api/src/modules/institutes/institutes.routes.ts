import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware";
import { requireRole } from "../../middleware/rbac.middleware";
import {
  createInstitute,
  getMyInstitute,
  updateInstitute,
  deleteInstitute,
  getInstituteStats,
  getInstituteReports,
  getInstituteBySlug,
  getInstituteSettings,
  updateInstituteSettings,
  getInstituteSubscription,
  updateInstituteSubscription,
  getPublicConfigByDomain
} from "./institutes.controller";

const router = Router();

// All institute routes require authentication (applied per-route, not as blanket middleware)

// ⚠️  Public route — no auth — must come FIRST before /:id wildcard
router.get("/by-slug/:slug", getInstituteBySlug);
router.get("/public/:domain", getPublicConfigByDomain);

// ⚠️  ORDER MATTERS: "/me" must come before "/:id"
router.get("/me", authenticate, requireRole("institute_admin", "super_admin"), getMyInstitute);
router.get("/me/settings", authenticate, requireRole("institute_admin", "super_admin"), getInstituteSettings);
router.patch("/me/settings", authenticate, requireRole("institute_admin", "super_admin"), updateInstituteSettings);
router.get("/me/subscription", authenticate, requireRole("institute_admin", "super_admin"), getInstituteSubscription);

router.post("/", authenticate, requireRole("super_admin"), createInstitute);
router.patch("/:id", authenticate, requireRole("institute_admin", "super_admin"), updateInstitute);
router.delete("/:id", authenticate, requireRole("super_admin"), deleteInstitute);
// Commercial terms are super_admin only — never the institute being billed.
router.patch("/:id/subscription", authenticate, requireRole("super_admin"), updateInstituteSubscription);
router.get("/:id/stats", authenticate, requireRole("institute_admin", "super_admin"), getInstituteStats);
router.get("/:id/reports", authenticate, requireRole("institute_admin", "super_admin"), getInstituteReports);

export default router;
