import { supabaseDB } from "./supabase";

/**
 * Observed behaviour per question, and the rules for when to trust it.
 *
 * Two things the system otherwise guesses come from here: how hard a question
 * really is, and which wrong option is the trap. Both are read off attempts
 * rather than tagged by anyone — see migration 49.
 */

export interface QuestionStats {
  question_id: string;
  sample_size: number;
  correct_count: number;
  option_counts: Record<string, number>;
  p_value: number | null;
  top_distractor: string | null;
  top_distractor_share: number | null;
}

/**
 * Answers needed before a distribution says anything.
 *
 * Below this the numbers are noise: two students both picking B is not
 * evidence that B is a trap. Thirty is roughly where a four-option split
 * stabilises, and is reached by one batch sitting one paper rather than by
 * platform-wide volume.
 */
export const MIN_SAMPLE_FOR_STATS = 30;

/**
 * Share of wrong answers a distractor must take to count as one.
 *
 * With four options there are three wrong ones, so chance alone puts about a
 * third on each. Half is comfortably above that without demanding a landslide.
 */
export const DISTRACTOR_SHARE_THRESHOLD = 0.5;

/** p-value bands. Low p means few got it right, so the question is hard. */
const HARD_BELOW = 0.35;
const EASY_ABOVE = 0.7;

export type Difficulty = "easy" | "medium" | "hard";

/** Observed difficulty, or null when too few have answered to say. */
export function observedDifficulty(stats: QuestionStats | null | undefined): Difficulty | null {
  if (!stats || stats.sample_size < MIN_SAMPLE_FOR_STATS || stats.p_value === null) return null;
  if (stats.p_value < HARD_BELOW) return "hard";
  if (stats.p_value > EASY_ABOVE) return "easy";
  return "medium";
}

export interface DistractorVerdict {
  /** The chosen option is the one most students who got this wrong also chose. */
  isCommonTrap: boolean;
  /** Share of wrong answers that went to the option the student chose. */
  share: number;
  /** Wording for the student, or null when there is not enough data to say anything. */
  note: string | null;
}

/**
 * What choosing this particular wrong option means.
 *
 * The distinction that matters is not "wrong" but *which* wrong: falling for
 * the option most students fall for is a different mistake from an answer
 * almost nobody else gave, and they call for different advice. That much is
 * pure data — the hand-written explanation of *why* an option traps people is
 * what the never-built distractor_map was for, and is not needed for this.
 */
export function classifyDistractor(
  stats: QuestionStats | null | undefined,
  chosen: string | null | undefined,
): DistractorVerdict {
  const empty: DistractorVerdict = { isCommonTrap: false, share: 0, note: null };
  if (!stats || !chosen || stats.sample_size < MIN_SAMPLE_FOR_STATS) return empty;

  const choice = String(chosen).trim().toUpperCase();
  const wrongTotal = stats.sample_size - stats.correct_count;
  if (wrongTotal <= 0) return empty;

  const chosenCount = stats.option_counts?.[choice] ?? 0;
  if (chosenCount === 0) return empty;

  const share = chosenCount / wrongTotal;
  const percent = Math.round(share * 100);

  if (stats.top_distractor === choice && share >= DISTRACTOR_SHARE_THRESHOLD) {
    return {
      isCommonTrap: true,
      share,
      note: `${percent}% of students who got this wrong also chose ${choice}. ` +
        `This is the standard trap on this question — worth understanding why it is tempting.`,
    };
  }

  // Deliberately says "unusual", not "careless". An answer nobody else gave
  // may be a slip or a misconception of its own; the data distinguishes rare
  // from common, and claims nothing beyond that.
  if (share <= 0.15) {
    return {
      isCommonTrap: false,
      share,
      note: `Only ${percent}% of students who got this wrong chose ${choice}. ` +
        `Most went elsewhere, so this looks like your own slip rather than the usual trap.`,
    };
  }

  return { isCommonTrap: false, share, note: null };
}

/** Stats for a set of questions, keyed by id. Absent ids simply have no data yet. */
export async function getQuestionStats(questionIds: string[]): Promise<Record<string, QuestionStats>> {
  if (questionIds.length === 0) return {};
  const out: Record<string, QuestionStats> = {};

  // Paged: a full paper is 180 questions, but a bank-wide caller could exceed
  // PostgREST's 1000-row ceiling and silently receive a truncated map.
  for (let from = 0; from < questionIds.length; from += 500) {
    const slice = questionIds.slice(from, from + 500);
    const { data, error } = await supabaseDB
      .from("question_answer_stats")
      .select("question_id, sample_size, correct_count, option_counts, p_value, top_distractor, top_distractor_share")
      .in("question_id", slice);
    if (error) {
      console.error("[question-stats] lookup failed:", error.message);
      return out;
    }
    for (const row of data ?? []) out[(row as any).question_id] = row as QuestionStats;
  }
  return out;
}

/**
 * Recompute the rollup. Passing ids limits it to those questions, which is what
 * an attempt-level refresh wants; omitting them rebuilds everything.
 */
export async function refreshQuestionStats(questionIds?: string[]): Promise<number> {
  const { data, error } = await supabaseDB.rpc("refresh_question_answer_stats", {
    p_question_ids: questionIds && questionIds.length > 0 ? questionIds : null,
  });
  if (error) {
    console.error("[question-stats] refresh failed:", error.message);
    return 0;
  }
  return Number(data ?? 0);
}

/**
 * Questions whose stored difficulty disagrees with what students demonstrate.
 *
 * A label reading "easy" on a question a fifth of students answer correctly is
 * not a small inaccuracy: difficulty drives the error-pattern rules, the
 * expected-time table, and which questions a study plan puts in front of a
 * student.
 */
export async function findMislabelledDifficulty(limit = 50): Promise<Array<{
  question_id: string;
  labelled: string;
  observed: Difficulty;
  p_value: number;
  sample_size: number;
}>> {
  const { data, error } = await supabaseDB
    .from("question_answer_stats")
    .select("question_id, sample_size, correct_count, option_counts, p_value, top_distractor, top_distractor_share, questions!inner(difficulty)")
    .gte("sample_size", MIN_SAMPLE_FOR_STATS)
    .order("sample_size", { ascending: false })
    .limit(limit * 4);

  if (error) {
    console.error("[question-stats] mislabel scan failed:", error.message);
    return [];
  }

  const out = [];
  for (const row of (data ?? []) as any[]) {
    const observed = observedDifficulty(row);
    const labelled = Array.isArray(row.questions) ? row.questions[0]?.difficulty : row.questions?.difficulty;
    if (observed && labelled && observed !== labelled) {
      out.push({
        question_id: row.question_id,
        labelled,
        observed,
        p_value: Number(row.p_value),
        sample_size: row.sample_size,
      });
    }
    if (out.length >= limit) break;
  }
  return out;
}
