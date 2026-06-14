import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware";
import { requireRole } from "../../middleware/rbac.middleware";
import {
  getAnalysis,
  regenerateAnalysis,
  getBatchAnalysis,
} from "./analysis.controller";

const router = Router();

// ⚠️  ORDER MATTERS: static paths must come before parameterized ones.
// GET /batch/:test_id/:batch_id must be before GET /:attempt_id
router.get("/batch/:test_id/:batch_id", authenticate, requireRole("teacher", "institute_admin", "super_admin"), getBatchAnalysis);

router.get("/:attempt_id", getAnalysis);
router.post("/:attempt_id/regenerate", regenerateAnalysis);

export default router;
