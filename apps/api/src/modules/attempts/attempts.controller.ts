import { Request, Response } from "express";
import path from "path";
import fs from "fs";
import { isChoiceQuestion } from "../../lib/question-taxonomy";
import { supabaseDB } from "../../lib/supabase";
import { PYQ_REGISTRY, ROOT } from "../pyqs/pyqs.service";
import { analyzeAttempt } from "../analysis-engine/services/analysis.service";
import { db } from "../analysis-engine/services/db.service";
import { AttemptAnswer } from "../../../../../packages/types/src/analysis.types";
import { enqueueAnalysis } from "../../lib/queue/analysis.queue";
import { connection as redis } from "../../lib/queue/redis";
import { getStudentTestAccess } from "../tests/test-access.service";
import { isMaintenanceMode, MAINTENANCE_RESPONSE } from "../../lib/maintenance";
import {
  defaultMarkingScheme,
  normaliseMarkingScheme,
  scoreQuestion,
  totalMarksForQuestions,
  type MarkingScheme,
} from "../../lib/marking-scheme";

// ─── Helpers ──────────────────────────────────────────────────────────────────

type LoadedPaper = {
  questions: any[];
  examCode: string;
  /** The paper's own marks, or null when it states none. Never a substitute. */
  markingScheme: MarkingScheme | null;
  testType: string | null;
};

/** Fetch paper metadata + ordered questions from either PYQ files or Supabase */
async function loadPaperQuestions(paperId: string): Promise<LoadedPaper> {
  // 1. Try local PYQ file registry
  const pyqPaperId = paperId.startsWith("pyq-") ? paperId.replace("pyq-", "") : paperId;
  const paper = PYQ_REGISTRY.find((p) => p.id === pyqPaperId);
  if (paper) {
    const filePath = path.join(ROOT, paper.fileName);
    const questions = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    return { questions, examCode: (paper as any).exam ?? "jee-main", markingScheme: null, testType: "pyq" };
  }

  // 2. Fallback: fetch from Supabase
  const { data: paperRow } = await supabaseDB
    .from("papers")
    .select("id, test_type, marking_scheme, exam_code:exams(code)")
    .eq("id", pyqPaperId)
    .eq("is_active", true)
    .maybeSingle();

  const paperScheme = normaliseMarkingScheme((paperRow as any)?.marking_scheme);
  const paperTestType = (paperRow as any)?.test_type ?? null;

  // Fetch ordered question IDs
  const { data: pqs } = await supabaseDB
    .from("paper_questions")
    .select("question_id")
    .eq("paper_id", pyqPaperId)
    .order("position", { ascending: true });

  const questionIds = (pqs ?? []).map((r: any) => r.question_id);
  if (questionIds.length === 0) {
    return {
      questions: [],
      examCode: (paperRow as any)?.exam_code?.code ?? "jee-main",
      markingScheme: paperScheme,
      testType: paperTestType,
    };
  }

  // `marks` is the per-question override — the escape hatch for a paper whose
  // two sections share a question type but not its marks. Scoring reads it, so
  // leaving it out of this select silently discarded it.
  const { data: rawQs } = await supabaseDB
    .from("questions")
    .select("id, question_text, question_images, options, correct_answer, explanation, explanation_images, question_type, subject, chapter, topic, difficulty, source, year, tags, marks")
    .in("id", questionIds)
    .eq("is_active", true);

  const byId: Record<string, any> = {};
  for (const q of rawQs ?? []) byId[q.id] = q;
  const questions = questionIds.map((qid: string) => byId[qid]).filter(Boolean);

  // Detect exam code from question subjects — more reliable than the DB FK.
  // Biology present → NEET UG. Mathematics → JEE Main.
  // Fall back to the paper's DB exam_code only when subjects are ambiguous.
  const subjectSet = new Set(
    questions.map((q: any) => (q.subject ?? "").toLowerCase().trim()).filter(Boolean)
  );
  let examCode: string;
  if (subjectSet.has("biology") || subjectSet.has("bio")) {
    examCode = "neet-ug";
  } else if (subjectSet.has("mathematics") || subjectSet.has("maths") || subjectSet.has("math")) {
    examCode = "jee-main";
  } else {
    examCode = (paperRow as any)?.exam_code?.code ?? "jee-main";
  }

  return { questions, examCode, markingScheme: paperScheme, testType: paperTestType };
}

