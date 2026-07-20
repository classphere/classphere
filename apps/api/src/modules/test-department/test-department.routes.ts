import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware";
import { requireRole } from "../../middleware/rbac.middleware";
import { createDepartmentMember, getReviewPaper, listDepartmentMembers, listReviewPapers, transitionReviewPaper, updateReviewQuestion } from "./test-department.controller";

const router = Router();
const departmentOrAdmin = ["test_department_head", "institute_admin"] as const;

router.get("/members", authenticate, requireRole(...departmentOrAdmin), listDepartmentMembers);
router.post("/members", authenticate, requireRole("institute_admin"), createDepartmentMember);
router.get("/papers", authenticate, requireRole(...departmentOrAdmin), listReviewPapers);
router.get("/papers/:id", authenticate, requireRole(...departmentOrAdmin), getReviewPaper);
router.patch("/papers/:paperId/questions/:questionId", authenticate, requireRole("test_department_head"), updateReviewQuestion);
router.post("/papers/:id/workflow", authenticate, requireRole("test_department_head"), transitionReviewPaper);

export default router;
