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
 * A body-size override, not the global 1MB limit: questions carry inline
 * base64 diagrams (processBase64ImageList in the controller uploads them to
 * R2 from here), and a chapter with 500+ questions — some with figures — was
 * never going to fit in 1MB. Scoped to this route alone; the global limit
 * elsewhere exists specifically to stop one request holding disproportionate
 * memory before auth/validation has run, and that reasoning still holds for
 * every route that isn't ingesting an extracted question bank.
 *
 * 25mb, then 60mb, both still weren't enough: Electrostatics.json (1159 Qs),
 * then Aldehydes/Ketones/Carboxylic Acids.json (969 Qs) and Chemical Bonding
 * and Molecular Structure.json (910 Qs) each in turn hit PayloadTooLargeError
 * in production. Organic-chemistry chapters especially carry a structural
 * diagram per question, so question count alone doesn't predict body size.
 * 150mb is a wide enough margin that another chapter shouldn't hit this
 * again; if one still does, the durable fix is uploading each question's
 * images to R2 client-side before submit and sending URLs instead of base64,
 * not another number bump here.
 */
router.post("/upload-questions", express.json({ limit: "150mb" }), uploadQuestions);

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

