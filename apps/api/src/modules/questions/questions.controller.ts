import { Request, Response } from "express";
import { supabaseDB, supabaseAdmin } from "../../lib/supabase";

// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/v1/questions
 * Authenticated — List questions with optional filters.
 * Query params: exam (code), subject, chapter, difficulty, type, page, limit
 * NOTE: correct_answer is stripped unless super_admin.
 */
export const listQuestions = async (req: Request, res: Response): Promise<void> => {
  try {
    const { exam, subject, chapter, difficulty, type, page = "1", limit = "20", topics } = req.query as Record<string, string>;
    const pageNum = Math.max(1, isNaN(parseInt(page)) ? 1 : parseInt(page));
    const limitNum = Math.min(100, Math.max(1, isNaN(parseInt(limit)) ? 20 : parseInt(limit)));
    const offset = (pageNum - 1) * limitNum;

    const isSuperAdmin = req.user?.role === "super_admin";
    const selectCols = isSuperAdmin
      ? "id, question_text, image_url, subject, chapter, topic, difficulty, question_type, source, year, correct_answer, options, created_at"
      : "id, question_text, image_url, subject, chapter, topic, difficulty, question_type, source, year, options, created_at";

    let query = supabaseDB
      .from("questions")
      .select(selectCols, { count: "exact" })
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .range(offset, offset + limitNum - 1);

    if (subject) query = query.eq("subject", subject);
    if (chapter) query = query.eq("chapter", chapter);
    if (difficulty) query = query.eq("difficulty", difficulty);
    if (type) query = query.eq("question_type", type);

    if (topics) {
      const topicsArray = typeof topics === "string"
        ? topics.split(",").map(t => t.trim()).filter(Boolean)
        : Array.isArray(topics) ? (topics as string[]).map(t => String(t).trim()).filter(Boolean) : [];
      if (topicsArray.length > 0) {
        query = query.in("topic", topicsArray);
      }
    }

    // exam filter: join via exams table — filter by exam code
    if (exam) {
      // First resolve exam_id from code
      const { data: examRow } = await supabaseDB.from("exams").select("id").eq("code", exam).maybeSingle();
      if (examRow) {
        query = (query as any).eq("exam_id", examRow.id);
      }
    }

    const { data: questions, count, error } = await query;

    if (error) {
      res.status(500).json({ success: false, message: error.message });
      return;
    }

    res.status(200).json({
      success: true,
      data: { questions: questions ?? [], total: count ?? 0, page: pageNum, limit: limitNum },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * GET /api/v1/questions/meta/exams
 * Authenticated — Return all active exams with their subjects and chapters.
 */
export const getExamsMeta = async (req: Request, res: Response): Promise<void> => {
  try {
    const { data: exams } = await supabaseDB
      .from("exams")
      .select("id, code, full_name")
      .eq("is_active", true)
      .order("code");

    if (!exams || exams.length === 0) {
      res.status(200).json({ success: true, data: { exams: [] } });
      return;
    }

    // For each exam, get distinct subjects and chapters
    const result = await Promise.all(
      exams.map(async (exam: any) => {
        const { data: qData } = await supabaseDB
          .from("questions")
          .select("subject, chapter, topic")
          .eq("exam_id", exam.id)
          .eq("is_active", true);

        // Group subjects → chapters → topics
        const subjectMap: Record<string, Record<string, Set<string>>> = {};
        for (const q of qData ?? []) {
          if (!subjectMap[q.subject]) subjectMap[q.subject] = {};
          if (q.chapter) {
            if (!subjectMap[q.subject][q.chapter]) subjectMap[q.subject][q.chapter] = new Set();
            if (q.topic) subjectMap[q.subject][q.chapter].add(q.topic);
          }
        }

        return {
          exam_id: exam.id,
          code: exam.code,
          full_name: exam.full_name,
          subjects: Object.entries(subjectMap).map(([name, chapters]) => ({
            name,
            chapters: Object.entries(chapters).map(([chapterName, topicsSet]) => ({
              name: chapterName,
              topics: Array.from(topicsSet).sort(),
            })).sort((a, b) => a.name.localeCompare(b.name)),
          })).sort((a, b) => a.name.localeCompare(b.name)),
        };
      })
    );

    res.status(200).json({ success: true, data: { exams: result } });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * GET /api/v1/questions/:id
 * Authenticated — Return a single question by ID.
 * correct_answer stripped unless super_admin.
 */
export const getQuestion = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const isSuperAdmin = req.user?.role === "super_admin";

    // Strip explanation from non-super_admin lookups (SEC-3)
    const isTeacherOrAdmin = ["super_admin", "institute_admin", "teacher"].includes(req.user?.role ?? "");
    const selectCols = isSuperAdmin
      ? "*"
      : isTeacherOrAdmin
        ? "id, question_text, image_url, subject, chapter, topic, difficulty, question_type, source, year, options, correct_answer, explanation, tags"
        : "id, question_text, image_url, subject, chapter, topic, difficulty, question_type, source, year, options, tags";

    const { data: question, error } = await supabaseDB
      .from("questions")
      .select(selectCols)
      .eq("id", id)
      .eq("is_active", true)
      .maybeSingle();

    if (error) {
      res.status(500).json({ success: false, message: error.message });
      return;
    }

    if (!question) {
      res.status(404).json({ success: false, message: "Question not found" });
      return;
    }

    res.status(200).json({ success: true, data: { question } });
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
    const { exam_id, subject, chapter, topic, difficulty, question_type, question_text, options, correct_answer, explanation, source, year, tags, image_url } = req.body;

    if (!exam_id || !subject || !chapter || !difficulty || !question_type || !question_text || !correct_answer) {
      res.status(400).json({ success: false, message: "Missing required fields: exam_id, subject, chapter, difficulty, question_type, question_text, correct_answer" });
      return;
    }

    const { data: question, error } = await supabaseAdmin
      .from("questions")
      .insert({
        exam_id,
        subject,
        chapter,
        topic: topic ?? null,
        difficulty,
        question_type,
        question_text,
        image_url: image_url || null,
        options: options ?? null,
        correct_answer: Array.isArray(correct_answer) ? correct_answer : [correct_answer],
        explanation: explanation ?? null,
        source: source ?? null,
        year: year ?? null,
        tags: tags ?? [],
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      res.status(500).json({ success: false, message: error.message });
      return;
    }

    res.status(201).json({ success: true, data: { question } });
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
    const allowed = ["subject", "chapter", "topic", "difficulty", "question_type", "question_text", "image_url", "options", "correct_answer", "explanation", "source", "year", "tags"];
    const updates: Record<string, any> = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }
    if (Object.keys(updates).length === 0) {
      res.status(400).json({ success: false, message: "No valid fields to update" });
      return;
    }

    const { data: question, error } = await supabaseAdmin
      .from("questions")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("is_active", true)
      .select()
      .single();

    if (error || !question) {
      res.status(error ? 500 : 404).json({ success: false, message: error?.message ?? "Question not found" });
      return;
    }

    res.status(200).json({ success: true, data: { question } });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * DELETE /api/v1/questions/:id
 * [super_admin only] — Soft delete (sets is_active = false).
 */
export const deleteQuestion = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const { error } = await supabaseAdmin
      .from("questions")
      .update({ is_active: false })
      .eq("id", id);

    if (error) {
      res.status(500).json({ success: false, message: error.message });
      return;
    }

    res.status(200).json({ success: true, message: "Question deactivated" });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * POST /api/v1/questions/bulk
 * [super_admin / service_role only] — Upsert an array of questions in one shot.
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

    const { error } = await supabaseAdmin
      .from("questions")
      .upsert(questions, { onConflict: "id" });

    if (error) {
      res.status(500).json({ success: false, message: error.message });
      return;
    }

    res.status(201).json({ success: true, message: `Upserted ${questions.length} questions.` });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * GET /api/v1/questions/tests
 * Authenticated — Returns available test papers grouped by test_type.
 * Query params: exam (jee-main|neet-ug|ssc-cgl), type (chapter-wise|mock-test|pyq)
 */
export const listTests = async (req: Request, res: Response): Promise<void> => {
  try {
    const { exam, type } = req.query;

    let query = supabaseDB
      .from("papers")
      .select("id, title, test_type, subject, chapter, year, shift, total_questions, total_marks, duration_min, difficulty, exams(code, full_name)")
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (type) query = query.eq("test_type", type as string);

    const { data, error } = await query;

    if (error) {
      res.status(500).json({ success: false, message: error.message });
      return;
    }

    const filtered = exam
      ? (data ?? []).filter((p: any) => p.exams?.code === exam)
      : (data ?? []);

    res.json({ success: true, data: { papers: filtered, total: filtered.length } });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};
