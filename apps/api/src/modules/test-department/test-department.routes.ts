import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware";
import { requireRole } from "../../middleware/rbac.middleware";
import { createDepartmentMember, deactivateDepartmentMember, getReviewPaper, listDepartmentMembers, listReviewPapers, transitionReviewPaper, updateReviewQuestion } from "./test-department.controller";

const router = Router();
router.get("/members", authenticate, requireRole("institute_admin", "test_department_head", "test_department_member"), listDepartmentMembers);
router.post("/members", authenticate, requireRole("institute_admin", "test_department_head"), createDepartmentMember);
router.delete("/members/:userId", authenticate, requireRole("institute_admin", "test_department_head"), deactivateDepartmentMember);
router.get("/papers", authenticate, requireRole("test_department_head", "test_department_member"), listReviewPapers);
router.get("/papers/:id", authenticate, requireRole("test_department_head", "test_department_member"), getReviewPaper);
router.patch("/papers/:paperId/questions/:questionId", authenticate, requireRole("test_department_head", "test_department_member"), updateReviewQuestion);
router.post("/papers/:id/workflow", authenticate, requireRole("test_department_head", "test_department_member"), transitionReviewPaper);

export default router;
