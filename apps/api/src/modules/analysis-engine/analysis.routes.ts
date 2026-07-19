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
router.get("/batch/:test_id/:batch_id", authenticate, requireRole("teacher", "institute_admin", "super_admin"), getBatchAnalysis);

router.post("/:attempt_id/booster", authenticate, requireRole("student"), createBooster);
router.post("/:attempt_id/retry", authenticate, requireRole("student"), retryMyAnalysis);
router.get("/:attempt_id", authenticate, getAnalysis);
router.post("/:attempt_id/regenerate", authenticate, requireRole("super_admin"), regenerateAnalysis);

export default router;
