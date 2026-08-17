import {
  ClassifiedAnswer,
  ScoringResult,
  FreeMarksResult,
} from "../../../../../../../packages/types/src/analysis.types";
import { marksFor, type MarkingScheme } from "../../../../lib/marking-scheme";

export function calculateFreeMarks(
  classified: ClassifiedAnswer[],
  scoring: ScoringResult,
  scheme: MarkingScheme | null | undefined
): FreeMarksResult {
  const silly = classified.filter((a) => a.classification?.type === "silly");
  const calc = classified.filter((a) => a.classification?.type === "calculation");
  const fixable = silly.length + calc.length;

  // Each fixable error recovers what that question is worth plus the penalty it
  // cost — +4 and +1 on a standard JEE Main question, so +5. Summed per question
  // rather than multiplied by one figure: on a paper whose question types carry
  // different marks, a silly slip on a +4 question is not worth the same as one
  // on a +3.
  const totalFree = [...silly, ...calc].reduce((sum, answer) => {
    const marking = marksFor(scheme, answer.question.question_type, answer.question.marks);
    return sum + marking.correct + Math.abs(marking.incorrect);
  }, 0);
  const projected = scoring.score + totalFree;

  return {
    totalFreeMarks: totalFree,
    sillyCount: silly.length,
    calculationCount: calc.length,
    projectedScore: projected,
    projectedPercentage: scoring.maxScore > 0 ? (projected / scoring.maxScore) * 100 : 0,
    message: `Fix ${fixable} silly+calc errors → score jumps from ${scoring.score} to ${projected} (+${totalFree} marks)`,
  };
}
