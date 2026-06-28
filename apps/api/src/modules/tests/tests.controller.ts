import { Request, Response } from "express";

/**
 * POST /api/v1/tests
 * Authenticated — Create a new test by generating a question set from a config.
 */
export const createTest = async (req: Request, res: Response): Promise<void> => {
  try {
    // TODO: implement
    // 1. Validate req.body:
    //    { exam_id, title?, type, config: { subjects, chapters, difficulty_mix, question_count },
    //      marking_scheme?, duration_minutes?, mode: 'exam'|'practice',
    //      is_institute_test?, batch_ids?, scheduled_start?, scheduled_end? }
    // 2. Query questions matching the config filters (exam_id, subjects, chapters, difficulty_mix)
    //    and randomly select `question_count` of them using the difficulty distribution
    // 3. INSERT INTO tests (created_by, exam_id, title, type, config, marking_scheme,
    //    duration_minutes, total_marks, question_ids, mode, is_institute_test,
    //    scheduled_start, scheduled_end) VALUES (...) RETURNING *
    // 4. If is_institute_test && batch_ids: INSERT INTO test_batch_assignments
    // 5. Return { success: true, data: { test } } with status 201
    res.status(201).json({ success: true, message: "createTest — TODO: implement" });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * GET /api/v1/tests/my
 * Authenticated — List tests created by the current user.
 */
export const getMyTests = async (req: Request, res: Response): Promise<void> => {
  try {
    // TODO: implement
    // 1. Parse query: page=1, limit=20
    // 2. SELECT * FROM tests WHERE created_by = req.user!.id
    //    ORDER BY created_at DESC LIMIT $limit OFFSET offset
    // 3. Return { success: true, data: { tests, total, page, limit } }
    res.status(200).json({ success: true, message: "getMyTests — TODO: implement" });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * GET /api/v1/tests/assigned
 * Authenticated (student/teacher) — List institute-assigned tests for the current user.
 */
export const getAssignedTests = async (req: Request, res: Response): Promise<void> => {
  try {
    // TODO: implement
    // 1. Find all batch_ids for current user via batch_students (or batch_teachers for teacher)
    // 2. SELECT DISTINCT t.* FROM tests t
    //      JOIN test_batch_assignments tba ON tba.test_id = t.id
    //    WHERE tba.batch_id = ANY($batch_ids)
    //      AND t.is_published = true
    //      AND t.scheduled_end > now()          -- still within window
    //    ORDER BY t.scheduled_start ASC
    // 3. Return { success: true, data: { tests } }
    res.status(200).json({ success: true, message: "getAssignedTests — TODO: implement" });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * GET /api/v1/tests/:id
 * Authenticated — Get test config WITHOUT correct answers.
 */
export const getTest = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    // TODO: implement
    // 1. SELECT * FROM tests WHERE id = $id
    // 2. If not found: 404
    // 3. Fetch questions: SELECT id, question_text, options, type, difficulty, subject, chapter
    //      FROM questions WHERE id = ANY(test.question_ids)
    //    — NOTE: correct_answer is deliberately excluded here
    // 4. Return { success: true, data: { test: { ...test, questions } } }
    res.status(200).json({ success: true, message: "getTest — TODO: implement", id });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * POST /api/v1/tests/:id/publish
 * [teacher only] — Publish an institute test so students can see and attempt it.
 */
export const publishTest = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    // TODO: implement
    // 1. Fetch test by id; verify it exists and is_institute_test = true
    // 2. Verify requesting teacher is assigned to at least one of the test's batches
    //    (via batch_teachers + test_batch_assignments)
    // 3. UPDATE tests SET is_published = true WHERE id = $id
    // 4. Return { success: true, data: { test } }
    res.status(200).json({ success: true, message: "publishTest — TODO: implement", id });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};
