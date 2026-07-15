import { Request, Response } from "express";
import { supabaseDB, supabaseAdmin } from "../../lib/supabase";

// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/v1/tests/:id
 * Authenticated — Get a paper's metadata + full question list.
 * Used by /test/[id] page for PYQ papers uploaded via superadmin.
 */
export const getTest = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // 1. Fetch paper metadata
    const { data: paper, error: pErr } = await supabaseDB
      .from("papers")
      .select("*, exams(code, full_name)")
      .eq("id", id)
      .eq("is_active", true)
      .maybeSingle();

    if (pErr) {
      res.status(500).json({ success: false, message: pErr.message });
      return;
    }
    if (!paper) {
      res.status(404).json({ success: false, message: `Test '${id}' not found.` });
      return;
    }

    // 2. Fetch ordered question IDs from join table
    const { data: pqs, error: pqErr } = await supabaseDB
      .from("paper_questions")
      .select("question_id, position")
      .eq("paper_id", id)
      .order("position", { ascending: true });

    if (pqErr) {
      res.status(500).json({ success: false, message: pqErr.message });
      return;
    }

    const questionIds: string[] = (pqs ?? []).map((r: any) => r.question_id);
    let questions: any[] = [];

    if (questionIds.length > 0) {
      const { data: rawQs, error: qErr } = await supabaseDB
        .from("questions")
        .select("id, question_text, image_url, options, correct_answer, explanation, question_type, subject, chapter, topic, difficulty, distractor_map, marking_scheme, source, year, tags")
        .in("id", questionIds)
        .eq("is_active", true);

      if (qErr) {
        res.status(500).json({ success: false, message: qErr.message });
        return;
      }

      const byId: Record<string, any> = {};
      for (const q of rawQs ?? []) byId[q.id] = q;
      questions = questionIds
        .map((qid, idx) => byId[qid] ? { ...byId[qid], question_number: idx + 1 } : null)
        .filter(Boolean);
    }

    const examCode = (paper as any).exams?.code ?? "";
    const examLabel = (paper as any).exams?.full_name ?? "";
    const meta = {
      id: paper.id,
      exam: examLabel || examCode,
      year: paper.year ?? null,
      shift: paper.shift ?? paper.title,
      questions: questions.length,
      duration: paper.duration_min,
      title: paper.title,
      test_type: paper.test_type,
    };

    res.json({ success: true, data: { paper: meta, questions, total: questions.length } });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/v1/tests
 * [institute_admin / teacher] — Create an institute test.
 * Body: { exam_id, title, type, question_count, subjects, difficulty_mix,
 *         duration_minutes, batch_ids, scheduled_start, scheduled_end }
 */
