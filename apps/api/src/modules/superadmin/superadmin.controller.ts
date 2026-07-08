import { Request, Response } from "express";
import { supabaseAdmin } from "../../lib/supabase";
import { listAllInstitutes, getInstituteCRMStats } from "../institutes/institutes.service";

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

// ─── Validation ───────────────────────────────────────────────────────────────
function validateQuestion(q: any, index: number): string | null {
  if (!q.id)            return `Question #${index + 1}: missing 'id'`;
  if (!q.question_text) return `Question #${index + 1}: missing 'question_text'`;
  if (q.correct_answer === null || q.correct_answer === undefined || q.correct_answer === "")
    return `Question #${index + 1}: missing 'correct_answer'`;

  const isInteger = q.question_type === "integer" || q.question_type === "integer_type";
  if (!isInteger) {
    if (!Array.isArray(q.options) || q.options.length < 2)
      return `Question #${index + 1}: 'options' must be an array with at least 2 items`;
  }

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
      supabaseAdmin.from("institutes").select("id", { count: "exact", head: true }).eq("is_active", true),
      supabaseAdmin.from("users").select("id", { count: "exact", head: true }).eq("role", "student"),
      supabaseAdmin.from("attempts").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("institutes").select("id", { count: "exact", head: true }).gte("created_at", oneWeekAgo),
      supabaseAdmin.from("users").select("id", { count: "exact", head: true }).eq("role", "student").gte("created_at", oneWeekAgo),
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
    const questionRows = questions.map((q: any) => ({
      id:             q.id,
      exam_id:        examId,
      test_type,
      subject:        q.subject  || subject  || "General",
      chapter:        q.chapter  || chapter  || "General",
      topic:          q.topic    || null,
      difficulty:     q.difficulty || difficulty,
      year:           q.year     || year     || null,
      source:         q.source   || title,
      question_type:  q.question_type || "mcq_single",
      question_text:  q.question_text,
      image_url:      q.image_url || null,
      options:        q.options ?? [],
      correct_answer: Array.isArray(q.correct_answer) ? q.correct_answer : [q.correct_answer],
      explanation:    q.explanation || null,
      tags:           q.tags || [],
      distractor_map: q.distractor_map || null,
      marking_scheme: q.marking_scheme || null,
    }));

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
