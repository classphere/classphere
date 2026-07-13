import { Request, Response } from "express";
import path from "path";
import fs from "fs";
import { supabaseDB } from "../../lib/supabase";
import { PYQ_REGISTRY, ROOT } from "../pyqs/pyqs.service";
import { analyzeAttempt } from "../analysis-engine/services/analysis.service";
import { db } from "../analysis-engine/services/db.service";
import { AttemptAnswer } from "../../../../../packages/types/src/analysis.types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Fetch paper metadata + ordered questions from either PYQ files or Supabase */
async function loadPaperQuestions(paperId: string): Promise<{ questions: any[]; examCode: string }> {
  // 1. Try local PYQ file registry
  const pyqPaperId = paperId.startsWith("pyq-") ? paperId.replace("pyq-", "") : paperId;
  const paper = PYQ_REGISTRY.find((p) => p.id === pyqPaperId);
  if (paper) {
    const filePath = path.join(ROOT, paper.fileName);
    const questions = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    return { questions, examCode: paper.exam ?? "jee-main" };
  }

  // 2. Fallback: fetch from Supabase
  const { data: paperRow } = await supabaseDB
    .from("papers")
    .select("id, exam_code:exams(code)")
    .eq("id", pyqPaperId)
    .eq("is_active", true)
    .maybeSingle();

  const examCode = (paperRow as any)?.exam_code?.code ?? "jee-main";

  // Fetch ordered question IDs
  const { data: pqs } = await supabaseDB
    .from("paper_questions")
    .select("question_id")
    .eq("paper_id", pyqPaperId)
    .order("position", { ascending: true });

  const questionIds = (pqs ?? []).map((r: any) => r.question_id);
  if (questionIds.length === 0) return { questions: [], examCode };

  const { data: rawQs } = await supabaseDB
    .from("questions")
    .select("id, question_text, question_images, options, correct_answer, explanation, explanation_images, question_type, subject, chapter, topic, difficulty, distractor_map, marking_scheme, source, year, tags")
    .in("id", questionIds)
    .eq("is_active", true);

  const byId: Record<string, any> = {};
  for (const q of rawQs ?? []) byId[q.id] = q;
  const questions = questionIds.map((qid: string) => byId[qid]).filter(Boolean);

  return { questions, examCode };
}

/** Score a single question answer */
function scoreAnswer(question: any, selectedAnswer: string | null): { isCorrect: boolean; marks: number } {
  if (!selectedAnswer) return { isCorrect: false, marks: 0 };

  const scheme = question.marking_scheme ?? { correct: 4, incorrect: -1, unattempted: 0 };
  const correctAnswersList = Array.isArray(question.correct_answer)
    ? question.correct_answer.map((v: any) => String(v).trim().toUpperCase())
    : [String(question.correct_answer).trim().toUpperCase()];

  const selected = String(selectedAnswer).trim().toUpperCase();
  const isCorrect = correctAnswersList.includes(selected);
  const marks = isCorrect ? (scheme.correct ?? 4) : (scheme.incorrect ?? -1);

  return { isCorrect, marks };
}

// ─── Handlers ─────────────────────────────────────────────────────────────────

/**
 * POST /api/v1/attempts
 * Authenticated (student) — Start a new attempt for a given paper.
 */
