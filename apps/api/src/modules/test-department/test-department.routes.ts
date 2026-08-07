import { Router } from "express";
import multer from "multer";
import { authenticate } from "../../middleware/auth.middleware";
import { requireRole } from "../../middleware/rbac.middleware";
import { createDepartmentMember, deactivateDepartmentMember, deleteReviewQuestion, getReviewPaper, updateReviewPaper, listDepartmentMembers, listReviewPapers, transitionReviewPaper, updateReviewQuestion, validatePaper, uploadImage } from "./test-department.controller";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only images (PNG, JPG, GIF, WEBP, SVG) are allowed"));
    }
  },
});

router.get("/members", authenticate, requireRole("institute_admin", "test_department_head", "test_department_member"), listDepartmentMembers);
router.post("/members", authenticate, requireRole("institute_admin", "test_department_head"), createDepartmentMember);
router.delete("/members/:userId", authenticate, requireRole("institute_admin", "test_department_head"), deactivateDepartmentMember);
router.get("/papers", authenticate, requireRole("institute_admin", "test_department_head", "test_department_member"), listReviewPapers);
router.get("/papers/:id", authenticate, requireRole("institute_admin", "test_department_head", "test_department_member"), getReviewPaper);
router.patch("/papers/:id", authenticate, requireRole("institute_admin", "test_department_head", "test_department_member"), updateReviewPaper);
router.get("/papers/:id/validate", authenticate, requireRole("institute_admin", "test_department_head", "test_department_member"), validatePaper);
router.patch("/papers/:paperId/questions/:questionId", authenticate, requireRole("institute_admin", "test_department_head", "test_department_member"), updateReviewQuestion);
router.delete("/papers/:paperId/questions/:questionId", authenticate, requireRole("institute_admin", "test_department_head", "test_department_member"), deleteReviewQuestion);
router.post("/papers/:id/workflow", authenticate, requireRole("institute_admin", "test_department_head", "test_department_member"), transitionReviewPaper);
router.post("/upload", authenticate, requireRole("institute_admin", "test_department_head", "test_department_member"), upload.single("image") as any, uploadImage);

export default router;
