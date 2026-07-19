import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware";
import { requireRole } from "../../middleware/rbac.middleware";
import {
  getStudentDashboard,
  getStudentAnalytics,
  getStudentHistory,
  getStudentMistakes,
  getStudentRevisionQueue,
  getRevisionTaskQuestions,
  resolveMistake,
  updateStudentRevisionTask,
  submitRevisionTask,
} from "./student.controller";
import { getTeacherDashboard, getBatchAnalytics } from "./teacher.controller";

const router = Router();

// ─── Student Dashboard Routes ─────────────────────────────────────────────────
router.get(
  "/student",
  authenticate,
  requireRole("student"),
  getStudentDashboard
);

router.get(
  "/student/history",
  authenticate,
  requireRole("student"),
  getStudentHistory
);

router.get(
  "/student/analytics",
  authenticate,
  requireRole("student"),
  getStudentAnalytics
);

router.get(
  "/student/mistakes",
  authenticate,
  requireRole("student"),
  getStudentMistakes
);

router.get(
  "/student/revision-queue",
  authenticate,
  requireRole("student"),
  getStudentRevisionQueue
);

router.patch(
  "/student/revision-queue/:id",
  authenticate,
  requireRole("student"),
  updateStudentRevisionTask
);

router.get(
  "/student/revision-queue/:id/questions",
  authenticate,
  requireRole("student"),
  getRevisionTaskQuestions
);

router.post(
  "/student/revision-queue/:id/submit",
  authenticate,
  requireRole("student"),
  submitRevisionTask
);

router.patch(
  "/student/mistakes/:topic/resolve",
  authenticate,
  requireRole("student"),
  resolveMistake
);

// ─── Teacher Dashboard Routes ─────────────────────────────────────────────────
router.get(
  "/teacher",
  authenticate,
  requireRole("teacher", "institute_admin", "super_admin"),
  getTeacherDashboard
);

router.get(
  "/teacher/batch/:id/analytics",
  authenticate,
  requireRole("teacher", "institute_admin", "super_admin"),
  getBatchAnalytics
);

export default router;
