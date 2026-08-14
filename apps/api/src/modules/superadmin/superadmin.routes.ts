import { Router } from "express";
import express from "express";
import { authenticate } from "../../middleware/auth.middleware";
import { requireRole } from "../../middleware/rbac.middleware";
import rateLimit from "express-rate-limit";
import { 
  uploadQuestions, 
  getPlatformStats, 
  listInstitutes, 
  listTransactions, 
  extractPDFController,
  getPdfExtractionJobStatus,
  getPlatformTelemetry,
  getPlatformConfig,
  updatePlatformConfig,
  listAuditLogs,
  updateTicketStatus,
  replyToTicket,
  listTicketReplies,
  getPlatformAnalytics
} from "./superadmin.controller";
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
router.get("/analytics", getPlatformAnalytics);

/**
 * GET /api/v1/superadmin/institutes
 * List all institutes with owner info and student counts.
 */
router.get("/institutes", listInstitutes);

/**
 * POST /api/v1/superadmin/upload-questions
 * Upload a JSON question bank with full metadata tagging.
 * Body: { exam, test_type, title, subject, chapter, year, shift, duration, marks, difficulty, questions[] }
 *
 * A body-size override, not the global 1MB limit — but not because questions
 * carry inline base64 diagrams anymore. They used to, and three limit bumps
 * in a row (1mb -> 25mb -> 60mb -> 150mb) kept losing that race: chapter
 * count doesn't predict body size, image density per question does, and
 * there's no ceiling to raise the number against. Every caller (BulkUpload.tsx
 * and both upload paths in AIExtractor.tsx) now runs its questions through
 * convertQuestionsForUpload (apps/web/src/lib/question-image-upload.ts) first,
 * which uploads each diagram to R2 client-side and sends its URL instead — so
 * the body is text-only metadata and question content, and 20mb is generous
 * headroom for even a 2000-question chapter of that. If this route starts
 * rejecting bodies again, the bug is almost certainly a new caller sending raw
 * base64 without going through that helper, not that 20mb needs to grow.
 */
router.post("/upload-questions", express.json({ limit: "20mb" }), uploadQuestions);

// Rate limiter: max 3 PDF extractions per IP per 10 minutes
const pdfExtractionLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many PDF extraction requests. Please wait 10 minutes before trying again." },
});

/**
 * POST /api/v1/superadmin/extract-pdf
 * Enqueue an async PDF extraction job. Returns jobId immediately.
 */
router.post("/extract-pdf", pdfExtractionLimiter as any, uploadPDF.single("pdf") as any, extractPDFController);

/**
 * GET /api/v1/superadmin/extract-pdf/:jobId
 * Poll for the status and result of an async PDF extraction job.
 */
router.get("/extract-pdf/:jobId", getPdfExtractionJobStatus);

/**
 * GET /api/v1/superadmin/tickets
 * List all support tickets globally.
 */
router.get("/tickets", listAllTickets);

/**
 * PATCH /api/v1/superadmin/tickets/:id
 * Update a B2B support ticket status or priority.
 */
router.patch("/tickets/:id", updateTicketStatus);

/**
 * POST /api/v1/superadmin/tickets/:id/replies
 * Post a reply on a support ticket.
 */
router.post("/tickets/:id/replies", replyToTicket);

/**
 * GET /api/v1/superadmin/tickets/:id/replies
 * Get all replies for a support ticket.
 */
router.get("/tickets/:id/replies", listTicketReplies);

/**
 * GET /api/v1/superadmin/transactions
 * List all institute invoices.
 */
router.get("/transactions", listTransactions);

/**
 * GET /api/v1/superadmin/telemetry
 * Live telemetry / health diagnostics of API, DB, Cache, Workers, CDN.
 */
router.get("/telemetry", getPlatformTelemetry);

/**
 * GET /api/v1/superadmin/config
 * Fetch platform system configuration flags.
 */
router.get("/config", getPlatformConfig);

/**
 * PATCH /api/v1/superadmin/config
 * Save platform system configuration flags.
 */
router.patch("/config", updatePlatformConfig);

/**
 * GET /api/v1/superadmin/audit-logs
 * List admin audit logs.
 */
router.get("/audit-logs", listAuditLogs);

export default router;

