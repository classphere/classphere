import { Request, Response } from "express";
import { supabaseAdmin, supabaseDB } from "../../lib/supabase";
import { listAllInstitutes, getInstituteCRMStats } from "../institutes/institutes.service";
import { randomUUID } from "crypto";
import { uploadToR2 } from "../../lib/r2";
import { extractPDF } from "../../services/extractor/pdfExtractor.service";
import * as fs from "fs";
import * as path from "path";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY!;

// ─── Supabase REST helper ─────────────────────────────────────────────────────
async function sbPost(table: string, rows: any[], prefer = "resolution=merge-duplicates,return=minimal") {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: "POST",
    headers: {
      "Content-Type":  "application/json",
      "apikey":        SUPABASE_SERVICE_KEY,
      "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`,
      "Prefer":        prefer,
    },
    body: JSON.stringify(rows),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase ${table} insert failed (${res.status}): ${text}`);
  }
  if (prefer.includes("return=representation")) return res.json();
  return null;
}

async function sbSelect(table: string, query: string) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, {
    headers: {
      "apikey":        SUPABASE_SERVICE_KEY,
      "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`,
    },
  });
  if (!res.ok) throw new Error(`Supabase select failed: ${await res.text()}`);
  return res.json();
}

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
  if (q.correct_answer === null || q.correct_answer === undefined || q.correct_answer === "")
    return `Question #${index + 1}: missing 'correct_answer'`;

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
      activeTrialsRes,
      crmStats,
    ] = await Promise.all([
      supabaseDB.from("institutes").select("id", { count: "exact", head: true }).eq("is_active", true),
      supabaseDB.from("users").select("id", { count: "exact", head: true }).eq("role", "student"),
      supabaseDB.from("attempts").select("id", { count: "exact", head: true }),
      supabaseDB.from("institutes").select("id", { count: "exact", head: true }).gte("created_at", oneWeekAgo),
      supabaseDB.from("users").select("id", { count: "exact", head: true }).eq("role", "student").gte("created_at", oneWeekAgo),
      supabaseDB.from("institute_subscriptions").select("id", { count: "exact", head: true }).eq("status", "trialing"),
      getInstituteCRMStats(),
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalInstitutes: institutesRes.count ?? 0,
        totalStudents: studentsRes.count ?? 0,
        totalAttempts: attemptsRes.count ?? 0,
        newInstitutesThisWeek: newInstitutesRes.count ?? 0,
        newStudentsThisWeek: newStudentsRes.count ?? 0,
        activeTrials: activeTrialsRes.count ?? 0,
        enterprisePlans: crmStats.enterprisePlans,
        estimatedMRR: crmStats.estimatedMRR,
        systemUptime: "99.98%", // Static for now — wire to a health monitor later
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

// ── Helper to process base64 inline images and upload to R2 ────────────────────
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

    // ── 1. Validate required metadata ────────────────────────────────────────
    const missing = [];
    if (!exam)      missing.push("exam");
    if (!test_type) missing.push("test_type");
    if (!title)     missing.push("title");
    if (!duration)  missing.push("duration");
    if (!marks)     missing.push("marks");
    if (!difficulty) missing.push("difficulty");

    if (missing.length > 0) {
      res.status(400).json({ success: false, message: `Missing required fields: ${missing.join(", ")}` });
      return;
    }

    if (!Array.isArray(questions) || questions.length === 0) {
      res.status(400).json({ success: false, message: "Body must include a non-empty 'questions' array." });
      return;
    }

    const validExams = ["jee-main", "jee-advanced", "neet-ug", "ssc-cgl"];
    if (!validExams.includes(exam)) {
      res.status(400).json({ success: false, message: `Invalid exam. Must be one of: ${validExams.join(", ")}` });
      return;
    }

    const validTypes = ["chapter-wise", "mock-test", "pyq"];
    if (!validTypes.includes(test_type)) {
      res.status(400).json({ success: false, message: `Invalid test_type. Must be one of: ${validTypes.join(", ")}` });
      return;
    }

    // ── 2. Validate questions array ──────────────────────────────────────────
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

    // ── 3. Resolve exam_id from DB ────────────────────────────────────────────
    const exams = await sbSelect("exams", `code=eq.${exam}&select=id,code`);
    if (!exams.length) {
      res.status(400).json({ success: false, message: `Exam '${exam}' not found in database. Run migration 02 first.` });
      return;
    }
    const examId = exams[0].id;

    // ── 4. Map questions to DB schema ─────────────────────────────────────────
    const questionRows = await Promise.all(
      questions.map(async (q: any) => {
        const isNumerical = !q.options || q.options.length < 2;
        const type = isNumerical ? "integer" : (q.question_type || "mcq_single");

        // Upload any inline base64 images generated by the PDF parser to R2
        const processedText = await processBase64ImagesInText(q.question_text);
        const processedExplanation = await processBase64ImagesInText(q.explanation);
        const processedImageUrl = await processBase64ImageUrl(q.image_url);

        const processedOptions = await Promise.all(
          (q.options ?? []).map(async (opt: any) => {
            const processedOptText = await processBase64ImagesInText(opt.text);
            const processedOptImageUrl = await processBase64ImageUrl(opt.image_url);
            return {
              ...opt,
              text: processedOptText,
              image_url: processedOptImageUrl,
            };
          })
        );

        return {
          id:             ensureUUID(q.id),    // auto-generate UUID if missing/invalid
          exam_id:        examId,
          test_type,
          subject:        q.subject  || subject  || "General",
          chapter:        q.chapter  || chapter  || "General",
          topic:          q.topic    || null,
          difficulty:     q.difficulty || difficulty,
          year:           q.year     || year     || null,
          source:         q.source   || title,
          question_type:  type,
          question_text:  processedText,
          image_url:      processedImageUrl,
          options:        processedOptions,
          correct_answer: Array.isArray(q.correct_answer) ? q.correct_answer : [q.correct_answer],
          explanation:    processedExplanation,
          tags:           q.tags || [],
        };
      })
    );

    // ── 5. Bulk upsert questions ─────────────────────────────────────────────
    const batches = chunk(questionRows, 100);
    for (const batch of batches) {
      await sbPost("questions", batch);
    }

    // ── 6. Create the Paper record ────────────────────────────────────────────
    const paperRows = [{
      exam_id:         examId,
      test_type,
      title,
      subject:         subject  || null,
      chapter:         chapter  || null,
      year:            year     || null,
      shift:           shift    || null,
      total_questions: questionRows.length,
      total_marks:     marks,
      duration_min:    duration,
      difficulty,
    }];

    const createdPapers = await sbPost(
      "papers",
      paperRows,
      "return=representation"
    );

    const paper = Array.isArray(createdPapers) ? createdPapers[0] : null;

    // ── 7. Link questions to paper via paper_questions join table ─────────────
    if (paper?.id) {
      const pqRows = questionRows.map((q: any, idx: number) => ({
        paper_id:    paper.id,
        question_id: q.id,
        position:    idx + 1,
      }));
      const pqBatches = chunk(pqRows, 100);
      for (const batch of pqBatches) {
        await sbPost("paper_questions", batch, "resolution=merge-duplicates,return=minimal");
      }
    }

    // ── 8. Respond ────────────────────────────────────────────────────────────
    res.status(201).json({
      success: true,
      message: `Successfully uploaded ${questionRows.length} questions as "${title}".`,
      data: {
        paper_id:       paper?.id ?? null,
        title,
        exam,
        test_type,
        total_questions: questionRows.length,
      },
    });
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

    const pages = req.body.pages as string | undefined;

    // Create temp directory
    const tempDir = path.join(__dirname, "../../../temp_uploads");
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const uniqueId = `${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const tempWorkingDir = path.join(tempDir, `extract_${uniqueId}`);
    fs.mkdirSync(tempWorkingDir, { recursive: true });

    const tempPdfPath = path.join(tempWorkingDir, "temp.pdf");
    fs.writeFileSync(tempPdfPath, req.file.buffer);

    console.log(`[extractPDFController] Starting extraction on ${tempPdfPath} (pages: ${pages || "all"})`);
    const result = await extractPDF(tempPdfPath, pages);

    // Cleanup files asynchronously
    setTimeout(() => {
      try {
        fs.rmSync(tempWorkingDir, { recursive: true, force: true });
        console.log(`[extractPDFController] Cleaned up temporary directory: ${tempWorkingDir}`);
      } catch (cleanupErr: any) {
        console.error(`[extractPDFController] Clean up failed: ${cleanupErr.message}`);
      }
    }, 15000);

    if (!result.success) {
      res.status(500).json({ success: false, message: result.message, questions: [] });
      return;
    }

    res.status(200).json({
      success: true,
      message: result.message,
      data: {
        questions: result.questions,
      },
    });
  } catch (err: any) {
    console.error("[extractPDFController] ERROR:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};
