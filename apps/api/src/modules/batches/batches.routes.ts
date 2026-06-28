import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware";
import { requireRole } from "../../middleware/rbac.middleware";
import {
  createBatch,
  listBatches,
  getBatch,
  updateBatch,
  deactivateBatch,
  addStudentToBatch,
  removeStudentFromBatch,
  addTeacherToBatch,
  generateBatchInvite,
} from "../institutes/institutes.controller";

const router = Router();

// All batch routes require authentication (applied per-route, not as blanket middleware)

router.post("/", authenticate, requireRole("institute_admin"), createBatch);
router.get("/", authenticate, requireRole("institute_admin", "teacher", "super_admin"), listBatches);
// getBatch: access control is enforced inside the handler (membership check)
router.get("/:id", authenticate, getBatch);
router.patch("/:id", authenticate, requireRole("institute_admin", "super_admin"), updateBatch);
router.delete("/:id", authenticate, requireRole("institute_admin", "super_admin"), deactivateBatch); // soft delete

// Batch membership management
router.post("/:id/students", authenticate, requireRole("institute_admin", "super_admin"), addStudentToBatch);
router.delete("/:id/students/:student_id", authenticate, requireRole("institute_admin", "super_admin"), removeStudentFromBatch);
router.post("/:id/teachers", authenticate, requireRole("institute_admin", "super_admin"), addTeacherToBatch);
router.post("/:id/invite", authenticate, requireRole("institute_admin", "super_admin"), generateBatchInvite);

export default router;
