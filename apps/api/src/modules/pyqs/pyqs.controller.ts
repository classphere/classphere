import { Request, Response } from "express";
import { supabaseDB } from "../../lib/supabase";
import { getStudentExamCodes, resolveExamFilter } from "../../lib/student-exam";

// ─── Controllers ──────────────────────────────────────────────────────────────

/**
 * GET /api/v1/pyqs
 * Returns metadata for all PYQ papers from the DB.
 * Query params: exam (exam code e.g. "jee-main"), year
 */
export const getPYQList = async (req: Request, res: Response): Promise<void> => {
  try {
    const { exam, year } = req.query;

    let query = supabaseDB
      .from("papers")
      .select(`
        id,
        title,
        year,
        shift,
        total_questions,
        total_marks,
        duration_min,
        difficulty,
        exams!inner(code, full_name)
      `)
      // ?kind=paper lists whole past-year papers, sat end to end against a
      // clock; the default lists past-year questions filed by chapter, which
      // are practice. They were one type until now and behave nothing alike.
      .eq("test_type", String(req.query.kind ?? "").trim() === "paper" ? "pyq-paper" : "pyq")
      .eq("is_active", true)
      // A retired exam (SSC, deactivated rather than deleted since old
      // papers may still reference it) must not resurface here for anyone,
      // student or staff — not just be excluded from a student's own
      // entitlement filter above.
      .eq("exams.is_active", true);
    query = query.eq("is_published", true).eq("delivery_mode", "public_practice");

    // Exam filter, constrained to what this student's batches entitle them
    // to. The frontend never sent `exam` at all — it fetched every exam's
    // papers in one call and filtered client-side with an "All" option — so
    // a NEET student browsing without picking a filter saw JEE and SSC
    // papers mixed into their own. Same pattern questions.controller.ts
    // already applies to /api/v1/questions; this endpoint just never got it.
    const entitled = req.user?.role === "student" ? await getStudentExamCodes(req.user.id) : [];
    const { codes: examCodes, denied } = resolveExamFilter(exam ? String(exam).trim() : undefined, entitled);
    if (denied) {
      res.json({ success: true, data: { papers: [], total: 0 } });
      return;
    }
    if (examCodes && examCodes.length > 0) {
      query = query.in("exams.code", examCodes);
    }

    if (year) {
      const yearNum = parseInt(String(year), 10);
      if (!isNaN(yearNum)) {
        query = query.eq("year", yearNum);
      }
    }

    const { data: papers, error } = await query.order("year", { ascending: false });

    if (error) throw error;

    res.json({ success: true, data: { papers: papers ?? [], total: papers?.length ?? 0 } });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * GET /api/v1/pyqs/:id/questions
 * Returns the full enriched question array for a specific PYQ paper.
 */
export const getPYQQuestions = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // 1. Fetch paper metadata
    const { data: paperData, error: paperError } = await supabaseDB
      .from("papers")
      .select("*, exams(code, full_name)")
      .eq("id", id)
      .in("test_type", ["pyq", "pyq-paper"])
      .eq("is_active", true)
      .eq("is_published", true)
      .eq("delivery_mode", "public_practice")
      .maybeSingle();

    if (paperError || !paperData) {
      res.status(404).json({ success: false, message: `PYQ paper '${id}' not found.` });
      return;
    }

    // The list endpoint already hides a paper outside the student's
    // entitled exams, but that's client-side navigation, not access
    // control — a bookmarked or guessed id must be refused here too, or
    // the list-level fix is cosmetic. 404 rather than 403: this endpoint
    // otherwise never reveals whether an id exists at all.
    if (req.user?.role === "student") {
      const entitled = await getStudentExamCodes(req.user.id);
      const { denied } = resolveExamFilter((paperData as any).exams?.code, entitled);
      if (denied) {
        res.status(404).json({ success: false, message: `PYQ paper '${id}' not found.` });
        return;
      }
    }

    // 2. Fetch questions via join table
    const { data: pqs, error: pqsError } = await supabaseDB
      .from("paper_questions")
      .select("question_id")
      .eq("paper_id", id)
      .order("position", { ascending: true });

    if (pqsError) throw pqsError;

    const questionIds = (pqs ?? []).map((r: any) => r.question_id);

    let questions: any[] = [];
    if (questionIds.length > 0) {
      // Fetch questions by IDs in one shot using `in` filter
      const { data: rawQs, error: qsError } = await supabaseDB
        .from("questions")
        .select(`
          id,
          question_text,
          question_images,
          options,
          correct_answer,
          explanation,
          question_type,
          subject,
          chapter,
          topic,
          difficulty
        `)
        .in("id", questionIds)
        .eq("is_active", true);

      if (qsError) throw qsError;

      // Preserve the position order from paper_questions
      const byId: Record<string, any> = {};
      for (const q of rawQs ?? []) {
        if (req.user?.role === "student") {
          const { correct_answer, explanation, ...rest } = q;
          byId[q.id] = rest;
        } else {
          byId[q.id] = q;
        }
      }

      questions = questionIds
        .map((qid) => byId[qid] ?? null)
        .filter(Boolean);
    }

    res.json({
      success: true,
      data: { paper: paperData, questions, total: questions.length },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};
