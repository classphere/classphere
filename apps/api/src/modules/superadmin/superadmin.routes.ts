import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware";
import { requireRole } from "../../middleware/rbac.middleware";
import { uploadQuestions, getPlatformStats, listInstitutes, listTransactions, extractPDFController } from "./superadmin.controller";
import { listAllTickets } from "../support/support.controller";
import multer from "multer";
import { uploadToR2 } from "../../lib/r2";

const router = Router();

// Configure multer storage for images
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

// Configure multer storage for PDFs (larger limit)
const uploadPDF = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === "application/pdf" || file.originalname.toLowerCase().endsWith(".pdf")) {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are allowed"));
    }
  },
});

// All superadmin routes require authentication + super_admin role
router.use(authenticate, requireRole("super_admin"));

/**
 * POST /api/v1/superadmin/upload
 * Upload an image to Cloudflare R2 and retrieve the public access URL.
 */
router.post("/upload", upload.single("image") as any, async (req: any, res: any) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }
    const url = await uploadToR2(req.file.buffer, req.file.originalname, req.file.mimetype);
    return res.status(200).json({ success: true, url });
  } catch (err: any) {
    console.error("[superadmin/upload error]", err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/v1/superadmin/stats
 * Real-time platform-wide stats for the superadmin dashboard.
 */
router.get("/stats", getPlatformStats);

/**
 * GET /api/v1/superadmin/institutes
 * List all institutes with owner info and student counts.
 */
router.get("/institutes", listInstitutes);

/**
 * POST /api/v1/superadmin/upload-questions
 * Upload a JSON question bank with full metadata tagging.
 * Body: { exam, test_type, title, subject, chapter, year, shift, duration, marks, difficulty, questions[] }
 */
router.post("/upload-questions", uploadQuestions);

/**
 * POST /api/v1/superadmin/extract-pdf
 * Extract questions dynamically from a PDF using AI OCR.
 * Body: pdf file, pages string
 */
router.post("/extract-pdf", uploadPDF.single("pdf") as any, extractPDFController);

/**
 * GET /api/v1/superadmin/tickets
 * List all support tickets globally.
 */
router.get("/tickets", listAllTickets);

/**
 * GET /api/v1/superadmin/transactions
 * List all institute invoices.
 */
router.get("/transactions", listTransactions);

export default router;

