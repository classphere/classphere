import { AttemptAnswer, ScoringResult } from "../../../../../../packages/types/src/analysis.types";

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
    s.maxScore += scheme.correct;

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

  const maxScore = answers.length * scheme.correct;
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
