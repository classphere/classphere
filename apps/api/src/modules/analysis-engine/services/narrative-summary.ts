import {
  ScoringResult,
  TopicStat,
  ErrorPattern,
  FreeMarksResult,
  LongitudinalFlag,
  AttemptStrategy,
  AnalysisNarrative,
  ExamCountdown,
} from "../../../../../../packages/types/src/analysis.types";

// ── JEE exam windows (hardcoded per user spec) ──────────────────────────────
//
// JEE Main Session 1: approx Jan 22 – Feb 2  (we anchor to Jan 22)
// JEE Main Session 2: approx Apr 2 – Apr 10  (we anchor to Apr 2)
// We always target the NEXT upcoming session from today.
//
// For NEET: May (approx first Sunday of May), anchor May 4

const JEE_SESSION_DATES: { name: string; month: number; day: number }[] = [
  { name: "JEE Main Session 1", month: 1,  day: 22 },  // January 22
  { name: "JEE Main Session 2", month: 4,  day: 2  },  // April 2
];

const NEET_DATE = { name: "NEET UG", month: 5, day: 4 };  // May 4

/**
 * Computes the next upcoming exam date from today and derives urgency mode.
 */
export function getExamCountdown(examCode: string): ExamCountdown | null {
  const now = new Date();
  const currentYear = now.getFullYear();

  let target: { name: string; date: Date } | null = null;

  if (examCode === "jee-main" || examCode === "jee-advanced") {
    // Find the next JEE session that hasn't passed yet
    for (const session of JEE_SESSION_DATES) {
      const candidate = new Date(currentYear, session.month - 1, session.day);
      if (candidate > now) {
        target = { name: session.name, date: candidate };
        break;
      }
    }
    // Both sessions passed this year — next year's Session 1
    if (!target) {
      const next = new Date(currentYear + 1, JEE_SESSION_DATES[0].month - 1, JEE_SESSION_DATES[0].day);
      target = { name: JEE_SESSION_DATES[0].name, date: next };
    }
  } else if (examCode === "neet") {
    let candidate = new Date(currentYear, NEET_DATE.month - 1, NEET_DATE.day);
    if (candidate <= now) {
      candidate = new Date(currentYear + 1, NEET_DATE.month - 1, NEET_DATE.day);
    }
    target = { name: NEET_DATE.name, date: candidate };
  } else {
    return null;
  }

  const daysRemaining = Math.ceil(
    (target.date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );

  const urgencyMode = getUrgencyMode(daysRemaining);
  const urgencyLabel = buildUrgencyLabel(urgencyMode, daysRemaining);

  return {
    examName: target.name,
    examDate: target.date.toISOString().split("T")[0],
    daysRemaining,
    urgencyMode,
    urgencyLabel,
  };
}

function getUrgencyMode(daysRemaining: number): ExamCountdown["urgencyMode"] {
  if (daysRemaining > 90) return "foundation";
  if (daysRemaining > 30) return "growth";
  if (daysRemaining > 14) return "sprint";
  return "crisis";
}

function buildUrgencyLabel(mode: ExamCountdown["urgencyMode"], days: number): string {
  switch (mode) {
    case "foundation": return `Foundation Phase — ${days} days to go`;
    case "growth":     return `Growth Phase — ${days} days to go`;
    case "sprint":     return `Sprint Mode — ${days} days left`;
    case "crisis":     return `⚠️ Crisis Mode — only ${days} days left`;
  }
}

// ── Narrative Generator ───────────────────────────────────────────────────

export function generateNarrative(
  scoring: ScoringResult,
  topicStats: TopicStat[],
  errorPatterns: ErrorPattern[],
  freeMarks: FreeMarksResult,
  longitudinalFlags: LongitudinalFlag[],
  strategy: AttemptStrategy,
  examCode: string
): AnalysisNarrative {
  const countdown = getExamCountdown(examCode);
  const weakCount = topicStats.filter((t) => t.isWeak).length;
  const pct = scoring.percentage.toFixed(0);
  const criticalFlag = longitudinalFlags.find((f) => f.urgency === "critical");
  const highFlags = longitudinalFlags.filter((f) => f.urgency === "high");

  // ── Headline ──────────────────────────────────────────────────────────
  const headline = buildHeadline(scoring, freeMarks, criticalFlag, longitudinalFlags);

  // ── Overview ──────────────────────────────────────────────────────────
  const overview = buildOverview(scoring, pct, weakCount, freeMarks, strategy);

  // ── Biggest win ───────────────────────────────────────────────────────
  const biggestWin = identifyBiggestWin(errorPatterns, freeMarks, longitudinalFlags, strategy);

  // ── Warning ───────────────────────────────────────────────────────────
  const warningMessage = criticalFlag
    ? criticalFlag.message
    : highFlags.length > 0
    ? highFlags[0].message
    : null;

  // ── Motivational note ─────────────────────────────────────────────────
  const motivationalNote = buildMotivationalNote(scoring, freeMarks, countdown, weakCount);

  return {
    headline,
    overview,
    biggestWin,
    warningMessage,
    motivationalNote,
    examCountdown: countdown,
  };
}

// ── Builders ──────────────────────────────────────────────────────────────

function buildHeadline(
  scoring: ScoringResult,
  freeMarks: FreeMarksResult,
  criticalFlag: LongitudinalFlag | undefined,
  longitudinalFlags: LongitudinalFlag[]
): string {
  if (criticalFlag) {
    return `Recurring gap in "${criticalFlag.topic}" needs immediate attention.`;
  }
  if (freeMarks.totalFreeMarks >= 20) {
    return `${freeMarks.totalFreeMarks} marks left on the table — and you already knew how to earn them.`;
  }
  if (scoring.percentage >= 80) {
    return "Strong performance — now it's about eliminating the last few leaks.";
  }
  if (scoring.percentage >= 60) {
    return "Solid foundation — targeted fixes can push you into the top percentile.";
  }
  if (scoring.percentage >= 40) {
    return "Significant room to grow — the right strategy will accelerate your improvement.";
  }
  return "Early stage — every test is data. Let's see exactly where to focus.";
}

function buildOverview(
  scoring: ScoringResult,
  pct: string,
  weakCount: number,
  freeMarks: FreeMarksResult,
  strategy: AttemptStrategy
): string {
  const scoreStr = `${scoring.score}/${scoring.maxScore}`;
  let text = `You scored ${pct}% (${scoreStr}) this test, with ${weakCount} topic${weakCount !== 1 ? "s" : ""} falling below the 50% threshold. `;

  if (freeMarks.totalFreeMarks > 0) {
    text += `${freeMarks.totalFreeMarks} marks were lost to fixable errors (${freeMarks.sillyCount} silly + ${freeMarks.calculationCount} calculation) — these are recoverable without any additional studying. `;
  }

  if (strategy.overtimeSubjects.length > 0) {
    text += `Time allocation shows over-investment in ${strategy.overtimeSubjects.join(" and ")}, which may have compressed time on other sections.`;
  } else if (strategy.strategyScore >= 75) {
    text += "Your time management across subjects was well-balanced.";
  }

  return text.trim();
}

function identifyBiggestWin(
  errorPatterns: ErrorPattern[],
  freeMarks: FreeMarksResult,
  longitudinalFlags: LongitudinalFlag[],
  strategy: AttemptStrategy
): string {
  // Priority: critical longitudinal > free marks > strategy > error patterns
  const critical = longitudinalFlags.find((f) => f.urgency === "critical");
  if (critical) {
    return `Fix "${critical.topic}" — it's been your weakest point for ${critical.occurrences} tests. ${critical.actionRequired}`;
  }

  if (freeMarks.totalFreeMarks >= 15) {
    return `Recover your free marks: ${freeMarks.totalFreeMarks} marks lost to silly + calculation errors. ` +
      `These require zero new studying — just more careful execution. Slow down on easy questions.`;
  }

  if (strategy.overtimeSubjects.length > 0 && strategy.strategyScore < 70) {
    return `Fix your time strategy: you're over-investing in ${strategy.overtimeSubjects.join("/")}. ` +
      `${strategy.recommendation}`;
  }

  const highPattern = errorPatterns.find((p) => p.severity === "high");
  if (highPattern) {
    return `${highPattern.name}: ${highPattern.tip}`;
  }

  return "Revisit your weakest topic this week with a focused 60-minute session before your next test.";
}

function buildMotivationalNote(
  scoring: ScoringResult,
  freeMarks: FreeMarksResult,
  countdown: ExamCountdown | null,
  weakCount: number
): string {
  const parts: string[] = [];

  if (freeMarks.totalFreeMarks > 0) {
    parts.push(
      `If you fix just the fixable errors, your score jumps to ${freeMarks.projectedScore} — ` +
      `that's ${freeMarks.projectedPercentage.toFixed(0)}% without learning a single new concept.`
    );
  }

  if (countdown) {
    if (countdown.urgencyMode === "foundation") {
      parts.push(
        `With ${countdown.daysRemaining} days until ${countdown.examName}, you have time to build deeply. ` +
        `Focus on understanding, not memorization.`
      );
    } else if (countdown.urgencyMode === "sprint") {
      parts.push(
        `${countdown.daysRemaining} days to ${countdown.examName}. ` +
        `Every mock from here is a full dress rehearsal. Execute your study plan precisely.`
      );
    } else if (countdown.urgencyMode === "crisis") {
      parts.push(
        `${countdown.daysRemaining} days left. No new concepts — only consolidation and attempt strategy. ` +
        `Your foundation is set. Trust it.`
      );
    }
  }

  if (parts.length === 0) {
    parts.push(
      `The goal isn't a perfect score — it's a consistently improving one. ` +
      `${weakCount} topics to fix. That's specific. That's solvable.`
    );
  }

  return parts.join(" ");
}