export const createTest = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const {
      exam_id, title, type = "mock-test",
      question_count = 90, subjects, chapters, difficulty_mix,
      duration_minutes = 180, batch_ids,
      scheduled_start, scheduled_end,
    } = req.body;

    if (!exam_id || !batch_ids?.length) {
      res.status(400).json({ success: false, message: "exam_id and batch_ids[] are required" });
      return;
    }

    // 1. Select random questions matching config
    let questionQuery = supabaseDB
      .from("questions")
      .select("id, subject, difficulty")
      .eq("exam_id", exam_id)
      .eq("is_active", true);

    if (subjects?.length) questionQuery = questionQuery.in("subject", subjects);
    if (chapters?.length) questionQuery = questionQuery.in("chapter", chapters);

    const { data: allQs } = await questionQuery;
    if (!allQs || allQs.length === 0) {
      res.status(400).json({ success: false, message: "No questions found matching the given config" });
      return;
    }

    // Shuffle and pick question_count
    const shuffled = allQs.sort(() => Math.random() - 0.5).slice(0, question_count);

    // 2. Insert paper row
    const { data: paper, error: pErr } = await supabaseAdmin
      .from("papers")
      .insert({
        exam_id,
        title: title ?? `Custom Test — ${new Date().toLocaleDateString("en-IN")}`,
        test_type: type,
        total_questions: shuffled.length,
        total_marks: shuffled.length * 4,
        duration_min: duration_minutes,
        created_by: userId,
        is_active: true,
        is_published: false,
      })
      .select("id")
      .single();

    if (pErr || !paper) {
      res.status(500).json({ success: false, message: pErr?.message ?? "Failed to create test" });
      return;
    }

    // 3. Insert paper_questions join rows
    const pqRows = shuffled.map((q: any, idx: number) => ({
      paper_id: paper.id,
      question_id: q.id,
      position: idx + 1,
    }));
    await supabaseAdmin.from("paper_questions").insert(pqRows);

    // 4. Assign to batches (using test_batch_assignments)
    if (batch_ids && batch_ids.length > 0) {
      const tbRows = batch_ids.map((b_id: string) => ({
        test_id: paper.id,
        batch_id: b_id,
      }));
      await supabaseAdmin.from("test_batch_assignments").insert(tbRows);
    }
    
    console.log(`[createTest] Created paper ${paper.id} with ${shuffled.length} questions, assigned to ${batch_ids.length} batches`);

    res.status(201).json({ success: true, data: { test: { id: paper.id, title, question_count: shuffled.length, batch_ids } } });
  } catch (err: any) {
    console.error("[createTest error]", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * GET /api/v1/tests/my
 * Authenticated — List papers created by the current user.
 */
export const getMyTests = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const page = Math.max(1, Number(req.query.page ?? 1));
    const limit = Math.min(50, Math.max(1, Number(req.query.limit ?? 20)));
    const offset = (page - 1) * limit;

    const { data: tests, count, error } = await supabaseDB
      .from("papers")
      .select("id, title, test_type, total_questions, duration_min, is_active, created_at, exams(code, full_name)", { count: "exact" })
      .eq("created_by", userId)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      res.status(500).json({ success: false, message: error.message });
      return;
    }

    res.status(200).json({ success: true, data: { tests: tests ?? [], total: count ?? 0, page, limit } });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * GET /api/v1/tests/assigned
 * Authenticated (student) — List all tests assigned to the student's batches.
 */
export const getAssignedTests = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;

    // Get student's batch IDs
    const { data: batchLinks } = await supabaseDB
      .from("batch_students")
      .select("batch_id")
      .eq("student_id", userId);

    const batchIds = (batchLinks ?? []).map((r: any) => r.batch_id);
    if (batchIds.length === 0) {
      res.status(200).json({ success: true, data: { tests: [] } });
      return;
    }

    // Fetch tests assigned to these batches
    const { data: assignments, error: assignErr } = await supabaseDB
      .from("test_batch_assignments")
      .select("assigned_at, batch_id, papers(id, title, test_type, total_questions, duration_min, is_active, created_at)")
      .in("batch_id", batchIds);

    if (assignErr) {
      res.status(500).json({ success: false, message: assignErr.message });
      return;
    }

    // Deduplicate in case multiple batches have the same test
    const testsMap = new Map();
    for (const a of (assignments ?? [])) {
      const p: any = Array.isArray(a.papers) ? a.papers[0] : a.papers;
      if (p && p.is_active) {
        testsMap.set(p.id, p);
      }
    }

    const assignedTests = Array.from(testsMap.values());
    res.status(200).json({ success: true, data: { tests: assignedTests } });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * POST /api/v1/tests/:id/publish
 * [teacher / institute_admin] — Publish a test so students can see it.
 */
export const publishTest = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const isSuperAdmin = req.user?.role === "super_admin";

    let query = supabaseAdmin
      .from("papers")
      .update({ is_published: true })
      .eq("id", id)
      .eq("is_active", true);

    if (!isSuperAdmin) {
      query = query.eq("created_by", req.user!.id);
    }

    const { data: paper, error } = await query
      .select("id, title, is_published")
      .maybeSingle();

    if (error) {
      res.status(500).json({ success: false, message: error.message });
      return;
    }

    if (!paper) {
      res.status(404).json({ success: false, message: "Test not found or access denied." });
      return;
    }

    res.status(200).json({ success: true, message: "Test published", data: { test: paper } });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * DELETE /api/v1/tests/:id
 * [super_admin / institute_admin] — Soft delete a test (is_active = false).
 */
export const deleteTest = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const isSuperAdmin = req.user?.role === "super_admin";

    let query = supabaseAdmin
      .from("papers")
      .update({ is_active: false })
      .eq("id", id);

    if (!isSuperAdmin) {
      query = query.eq("created_by", req.user!.id);
    }

    const { data: paper, error } = await query
      .select("id")
      .maybeSingle();

    if (error) {
      res.status(500).json({ success: false, message: error.message });
      return;
    }

    if (!paper) {
      res.status(404).json({ success: false, message: "Test not found or access denied." });
      return;
    }

    res.status(200).json({ success: true, message: "Test successfully deactivated." });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};
