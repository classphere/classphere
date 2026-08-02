import { Request, Response } from "express";
import { questionTypeForStorage, subjectForStorage } from "../../lib/question-taxonomy";
import { supabaseAdmin, supabaseDB } from "../../lib/supabase";
import { listAllInstitutes, getInstituteCRMStats } from "../institutes/institutes.service";
import { randomUUID } from "crypto";
import { uploadToR2, uploadToR2Raw } from "../../lib/r2";
import { enqueuePdfExtraction } from "../../lib/queue/pdf-extraction.queue";
import { connection as redisConnection } from "../../lib/queue/redis";
import { logAdminAction as writeAdminAudit } from "../../lib/admin-audit";
import * as fs from "fs";
import * as path from "path";
import { figuresForStorage, normalizeQuestionMedia, stripInlineImages } from "../../lib/question-media";
import { deriveLegacyContentBlocks } from "../../lib/question-content";
import { deriveDurationMin, deriveTotalMarks } from "../../lib/exam-profile";

// Supabase credentials are read from the validated env via the supabaseDB
// client (service-role). The previous module-level SUPABASE_SERVICE_KEY
// constant + raw fetch() helpers (sbPost/sbSelect) are removed: they bypassed
// the supabase-js abstraction and kept the service key in the call stack where
// an unexpected error could surface it in logs. All DB access now goes through
// supabaseDB, which is parameterized and never exposes the key to application
// code.

// ─── Chunk helper ─────────────────────────────────────────────────────────────
function chunk<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
  return chunks;
}

// ─── UUID helper ──────────────────────────────────────────────────────────────
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function ensureUUID(id: any): string {
  return typeof id === "string" && UUID_REGEX.test(id) ? id : randomUUID();
}

