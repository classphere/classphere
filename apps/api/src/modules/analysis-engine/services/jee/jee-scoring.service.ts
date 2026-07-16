import { AttemptAnswer, ScoringResult } from "../../../../../../../packages/types/src/analysis.types";

export function scoreAttempt(
  rawAnswers: AttemptAnswer[],
  scheme: { correct: number; incorrect: number; unattempted: number }
): ScoringResult {
  // Deep copy answer objects so we don't mutate input data (ENGINE-2)
  const answers = rawAnswers.map(a => ({
    ...a,
    question: { ...a.question }
  }));

  // Enforce negative sign for incorrect penalty (H13)
  const incorrectPenalty = -Math.abs(scheme.incorrect);

  let score = 0;
  let correct = 0;
  let incorrect = 0;
  let skipped = 0;

  const subjectBreakdown: Record<
    string,
    { score: number; maxScore: number; correct: number; incorrect: number; skipped: number }
  > = {};

  // Count question types per subject to determine maxScore
  const subjectMcqCounts: Record<string, number> = {};
  const subjectIntegerCounts: Record<string, number> = {};
  for (const ans of answers) {
    const subj = ans.question.subject;
    if (ans.question.question_type === "integer") {
      subjectIntegerCounts[subj] = (subjectIntegerCounts[subj] || 0) + 1;
    } else {
      subjectMcqCounts[subj] = (subjectMcqCounts[subj] || 0) + 1;
    }
  }

  // Track the count of answered integer questions per subject
  const integerAnsweredCountPerSubject: Record<string, number> = {};

  for (const ans of answers) {
    const subj = ans.question.subject;
    if (!subjectBreakdown[subj]) {
      subjectBreakdown[subj] = { score: 0, maxScore: 0, correct: 0, incorrect: 0, skipped: 0 };
    }
    const s = subjectBreakdown[subj];

    // Enforce JEE Section B limit: only the first 5 answered numerical questions are scored
    let isAttemptAllowed = true;
    if (ans.question.question_type === "integer" && ans.selected_answer !== null && ans.selected_answer !== "") {
      integerAnsweredCountPerSubject[subj] = (integerAnsweredCountPerSubject[subj] || 0) + 1;
      if (integerAnsweredCountPerSubject[subj] > 5) {
        isAttemptAllowed = false;
        // Zero out marks without removing the answer (so classifier knows they attempted it)
        ans.is_correct = false;
        ans.marks_awarded = 0;
      }
    }

    if (!ans.selected_answer) {
      score += scheme.unattempted;
      s.score += scheme.unattempted;
      skipped++;
      s.skipped++;
    } else if (!isAttemptAllowed) {
      // Disallowed extra numerical answers get 0 marks, and do not increment correct/incorrect/skipped counts
      ans.marks_awarded = 0;
    } else if (ans.is_correct) {
      score += scheme.correct;
      s.score += scheme.correct;
      correct++;
      s.correct++;
    } else {
      score += incorrectPenalty;
      s.score += incorrectPenalty;
      incorrect++;
      s.incorrect++;
    }
  }

  // Calculate subject and overall maxScore based on allowed attempts
  for (const subj of Object.keys(subjectBreakdown)) {
    const mcqs = subjectMcqCounts[subj] || 0;
    const integers = subjectIntegerCounts[subj] || 0;
    subjectBreakdown[subj].maxScore = (mcqs + Math.min(5, integers)) * scheme.correct;
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
