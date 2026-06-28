import { AttemptAnswer, ScoringResult } from "../../../../../../../packages/types/src/analysis.types";

/**
 * NEET UG Scoring Engine
 *
 * NEET-specific rules (differs from JEE):
 * - Pure MCQ only — NO integer-type questions
 * - Total marks: 720 (Physics: 180, Chemistry: 180, Biology: 360)
 * - Marking: +4 correct, -1 wrong, 0 unattempted
 * - Biology is treated as ONE subject with internal Botany/Zoology breakdown
 * - No Section B, no "5 integer question" cap
 */
export function scoreAttempt(
  answers: AttemptAnswer[],
  scheme: { correct: number; incorrect: number; unattempted: number }
): ScoringResult {
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

    // NEET has NO integer questions — all MCQ, all or nothing
    if (!ans.selected_answer) {
      score += scheme.unattempted;
      s.score += scheme.unattempted;
      skipped++;
      s.skipped++;
    } else if (ans.is_correct) {
      score += scheme.correct;
      s.score += scheme.correct;
      correct++;
      s.correct++;
    } else {
      score += scheme.incorrect;
      s.score += scheme.incorrect;
      incorrect++;
      s.incorrect++;
    }
  }

  // NEET maxScore: every question counts — pure MCQ, no integer cap needed
  for (const subj of Object.keys(subjectBreakdown)) {
    const totalQs = answers.filter(a => a.question.subject === subj).length;
    subjectBreakdown[subj].maxScore = totalQs * scheme.correct;
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
  };
}
