import { supabaseAdmin } from "../../lib/supabase";
import { TopicStat } from "../../../../../packages/types/src/analysis.types";
import {
  ReviewState,
  initialState,
  scheduleNextReview,
  seedFromAttempt,
} from "./spaced-repetition";

export interface TopicReviewRow {
  id: string;
  exam_code: string;
  subject: string;
  chapter: string;
  topic: string;
  interval_days: number;
  ease: number;
  repetitions: number;
  lapses: number;
  last_accuracy: number | null;
  last_reviewed_at: string | null;
  due_at: string;
}

/** A topic answered too few times to say anything about — skip rather than mis-schedule. */
const MIN_ATTEMPTED_TO_SCHEDULE = 2;

const toState = (row: Pick<TopicReviewRow, "interval_days" | "ease" | "repetitions" | "lapses">): ReviewState => ({
  intervalDays: row.interval_days,
  ease: row.ease,
  repetitions: row.repetitions,
  lapses: row.lapses,
});

/**
 * Fold a finished attempt into the student's revision schedule.
 *
 * A topic seen for the first time is seeded from the accuracy just observed; a
 * topic already scheduled is advanced as though this attempt were its review,
 * so sitting a test counts as revision rather than duplicating it.
 *
 * Best-effort by design: this runs after the analysis is already saved, and a
 * scheduling failure must never invalidate a student's result.
 */
export async function recordAttemptForRevision(
  studentId: string,
  examCode: string,
  topicStats: TopicStat[],
  now: Date = new Date(),
): Promise<{ seeded: number; advanced: number }> {
  const relevant = topicStats.filter(
    (stat) => stat.attempted >= MIN_ATTEMPTED_TO_SCHEDULE && (stat.chapter || stat.topic),
  );
  if (!relevant.length) return { seeded: 0, advanced: 0 };

  const { data: existingRows, error } = await supabaseAdmin
    .from("student_topic_reviews")
    .select("id, exam_code, subject, chapter, topic, interval_days, ease, repetitions, lapses, last_accuracy, last_reviewed_at, due_at")
    .eq("student_id", studentId)
    .eq("exam_code", examCode);

  if (error) {
    console.error("[topic-review] could not read existing reviews:", error.message);
    return { seeded: 0, advanced: 0 };
  }

  const existing = new Map<string, TopicReviewRow>();
  for (const row of (existingRows ?? []) as TopicReviewRow[]) {
    existing.set(`${row.chapter}::${row.topic}`, row);
  }

  const rows: Record<string, unknown>[] = [];
  let seeded = 0;
  let advanced = 0;

  for (const stat of relevant) {
    const key = `${stat.chapter}::${stat.topic}`;
    const prior = existing.get(key);
    const next = prior
      ? scheduleNextReview(toState(prior), stat.accuracy, now)
      : seedFromAttempt(stat.accuracy, now);
    prior ? advanced++ : seeded++;

    rows.push({
      student_id: studentId,
      exam_code: examCode,
      subject: stat.subject ?? "",
      chapter: stat.chapter ?? "",
      topic: stat.topic ?? "",
      interval_days: next.intervalDays,
      ease: next.ease,
      repetitions: next.repetitions,
      lapses: next.lapses,
      last_accuracy: Math.round(Math.max(0, Math.min(100, stat.accuracy))),
      last_reviewed_at: now.toISOString(),
      due_at: next.dueAt.toISOString(),
      updated_at: now.toISOString(),
    });
  }

  const { error: upsertError } = await supabaseAdmin
    .from("student_topic_reviews")
    .upsert(rows, { onConflict: "student_id,exam_code,chapter,topic" });

  if (upsertError) {
    console.error("[topic-review] upsert failed:", upsertError.message);
    return { seeded: 0, advanced: 0 };
  }

  return { seeded, advanced };
}

/**
 * Topics due for revision now, most overdue first.
 *
 * Ordering by due_at rather than by weakness is deliberate: the point of
 * spacing is to catch a topic as it is about to fade, and a topic that slipped
 * past its date is the one closest to being forgotten.
 */
export async function getDueTopics(
  studentId: string,
  examCode: string,
  limit: number,
  now: Date = new Date(),
): Promise<TopicReviewRow[]> {
  const { data, error } = await supabaseAdmin
    .from("student_topic_reviews")
    .select("id, exam_code, subject, chapter, topic, interval_days, ease, repetitions, lapses, last_accuracy, last_reviewed_at, due_at")
    .eq("student_id", studentId)
    .eq("exam_code", examCode)
    .lte("due_at", now.toISOString())
    .order("due_at", { ascending: true })
    .limit(limit);

  if (error) {
    console.error("[topic-review] due query failed:", error.message);
    return [];
  }
  return (data ?? []) as TopicReviewRow[];
}

/**
 * Advance one topic after the student completes its daily revision questions.
 * Returns the updated row so the caller can tell the student when it returns.
 */
export async function completeTopicReview(
  studentId: string,
  reviewId: string,
  accuracyPct: number,
  now: Date = new Date(),
): Promise<{ intervalDays: number; dueAt: string; passed: boolean } | null> {
  const { data: row, error } = await supabaseAdmin
    .from("student_topic_reviews")
    .select("id, interval_days, ease, repetitions, lapses")
    .eq("id", reviewId)
    .eq("student_id", studentId) // never let one student advance another's schedule
    .maybeSingle();

  if (error || !row) {
    if (error) console.error("[topic-review] load for completion failed:", error.message);
    return null;
  }

  const next = scheduleNextReview(toState(row as any), accuracyPct, now);
  const { error: updateError } = await supabaseAdmin
    .from("student_topic_reviews")
    .update({
      interval_days: next.intervalDays,
      ease: next.ease,
      repetitions: next.repetitions,
      lapses: next.lapses,
      last_accuracy: Math.round(Math.max(0, Math.min(100, accuracyPct))),
      last_reviewed_at: now.toISOString(),
      due_at: next.dueAt.toISOString(),
      updated_at: now.toISOString(),
    })
    .eq("id", reviewId)
    .eq("student_id", studentId);

  if (updateError) {
    console.error("[topic-review] update failed:", updateError.message);
    return null;
  }

  return { intervalDays: next.intervalDays, dueAt: next.dueAt.toISOString(), passed: next.passed };
}
