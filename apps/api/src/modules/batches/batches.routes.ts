import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware";
import { requireRole } from "../../middleware/rbac.middleware";
import {
  createBatch,
  listBatches,
  getBatch,
  updateBatch,
  deactivateBatch,
  restoreBatch,
  addStudentToBatch,
  moveStudentsBetweenBatches,
  removeStudentFromBatch,
  addTeacherToBatch,
  removeTeacherFromBatch,
  getExamCalendar,
  updateExamCalendarEntry,
} from "../institutes/institutes.controller";

const router = Router();

// All batch routes require authentication (applied per-route, not as blanket middleware)

// Exam calendar — public read, superadmin write
router.get("/exam-calendar", getExamCalendar);
router.patch("/exam-calendar/:exam_code", authenticate, requireRole("super_admin"), updateExamCalendarEntry);

router.post("/", authenticate, requireRole("institute_admin"), createBatch);
router.get("/", authenticate, requireRole("institute_admin", "teacher", "super_admin", "test_department_head", "test_department_member"), listBatches);
// getBatch: access control is enforced inside the handler (membership check)
router.get("/:id", authenticate, getBatch);
router.patch("/:id", authenticate, requireRole("institute_admin", "super_admin"), updateBatch);
router.delete("/:id", authenticate, requireRole("institute_admin", "super_admin"), deactivateBatch); // archive
// Archiving used to be a one-way door: is_active was not an updatable field
// and nothing ever set it back, so a misclick could only be undone in the DB.
router.post("/:id/restore", authenticate, requireRole("institute_admin", "super_admin"), restoreBatch);

// Batch membership management
router.post("/:id/students", authenticate, requireRole("institute_admin", "super_admin"), addStudentToBatch);
// Section changes and class 12 -> droppers, without re-importing anyone.
router.post("/:id/students/move", authenticate, requireRole("institute_admin", "super_admin"), moveStudentsBetweenBatches);
router.delete("/:id/students/:student_id", authenticate, requireRole("institute_admin", "super_admin"), removeStudentFromBatch);
router.post("/:id/teachers", authenticate, requireRole("institute_admin", "super_admin"), addTeacherToBatch);
router.delete("/:id/teachers/:teacher_id", authenticate, requireRole("institute_admin", "super_admin"), removeTeacherFromBatch);

export default router;
