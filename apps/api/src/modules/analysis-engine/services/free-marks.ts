import {
  ClassifiedAnswer,
  ScoringResult,
  FreeMarksResult,
} from "../../../../../../packages/types/src/analysis.types";

export function calculateFreeMarks(
  classified: ClassifiedAnswer[],
  scoring: ScoringResult,
  scheme: { correct: number; incorrect: number; unattempted: number }
): FreeMarksResult {
  const silly = classified.filter((a) => a.classification?.type === "silly");
  const calc = classified.filter((a) => a.classification?.type === "calculation");
  const fixable = silly.length + calc.length;

  // Each fixable error recovers:
  //   +scheme.correct   (gained)
  //   -scheme.incorrect (penalty avoided, which was negative, so we add its absolute)
  const marksPerFix = scheme.correct + Math.abs(scheme.incorrect); // +4 + 1 = +5 for JEE
  const totalFree = fixable * marksPerFix;
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
