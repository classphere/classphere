import { Request, Response } from "express";
import { supabaseAdmin } from "../../lib/supabase";
import { completeTopicReview, getDueTopics, TopicReviewRow } from "./topic-review.service";

/** Topics per daily set. Small enough to finish in one sitting. */
const DEFAULT_TOPIC_LIMIT = 5;
/** Questions drawn per topic. */
const QUESTIONS_PER_TOPIC = 4;

const QUESTION_FIELDS = "id, question_text, image_url, options, question_type, subject, chapter, topic, difficulty, content_blocks";

async function resolveExamCode(studentId: string): Promise<string> {
  const { data } = await supabaseAdmin.from("users").select("exam_target").eq("id", studentId).maybeSingle();
  return data?.exam_target ?? "jee-main";
}

/**
 * GET /api/v1/revision/daily
 *
 * The day's revision set: topics whose spacing interval has elapsed, each with
 * fresh questions the student has not answered before.
 *
 * Questions are drawn anew every time rather than replaying the originals — the
 * point is to re-test the method, not to check whether they memorised an answer.
 */
export const getDailyRevision = async (req: Request, res: Response): Promise<void> => {
  try {
    const studentId = req.user!.id;
    const limit = Math.min(10, Math.max(1, Number(req.query.limit ?? DEFAULT_TOPIC_LIMIT)));
    const examCode = await resolveExamCode(studentId);

    const due = await getDueTopics(studentId, examCode, limit);
    if (!due.length) {
      const { data: next } = await supabaseAdmin
        .from("student_topic_reviews")
        .select("due_at")
        .eq("student_id", studentId)
        .eq("exam_code", examCode)
        .order("due_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      res.status(200).json({
        success: true,
        data: { topics: [], nextDueAt: next?.due_at ?? null, examCode },
      });
      return;
    }

    const topics = await Promise.all(
      due.map(async (review: TopicReviewRow) => {
        // Prefer an exact topic match, widening to the chapter when the topic
        // is exhausted — a student should never get an empty revision card.
        let questions = await fetchQuestions(review, true);
        if (questions.length < QUESTIONS_PER_TOPIC * 2) {
          const extra = await fetchQuestions(review, false);
          const have = new Set(questions.map((q: any) => q.id));
          questions = [...questions, ...extra.filter((q: any) => !have.has(q.id))];
        }
        // Filter out already-answered questions by asking only about THESE
        // candidates. Fetching the student's whole answer history instead was
        // both unbounded and silently truncated at PostgREST's 1000-row cap,
        // so revision quietly began repeating questions.
        questions = await excludeSeen(studentId, questions);
        const overdueDays = Math.max(
          0,
          Math.floor((Date.now() - new Date(review.due_at).getTime()) / 86400000),
        );
        return {
          reviewId: review.id,
          subject: review.subject,
          chapter: review.chapter,
          topic: review.topic,
          lastAccuracy: review.last_accuracy,
          lastReviewedAt: review.last_reviewed_at,
          intervalDays: review.interval_days,
          lapses: review.lapses,
          overdueDays,
          questions: questions.slice(0, QUESTIONS_PER_TOPIC),
        };
      }),
    );

    res.status(200).json({
      success: true,
      data: { topics: topics.filter((t) => t.questions.length > 0), examCode },
    });
  } catch (err: any) {
    console.error("[getDailyRevision error]", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Drop questions this student has already answered.
 *
 * Scoped to the candidate ids rather than the student's full history, so the
 * query size is bounded by what we're about to show (tens of rows) instead of
 * by how long they've been preparing (tens of thousands).
 */
async function excludeSeen<T extends { id: string }>(studentId: string, candidates: T[]): Promise<T[]> {
  if (!candidates.length) return candidates;
  const { data, error } = await supabaseAdmin
    .from("attempt_answers")
    .select("question_id, attempts!inner(student_id)")
    .eq("attempts.student_id", studentId)
    .in("question_id", candidates.map((q) => q.id));
  if (error) {
    console.error("[daily-revision] seen lookup failed:", error.message);
    return candidates; // showing a repeat beats showing nothing
  }
  const seen = new Set((data ?? []).map((row: any) => row.question_id));
  return candidates.filter((q) => !seen.has(q.id));
}

async function fetchQuestions(review: TopicReviewRow, exactTopic: boolean) {
  let query = supabaseAdmin
    .from("questions")
    .select(QUESTION_FIELDS)
    .eq("is_active", true)
    .eq("chapter", review.chapter)
    .limit(QUESTIONS_PER_TOPIC * 6);
  if (exactTopic && review.topic) query = query.eq("topic", review.topic);

  const { data } = await query;
  return (data ?? []) as Array<{ id: string } & Record<string, unknown>>;
}

/**
 * POST /api/v1/revision/daily/:reviewId/submit
 * Body: { answers: { [questionId]: string | string[] } }
 *
 * Grades the submitted answers server-side and advances the topic's schedule.
 * Accuracy is never taken from the client — the interval is the product, so a
 * client-supplied score would let a student trivially bury a weak topic.
 */
export const submitDailyRevision = async (req: Request, res: Response): Promise<void> => {
  try {
    const studentId = req.user!.id;
    const { reviewId } = req.params;
    const answers = req.body?.answers;

    if (!answers || typeof answers !== "object" || Array.isArray(answers)) {
      res.status(400).json({ success: false, message: "answers object is required" });
      return;
    }
    const questionIds = Object.keys(answers);
    if (!questionIds.length) {
      res.status(400).json({ success: false, message: "Answer at least one question before submitting" });
      return;
    }

    const { data: questions, error } = await supabaseAdmin
      .from("questions")
      .select("id, correct_answer, explanation")
      .in("id", questionIds)
      .eq("is_active", true);
    if (error) throw error;
    if (!questions?.length) {
      res.status(400).json({ success: false, message: "No valid questions in this submission" });
      return;
    }

    const normalise = (value: unknown) =>
      (Array.isArray(value) ? value : value == null ? [] : [value])
        .map((item) => String(item).trim().toUpperCase())
        .filter(Boolean)
        .sort();

    const results = questions.map((question: any) => {
      const selected = normalise(answers[question.id]);
      const correct = normalise(question.correct_answer);
      const isCorrect =
        selected.length > 0 &&
        selected.length === correct.length &&
        selected.every((value, index) => value === correct[index]);
      return {
        question_id: question.id,
        is_correct: isCorrect,
        correct_answer: correct,
        explanation: question.explanation ?? "",
      };
    });

    const correctCount = results.filter((r) => r.is_correct).length;
    const accuracyPct = Math.round((correctCount / results.length) * 100);

    const next = await completeTopicReview(studentId, reviewId, accuracyPct);
    if (!next) {
      res.status(404).json({ success: false, message: "Revision topic not found" });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        correctCount,
        totalQuestions: results.length,
        accuracyPct,
        passed: next.passed,
        nextReviewInDays: next.intervalDays,
        nextDueAt: next.dueAt,
        results,
      },
    });
  } catch (err: any) {
    console.error("[submitDailyRevision error]", err);
    res.status(500).json({ success: false, message: err.message });
  }
};
