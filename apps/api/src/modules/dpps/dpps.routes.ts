import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware";
import { requireRole } from "../../middleware/rbac.middleware";
import {
  createDPP,
  getTeacherDPPs,
  getStudentDPPs,
  getDPPQuestions,
  submitDPP,
  deleteDPP,
  getDPPAnalytics,
} from "./dpps.controller";

const router = Router();

// Teacher routes
router.post(
  "/",
  authenticate,
  requireRole("teacher", "institute_admin"),
  createDPP
);

router.get(
  "/teacher",
  authenticate,
  requireRole("teacher", "institute_admin", "super_admin"),
  getTeacherDPPs
);

// Student routes
router.get(
  "/student",
  authenticate,
  requireRole("student"),
  getStudentDPPs
);

router.get("/:id", authenticate, getDPPQuestions); // actually we can use this for meta too
router.get("/:id/questions", authenticate, getDPPQuestions);
router.post("/:id/submit", authenticate, requireRole("student"), submitDPP);

// analytics for teacher
router.get("/:id/analytics", authenticate, requireRole("teacher", "institute_admin", "super_admin"), getDPPAnalytics);

// delete
router.delete("/:id", authenticate, requireRole("teacher", "institute_admin", "super_admin"), deleteDPP);

export default router;
