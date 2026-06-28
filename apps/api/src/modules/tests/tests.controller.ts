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
 * Authenticated — Get a paper's metadata + full question list (with correct_answer, for now).
 * Used by /test/[id] page when the test was uploaded via the superadmin upload tool.
 */
export const getTest = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const SUPABASE_URL      = process.env.SUPABASE_URL!;
    const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY!;

    async function sbFetch(path: string) {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
        headers: {
          "Content-Type":  "application/json",
          "apikey":        SUPABASE_SERVICE_KEY,
          "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`,
        },
      });
      if (!r.ok) throw new Error(`Supabase error (${r.status}): ${await r.text()}`);
      return r.json();
    }

    // 1. Fetch paper metadata
    const papers = await sbFetch(
      `papers?id=eq.${id}&is_active=eq.true&select=*,exams(code,full_name)`
    );
    if (!papers.length) {
      res.status(404).json({ success: false, message: `Test '${id}' not found.` });
      return;
    }
    const paper = papers[0];

    // 2. Fetch ordered question IDs from join table
    const pqs = await sbFetch(
      `paper_questions?paper_id=eq.${id}&order=position.asc&select=question_id,position`
    );
    const questionIds: string[] = pqs.map((r: any) => r.question_id);

    let questions: any[] = [];
    if (questionIds.length > 0) {
      const ids = questionIds.join(",");
      const rawQs = await sbFetch(
        `questions?id=in.(${ids})&is_active=eq.true&select=id,question_text,image_url,options,correct_answer,explanation,question_type,subject,chapter,topic,difficulty,distractor_map,marking_scheme`
      );

      // Re-order to match paper_questions position order
      const byId: Record<string, any> = {};
      for (const q of rawQs) byId[q.id] = q;
      questions = questionIds
        .map((qid, idx) => byId[qid] ? { ...byId[qid], question_number: idx + 1 } : null)
        .filter(Boolean);
    }

    // Build meta shape matching what the test attempt page expects
    const examCode  = paper.exams?.code ?? "";
    const examLabel = paper.exams?.full_name ?? "";
    const meta = {
      id:       paper.id,
      exam:     examLabel || examCode,
      year:     paper.year     ?? null,
      shift:    paper.shift    ?? paper.title,
      questions: questions.length,
      duration:  paper.duration_min,
      title:    paper.title,
      test_type: paper.test_type,
    };

    res.json({ success: true, data: { paper: meta, questions, total: questions.length } });
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
