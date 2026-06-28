import {
  ClassifiedAnswer,
  AttemptStrategy,
} from "../../../../../../../packages/types/src/analysis.types";

/**
 * Optimal time split (percentage of total test time) per subject for NEET.
 * NEET: 3 hours for 200 questions (Physics 45Q, Chemistry 45Q, Biology 90Q)
 * Biology gets most time due to 90 questions. Physics is hardest per question.
 */
const OPTIMAL_TIME_SPLIT_PCT: Record<string, Record<string, number>> = {
  "neet":     { Physics: 30, Chemistry: 23, Biology: 47 },
  "neet-omr": { Physics: 30, Chemistry: 23, Biology: 47 },
};

// Default when exam type variant is unknown
const DEFAULT_SPLIT: Record<string, number> = {
  Physics: 30, Chemistry: 23, Biology: 47,
};

/**
 * Reconstructs the student's attempt strategy from their answer data.
 * Uses time_taken_sec per question as a proxy for when/how they moved.
 */
export function analyzeAttemptStrategy(
  classified: ClassifiedAnswer[],
  examType: string = "neet",
  totalTestDurationSec: number = 10800, // 3 hours for NEET
  hasTimingData: boolean = true
): AttemptStrategy {
  const optimalSplitPct = OPTIMAL_TIME_SPLIT_PCT[examType] ?? DEFAULT_SPLIT;

  // ── Offline Mode (OMR) Fallback ──
  if (!hasTimingData) {
    return {
      pattern: "mixed",
      subjectOrder: [],
      timePerSubjectSec: {},
      optimalTimeSec: {},
      timeDeviationPct: {},
      strategyScore: 100, // Neutral score
      insight: "Offline OMR test — time management tracking is disabled.",
      recommendation: "To track your attempt strategy, use the digital testing mode next time.",
      overtimeSubjects: [],
      undertimeSubjects: [],
    };
  }

  // ── Step 1: Compute time spent per subject ─────────────────────────────
  const timeBySubject: Record<string, number> = {};
  const countBySubject: Record<string, number> = {};
  const subjectAttemptOrder: Array<{ subject: string; questionNumber: number }> = [];

  for (const ans of classified) {
    const subj = ans.question.subject;
    timeBySubject[subj] = (timeBySubject[subj] ?? 0) + ans.time_taken_sec;
    countBySubject[subj] = (countBySubject[subj] ?? 0) + 1;
    subjectAttemptOrder.push({ subject: subj, questionNumber: ans.question.question_number });
  }

  // Total time actually recorded
  const totalRecordedSec = Object.values(timeBySubject).reduce((s, t) => s + t, 0);

  // If the total time recorded is under 5 minutes (300 seconds), we don't have enough data
  // to perform meaningful pacing/subject over-investment analysis. Return early with neutral state.
  if (totalRecordedSec < 300) {
    return {
      pattern: detectPattern(subjectAttemptOrder, classified),
      subjectOrder: inferSubjectOrder(subjectAttemptOrder),
      timePerSubjectSec: timeBySubject,
      optimalTimeSec: {},
      timeDeviationPct: {},
      strategyScore: 100, // Neutral score
      insight: "Test attempt was too brief to analyze subject pacing.",
      recommendation: "Spend more time on questions in your next attempt to get detailed pacing insights.",
      overtimeSubjects: [],
      undertimeSubjects: [],
    };
  }

  const effectiveTotalSec = totalRecordedSec;

  // ── Step 2: Optimal time (seconds) per subject ─────────────────────────
  const optimalTimeSec: Record<string, number> = {};
  for (const [subj, pct] of Object.entries(optimalSplitPct)) {
    optimalTimeSec[subj] = (pct / 100) * effectiveTotalSec;
  }

  // ── Step 3: Deviation from optimal ────────────────────────────────────
  const timeDeviationPct: Record<string, number> = {};
  const overtimeSubjects: string[] = [];
  const undertimeSubjects: string[] = [];

  for (const subj of Object.keys(optimalTimeSec)) {
    const actual = timeBySubject[subj] ?? 0;
    const optimal = optimalTimeSec[subj] ?? 1;
    const deviation = ((actual - optimal) / optimal) * 100;
    timeDeviationPct[subj] = Math.round(deviation);

    if (deviation > 20) overtimeSubjects.push(subj);
    if (deviation < -20) undertimeSubjects.push(subj);
  }

  // ── Step 4: Detect attempt pattern ────────────────────────────────────
  const subjectOrder = inferSubjectOrder(subjectAttemptOrder);
  const pattern = detectPattern(subjectAttemptOrder, classified);

  // ── Step 5: Strategy score (0–100) ────────────────────────────────────
  let score = 100;

  // Deduct for each over-budget subject (up to 15 pts each)
  score -= overtimeSubjects.length * 15;

  // Deduct for linear pattern (not optimal)
  if (pattern === "linear") score -= 15;

  // Deduct for every subject that has >30% deviation
  for (const dev of Object.values(timeDeviationPct)) {
    if (Math.abs(dev) > 30) score -= 10;
  }

  score = Math.max(0, Math.min(100, score));

  // ── Step 6: Build insight + recommendation ─────────────────────────────
  const { insight, recommendation } = buildInsight(
    timeBySubject,
    optimalTimeSec,
    timeDeviationPct,
    overtimeSubjects,
    undertimeSubjects,
    pattern,
    score,
    examType
  );

  return {
    pattern,
    subjectOrder,
    timePerSubjectSec: timeBySubject,
    optimalTimeSec,
    timeDeviationPct,
    strategyScore: score,
    insight,
    recommendation,
    overtimeSubjects,
    undertimeSubjects,
  };
}

