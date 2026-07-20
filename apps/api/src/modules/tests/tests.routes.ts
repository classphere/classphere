import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware";
import { requireRole } from "../../middleware/rbac.middleware";
import multer from "multer";
import {
  createTest,
  getMyTests,
  getAssignedTests,
  getTest,
  publishTest,
  deleteTest,
  updateGlobalTest,
  bulkUpdateGlobalTests,
  bulkDeleteGlobalTests,
  uploadTestController,
} from "./tests.controller";

const router = Router();

// Multer storage configuration for parsing test files
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max file size
});

const uploadFields = upload.fields([
  { name: "pdf", maxCount: 1 },
  { name: "answer_key", maxCount: 1 },
]);

// ⚠️  ORDER MATTERS: static paths ("/my", "/assigned", "/upload-test") must be declared BEFORE "/:id"
router.get("/my", authenticate, getMyTests);
router.get("/assigned", authenticate, getAssignedTests);

router.post(
  "/upload-test",
  authenticate,
  requireRole("teacher", "institute_admin", "super_admin", "test_department_head"),
  uploadFields as any,
  uploadTestController
);

router.post("/", authenticate, requireRole("teacher", "institute_admin", "super_admin", "test_department_head"), createTest);
router.patch("/bulk/global", authenticate, requireRole("super_admin"), bulkUpdateGlobalTests);
router.delete("/bulk/global", authenticate, requireRole("super_admin"), bulkDeleteGlobalTests);
router.patch("/:id/global", authenticate, requireRole("super_admin"), updateGlobalTest);
router.get("/:id", authenticate, getTest);
router.delete("/:id", authenticate, requireRole("super_admin", "institute_admin"), deleteTest);

// teacher only
router.post("/:id/publish", authenticate, requireRole("teacher", "institute_admin", "super_admin"), publishTest);

export default router;

