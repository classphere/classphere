import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/rbac.middleware";
import {
  createTest,
  getMyTests,
  getAssignedTests,
  getTest,
  publishTest,
} from "../controllers/tests.controller";

const router = Router();

// ⚠️  ORDER MATTERS: static paths ("/my", "/assigned") must be declared BEFORE "/:id"
router.get("/my", authenticate, getMyTests);
router.get("/assigned", authenticate, getAssignedTests);

router.post("/", authenticate, createTest);
router.get("/:id", authenticate, getTest);

// teacher only
router.post("/:id/publish", authenticate, requireRole("teacher", "institute_admin", "super_admin"), publishTest);

export default router;