/**
 * The marks an attempt is scored against, decided once when it starts.
 *
 * The paper's own scheme, and nothing else, whenever it has one. Every caller
 * used to hardcode `{ correct: 4, incorrect: -1 }` instead — startAttempt wrote
 * it onto the attempt, submitAttempt scored against it, and the analysis engine
 * substituted it again — so a Test Head could set a paper's marks, watch
 * total_marks change on screen, and have students scored on +4/-1 regardless.
 * The editor priced the paper; nothing priced the answers.
 *
 * Copied onto the attempt rather than read from the paper at submit time, so
 * that re-pricing a paper can never re-score a sitting already in progress.
 *
 * The fallbacks below only reach papers that are not institute assessments:
 * publish refuses an institute paper with no scheme (see
 * transitionReviewPaper), so what is left is practice sets, boosters and PYQ
 * files. Each is logged rather than applied silently.
 */
function resolveAttemptScheme(
  paperScheme: MarkingScheme | null,
  examCode: string,
  paperId: string,
): MarkingScheme | null {
  if (paperScheme && Object.keys(paperScheme).length > 0) return paperScheme;

  const standard = defaultMarkingScheme(examCode);
  if (standard) {
    console.warn(`[attempts] Paper ${paperId} states no marking scheme; scoring on the ${examCode} standard.`);
    return standard;
  }
  console.error(
    `[attempts] Paper ${paperId} states no marking scheme and ${examCode} has no standard one. ` +
    `Scoring falls back to +4/-1, which is a guess — this paper should state its marks.`,
  );
  return null;
}

/** Score a single question answer */
function normalizeAnswerSet(answer: unknown): string[] {
  const values = Array.isArray(answer) ? answer : answer == null ? [] : [answer];
  return [...new Set(values.map((value) => String(value).trim().toUpperCase()).filter(Boolean))].sort();
}

/**
 * The correct answers as option ids.
 *
 * Two answer-key formats exist in the bank: letters ("C") for ~49,700
 * questions and 1-based option indices (2, "3") for ~740. The student always
 * submits an option id, so an index key never matches and the question is
 * marked wrong however it is answered. Indices are resolved through the
 * question's own options.
 *
 * Only for choice questions: on an integer question the answer genuinely is a
 * number, and "2" means two, not the second option.
 */
function canonicalCorrectAnswers(question: any): string[] {
  const raw = Array.isArray(question.correct_answer) ? question.correct_answer : [question.correct_answer];
  const options = Array.isArray(question.options) ? question.options : [];
  if (!isChoiceQuestion(question.question_type) || options.length === 0) {
    return normalizeAnswerSet(raw);
  }
  return normalizeAnswerSet(
    raw.map((value: unknown) => {
      const text = String(value ?? "").trim();
      if (!/^[1-9]\d*$/.test(text)) return value;
      const option = options[Number(text) - 1];
      return option?.id ?? value;
    }),
  );
}

/**
 * Score one answer against the paper's marks.
 *
 * The arithmetic lives in scoreQuestion, which reads the marks for this
 * question's own type and honours the per-question override and partial credit.
 * This wrapper is the part that is specific to a stored question: resolving an
 * index-shaped answer key to option ids, and refusing to penalise a question
 * that carries no key at all.
 *
 * It used to take a flat `{ correct, incorrect }` and default it to +4/-1,
 * which meant a paper whose single-correct and multiple-correct questions were
 * worth different marks scored both the same.
 */
function scoreAnswer(
  question: any,
  selectedAnswer: unknown,
  scheme: MarkingScheme | null,
): { isCorrect: boolean; marks: number } {
  const selectedAnswers = normalizeAnswerSet(selectedAnswer);
  const correctAnswersList = canonicalCorrectAnswers(question);

  // ~3,795 questions carry no answer key at all. Scoring them as incorrect
  // penalises a student for a gap in our data, so they are neutral instead:
  // no marks either way, as though the question were not on the paper.
  if (selectedAnswers.length > 0 && correctAnswersList.length === 0) {
    console.warn(`[scoreAnswer] Question ${question.id} has no correct_answer; scoring it neutral.`);
  }

  return scoreQuestion(question.question_type, selectedAnswers, correctAnswersList, scheme, question.marks);
}

