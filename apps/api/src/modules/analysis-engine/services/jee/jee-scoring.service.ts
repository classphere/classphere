import { AttemptAnswer, ScoringResult } from "../../../../../../../packages/types/src/analysis.types";
import { marksFor, type MarkingScheme } from "../../../../lib/marking-scheme";

/**
 * Re-score a submitted attempt for the analysis report.
 *
 * Takes the paper's whole marking scheme rather than one flat
 * `{ correct, incorrect, unattempted }`. That flat shape could only express a
 * paper where every question is worth the same, so a JEE Advanced paper mixing
 * +3 single-correct with +4 multiple-correct was reported against whichever
 * pair of numbers happened to be passed in — and once a paper could state its
 * own per-type marks, reading `scheme.correct` off a keyed scheme would have
 * produced undefined, and a NaN score on the result screen.
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

  // What each subject's questions are worth, for maxScore. JEE scores only the
  // first five numerical questions in a section, so the cheapest five of them
  // are the ones that cannot count — taking the highest-valued five keeps
  // maxScore the best score actually reachable.
  const subjectMcqMarks: Record<string, number> = {};
  const subjectIntegerMarks: Record<string, number[]> = {};
  for (const ans of answers) {
    const subj = ans.question.subject;
    const correctMarks = marksOf(ans).correct;
    if (ans.question.question_type === "integer") {
      (subjectIntegerMarks[subj] ??= []).push(correctMarks);
    } else {
      subjectMcqMarks[subj] = (subjectMcqMarks[subj] || 0) + correctMarks;
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

    const marking = marksOf(ans);
    // Enforce negative sign for incorrect penalty (H13)
    const incorrectPenalty = -Math.abs(marking.incorrect);

    if (!ans.selected_answer) {
      score += marking.unattempted;
      s.score += marking.unattempted;
      skipped++;
      s.skipped++;
    } else if (!isAttemptAllowed) {
      // Disallowed extra numerical answers get 0 marks, and do not increment correct/incorrect/skipped counts
      ans.marks_awarded = 0;
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
  }

  // Calculate subject and overall maxScore based on allowed attempts
  for (const subj of Object.keys(subjectBreakdown)) {
    const bestFiveIntegers = (subjectIntegerMarks[subj] ?? [])
      .sort((a, b) => b - a)
      .slice(0, 5)
      .reduce((sum, marks) => sum + marks, 0);
    subjectBreakdown[subj].maxScore = (subjectMcqMarks[subj] || 0) + bestFiveIntegers;
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
