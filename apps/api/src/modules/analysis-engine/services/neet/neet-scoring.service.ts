import { AttemptAnswer, ScoringResult } from "../../../../../../../packages/types/src/analysis.types";
import { marksFor, type MarkingScheme } from "../../../../lib/marking-scheme";

/**
 * NEET UG Scoring Engine
 *
 * NEET-specific rules (differs from JEE):
 * - Pure MCQ only — NO integer-type questions
 * - Biology is treated as ONE subject with internal Botany/Zoology breakdown
 * - No Section B, no "5 integer question" cap
 *
 * The marks come from the paper, not from this file. NEET convention is +4/-1
 * over 720, and that is still what almost every NEET paper here says — but an
 * institute running a 40-question practice paper at +2/-0 is entitled to have
 * it scored that way, and the flat scheme this used to take could not carry it.
 */
export function scoreAttempt(
  rawAnswers: AttemptAnswer[],
  scheme: MarkingScheme | null | undefined
): ScoringResult {
  // Deep copy answer objects so we don't mutate input data (ENGINE-2)
  const answers = rawAnswers.map(a => ({
    ...a,
    question: { ...a.question }
  }));

  /** This question's marks: its type's entry, or its own override. */
  const marksOf = (ans: AttemptAnswer) => marksFor(scheme, ans.question.question_type, ans.question.marks);

  let score = 0;
  let correct = 0;
  let incorrect = 0;
  let skipped = 0;

  const subjectBreakdown: Record<
    string,
    { score: number; maxScore: number; correct: number; incorrect: number; skipped: number }
  > = {};

  for (const ans of answers) {
    const subj = ans.question.subject;
    if (!subjectBreakdown[subj]) {
      subjectBreakdown[subj] = { score: 0, maxScore: 0, correct: 0, incorrect: 0, skipped: 0 };
    }
    const s = subjectBreakdown[subj];

    const marking = marksOf(ans);
    // Enforce negative sign for incorrect penalty (H13)
    const incorrectPenalty = -Math.abs(marking.incorrect);

    // NEET has NO integer questions — all MCQ, all or nothing
    if (!ans.selected_answer) {
      score += marking.unattempted;
      s.score += marking.unattempted;
      skipped++;
      s.skipped++;
    } else if (ans.is_correct) {
      score += marking.correct;
      s.score += marking.correct;
      correct++;
      s.correct++;
    } else {
      score += incorrectPenalty;
      s.score += incorrectPenalty;
      incorrect++;
      s.incorrect++;
    }

    // Every question counts — pure MCQ, no integer cap needed. Summed per
    // question rather than count × one figure, so a paper mixing marks totals
    // correctly.
    s.maxScore += marking.correct;
  }

  const maxScore = Object.values(subjectBreakdown).reduce((sum, s) => sum + s.maxScore, 0);

  return {
    score,
    maxScore,
    percentage: maxScore > 0 ? (score / maxScore) * 100 : 0,
    correctCount: correct,
    incorrectCount: incorrect,
    skippedCount: skipped,
    subjectBreakdown,
    answers,
  };
}
