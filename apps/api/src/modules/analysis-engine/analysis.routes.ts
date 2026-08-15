import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware";
import { requireRole } from "../../middleware/rbac.middleware";
import {
  getAnalysis,
  regenerateAnalysis,
  getBatchAnalysis,
  retryMyAnalysis,
} from "./analysis.controller";
import { createBooster } from "./booster.controller";

const router = Router();

// ⚠️  ORDER MATTERS: static paths must come before parameterized ones.
// GET /batch/:test_id/:batch_id must be before GET /:attempt_id
// Test Department roles included alongside teacher/institute_admin: they build
// and publish the paper, and how a batch actually performed on it is the
// feedback loop for the next one. Same institute scoping applies inside
// getBatchAnalysis regardless of role.
router.get("/batch/:test_id/:batch_id", authenticate, requireRole("teacher", "institute_admin", "test_department_head", "test_department_member", "super_admin"), getBatchAnalysis);

router.post("/:attempt_id/booster", authenticate, requireRole("student"), createBooster);
router.post("/:attempt_id/retry", authenticate, requireRole("student"), retryMyAnalysis);
router.get("/:attempt_id", authenticate, getAnalysis);
router.post("/:attempt_id/regenerate", authenticate, requireRole("super_admin"), regenerateAnalysis);

export default router;