export const startAttempt = async (req: Request, res: Response): Promise<void> => {
  try {
    const studentId = req.user!.id;
    let { paper_id } = req.body;

    if (!paper_id) {
      res.status(400).json({ success: false, message: "paper_id is required" });
      return;
    }

    // Normalize pyq- prefix
    if (paper_id.startsWith("pyq-")) paper_id = paper_id.replace("pyq-", "");

    // Load paper to get exam_code
    const { examCode } = await loadPaperQuestions(paper_id);

    // Check for an existing in-progress attempt (prevent duplicates)
    const { data: existing } = await supabaseDB
      .from("attempts")
      .select("id, status")
      .eq("student_id", studentId)
      .eq("paper_id", paper_id)
      .eq("status", "in_progress")
      .maybeSingle();

    if (existing) {
      // Return the existing in-progress attempt so the UI can resume
      res.status(200).json({
        success: true,
        message: "Resuming existing in-progress attempt",
        data: { attempt: existing, resumed: true },
      });
      return;
    }

    // Create new attempt
    const { data: attempt, error } = await supabaseDB
      .from("attempts")
      .insert({
        student_id: studentId,
        paper_id,
        exam_code: examCode,
        status: "in_progress",
        batch_id: req.user?.institute_id ? null : null, // set if institute test
        marking_scheme: { correct: 4, incorrect: -1, unattempted: 0, partial: false },
        total_duration_sec: 10800,
      })
      .select("id, student_id, paper_id, exam_code, status, created_at")
      .single();

    if (error || !attempt) {
      res.status(500).json({ success: false, message: error?.message ?? "Failed to create attempt" });
      return;
    }

    console.log(`[startAttempt] Created attempt ${attempt.id} for student ${studentId} on paper ${paper_id}`);
    res.status(201).json({ success: true, data: { attempt } });
  } catch (err: any) {
    console.error("[startAttempt error]", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * GET /api/v1/attempts/my
 * Authenticated — List all attempts by the current user.
 * Query: page=1, limit=20, status (in_progress|submitted)
 */
export const getMyAttempts = async (req: Request, res: Response): Promise<void> => {
  try {
    const studentId = req.user!.id;
    const page = Math.max(1, Number(req.query.page ?? 1));
    const limit = Math.min(50, Math.max(1, Number(req.query.limit ?? 20)));
    const offset = (page - 1) * limit;
    const statusFilter = req.query.status as string | undefined;

    let query = supabaseDB
      .from("attempts")
      .select("id, paper_id, exam_code, status, score, max_score, submitted_at, created_at", { count: "exact" })
      .eq("student_id", studentId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (statusFilter) {
      query = query.eq("status", statusFilter);
    }

    const { data: attempts, count, error } = await query;

    if (error) {
      res.status(500).json({ success: false, message: error.message });
      return;
    }

    res.status(200).json({
      success: true,
      data: { attempts: attempts ?? [], total: count ?? 0, page, limit },
    });
  } catch (err: any) {
    console.error("[getMyAttempts error]", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * GET /api/v1/attempts/:id
 * Authenticated — Get the current state of an attempt (for resume functionality).
 */
export const getAttempt = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const studentId = req.user!.id;

    const { data: attempt, error } = await supabaseDB
      .from("attempts")
      .select("id, student_id, paper_id, exam_code, status, score, max_score, submitted_at, created_at, marking_scheme, total_duration_sec")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      res.status(500).json({ success: false, message: error.message });
      return;
    }

    if (!attempt) {
      res.status(404).json({ success: false, message: "Attempt not found" });
      return;
    }

    // Access control
    if (attempt.student_id !== studentId && req.user?.role !== "super_admin" && req.user?.role !== "teacher") {
      res.status(403).json({ success: false, message: "Access denied" });
      return;
    }

    let savedAnswers: any[] = [];
    if (attempt.status === "in_progress") {
      // Fetch saved answers for resume
      const { data: aa } = await supabaseDB
        .from("attempt_answers")
        .select("question_id, selected_answer, marked_review, time_taken_sec")
        .eq("attempt_id", id);
      savedAnswers = aa ?? [];
    }

    res.status(200).json({ success: true, data: { attempt, saved_answers: savedAnswers } });
  } catch (err: any) {
    console.error("[getAttempt error]", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * PATCH /api/v1/attempts/:id
 * Authenticated — Auto-save answers (called every 30s from the test UI).
 * Body: { answers: { [question_id]: { selected_answer, marked_review, time_taken_sec, start_timestamp } } }
 */
export const saveAttempt = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const studentId = req.user!.id;
    const { answers } = req.body;

    if (!answers || typeof answers !== "object") {
      res.status(400).json({ success: false, message: "answers object is required" });
      return;
    }

    // Verify attempt belongs to this user and is in_progress
    const { data: attempt } = await supabaseDB
      .from("attempts")
      .select("id, student_id, status")
      .eq("id", id)
      .maybeSingle();

    if (!attempt) {
      res.status(404).json({ success: false, message: "Attempt not found" });
      return;
    }
    if (attempt.student_id !== studentId) {
      res.status(403).json({ success: false, message: "Access denied" });
      return;
    }
    if (attempt.status !== "in_progress") {
      res.status(400).json({ success: false, message: "Attempt is already submitted" });
      return;
    }

    // Build upsert rows
    const rows = Object.entries(answers).map(([question_id, ans]: [string, any]) => ({
      attempt_id: id,
      question_id,
      selected_answer: ans.selected_answer ?? null,
      marked_review: ans.marked_review ?? false,
      time_taken_sec: ans.time_taken_sec ?? 0,
      start_timestamp: ans.start_timestamp ?? -1,
      is_correct: false, // will be corrected on submit
      marks_awarded: 0,
    }));

    if (rows.length > 0) {
      const { error } = await supabaseDB
        .from("attempt_answers")
        .upsert(rows, { onConflict: "attempt_id,question_id" });

      if (error) {
        console.error("[saveAttempt] upsert error:", error.message);
        res.status(500).json({ success: false, message: error.message });
        return;
      }
    }

    res.status(200).json({ success: true, message: `${rows.length} answers saved` });
  } catch (err: any) {
    console.error("[saveAttempt error]", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * POST /api/v1/attempts/:id/submit
 * Authenticated — Submit an attempt, score it, and run analysis.
 * Body: { answers: { [question_id]: { selected_answer, time_taken_sec, marked_review, start_timestamp } } }
 *
 * Also supports legacy path where :id starts with "pyq-" (standalone PYQ submission).
 */
export const submitAttempt = async (req: Request, res: Response): Promise<void> => {
  try {
    const studentId = req.user?.id ?? "anonymous";
    let { id: rawId } = req.params;
    const { answers } = req.body;

    // Normalize pyq- prefix (legacy standalone submission without startAttempt)
    const isLegacyPyq = rawId.startsWith("pyq-");
    const paperId = rawId.startsWith("pyq-") ? rawId.replace("pyq-", "") : rawId;

    // ── Determine if this is a real attempt ID or a paper ID ──────────────────
    // Real attempt IDs are UUIDs. Paper IDs are also UUIDs but stored in paper registry.
    // Check if it's an existing in_progress attempt first.
    let attemptId: string;
    let existingAttempt: any = null;

    if (!isLegacyPyq) {
      const { data: att } = await supabaseDB
        .from("attempts")
        .select("id, student_id, paper_id, exam_code, status, marking_scheme")
        .eq("id", rawId)
        .maybeSingle();

      if (att) {
        existingAttempt = att;
        attemptId = att.id;
        if (att.status === "submitted") {
          res.status(400).json({ success: false, message: "Attempt already submitted" });
          return;
        }
      }
    }

    // ── Load questions ────────────────────────────────────────────────────────
    const targetPaperId = existingAttempt ? existingAttempt.paper_id : paperId;
    const { questions, examCode } = await loadPaperQuestions(targetPaperId);

    if (!questions || questions.length === 0) {
      res.status(404).json({ success: false, message: "Test has no questions or was not found." });
      return;
    }

    // ── Create attempt row if it doesn't exist (legacy flow or first call) ────
    if (!existingAttempt) {
      const { data: newAttempt, error: insertErr } = await supabaseDB
        .from("attempts")
        .insert({
          student_id: studentId,
          paper_id: targetPaperId,
          exam_code: examCode,
          status: "in_progress",
          marking_scheme: { correct: 4, incorrect: -1, unattempted: 0, partial: false },
          total_duration_sec: 10800,
        })
        .select("id, marking_scheme")
        .single();

      if (insertErr || !newAttempt) {
        res.status(500).json({ success: false, message: insertErr?.message ?? "Failed to create attempt record" });
        return;
      }
      attemptId = newAttempt.id;
      existingAttempt = newAttempt;
    }

    // ── Score all answers ─────────────────────────────────────────────────────
    const markingScheme = existingAttempt.marking_scheme ?? { correct: 4, incorrect: -1, unattempted: 0 };
    let totalScore = 0;
    let maxScore = 0;

    const answerUpsertRows: any[] = [];
    const attemptAnswers: AttemptAnswer[] = [];

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const studentAns = answers?.[q.id] ?? {};
      const selected = studentAns.selected_answer ?? null;
      const { isCorrect, marks } = scoreAnswer(q, selected);
      const marksAwarded = selected ? marks : (markingScheme.unattempted ?? 0);

      const qCorrect = q.marking_scheme?.correct ?? markingScheme.correct ?? 4;
      maxScore += qCorrect;
      totalScore += marksAwarded;

      answerUpsertRows.push({
        attempt_id: attemptId!,
        question_id: q.id,
        selected_answer: selected,
        is_correct: isCorrect,
        marks_awarded: marksAwarded,
        time_taken_sec: studentAns.time_taken_sec ?? 0,
        start_timestamp: studentAns.start_timestamp ?? -1,
        marked_review: studentAns.marked_review ?? false,
      });

      attemptAnswers.push({
        id: `${attemptId!}-${q.id}`,
        attempt_id: attemptId!,
        question_id: q.id,
        selected_answer: selected,
        is_correct: isCorrect,
        marks_awarded: marksAwarded,
        time_taken_sec: studentAns.time_taken_sec ?? 0,
        start_timestamp: studentAns.start_timestamp ?? -1,
        marked_review: studentAns.marked_review ?? false,
        question: {
          ...q,
          question_number: i + 1,
          question_images: q.question_images ?? [],
          explanation_images: q.explanation_images ?? [],
          correct_answer: Array.isArray(q.correct_answer) ? q.correct_answer : [q.correct_answer],
          tags: q.tags ?? [],
        },
      });
    }

    // ── Upsert all scored answers ─────────────────────────────────────────────
    if (answerUpsertRows.length > 0) {
      const { error: aaErr } = await supabaseDB
        .from("attempt_answers")
        .upsert(answerUpsertRows, { onConflict: "attempt_id,question_id" });

      if (aaErr) {
        console.error("[submitAttempt] attempt_answers upsert failed:", aaErr.message);
      }
    }

    // ── Update attempt row to submitted ───────────────────────────────────────
    const { error: updateErr } = await supabaseDB
      .from("attempts")
      .update({
        status: "submitted",
        score: totalScore,
        max_score: maxScore,
        submitted_at: new Date().toISOString(),
        exam_code: examCode,
      })
      .eq("id", attemptId!);

    if (updateErr) {
      console.error("[submitAttempt] attempt update failed:", updateErr.message);
    }

    // ── Run analysis (synchronous — fast enough for immediate feedback) ────────
    let analysisResult: any = null;
    try {
      analysisResult = await analyzeAttempt(attemptId!);
      await db.upsertAnalysis(attemptId!, studentId, examCode, analysisResult);
    } catch (analysisErr: any) {
      console.error("[submitAttempt] Analysis failed (non-fatal):", analysisErr.message);
    }

    console.log(`[submitAttempt] DONE attempt=${attemptId} score=${totalScore}/${maxScore} exam=${examCode}`);

    res.status(200).json({
      success: true,
      data: {
        attempt_id: attemptId!,
        score: totalScore,
        max_score: maxScore,
        percentage: maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0,
      },
    });
  } catch (err: any) {
    console.error("[submitAttempt error]", err);
    res.status(500).json({ success: false, message: err.message });
  }
};
