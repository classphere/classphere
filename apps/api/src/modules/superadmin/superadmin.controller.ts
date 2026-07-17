import { Request, Response } from "express";
import { supabaseAdmin, supabaseDB } from "../../lib/supabase";
import { listAllInstitutes, getInstituteCRMStats } from "../institutes/institutes.service";
import { randomUUID } from "crypto";
import { uploadToR2 } from "../../lib/r2";
import { extractPDF } from "../../services/extractor/pdfExtractor.service";
import { connection as redisConnection } from "../../lib/queue/redis";
import * as fs from "fs";
import * as path from "path";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY!;

// â”€â”€â”€ Supabase REST helper â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

// â”€â”€â”€ Chunk helper â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function chunk<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
  return chunks;
}

// â”€â”€â”€ UUID helper â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function ensureUUID(id: any): string {
  return typeof id === "string" && UUID_REGEX.test(id) ? id : randomUUID();
}

// â”€â”€â”€ Validation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function validateQuestion(q: any, index: number): string | null {
  if (!q.question_text) return `Question #${index + 1}: missing 'question_text'`;
  if (q.correct_answer === null || q.correct_answer === undefined || q.correct_answer === "")
    return `Question #${index + 1}: missing 'correct_answer'`;

  return null;
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
        enterprisePlans: crmStats.enterprisePlans,
        estimatedMRR: crmStats.estimatedMRR,
        systemUptime: "99.98%", // Static for now â€” wire to a health monitor later
      },
    });
  } catch (err: any) {
    console.error("[getPlatformStats] ERROR:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
/**
 * GET /api/v1/superadmin/institutes
 * [super_admin only]
 *
 * Returns all institutes with owner info and student counts.
 * Delegates to institutes.service.ts per ARCHITECTURE_V2 Â§4.1.
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

// â”€â”€ Helper to process base64 inline images and upload to R2 â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

    // â”€â”€ 1. Validate required metadata â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

    // â”€â”€ 2. Validate questions array â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

    // â”€â”€ 3. Resolve exam_id from DB â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const exams = await sbSelect("exams", `code=eq.${exam}&select=id,code`);
    if (!exams.length) {
      res.status(400).json({ success: false, message: `Exam '${exam}' not found in database. Run migration 02 first.` });
      return;
    }
    const examId = exams[0].id;

    // â”€â”€ 4. Map questions to DB schema â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

    // â”€â”€ 5. Bulk upsert questions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const batches = chunk(questionRows, 100);
    for (const batch of batches) {
      await sbPost("questions", batch);
    }

    // â”€â”€ 6. Create the Paper record â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

    // â”€â”€ 7. Link questions to paper via paper_questions join table â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

    // â”€â”€ 8. Respond â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// â”€â”€â”€ Extended Superadmin Features (Integration Wiring) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

    const allowedKeys = new Set([
      "maintenance_mode",
      "deterministic_engine",
      "ssc_pacing",
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

    const totalTests = attemptsCount.count ?? 0;
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
    const sscCount = examCount("ssc-cgl");

    const examBreakdown = [
      { exam: "JEE Main", tests: jeeMainCount, pct: percent(jeeMainCount), color: "from-[#00A656] to-[#00E576]", shadow: "shadow-[0px_2px_12px_rgba(0,181,18,0.4)]" },
      { exam: "JEE Advanced", tests: jeeAdvCount, pct: percent(jeeAdvCount), color: "from-[#2A85FF] to-[#60A5FA]", shadow: "shadow-[0px_2px_12px_rgba(42,133,255,0.4)]" },
      { exam: "NEET", tests: neetCount, pct: percent(neetCount), color: "from-[#FFD60A] to-[#FF9F0A]", shadow: "shadow-[0px_2px_12px_rgba(255,214,10,0.4)]" },
      { exam: "SSC / Other", tests: sscCount, pct: percent(sscCount), color: "from-[#8F5BFF] to-[#A78BFA]", shadow: "shadow-[0px_2px_12px_rgba(143,91,255,0.4)]" },
    ];

    const topInstitutes = (institutesList ?? [])
      .slice(0, 5)
      .map(inst => {
        return {
          name: inst.name,
          tests: 0,
          tokens: "â€”",
        };
      });

    res.status(200).json({
      success: true,
      data: {
        totalTests,
        examBreakdown,
        topInstitutes,
        // Token metering is not persisted yet, so do not invent consumption data.
        aiBreakdown: [],
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};
