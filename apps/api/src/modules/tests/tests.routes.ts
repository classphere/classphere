import { NextFunction, Request, Response, Router } from "express";
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
  validateTest,
  deleteTestQuestion,
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

/** Multer receives the entire PDF before the controller runs; log that phase. */
function logPdfUploadStart(req: Request, res: Response, next: NextFunction): void {
  const requestId = `pdf-upload-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  res.locals.pdfUpload = { requestId, startedAt: Date.now() };
  const contentLength = Number(req.headers["content-length"] ?? 0);
  const size = Number.isFinite(contentLength) && contentLength > 0
    ? `${(contentLength / 1024 / 1024).toFixed(2)} MB`
    : "unknown size";
  console.info(`[pdfUpload][${requestId}] Receiving multipart upload (${size})`);
  next();
}

function parsePdfUpload(req: Request, res: Response, next: NextFunction): void {
  uploadFields(req, res, (error: any) => {
    const { requestId = "unknown", startedAt = Date.now() } = res.locals.pdfUpload ?? {};
    const elapsed = Date.now() - startedAt;
    if (error) {
      console.error(`[pdfUpload][${requestId}] Multipart upload failed after ${elapsed}ms: ${error.message}`);
      res.status(error.code === "LIMIT_FILE_SIZE" ? 413 : 400).json({
        success: false,
        status: "error",
        message: error.code === "LIMIT_FILE_SIZE"
          ? "PDF is larger than the 50 MB upload limit."
          : `Upload could not be read: ${error.message}`,
      });
      return;
    }
    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
    const pdfBytes = files?.pdf?.[0]?.size ?? 0;
    const keyBytes = files?.answer_key?.[0]?.size ?? 0;
    console.info(`[pdfUpload][${requestId}] Multipart upload received in ${elapsed}ms (PDF ${(pdfBytes / 1024 / 1024).toFixed(2)} MB, answer key ${(keyBytes / 1024 / 1024).toFixed(2)} MB)`);
    next();
  });
}

// ⚠️  ORDER MATTERS: static paths ("/my", "/assigned", "/upload-test") must be declared BEFORE "/:id"
router.get("/my", authenticate, getMyTests);
router.get("/assigned", authenticate, getAssignedTests);

// institute_admin belongs here. The PDF upload screen is one component shared by
// all three tenant roles — /institute/tests/create holds it, and both
// /test-department/create and /institute/test-department/create re-export it,
// with middleware rewriting the institute paths onto it. The page even routes an
// institute admin back to /institute/tests when they finish.
//
// The role was missing from this list only, so an institute admin could open the
// screen built for them, fill it in, upload, and be refused at the last step.
// Nothing in uploadTestController is test-department specific: it scopes
// everything by req.user.institute_id, which an institute admin has, and files
// the result as a draft for review exactly as it does for anyone else.
router.post(
  "/upload-test",
  authenticate,
  requireRole("super_admin", "institute_admin", "test_department_head", "test_department_member"),
  logPdfUploadStart,
  parsePdfUpload,
  uploadTestController
);

// Assemble a paper from the question bank rather than a PDF. Same four roles as
// upload-test: whoever can create a test one way can create it the other.
router.post("/", authenticate, requireRole("super_admin", "institute_admin", "test_department_head", "test_department_member"), createTest);
router.patch("/bulk/global", authenticate, requireRole("super_admin"), bulkUpdateGlobalTests);
router.delete("/bulk/global", authenticate, requireRole("super_admin"), bulkDeleteGlobalTests);
router.patch("/:id/global", authenticate, requireRole("super_admin"), updateGlobalTest);
// The same per-question report the Test Department workspace gets. Reachable by
// every role that can review a paper, since one function produces it.
router.get("/:id/validate", authenticate, requireRole("super_admin", "institute_admin", "test_department_head", "test_department_member"), validateTest);
router.delete("/:id/questions/:questionId", authenticate, requireRole("super_admin"), deleteTestQuestion);
router.get("/:id", authenticate, getTest);
router.delete("/:id", authenticate, requireRole("super_admin"), deleteTest);

// teacher only
router.post("/:id/publish", authenticate, requireRole("super_admin"), publishTest);

export default router;