// ── Helpers ────────────────────────────────────────────────────────────────

/**
 * Infers the order in which subjects were attempted from question numbers.
 * Strategy: the subject whose first question has the smallest question_number
 * is typically attempted first.
 */
function inferSubjectOrder(
  subjectAttemptOrder: Array<{ subject: string; questionNumber: number }>
): string[] {
  const firstQBySubject: Record<string, number> = {};
  for (const { subject, questionNumber } of subjectAttemptOrder) {
    if (!(subject in firstQBySubject) || questionNumber < firstQBySubject[subject]) {
      firstQBySubject[subject] = questionNumber;
    }
  }
  return Object.entries(firstQBySubject)
    .sort((a, b) => a[1] - b[1])
    .map(([subj]) => subj);
}

/**
 * Detects whether the student went linear (1→N), jumped around by subject,
 * or did a difficulty sweep.
 */
function detectPattern(
  subjectAttemptOrder: Array<{ subject: string; questionNumber: number }>,
  classified: ClassifiedAnswer[]
): AttemptStrategy["pattern"] {
  // Sort by question number to see actual sequence
  const sorted = [...classified].sort(
    (a, b) => a.question.question_number - b.question.question_number
  );

  // Check if subject blocks are contiguous (subject_grouped)
  const subjectSequence = sorted.map((a) => a.question.subject);
  let groupedScore = 0;
  for (let i = 1; i < subjectSequence.length; i++) {
    if (subjectSequence[i] === subjectSequence[i - 1]) groupedScore++;
  }
  const groupingRatio = groupedScore / Math.max(subjectSequence.length - 1, 1);

  if (groupingRatio > 0.8) return "subject_grouped";
  if (groupingRatio < 0.4) return "mixed";

  // Check if difficulty sweeps easy→hard within subjects
  const easyFirst = sorted.filter(
    (a, i) =>
      i < sorted.length * 0.4 && a.question.difficulty === "easy"
  ).length;
  const hardFirst = sorted.filter(
    (a, i) =>
      i < sorted.length * 0.4 && a.question.difficulty === "hard"
  ).length;

  if (easyFirst > hardFirst * 2) return "difficulty_sweep";

  return "linear";
}

function buildInsight(
  timeBySubject: Record<string, number>,
  optimalTimeSec: Record<string, number>,
  deviationPct: Record<string, number>,
  overtime: string[],
  undertime: string[],
  pattern: AttemptStrategy["pattern"],
  score: number,
  examType: string
): { insight: string; recommendation: string } {
  const totalSec = Object.values(timeBySubject).reduce((s, t) => s + t, 0);

  const subjectPctStrs = Object.entries(timeBySubject)
    .map(([s, t]) => `${s}: ${((t / totalSec) * 100).toFixed(0)}%`)
    .join(", ");

  let insight = `Time allocation — ${subjectPctStrs}. `;

  if (overtime.length > 0) {
    const overtimeDetails = overtime.map((s) =>
      `${s} (+${deviationPct[s]}% over budget)`
    ).join(", ");
    insight += `You over-invested in ${overtimeDetails}. `;
  }

  if (undertime.length > 0) {
    const undertimeDetails = undertime.map((s) =>
      `${s} (${deviationPct[s]}% under budget)`
    ).join(", ");
    insight += `You under-invested in ${undertimeDetails}.`;
  }

  // Pattern-specific insight
  if (pattern === "linear") {
    insight += " You attempted questions in order (1→N). Toppers typically sweep easy questions first.";
  } else if (pattern === "difficulty_sweep") {
    insight += " Good — you attempted easier questions first and saved harder ones for later.";
  } else if (pattern === "subject_grouped") {
    insight += " You completed each subject as a block before moving on.";
  }

  // Build recommendation
  let recommendation = "";
  if (score >= 80) {
    recommendation = "Your time management strategy was solid. Keep this approach.";
  } else if (overtime.length > 0) {
    const worstOvertime = overtime[0];
    const suggestedCap = Math.round((optimalTimeSec[worstOvertime] ?? 0) / 60);
    recommendation = `In your next mock, set a hard cap of ${suggestedCap} minutes for ${worstOvertime}. ` +
      `When time is up, mark your best guess and move on — do not exceed the budget.`;
  } else if (pattern === "linear") {
    const examAdvice = examType.startsWith("neet")
      ? "Start with Biology (fastest marks per minute), then Chemistry, save Physics for last."
      : "Start with Biology (fastest marks per minute), then Chemistry, save Physics for last.";
    recommendation = `Try the multi-round strategy next test: first pass — solve only sure-shot questions in every section. ` +
      `Second pass — tackle medium ones. Third pass — attempt hard questions if time allows. ${examAdvice}`;
  } else {
    recommendation = "Tweak your subject time allocation to match the optimal split. " +
      "Even 5 minutes better distributed can recover 8–12 marks.";
  }

  return { insight, recommendation };
}
