import { Request, Response } from "express";

/**
 * POST /api/v1/attempts
 * Authenticated (student) — Start a new attempt for a given test.
 */
export const startAttempt = async (req: Request, res: Response): Promise<void> => {
  try {
    // TODO: implement
    // 1. Validate req.body: { test_id: string }
    // 2. Fetch test by test_id; verify it exists
    // 3. If is_institute_test:
    //    a. Verify student is enrolled in one of the test's batches
    //    b. Verify scheduled_start <= now() <= scheduled_end (within window)
    //    c. Verify no existing in_progress/submitted attempt for this test by this student
    // 4. If not institute test: allow multiple attempts (practice mode)
    // 5. INSERT INTO attempts (student_id, test_id, exam_id, max_score, status='in_progress') RETURNING *
    // 6. Return { success: true, data: { attempt: { id, test_id, status, created_at } } } with 201
    res.status(201).json({ success: true, message: "startAttempt — TODO: implement" });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * GET /api/v1/attempts/my
 * Authenticated — List all attempts by the current user.
 */
export const getMyAttempts = async (req: Request, res: Response): Promise<void> => {
  try {
    // TODO: implement
    // 1. Parse query: page=1, limit=20, exam (exam code filter), status filter
    // 2. SELECT a.*, t.title, t.type, t.exam_id, e.code AS exam_code
    //      FROM attempts a
    //      JOIN tests t ON t.id = a.test_id
    //      JOIN exams e ON e.id = a.exam_id
    //    WHERE a.student_id = req.user!.id
    //    ORDER BY a.created_at DESC LIMIT $limit OFFSET offset
    // 3. Return { success: true, data: { attempts, total, page, limit } }
    res.status(200).json({ success: true, message: "getMyAttempts — TODO: implement" });
  } catch (err: any) {
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
    // TODO: implement
    // 1. SELECT * FROM attempts WHERE id = $id
    // 2. If not found: 404
    // 3. Verify attempt.student_id === req.user!.id (or super_admin)
    // 4. If in_progress: fetch saved answers from attempt_answers for resuming
    //    SELECT question_id, selected_answer, marked_review FROM attempt_answers WHERE attempt_id = $id
    // 5. Return { success: true, data: { attempt, saved_answers } }
    res.status(200).json({ success: true, message: "getAttempt — TODO: implement", id });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * PATCH /api/v1/attempts/:id
 * Authenticated — Auto-save answers (called every 30 seconds from the test UI).
 */
export const saveAttempt = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    // TODO: implement
    // 1. Validate req.body: { answers: Array<{ question_id, selected_answer, marked_review, time_taken_sec }> }
    // 2. Verify attempt exists, belongs to req.user!.id, and status = 'in_progress'
    // 3. For each answer: UPSERT into attempt_answers
    //    ON CONFLICT (attempt_id, question_id) DO UPDATE SET selected_answer, marked_review, time_taken_sec
    // 4. Return { success: true, message: "Answers saved" }
    // Note: this path is performance-sensitive — keep DB round-trips minimal
    res.status(200).json({ success: true, message: "saveAttempt — TODO: implement", id });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * POST /api/v1/attempts/:id/submit
 * Authenticated — Submit an attempt, trigger scoring, and enqueue AI analysis.
 */
import fs from "fs";
import path from "path";
import { PYQ_REGISTRY, ROOT } from "../pyqs/pyqs.service";
import { analyzeAttempt } from "../analysis-engine/services/analysis.service";
import { globalDbStore } from "../analysis-engine/services/db.mock";
import { AttemptAnswer, Question } from "../../../../../packages/types/src/analysis.types";

export const submitAttempt = async (req: Request, res: Response): Promise<void> => {
  try {
    let { id: test_id } = req.params;
    const { answers } = req.body; // { question_id: { selected_answer: string, time_taken_sec: number, marked_review: boolean } }

    if (test_id.startsWith("pyq-")) {
      test_id = test_id.replace("pyq-", "");
    }

    // 1. Try fetching from PYQ_REGISTRY first
    let questions: any[] = [];
    let examCode = "jee-main"; // Default

    const paper = PYQ_REGISTRY.find((p) => p.id === test_id);
    if (paper) {
      const filePath = path.join(ROOT, paper.fileName);
      const raw = fs.readFileSync(filePath, "utf-8");
      questions = JSON.parse(raw);
    } else {
      // 2. Fallback to Supabase Database
      const SUPABASE_URL = process.env.SUPABASE_URL!;
      const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY!;

      const reqHeaders = {
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`
      };

      const pRes = await fetch(`${SUPABASE_URL}/rest/v1/papers?id=eq.${test_id}&is_active=eq.true&select=exams(code)`, {
        headers: reqHeaders
      });
      
      if (!pRes.ok) {
        res.status(404).json({ success: false, message: "Test not found in PYQ registry or DB (Invalid ID)." });
        return;
      }

      const pData = await pRes.json();
      if (!pData || pData.length === 0) {
        res.status(404).json({ success: false, message: "Test not found in PYQ registry or DB." });
        return;
      }
      examCode = pData[0]?.exams?.code || "jee-main";

      const pqRes = await fetch(`${SUPABASE_URL}/rest/v1/paper_questions?paper_id=eq.${test_id}&order=position.asc&select=question_id`, {
        headers: reqHeaders
      });
      const pqs = await pqRes.json();
      const questionIds = pqs.map((r: any) => r.question_id);

      if (questionIds.length > 0) {
        const ids = questionIds.join(",");
        const qRes = await fetch(`${SUPABASE_URL}/rest/v1/questions?id=in.(${ids})&is_active=eq.true&select=*`, {
          headers: reqHeaders
        });
        const rawQs = await qRes.json();
        const byId: Record<string, any> = {};
        for (const q of rawQs) byId[q.id] = q;
        questions = questionIds.map((qid: string) => byId[qid]).filter(Boolean);
      }
    }

    if (!questions || questions.length === 0) {
      res.status(404).json({ success: false, message: "Test has no questions or was not found." });
      return;
    }

    // Mock: Create AttemptAnswer objects
    const attemptAnswers: AttemptAnswer[] = [];
    const attemptId = `attempt-${Date.now()}`;

    for (const q of questions) {
      const studentAns = answers?.[q.id];
      const selected = studentAns?.selected_answer || null;
      let isCorrect = false;

      if (selected) {
        const correctAnswersList = Array.isArray(q.correct_answer)
          ? q.correct_answer.map((val: any) => String(val).trim().toUpperCase())
          : [String(q.correct_answer).trim().toUpperCase()];
        
        const selectedNormalized = String(selected).trim().toUpperCase();
        isCorrect = correctAnswersList.includes(selectedNormalized);
      }

      attemptAnswers.push({
        id: `ans-${q.id}`,
        attempt_id: attemptId,
        question_id: q.id,
        selected_answer: selected,
        is_correct: isCorrect,
        marks_awarded: isCorrect ? 4 : (selected ? -1 : 0),
        time_taken_sec: studentAns?.time_taken_sec || 0,
        start_timestamp: studentAns?.start_timestamp ?? -1,
        marked_review: studentAns?.marked_review || false,
        question: q,
      });

    }

    // Mock: Store attempt in global db so orchestrator can fetch it
    globalDbStore.attempts.set(attemptId, {
      attempt: {
        id: attemptId,
        student_id: "demo-student",
        exam_id: examCode,
        batch_id: "demo-batch",
        marking_scheme: { correct: 4, incorrect: -1, unattempted: 0, partial: false },
      },
      answers: attemptAnswers,
    });

    // Run Orchestrator synchronously (since it's fast and we want immediate feedback for demo)
    const analysisResult = await analyzeAttempt(attemptId);
    globalDbStore.analysisResults.set(attemptId, analysisResult);

    res.status(200).json({ success: true, data: { attempt_id: attemptId } });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};
