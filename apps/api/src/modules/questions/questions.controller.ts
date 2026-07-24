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
 * POST /api/v1/questions/topic-practice
 * Creates a private, immutable paper for one student's topic practice. The
 * paper links existing vetted questions; it never copies answer keys or makes
 * a student-selected set visible to other students.
 */
export const createTopicPractice = async (req: Request, res: Response): Promise<void> => {
  try {
    if (req.user?.role !== "student") {
      res.status(403).json({ success: false, message: "Topic practice is available to students only." });
      return;
    }
    const { exam, subject, chapter, topic, difficulty, question_count = 20 } = req.body ?? {};
    const count = Math.max(5, Math.min(50, Number(question_count) || 20));
    if (![exam, subject, chapter, topic].every((value) => typeof value === "string" && value.trim())) {
      res.status(400).json({ success: false, message: "exam, subject, chapter, and topic are required." });
      return;
    }

    const { data: examRow } = await supabaseDB.from("exams").select("id, code").eq("code", exam.trim()).eq("is_active", true).maybeSingle();
    if (!examRow) {
      res.status(404).json({ success: false, message: "The selected exam is unavailable." });
      return;
    }
    let questionQuery = supabaseDB
      .from("questions")
      .select("id")
      .eq("exam_id", examRow.id)
      .eq("subject", subject.trim())
      .eq("chapter", chapter.trim())
      .eq("topic", topic.trim())
      .eq("is_active", true)
      .limit(count);
    if (difficulty && ["easy", "medium", "hard"].includes(difficulty)) questionQuery = questionQuery.eq("difficulty", difficulty);
    const { data: matches, error: questionError } = await questionQuery;
    if (questionError) throw questionError;
    if (!matches?.length) {
      res.status(404).json({ success: false, message: "No active questions are available for this topic yet." });
      return;
    }

    const { data: paper, error: paperError } = await supabaseDB.from("papers").insert({
      exam_id: examRow.id,
      test_type: "topic-practice",
      title: `${topic.trim()} Practice`,
      subject: subject.trim(),
      chapter: chapter.trim(),
      total_questions: matches.length,
      total_marks: matches.length * 4,
      duration_min: Math.max(15, matches.length * 2),
      difficulty: difficulty || null,
      is_active: true,
      is_published: false,
      delivery_mode: "public_practice",
      created_by: req.user.id,
    }).select("id").single();
    if (paperError || !paper) throw paperError ?? new Error("Could not create practice set.");

    const { error: linkError } = await supabaseDB.from("paper_questions").insert(
      matches.map((question: any, index: number) => ({ paper_id: paper.id, question_id: question.id, position: index + 1 }))
    );
    if (linkError) {
      await supabaseDB.from("papers").delete().eq("id", paper.id).eq("created_by", req.user.id);
      throw linkError;
    }
    res.status(201).json({ success: true, data: { paper_id: paper.id, question_count: matches.length } });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message ?? "Could not create topic practice." });
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

    // Answer keys and explanations are platform-controlled material. They are
    // never returned by this generic lookup; delivery endpoints release them
    // only after an authorised submission or scheduled result release.
    const selectCols = isSuperAdmin
      ? "*"
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
    const allowed = [
      "subject", "chapter", "topic", "difficulty", "question_type", "question_text",
      "image_url", "options", "correct_answer", "explanation", "source", "year", "tags",
      "content_blocks", "extraction_metadata", "extractor_version", "source_crop_url", "source_reference",
    ];
    const updates: Record<string, any> = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }
    // Never leave an extracted block projection stale after a legacy-only edit.
    if ((req.body.question_text !== undefined || req.body.image_url !== undefined) && req.body.content_blocks === undefined) {
      updates.content_blocks = null;
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
      .eq("is_published", true)
      .eq("delivery_mode", "public_practice")
      .order("created_at", { ascending: false });

    if (type) query = query.eq("test_type", type as string);

    const { data, error } = await query;

    if (error) {
      res.status(500).json({ success: false, message: error.message });
      return;
    }

    const filtered = exam
      ? (data ?? []).filter((p: any) => {
          if (!p.exams) return false;
          const codes = Array.isArray(p.exams) ? p.exams.map((e: any) => e.code) : [p.exams.code];
          return codes.some((c: any) => c && c.toLowerCase() === (exam as string).toLowerCase());
        })
      : (data ?? []).filter((p: any) => {
          if (!p.exams) return false;
          if (Array.isArray(p.exams) && p.exams.length === 0) return false;
          return true;
        });

    res.json({ success: true, data: { papers: filtered, total: filtered.length } });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * POST /api/v1/questions/:id/report
 * Authenticated — Submit a discrepancy flag for a question.
 */
export const reportQuestion = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id: questionId } = req.params;
    const studentId = req.user!.id;
    const { reason, details } = req.body ?? {};

    if (!reason) {
      res.status(400).json({ success: false, message: "reason is required" });
      return;
    }

    const { data, error } = await supabaseDB
      .from("question_reports")
      .insert({
        question_id: questionId,
        reported_by: studentId,
        reason,
        details: details || null,
        status: "open",
      })
      .select()
      .single();

    if (error) {
      res.status(500).json({ success: false, message: error.message });
      return;
    }

    res.status(201).json({ success: true, data: { report: data }, message: "Question report submitted successfully." });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * GET /api/v1/questions/reports/aggregated
 * Staff view — Fetch list of discrepancy flags.
 */
export const getQuestionReports = async (req: Request, res: Response): Promise<void> => {
  try {
    const { data, error } = await supabaseDB
      .from("question_reports")
      .select("id, question_id, reported_by, reason, details, status, created_at, questions(question_text, subject, chapter, correct_answer)")
      .order("created_at", { ascending: false });

    if (error) {
      res.status(500).json({ success: false, message: error.message });
      return;
    }

    res.status(200).json({ success: true, data: { reports: data } });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};
