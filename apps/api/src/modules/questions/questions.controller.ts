import { Request, Response } from "express";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY!;

// ─── Supabase REST helper ─────────────────────────────────────────────────────
async function sbFetch(path: string, options: RequestInit = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      "Content-Type":  "application/json",
      "apikey":        SUPABASE_SERVICE_KEY,
      "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`,
      ...(options.headers ?? {}),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase error (${res.status}): ${text}`);
  }
  return res.json();
}

/**
 * GET /api/v1/questions
 * Authenticated — List questions with optional filters.
 * Query params: exam, subject, chapter, difficulty, type, page, limit
 */
export const listQuestions = async (req: Request, res: Response): Promise<void> => {
  try {
    // TODO: implement
    // 1. Parse query params: exam (exam code), subject, chapter, difficulty, type, page=1, limit=20
    // 2. Build query: SELECT q.* FROM questions q
    //      JOIN exams e ON q.exam_id = e.id
    //    WHERE q.is_active = true
    //      AND (exam filter) AND (subject filter) AND (chapter filter) AND (difficulty filter) AND (type filter)
    //    ORDER BY q.created_at DESC
    //    LIMIT $limit OFFSET ($page - 1) * $limit
    // 3. Return { success: true, data: { questions, total, page, limit } }
    // NOTE: correct_answer must NOT be returned for non-super_admin users
    res.status(200).json({ success: true, message: "listQuestions — TODO: implement" });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * GET /api/v1/questions/meta/exams
 * Authenticated — Return all active exams with their subjects and chapters.
 * Used by the test creation UI to populate dropdowns.
 */
export const getExamsMeta = async (req: Request, res: Response): Promise<void> => {
  try {
    // TODO: implement
    // 1. SELECT DISTINCT e.id, e.code, e.full_name, q.subject, q.chapter
    //      FROM exams e JOIN questions q ON q.exam_id = e.id
    //    WHERE e.is_active = true AND q.is_active = true
    //    ORDER BY e.code, q.subject, q.chapter
    // 2. Group into structure: [{ exam_id, code, full_name, subjects: [{ name, chapters: [...] }] }]
    // 3. Return { success: true, data: { exams } }
    res.status(200).json({ success: true, message: "getExamsMeta — TODO: implement" });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * GET /api/v1/questions/:id
 * Authenticated — Return a single question by ID.
 */
export const getQuestion = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    // TODO: implement
    // 1. SELECT * FROM questions WHERE id = $id AND is_active = true
    // 2. If not found: return 404
    // 3. Strip correct_answer unless req.user.role === 'super_admin'
    // 4. Return { success: true, data: { question } }
    res.status(200).json({ success: true, message: "getQuestion — TODO: implement", id });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * POST /api/v1/questions
 * [super_admin only] — Create a new question.
 */
export const createQuestion = async (req: Request, res: Response): Promise<void> => {
  try {
    // TODO: implement
    // 1. Validate req.body against question schema (exam_id, subject, chapter, topic, difficulty,
    //    type, question_text, options, correct_answer, explanation, image_url, source, year, tags)
    // 2. INSERT INTO questions (...) VALUES (...) RETURNING *
    //    — set created_by = req.user!.id
    // 3. Return { success: true, data: { question } } with status 201
    res.status(201).json({ success: true, message: "createQuestion — TODO: implement" });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * PATCH /api/v1/questions/:id
 * [super_admin only] — Update an existing question.
 */
export const updateQuestion = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    // TODO: implement
    // 1. Verify question exists and is_active = true
    // 2. Validate req.body (partial question fields)
    // 3. UPDATE questions SET ...fields, updated_at = now() WHERE id = $id RETURNING *
    // 4. Return { success: true, data: { question } }
    res.status(200).json({ success: true, message: "updateQuestion — TODO: implement", id });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * DELETE /api/v1/questions/:id
 * [super_admin only] — Soft delete a question (sets is_active = false).
 */
export const deleteQuestion = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    // TODO: implement
    // SOFT DELETE — do not hard delete
    // 1. Verify question exists
    // 2. UPDATE questions SET is_active = false, updated_at = now() WHERE id = $id
    // 3. Return { success: true, message: "Question deactivated" }
    res.status(200).json({ success: true, message: "deleteQuestion (soft) — TODO: implement", id });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * POST /api/v1/questions/bulk
 * [super_admin / service_role only] — Upsert an array of questions in one shot.
 * Used by the seed script. Max 500 per call.
 */
export const bulkUpsertQuestions = async (req: Request, res: Response): Promise<void> => {
  try {
    const { questions } = req.body as { questions: any[] };

    if (!Array.isArray(questions) || questions.length === 0) {
      res.status(400).json({ success: false, message: "Body must have a non-empty 'questions' array." });
      return;
    }
    if (questions.length > 500) {
      res.status(400).json({ success: false, message: "Max 500 questions per bulk call." });
      return;
    }

    await sbFetch(`questions`, {
      method: "POST",
      headers: { "Prefer": "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify(questions),
    });

    res.status(201).json({ success: true, message: `Upserted ${questions.length} questions.` });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * GET /api/v1/questions/tests
 * Authenticated — Returns available test papers grouped by test_type.
 * Used by the Tests Hub frontend to list tests dynamically.
 * Query params: exam (jee-main|neet-ug|ssc-cgl), type (chapter-wise|mock-test|pyq)
 */
export const listTests = async (req: Request, res: Response): Promise<void> => {
  try {
    const { exam, type } = req.query;

    let query = `papers?is_active=eq.true&select=id,title,test_type,subject,chapter,year,shift,total_questions,total_marks,duration_min,difficulty,exams(code,full_name)&order=created_at.desc`;

    if (type) query += `&test_type=eq.${type}`;

    // Filter by exam code using the exams foreign key
    const data = await sbFetch(query);

    // If exam filter provided, filter in memory (Supabase REST join filtering has limitations)
    const filtered = exam
      ? data.filter((p: any) => p.exams?.code === exam)
      : data;

    res.json({ success: true, data: { papers: filtered, total: filtered.length } });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};