// ─── Handlers ─────────────────────────────────────────────────────────────────

/**
 * POST /api/v1/attempts
 * Authenticated (student) — Start a new attempt for a given paper.
 */
export const startAttempt = async (req: Request, res: Response): Promise<void> => {
  try {
    const studentId = req.user!.id;
    let { paper_id, test_mode } = req.body;

    if (!paper_id) {
      res.status(400).json({ success: false, message: "paper_id is required" });
      return;
    }

    // Normalize pyq- prefix
    if (paper_id.startsWith("pyq-")) paper_id = paper_id.replace("pyq-", "");

    // Load paper to get exam_code and the marks it is scored on
    const { examCode, markingScheme } = await loadPaperQuestions(paper_id);

    const { data: paper } = await supabaseDB
      .from("papers")
      .select("id, test_type, created_by, duration_min, is_active, is_published, delivery_mode, available_from, available_until")
      .eq("id", paper_id)
      .maybeSingle();

    if (!paper) {
      res.status(404).json({ success: false, message: "Test is unavailable." });
      return;
    }

    const access = await getStudentTestAccess(studentId, paper);
    if (!access.allowed) {
      res.status(access.status).json({ success: false, message: access.message });
      return;
    }

    const requestedMode = test_mode === "practice" ? "practice" : "attempt";
    if (access.deliveryMode === "assigned_scheduled" && requestedMode === "practice") {
      res.status(400).json({
        success: false,
        message: "Institute-assigned tests must be started in timed attempt mode.",
      });
      return;
    }

    // Every prior attempt at this paper, not just the unfinished one. Only
    // in_progress used to be checked, which stopped a student holding two open
    // attempts but did nothing about starting a fresh one after submitting —
    // so an institute-assigned test could be sat over and over while its
    // window stayed open, each run overwriting nothing and producing its own
    // score and analysis.
    const { data: priorAttempts } = await supabaseDB
      .from("attempts")
      .select("id, status")
      .eq("student_id", studentId)
      .eq("paper_id", paper_id)
      .in("status", ["in_progress", "submitting", "submitted"]);

    const resumable = (priorAttempts ?? []).find((row: any) => row.status === "in_progress");
    if (resumable) {
      // Return the existing in-progress attempt so the UI can resume
      res.status(200).json({
        success: true,
        message: "Resuming existing in-progress attempt",
        data: { attempt: resumable, resumed: true },
      });
      return;
    }

    // An assigned test is graded coursework: one attempt each, and the result
    // already carries the analysis. Public practice papers, boosters and
    // topic-practice sets are deliberately unrestricted — those exist to be
    // repeated. "submitting" counts as spent too, so a second tab cannot slip
    // a new attempt in while the first is still finalising.
    const spent = (priorAttempts ?? []).find((row: any) => row.status === "submitted" || row.status === "submitting");
    if (spent && access.deliveryMode === "assigned_scheduled") {
      res.status(409).json({
        success: false,
        code: "ALREADY_ATTEMPTED",
        message: "You have already taken this test. Assigned tests can be attempted once — open your result to see the full analysis.",
        data: { attempt_id: spent.id },
      });
      return;
    }

    // Past this point the request is starting a genuinely new attempt, which is
    // exactly what maintenance is meant to stop. The resume branch above is
    // deliberately ahead of this check — the middleware lets POST /attempts
    // through precisely so a student mid-paper can still reload and continue.
    if (await isMaintenanceMode()) {
      res.status(503).json(MAINTENANCE_RESPONSE);
      return;
    }

    const resolvedBatchId = access.batchId;

    // Create new attempt
    const { data: attempt, error } = await supabaseDB
      .from("attempts")
      .insert({
        student_id: studentId,
        paper_id,
        exam_code: examCode,
        status: "in_progress",
        batch_id: resolvedBatchId,
        // The paper's own marks, frozen onto the attempt so that re-pricing the
        // paper cannot re-score a sitting already under way.
        marking_scheme: resolveAttemptScheme(markingScheme, examCode, paper_id),
        // Public papers can be started as untimed practice. Assigned tests are
        // always timed and are enforced above rather than trusted to the client.
        total_duration_sec: requestedMode === "practice"
          ? 0
          : Math.max(60, Number(paper.duration_min ?? 0) > 0 ? Number(paper.duration_min) * 60 : 180 * 60),
      })
      .select("id, student_id, paper_id, exam_code, status, created_at")
      .single();

    if (error || !attempt) {
      res.status(500).json({ success: false, message: error?.message ?? "Failed to create attempt" });
      return;
    }

    console.log(`[startAttempt] Created ${requestedMode} attempt ${attempt.id} for student ${studentId} on paper ${paper_id}`);
    res.status(201).json({ success: true, data: { attempt, mode: requestedMode } });
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
    if (req.user?.role === "teacher" && attempt.student_id !== studentId) {
      const { data: student } = await supabaseDB
        .from("users")
        .select("institute_id")
        .eq("id", attempt.student_id)
        .maybeSingle();
      if (!student || !req.user.institute_id || student.institute_id !== req.user.institute_id) {
        res.status(403).json({ success: false, message: "Access denied" });
        return;
      }
      if (attempt.status === "in_progress" || attempt.status === "submitting") {
        res.status(403).json({ success: false, message: "Live student answers are not available to staff." });
        return;
      }
    }

    let savedAnswers: any[] = [];
    if (attempt.status === "in_progress") {
      // Fetch saved answers from Redis
      const redisKey = `attempt:${id}:answers`;
      const redisAnswers = await redis.hgetall(redisKey);
      
      savedAnswers = Object.entries(redisAnswers).map(([question_id, val]) => {
        const parsed = JSON.parse(val);
        return {
          question_id,
          selected_answer: parsed.selected_answer,
          marked_review: parsed.marked_review,
          time_taken_sec: parsed.time_taken_sec,
          start_timestamp: parsed.start_timestamp
        };
      });
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
      .select("id, student_id, status, created_at, total_duration_sec, paper_id")
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
    const duration = Number(attempt.total_duration_sec ?? 0);
    if (duration > 0 && Date.now() >= new Date(attempt.created_at).getTime() + duration * 1000) {
      res.status(409).json({ success: false, message: "The test time has ended. Submit your saved answers now." });
      return;
    }
    const { data: paperQuestions } = await supabaseDB
      .from("paper_questions")
      .select("question_id")
      .eq("paper_id", attempt.paper_id);
    const allowedQuestionIds = new Set((paperQuestions ?? []).map((row: any) => row.question_id));

    // Build redis multi-set args
    const redisKey = `attempt:${id}:answers`;
    const msetArgs: string[] = [];
    for (const [qId, ans] of Object.entries(answers as Record<string, any>)) {
      if (!allowedQuestionIds.has(qId)) continue;
      msetArgs.push(qId, JSON.stringify({
        selected_answer: ans.selected_answer ?? null,
        marked_review: ans.marked_review ?? false,
        time_taken_sec: Math.max(0, Math.min(Number(ans.time_taken_sec ?? 0), duration)),
        start_timestamp: Math.max(-1, Math.min(Number(ans.start_timestamp ?? -1), duration))
      }));
    }

    if (msetArgs.length > 0) {
      // We pass the array of key-value pairs to hmset
      await redis.hmset(redisKey, ...msetArgs);
      await redis.expire(redisKey, Math.max(3600, duration + 3600));
    }

    res.status(200).json({ success: true, message: `${msetArgs.length / 2} answers saved to Redis` });
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
  let claimedAttemptId: string | null = null;
  let claimedStudentId: string | null = null;
  try {
    const studentId = req.user?.id ?? "anonymous";
    let { id: rawId } = req.params;
    let { answers: requestAnswers } = req.body;
    requestAnswers = requestAnswers || {};

    // Normalize pyq- prefix (legacy standalone submission without startAttempt)
    const isLegacyPyq = false;

    // ── Determine if this is a real attempt ID or a paper ID ──────────────────
    // Real attempt IDs are UUIDs. Paper IDs are also UUIDs but stored in paper registry.
    // Check if it's an existing in_progress attempt first.
    let attemptId: string = "";
    let existingAttempt: any = null;

    if (!isLegacyPyq) {
      const { data: att } = await supabaseDB
        .from("attempts")
        .select("id, student_id, paper_id, exam_code, status, marking_scheme, created_at, total_duration_sec")
        .eq("id", rawId)
        .maybeSingle();

      if (att) {
        if (att.student_id !== studentId) {
          res.status(403).json({ success: false, message: "Access denied. You cannot submit someone else's attempt." });
          return;
        }
        existingAttempt = att;
        attemptId = att.id;
        if (att.status === "submitted") {
          res.status(400).json({ success: false, message: "Attempt already submitted" });
          return;
        }
      }
    }

    // ── Load questions ────────────────────────────────────────────────────────
    if (!existingAttempt) {
      res.status(404).json({ success: false, message: "Attempt not found. Start the test before submitting." });
      return;
    }
    const targetPaperId = existingAttempt.paper_id;
    const { questions, examCode, markingScheme: paperScheme, testType } = await loadPaperQuestions(targetPaperId);

    if (!questions || questions.length === 0) {
      res.status(404).json({ success: false, message: "Test has no questions or was not found." });
      return;
    }

    // The "create the attempt row if it doesn't exist" branch that stood here
    // was unreachable — the 404 above returns whenever existingAttempt is null,
    // so nothing could ever fall through to it. It was also the last place still
    // writing a hardcoded +4/-1 scheme onto an attempt.

    // Claim the attempt before persisting answers. Only one concurrent submit
    // request can move in_progress -> submitting; all others fail harmlessly.
    const { data: claimRows, error: claimError } = await supabaseDB
      .from("attempts")
      .update({ status: "submitting" })
      .eq("id", attemptId)
      .eq("student_id", studentId)
      .eq("status", "in_progress")
      .select("id");
    if (claimError) {
      res.status(500).json({ success: false, message: claimError.message });
      return;
    }
    if (!claimRows?.length) {
      res.status(409).json({ success: false, message: "Attempt submission is already in progress or completed." });
      return;
    }
    claimedAttemptId = attemptId;
    claimedStudentId = studentId;

    // ── Fetch answers from Redis and merge ────────────────────────────────────
    const redisKey = `attempt:${attemptId}:answers`;
    const redisData = await redis.hgetall(redisKey);
    const finalAnswers: Record<string, any> = {};

    for (const [qId, val] of Object.entries(redisData)) {
      finalAnswers[qId] = JSON.parse(val);
    }
    // Merge any last-minute answers sent in the submit body
    const submitDuration = Number(existingAttempt.total_duration_sec ?? 0);
    const submissionIsLate = submitDuration > 0 && Date.now() >= new Date(existingAttempt.created_at).getTime() + submitDuration * 1000;
    if (!submissionIsLate) for (const [qId, ans] of Object.entries(requestAnswers)) {
      finalAnswers[qId] = { ...(finalAnswers[qId] || {}), ...(ans as object) };
    }

    // ── Score all answers ─────────────────────────────────────────────────────
    // The scheme frozen onto the attempt when it started. Falling back to the
    // paper's current scheme only covers attempts created before this became
    // the rule; there is no literal to fall back to beyond that, because a
    // number nobody chose is exactly what this replaced.
    const markingScheme = normaliseMarkingScheme(existingAttempt.marking_scheme)
      ?? resolveAttemptScheme(paperScheme, examCode, targetPaperId);
    let totalScore = 0;

    const answerUpsertRows: any[] = [];
    const attemptAnswers: AttemptAnswer[] = [];

    // What the paper is worth: the sum of what each question is worth under this
    // scheme, per question type and honouring any per-question override. It used
    // to be question-count × the scheme's single `correct` value, which is right
    // only when every question on the paper carries the same marks.
    const maxScore = totalMarksForQuestions(questions, markingScheme);

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const studentAns = finalAnswers[q.id] ?? {};
      const selected = studentAns.selected_answer ?? null;
      // scoreQuestion already returns the unattempted marks for an empty answer.
      const { isCorrect, marks: marksAwarded } = scoreAnswer(q, selected, markingScheme);

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
          question_images: Array.isArray(q.question_images) ? q.question_images : [],
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
        throw aaErr;
      }
    }

    // ── Update attempt row to submitted ───────────────────────────────────────
    const { data: updatedRows, error: updateErr } = await supabaseDB
      .from("attempts")
      .update({
        status: "submitted",
        score: totalScore,
        max_score: maxScore,
        submitted_at: new Date().toISOString(),
        exam_code: examCode,
      })
      .eq("id", attemptId!)
      .eq("status", "submitting")
      .select("id");

    if (updateErr) {
      console.error("[submitAttempt] attempt update failed:", updateErr.message);
      throw updateErr;
    }

    if (!updatedRows || updatedRows.length === 0) {
      throw new Error("Attempt submission state changed before finalisation.");
    }

    claimedAttemptId = null;
    claimedStudentId = null;

    // ── Update student_stats ──────────────────────────────────────────────────
    // Boosters and topic-practice sets are private drills a student generates
    // from their own weak areas, on demand and as often as they like. Folding
    // them in here made "Tests Taken" count practice attempts, and dragged the
    // accuracy figure the institute reports read towards whatever the student
    // had been drilling. Stats mean tests the institute set.
    const isPersonalPractice = testType === "booster" || testType === "topic-practice";
    if (isPersonalPractice) {
      console.info(`[submitAttempt] ${testType} attempt ${attemptId} excluded from student_stats.`);
    }
    try {
      let statsUpdated = isPersonalPractice;
      let retries = 0;
      const MAX_RETRIES = 5;

      while (!statsUpdated && retries < MAX_RETRIES) {
        retries++;
        const { data: currentStats } = await supabaseDB
          .from("student_stats")
          .select("total_tests, total_score, total_max_score")
          .eq("student_id", studentId)
          .maybeSingle();

        const newTotalTests = (currentStats?.total_tests ?? 0) + 1;
        const newTotalScore = (currentStats?.total_score ?? 0) + totalScore;
        const newTotalMax = (currentStats?.total_max_score ?? 0) + maxScore;
        // accuracy_pct and total_tests are read by the institute reports.
        // rank_score used to be computed here too — a lifetime "score × accuracy"
        // figure that ordered a platform-wide merit list. That list is gone, so
        // the column is no longer written; see rankings.routes.ts.
        const newAccuracy = newTotalMax > 0 ? Math.round((newTotalScore / newTotalMax) * 100) : 0;

        if (currentStats) {
          const { data: updatedRows } = await supabaseDB
            .from("student_stats")
            .update({
              total_tests: newTotalTests,
              total_score: newTotalScore,
              total_max_score: newTotalMax,
              accuracy_pct: newAccuracy,
              last_test_date: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq("student_id", studentId)
            .eq("total_tests", currentStats.total_tests ?? 0) // Optimistic check
            .select();

          if (updatedRows && updatedRows.length > 0) {
            statsUpdated = true;
          } else {
            await new Promise(r => setTimeout(r, 50 * retries));
          }
        } else {
          const { error: insertErr } = await supabaseDB
            .from("student_stats")
            .insert({
              student_id: studentId,
              exam_code: examCode,
              total_tests: 1,
              total_score: totalScore,
              total_max_score: maxScore,
              accuracy_pct: newAccuracy,
              last_test_date: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });

          if (!insertErr) {
            statsUpdated = true;
          } else {
            if (insertErr.code === "23505") {
              await new Promise(r => setTimeout(r, 50 * retries));
            } else {
              throw insertErr;
            }
          }
        }
      }
      if (!statsUpdated) {
        console.warn(`[submitAttempt] Failed to update student stats after ${MAX_RETRIES} retries for student ${studentId}.`);
      }
    } catch (statsErr: any) {
      console.error("[submitAttempt] student_stats update failed (non-fatal):", statsErr.message);
    }

    // ── Enqueue analysis job (asynchronous) ──────────────────────────────────
    try {
      await enqueueAnalysis(attemptId!, studentId, examCode);
      console.log(`[submitAttempt] Queued analysis for attempt=${attemptId}`);
    } catch (queueErr: any) {
      console.error("[submitAttempt] Failed to queue analysis:", queueErr.message);
    }

    res.status(200).json({
      success: true,
      data: {
        attempt_id: attemptId!,
        score: totalScore,
        max_score: maxScore,
        percentage: maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0,
        status: "processing",
        message: "Thank you for the test, the result will be displayed soon.",
      },
    });
  } catch (err: any) {
    // Make a failed finalisation retryable, while never reopening an attempt
    // already completed by the winning submission.
    if (claimedAttemptId && claimedStudentId) {
      await supabaseDB
        .from("attempts")
        .update({ status: "in_progress" })
        .eq("id", claimedAttemptId)
        .eq("student_id", claimedStudentId)
        .eq("status", "submitting");
    }
    console.error("[submitAttempt error]", err);
    res.status(500).json({ success: false, message: err.message });
  }
};
