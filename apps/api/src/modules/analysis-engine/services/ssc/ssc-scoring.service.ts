import { AttemptAnswer, ScoringResult } from "../../../../../../../packages/types/src/analysis.types";

/**
 * SSC Tier 1 Scoring
 * ─────────────────────────────────────────────────────────────
 * Total: 100 questions across 4 sections, each worth 50 marks.
 * Marking: +2 per correct, -0.5 per wrong, 0 for unattempted.
 * Note: No partial/integer type in SSC — all MCQ only.
 */
const SSC_MARKING_SCHEME = {
  correct: 2,
  incorrect: -0.5,
  unattempted: 0,
};

export const SSC_SECTIONS = [
  "General Intelligence & Reasoning",
  "General Awareness",
  "Quantitative Aptitude",
  "English Comprehension",
] as const;

export type SscSection = (typeof SSC_SECTIONS)[number];

/**
 * Each section has 25 questions, 15 minutes, max 50 marks.
 */
export const SSC_SECTION_CONFIG: Record<string, { durationSec: number; questionCount: number; maxMarks: number }> = {
  "General Intelligence & Reasoning": { durationSec: 900, questionCount: 25, maxMarks: 50 },
  "General Awareness":                { durationSec: 900, questionCount: 25, maxMarks: 50 },
  "Quantitative Aptitude":            { durationSec: 900, questionCount: 25, maxMarks: 50 },
  "English Comprehension":            { durationSec: 900, questionCount: 25, maxMarks: 50 },
};

export const SSC_TOTAL_DURATION_SEC = 3600; // 60 minutes total

export function scoreSscAttempt(answers: AttemptAnswer[]): ScoringResult {
  let score = 0;
  let correct = 0;
  let incorrect = 0;
  let skipped = 0;

  const subjectBreakdown: Record<
    string,
    { score: number; maxScore: number; correct: number; incorrect: number; skipped: number }
  > = {};

  for (const ans of answers) {
    const section = ans.question.subject;
    if (!subjectBreakdown[section]) {
      const cfg = SSC_SECTION_CONFIG[section];
      subjectBreakdown[section] = {
        score: 0,
        maxScore: cfg?.maxMarks ?? 50,
        correct: 0,
        incorrect: 0,
        skipped: 0,
      };
    }
    const s = subjectBreakdown[section];

    if (!ans.selected_answer) {
      // Unattempted: 0 marks
      skipped++;
      s.skipped++;
    } else if (ans.is_correct) {
      score += SSC_MARKING_SCHEME.correct;
      s.score += SSC_MARKING_SCHEME.correct;
      correct++;
      s.correct++;
    } else {
      score += SSC_MARKING_SCHEME.incorrect;
      s.score += SSC_MARKING_SCHEME.incorrect;
      incorrect++;
      s.incorrect++;
    }
  }

  const maxScore = Object.values(subjectBreakdown).reduce((sum, s) => sum + s.maxScore, 0);

  return {
    score: parseFloat(score.toFixed(2)),
    maxScore,
    percentage: maxScore > 0 ? parseFloat(((score / maxScore) * 100).toFixed(2)) : 0,
    correctCount: correct,
    incorrectCount: incorrect,
    skippedCount: skipped,
    subjectBreakdown,
  };
}