// ─── Validation ───────────────────────────────────────────────────────────────
function validateQuestion(q: any, index: number): string | null {
  if (!q.question_text) return `Question #${index + 1}: missing 'question_text'`;
  // Drafts are intentionally allowed to have missing keys or damaged matching
  // options. The review editor surfaces these defects; publication validates
  // them before a learner can access the paper.
  if (q.correct_answer === null || q.correct_answer === undefined || q.correct_answer === "") q.correct_answer = [];

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
/**
 * GET /api/v1/superadmin/stats
 * [super_admin only]
 *
 * Returns live platform-wide stats for the superadmin dashboard.
 */
export const getPlatformStats = async (req: Request, res: Response): Promise<void> => {
  try {
    // Run all counts in parallel
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const [
      institutesRes,
      studentsRes,
      attemptsRes,
      newInstitutesRes,
      newStudentsRes,
      crmStats,
    ] = await Promise.all([
      supabaseDB.from("institutes").select("id", { count: "exact", head: true }).eq("is_active", true),
      supabaseDB.from("users").select("id", { count: "exact", head: true }).eq("role", "student"),
      supabaseDB.from("attempts").select("id", { count: "exact", head: true }),
      supabaseDB.from("institutes").select("id", { count: "exact", head: true }).gte("created_at", oneWeekAgo),
      supabaseDB.from("users").select("id", { count: "exact", head: true }).eq("role", "student").gte("created_at", oneWeekAgo),
      getInstituteCRMStats(),
    ]);

    // A missing optional subscriptions table must not make the whole dashboard fail.
    const { count: activeTrials, error: trialsError } = await supabaseDB
      .from("institute_subscriptions")
      .select("id", { count: "exact", head: true })
      .eq("status", "trialing");
    if (trialsError && trialsError.code !== "42P01") throw trialsError;

    res.status(200).json({
      success: true,
      data: {
        totalInstitutes: institutesRes.count ?? 0,
        totalStudents: studentsRes.count ?? 0,
        totalAttempts: attemptsRes.count ?? 0,
        newInstitutesThisWeek: newInstitutesRes.count ?? 0,
        newStudentsThisWeek: newStudentsRes.count ?? 0,
        activeTrials: activeTrials ?? 0,
        // Classphere bills per student per year, so the book is measured in
        // paying institutes and billed students — not in how many sit on an
        // "enterprise" tier that was never sold. estimatedMRR was summed from
        // institute_invoices, a table nothing writes to, so it always read 0.
        activeInstitutes: crmStats.activeInstitutes,
        trialInstitutes: crmStats.trialInstitutes,
        billedStudents: crmStats.billedStudents,
        estimatedARRPaise: crmStats.estimatedARRPaise,
        systemUptime: null, // Uptime requires retained synthetic-monitor history.
      },
    });
  } catch (err: any) {
    console.error("[getPlatformStats] ERROR:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
/**
 * GET /api/v1/superadmin/institutes
 * [super_admin only]
 *
 * Returns all institutes with owner info and student counts.
 * Delegates to institutes.service.ts per ARCHITECTURE_V2 §4.1.
 */
export const listInstitutes = async (req: Request, res: Response): Promise<void> => {
  try {
    const institutes = await listAllInstitutes();
    res.status(200).json({ success: true, data: { institutes } });
  } catch (err: any) {
    console.error("[listInstitutes] ERROR:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Helper to process base64 inline images and upload to R2 ──────────────────
async function processBase64ImagesInText(text: string): Promise<string> {
  if (!text) return text;
  const base64Regex = /!\[image\]\(data:(image\/[a-zA-Z+.-]+);base64,([^)]+)\)/g;
  const matches = [...text.matchAll(base64Regex)];
  let updatedText = text;

  for (const match of matches) {
    const [fullMatch, mimeType, base64Data] = match;
    try {
      const buffer = Buffer.from(base64Data, "base64");
      const extension = mimeType.split("/")[1] || "png";
      const fileName = `question_asset_${Date.now()}_${Math.random().toString(36).substring(7)}.${extension}`;
      const publicUrl = await uploadToR2(buffer, fileName, mimeType);
      updatedText = updatedText.replace(fullMatch, `![image](${publicUrl})`);
    } catch (err) {
      console.error("[processBase64ImagesInText] Failed to upload inline image:", err);
    }
  }
  return updatedText;
}

async function processBase64ImageUrl(imageUrl: string | null): Promise<string | null> {
  if (!imageUrl || !imageUrl.startsWith("data:")) return imageUrl;
  const match = imageUrl.match(/^data:(image\/[a-zA-Z+.-]+);base64,(.+)$/);
  if (!match) return imageUrl;
  const [, mimeType, base64Data] = match;
  try {
    const buffer = Buffer.from(base64Data, "base64");
    const extension = mimeType.split("/")[1] || "png";
    const fileName = `question_image_${Date.now()}_${Math.random().toString(36).substring(7)}.${extension}`;
    return await uploadToR2(buffer, fileName, mimeType);
  } catch (err) {
    console.error("[processBase64ImageUrl] Failed to upload base64 image:", err);
    return imageUrl;
  }
}

/**
 * Upload every data URL in a figure list to R2, returning storage URLs.
 *
 * The extractor embeds base64 into question_images and explanation_images now
 * that it reads those arrays directly. Only text used to carry base64, so only
 * text was uploaded; an array of data URLs would otherwise be written to the
 * database verbatim, bloating rows and defeating the CDN.
 */
async function processBase64ImageList(images: unknown): Promise<string[]> {
  if (!Array.isArray(images)) return [];
  const uploaded = await Promise.all(
    images.map((entry) => processBase64ImageUrl(String(entry ?? "").trim() || null)),
  );
  return uploaded.filter((url): url is string => Boolean(url));
}

// ─────────────────────────────────────────────────────────────────────────────
/**
 * POST /api/v1/superadmin/upload-questions
 * [super_admin only]
 *
 * Accepts a JSON body with metadata + a questions array.
 * Creates a Paper record and bulk-upserts all questions linked to it.
 */
export const uploadQuestions = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      exam,
      test_type,
      title,
      subject,
      chapter,
      year,
      shift,
      duration,
      marks,
      difficulty,
      questions,
    } = req.body;

    // ── 1. Validate required metadata ───────────────────────────────────────
    //
    // duration, marks and difficulty are no longer required.
    //
    // A paper's total is the exam's marks per question times the number of
    // questions, and its length follows from the exam's pace, so asking for
    // them only invited a guess: the stored papers include a 106-question
    // paper out of 360, a 179-question paper out of the same 360, and a
    // 75-question JEE Main paper out of 360 rather than 300.
    //
    // Difficulty is a property of a question, not of a paper — a real paper
    // mixes all three — so there is nothing truthful to put at this level.
    // It stays accepted for callers that send it, and applies per question
    // only when the question itself does not say.
    const missing = [];
    if (!exam)      missing.push("exam");
    if (!test_type) missing.push("test_type");
    if (!title)     missing.push("title");

    if (missing.length > 0) {
      res.status(400).json({ success: false, message: `Missing required fields: ${missing.join(", ")}` });
      return;
    }

    if (!Array.isArray(questions) || questions.length === 0 || questions.length > 500) {
      res.status(400).json({ success: false, message: "Body must include between 1 and 500 questions." });
      return;
    }

    // Validated only when supplied — an override has to be sane, an absent
    // value is computed below.
    if (duration !== undefined && duration !== null &&
        (!Number.isInteger(Number(duration)) || Number(duration) <= 0)) {
      res.status(400).json({ success: false, message: "duration must be a positive integer when provided." });
      return;
    }
    if (marks !== undefined && marks !== null &&
        (!Number.isInteger(Number(marks)) || Number(marks) < 0)) {
      res.status(400).json({ success: false, message: "marks must be a non-negative integer when provided." });
      return;
    }

    const validExams = ["jee-main", "jee-advanced", "jee-main-advanced", "neet-ug"];
    if (!validExams.includes(exam)) {
      res.status(400).json({ success: false, message: `Invalid exam. Must be one of: ${validExams.join(", ")}` });
      return;
    }

    const validTypes = ["chapter-wise", "mock-test", "pyq", "ncert"];
    if (!validTypes.includes(test_type)) {
      res.status(400).json({ success: false, message: `Invalid test_type. Must be one of: ${validTypes.join(", ")}` });
      return;
    }

    // ── 2. Validate questions array ─────────────────────────────────────────
    const errors: string[] = [];
    for (let i = 0; i < questions.length; i++) {
      const err = validateQuestion(questions[i], i);
      if (err) errors.push(err);
      if (errors.length >= 5) break;
    }
    if (errors.length > 0) {
      res.status(400).json({ success: false, message: "Question validation failed.", errors });
      return;
    }

    // ── 3. Resolve exam_id from DB ──────────────────────────────────────────
    // (Replaced the raw-fetch sbSelect helper with supabaseDB — no service key
    //  in the call stack, parameterized query.)
    const { data: exams, error: examError } = await supabaseDB
      .from("exams")
      .select("id, code")
      .eq("code", exam)
      .limit(1);
    if (examError) throw examError;
    if (!exams || !exams.length) {
      res.status(400).json({ success: false, message: `Exam '${exam}' not found in database. Run migration 02 first.` });
      return;
    }
    const examId = exams[0].id;

    // ── 4. Map questions to DB schema ───────────────────────────────────────
    const questionRows = await Promise.all(
      questions.map(async (q: any) => {
        const isNumerical = !q.options || q.options.length < 2;
        const type = isNumerical ? "integer" : (q.question_type || "mcq_single");

        // Upload any inline base64 images generated by the PDF parser to R2
        const processedText = await processBase64ImagesInText(q.question_text);
        const processedExplanation = await processBase64ImagesInText(q.explanation);
        const processedImageUrl = await processBase64ImageUrl(q.image_url);
        // Figures now arrive as base64 inside the arrays, not only inline in
        // the text, so they need the same trip to R2.
        const processedQuestionImages = await processBase64ImageList(q.question_images);
        const processedExplanationImages = await processBase64ImageList(q.explanation_images);

        const processedOptions = await Promise.all(
          (q.options ?? []).map(async (opt: any) => {
            const processedOptText = await processBase64ImagesInText(opt.text);
            const processedOptImageUrl = await processBase64ImageUrl(opt.image_url);
            return {
              ...opt,
              text: processedOptText,
              image_url: processedOptImageUrl,
              ...(q.extractor_version === "v4" ? {
                content_blocks: deriveLegacyContentBlocks({
                  question_text: processedOptText,
                  image_url: processedOptImageUrl,
                  extraction_confidence: opt.extraction_confidence ?? q.extraction_confidence,
                  needs_review: opt.needs_review ?? q.needs_review ?? q._needs_review,
                  review_reasons: opt.review_reasons ?? q.review_reasons ?? q._defects,
                  source_crop: opt.source_crop,
                  source: Array.isArray(q._pages) && q._pages.length ? { page: q._pages[0], role: "option" } : undefined,
                }),
              } : {}),
            };
          })
        );

        const normalizedMedia = normalizeQuestionMedia({
          question_text: processedText,
          image_url: processedImageUrl,
          options: processedOptions,
        });

        return {
          id:             ensureUUID(q.id),    // auto-generate UUID if missing/invalid
          exam_id:        examId,
          test_type,
          // "General" is not a subject any exam has; rows defaulted to it
          // belonged to no axis on any report and were invisible rather than
          // visibly wrong. NULL is the honest value for "not known".
          subject:        subjectForStorage(q.subject, subject),
          chapter:        q.chapter  || chapter  || "General",
          topic:          q.topic    || null,
          difficulty:     q.difficulty || difficulty,
          year:           q.year     || year     || null,
          source:         q.source   || title,
          // Normalised on the way in. The extractor is prompted for "MCQ" |
          // "MSQ" | "Numerical" while the rest of the system uses snake_case,
          // and storing the raw value is what split one category into two.
          question_type:  questionTypeForStorage(q.question_type ?? type, normalizedMedia.options?.length ?? 0),
          // Figures are pulled out of the text and stored in the array, so a
          // question bank with images inline and a PDF-extracted paper end up
          // identical — and neither renders the same figure twice.
          question_text:  stripInlineImages(normalizedMedia.question_text),
          // Read from the unstripped text above — stripInlineImages returns a
          // new string, so both see the same input. The URLs are real by now:
          // inline images were uploaded to R2 earlier in this function, whereas
          // the extractor's own array holds bare filenames that resolve to
          // nothing.
          question_images: figuresForStorage(
            normalizedMedia.question_text,
            [...processedQuestionImages, ...(processedImageUrl ? [processedImageUrl] : [])],
          ),
          options:        normalizedMedia.options,
          correct_answer: Array.isArray(q.correct_answer) ? q.correct_answer : q.correct_answer ? [q.correct_answer] : [],
          explanation:    stripInlineImages(processedExplanation),
          // Produced by normalize_json.py and, until now, dropped here.
          explanation_images: figuresForStorage(processedExplanation, processedExplanationImages),
          tags:           q.tags || [],
          ...(q.extractor_version === "v4" ? {
            content_blocks: deriveLegacyContentBlocks({
              question_text: normalizedMedia.question_text,
              image_url: normalizedMedia.image_url,
              extraction_confidence: q.extraction_confidence,
              needs_review: q.needs_review ?? q._needs_review,
              review_reasons: q.review_reasons ?? q._defects,
              source_crop: q.source_crop,
              source: Array.isArray(q._pages) && q._pages.length ? { page: q._pages[0], role: "stem" } : undefined,
            }),
            extraction_metadata: q.extraction_metadata ?? null,
            extractor_version: "v4",
            source_crop_url: q.source_crop?.url ?? q.source_crop_url ?? null,
            source_reference: q.source_reference ?? {},
          } : {}),
          content_scope:  "global",
          review_status:  "draft",
          created_by:     req.user?.id ?? null,
        };
      })
    );

    // Marks and duration follow from the exam and the number of questions
    // unless the caller states otherwise. A full sitting gets the real figures
    // — 180 NEET questions are out of 720 over 180 minutes — and a partial set
    // is counted and paced from its own questions rather than inheriting a
    // three-hour slot for twenty questions.
    const totalMarks = marks !== undefined && marks !== null
      ? Number(marks)
      : deriveTotalMarks(exam, questionRows.length);
    const durationMin = duration !== undefined && duration !== null
      ? Number(duration)
      : deriveDurationMin(exam, questionRows.length);

    // ── 5. Bulk upsert questions via a single RPC ───────────────────────────
    const { data: paperId, error: uploadError } = await supabaseDB.rpc(
      "create_global_review_draft_with_questions",
      {
        p_exam_id: examId,
        p_test_type: test_type,
        p_title: title.trim(),
        p_subject: subject ?? "",
        p_chapter: chapter ?? "",
        p_year: year ? Number(year) : null,
        p_shift: shift ?? "",
        p_duration_min: durationMin,
        p_total_marks: totalMarks,
        // Null rather than a guess: a real paper mixes difficulties, and the
        // column is nullable precisely because there is no honest single value.
        p_difficulty: difficulty ?? null,
        p_created_by: req.user?.id ?? null,
        p_questions: questionRows,
      }
    );
    if (uploadError || !paperId) throw uploadError ?? new Error("Global paper upload did not return an id.");

    await writeAdminAudit(
      req.user?.id,
      "Global question bank upload",
      `Created global paper "${title.trim()}" with ${questionRows.length} questions.`,
      "question_bank",
      "success"
    );

    res.status(201).json({
      success: true,
      message: `Draft created with ${questionRows.length} questions. Review and publish it from the question bank.`,
      data: { paper_id: paperId, title, exam, test_type, total_questions: questionRows.length },
    });
    return;
  } catch (err: any) {
    console.error("[uploadQuestions] ERROR:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
/**
 * GET /api/v1/superadmin/transactions
 * [super_admin only]
 *
 * Returns recent institute invoices.
 */
export const listTransactions = async (req: Request, res: Response): Promise<void> => {
  try {
    const { data, error } = await supabaseDB
      .from("institute_invoices")
      .select(`
        *,
        institute:institutes(name, plan)
      `)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      if (error.code === '42P01') {
        res.status(200).json({ success: true, data: [] });
        return;
      }
      throw error;
    }

    res.status(200).json({ success: true, data });
  } catch (err: any) {
    console.error("[listTransactions] ERROR:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * POST /api/v1/superadmin/extract-pdf
 * [super_admin only]
 *
 * Accepts a PDF file, runs it page-by-page through PyMuPDF & Cerebras Cloud,
 * and responds with normalized JSON questions. Inline images are served as base64 URLs.
 */
export const extractPDFController = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, message: "No PDF file uploaded." });
      return;
    }

    // Validate: PDF only, max 50MB (already enforced by multer, this is defence-in-depth)
    if (req.file.size > 50 * 1024 * 1024) {
      res.status(400).json({ success: false, message: "PDF exceeds the 50 MB size limit." });
      return;
    }

    const pages = req.body.pages as string | undefined;
    const jobId = randomUUID();
    const r2Key = `temp-pdf-jobs/${jobId}.pdf`;

    // 1. Upload the PDF buffer to R2 (temp key, deleted by worker after processing)
    await uploadToR2Raw(req.file.buffer, r2Key, "application/pdf");

    // 2. Create a job row in Supabase so the frontend can poll for status
    const { error: insertErr } = await supabaseDB
      .from("pdf_extraction_jobs")
      .insert({
        id: jobId,
        status: "pending",
        requested_by: req.user?.id ?? null,
        pages: pages ?? null,
        created_at: new Date().toISOString(),
      });
    if (insertErr) throw new Error(`Failed to create job row: ${insertErr.message}`);

    // 3. Push job to BullMQ — returns immediately
    await enqueuePdfExtraction({ jobId, r2Key, pages, requestedBy: req.user?.id ?? "" });

    console.log(`[extractPDFController] Enqueued async PDF extraction job: ${jobId}`);

    // 4. Respond immediately with the job ID for polling
    res.status(202).json({
      success: true,
      message: "PDF extraction started. Poll the status endpoint for results.",
      data: { jobId },
    });
  } catch (err: any) {
    console.error("[extractPDFController] ERROR:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * GET /api/v1/superadmin/extract-pdf/:jobId
 * Poll for the status and result of an async PDF extraction job.
 */
export const getPdfExtractionJobStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { jobId } = req.params;
    const { data, error } = await supabaseDB
      .from("pdf_extraction_jobs")
      .select("id, status, result, error, created_at, started_at, completed_at")
      .eq("id", jobId)
      .single();

    if (error || !data) {
      res.status(404).json({ success: false, message: "Job not found." });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        jobId: data.id,
        status: data.status,           // pending | processing | done | failed
        result: data.status === "done" ? data.result : null,
        error:  data.status === "failed" ? data.error : null,
        createdAt: data.created_at,
        startedAt: data.started_at,
        completedAt: data.completed_at,
      },
    });
  } catch (err: any) {
    console.error("[getPdfExtractionJobStatus] ERROR:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// ─── Extended Superadmin Features (Integration Wiring) ───────────────────────
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Helper to log admin actions to the database audit_logs table
 */
export async function logAdminAction(
  userId: string | undefined,
  action: string,
  detail: string,
  category: string,
  type: "info" | "success" | "error" = "info"
): Promise<void> {
  try {
    await supabaseDB.from("audit_logs").insert([{
      user_id: userId ?? null,
      action,
      detail,
      category,
      type
    }]);
  } catch (err) {
    console.error("[logAdminAction] failed to log:", err);
  }
}

/**
 * GET /api/v1/superadmin/telemetry
 * Returns dynamic, fluctuating telemetry for system metrics visualization
 */
export const getPlatformTelemetry = async (req: Request, res: Response): Promise<void> => {
  try {
    const [database, cache] = await Promise.allSettled([
      supabaseDB.from("institutes").select("id", { count: "exact", head: true }),
      redisConnection.ping(),
    ]);

    const databaseHealthy = database.status === "fulfilled" && !database.value.error;
    const cacheHealthy = cache.status === "fulfilled" && cache.value === "PONG";
    const health = (healthy: boolean, healthyLabel = "Normal") => ({
      score: healthy ? 100 : 0,
      load: healthy ? healthyLabel : "Unavailable",
      trend: healthy ? "Live" : "Offline",
    });

    res.status(200).json({
      success: true,
      data: {
        api: health(true),
        db: health(databaseHealthy),
        storage: { score: 0, load: "Not monitored", trend: "N/A" },
        cache: health(cacheHealthy),
        workers: health(cacheHealthy, "Queue available"),
        cdn: { score: 0, load: "Not monitored", trend: "N/A" },
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * GET /api/v1/superadmin/config
 * Retrieves all configuration settings from the database
 */
export const getPlatformConfig = async (req: Request, res: Response): Promise<void> => {
  try {
    const { data, error } = await supabaseDB.from("system_settings").select("*");
    if (error) throw error;

    const config: Record<string, any> = {};
    data?.forEach(row => {
      config[row.key] = row.value;
    });

    res.status(200).json({ success: true, data: config });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * PATCH /api/v1/superadmin/config
 * Saves key-value configuration overrides to settings database
 */
export const updatePlatformConfig = async (req: Request, res: Response): Promise<void> => {
  try {
    const { settings } = req.body;
    if (!settings || typeof settings !== 'object') {
      res.status(400).json({ success: false, message: "Settings payload required" });
      return;
    }

    res.status(409).json({
      success: false,
      message: "Runtime configuration controls are not enabled. No settings were changed.",
    });
    return;

    const allowedKeys = new Set([
      "maintenance_mode",
      "deterministic_engine",
      "custom_domains_enabled",
      "forum_moderation_enabled",
      "max_concurrent_users",
      "omr_ingestion_rate",
      "max_bulk_upload_size",
      "session_timeout",
    ]);
    const entries = Object.entries(settings).filter(([key]) => allowedKeys.has(key));
    if (entries.length === 0) {
      res.status(400).json({ success: false, message: "No supported settings supplied" });
      return;
    }

    for (const [key, val] of entries) {
      const { error } = await supabaseDB
        .from("system_settings")
        .upsert({ key, value: val, updated_at: new Date().toISOString() });
      if (error) throw error;

      await logAdminAction(
        req.user?.id,
        "Configuration Update",
        `Updated configuration setting '${key}' to '${val}'`,
        "system",
        "success"
      );
    }

    res.status(200).json({ success: true, message: "Configuration saved successfully" });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * GET /api/v1/superadmin/audit-logs
 * Retrieves paginated audit logs from the database
 */
export const listAuditLogs = async (req: Request, res: Response): Promise<void> => {
  try {
    let limit = parseInt(req.query.limit as string, 10);
    let page = parseInt(req.query.page as string, 10);
    if (isNaN(limit) || limit < 1) limit = 20;
    if (isNaN(page) || page < 1) page = 1;
    limit = Math.min(limit, 100);

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, error, count } = await supabaseDB
      .from("audit_logs")
      .select("*, user:users(name, email)", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) {
      if (error.code === '42P01') {
        res.status(200).json({ success: true, data: [], pagination: { page, limit, total: 0 } });
        return;
      }
      throw error;
    }

    res.status(200).json({
      success: true,
      data: data ?? [],
      pagination: { page, limit, total: count ?? 0 }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * PATCH /api/v1/superadmin/tickets/:id
 * Updates ticket fields (status, priority) from the superadmin helpdesk
 */
export const updateTicketStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status, priority } = req.body;

    const allowedStatuses = new Set(["open", "in_progress", "resolved"]);
    const allowedPriorities = new Set(["low", "medium", "high"]);
    if (!status && !priority) {
      res.status(400).json({ success: false, message: "Provide a status or priority to update" });
      return;
    }
    if (status && !allowedStatuses.has(status)) {
      res.status(400).json({ success: false, message: "Invalid ticket status" });
      return;
    }
    if (priority && !allowedPriorities.has(priority)) {
      res.status(400).json({ success: false, message: "Invalid ticket priority" });
      return;
    }

    const updateData: Record<string, any> = { updated_at: new Date().toISOString() };
    if (status) updateData.status = status;
    if (priority) updateData.priority = priority;

    const { data, error } = await supabaseDB
      .from("support_tickets")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        res.status(404).json({ success: false, message: "Ticket not found" });
        return;
      }
      throw error;
    }

    await logAdminAction(
      req.user?.id,
      "Support Ticket Update",
      `Updated ticket #${id} (status: ${status || 'unchanged'}, priority: ${priority || 'unchanged'})`,
      "support",
      "info"
    );

    res.status(200).json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * POST /api/v1/superadmin/tickets/:id/replies
 * Superadmin post a reply response on a support ticket
 */
export const replyToTicket = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id: ticketId } = req.params;
    const { message } = req.body;
    const userId = req.user?.id;

    if (!message) {
      res.status(400).json({ success: false, message: "Reply message is required" });
      return;
    }

    const { data: reply, error: replyError } = await supabaseDB
      .from("ticket_replies")
      .insert([{
        ticket_id: ticketId,
        author_id: userId,
        message
      }])
      .select()
      .single();

    if (replyError) throw replyError;

    const { error: ticketError } = await supabaseDB
      .from("support_tickets")
      .update({ status: "in_progress", updated_at: new Date().toISOString() })
      .eq("id", ticketId);

    if (ticketError) throw ticketError;

    await logAdminAction(
      req.user?.id,
      "Support Ticket Reply",
      `Posted reply on support ticket #${ticketId}`,
      "support",
      "info"
    );

    res.status(201).json({ success: true, data: reply });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * GET /api/v1/superadmin/tickets/:id/replies
 * Returns all reply messages for a support ticket ordered chronologically
 */
export const listTicketReplies = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id: ticketId } = req.params;
    const { data, error } = await supabaseDB
      .from("ticket_replies")
      .select("*, author:users(name, email)")
      .eq("ticket_id", ticketId)
      .order("created_at", { ascending: true });

    if (error) throw error;
    res.status(200).json({ success: true, data: data ?? [] });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * GET /api/v1/superadmin/analytics
 * Platform-wide engagement and AI consumption analytics metrics
 */
export const getPlatformAnalytics = async (req: Request, res: Response): Promise<void> => {
  try {
    const [
      attemptsCount,
      institutesList,
      papersResult,
      examsResult,
    ] = await Promise.all([
      supabaseDB.from("attempts").select("id", { count: "exact", head: true }),
      listAllInstitutes(),
      supabaseDB.from("papers").select("exam_id").eq("is_active", true),
      supabaseDB.from("exams").select("id, code, full_name").eq("is_active", true),
    ]);

    const totalAttempts = attemptsCount.count ?? 0;
    if (papersResult.error) throw papersResult.error;
    if (examsResult.error) throw examsResult.error;

    const paperCounts = new Map<string, number>();
    for (const paper of papersResult.data ?? []) {
      paperCounts.set(paper.exam_id, (paperCounts.get(paper.exam_id) ?? 0) + 1);
    }
    const activePaperCount = papersResult.data?.length ?? 0;
    const examCount = (code: string) => {
      const exam = (examsResult.data ?? []).find((item: any) => item.code === code);
      return exam ? paperCounts.get(exam.id) ?? 0 : 0;
    };
    const percent = (count: number) => activePaperCount > 0 ? Math.round((count / activePaperCount) * 100) : 0;

    const jeeMainCount = examCount("jee-main");
    const jeeAdvCount = examCount("jee-advanced");
    const neetCount = examCount("neet-ug");

    const examBreakdown = [
      { exam: "JEE Main", tests: jeeMainCount, pct: percent(jeeMainCount), color: "from-[#00A656] to-[#00E576]", shadow: "shadow-[0px_2px_12px_rgba(0,181,18,0.4)]" },
      { exam: "JEE Advanced", tests: jeeAdvCount, pct: percent(jeeAdvCount), color: "from-[#2A85FF] to-[#60A5FA]", shadow: "shadow-[0px_2px_12px_rgba(42,133,255,0.4)]" },
      { exam: "NEET", tests: neetCount, pct: percent(neetCount), color: "from-[#FFD60A] to-[#FF9F0A]", shadow: "shadow-[0px_2px_12px_rgba(255,214,10,0.4)]" },
    ];

    const topInstitutes = [...(institutesList ?? [])]
      .sort((a: any, b: any) => (b.student_count ?? 0) - (a.student_count ?? 0))
      .slice(0, 5)
      .map(inst => {
        return {
          name: inst.name,
          studentCount: inst.student_count ?? 0,
          tokens: "—",
        };
      });

    res.status(200).json({
      success: true,
      data: {
        totalAttempts,
        activePapers: activePaperCount,
        examBreakdown,
        topInstitutes,
        // Token metering is not persisted yet, so do not invent consumption data.
        aiUsageAvailable: false,
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};
