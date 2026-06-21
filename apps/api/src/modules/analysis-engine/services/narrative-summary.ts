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

// Helper: Deterministic Hash
function getDeterministicIndex(seed: string, length: number): number {
  if (!seed) return Math.floor(Math.random() * length);
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % length;
}

// ── Narrative Generator ───────────────────────────────────────────────────

export function generateNarrative(
  scoring: ScoringResult,
  topicStats: TopicStat[],
  errorPatterns: ErrorPattern[],
  freeMarks: FreeMarksResult,
  longitudinalFlags: LongitudinalFlag[],
  strategy: AttemptStrategy,
  examCode: string,
  attemptId: string = ""
): AnalysisNarrative {
  const countdown = getExamCountdown(examCode);
  const weakCount = topicStats.filter((t) => t.isWeak).length;
  const pct = scoring.percentage.toFixed(0);
  const criticalFlag = longitudinalFlags.find((f) => f.urgency === "critical");
  const highFlags = longitudinalFlags.filter((f) => f.urgency === "high");

  // ── Headline ──────────────────────────────────────────────────────────
  const headline = buildHeadline(scoring, freeMarks, criticalFlag, attemptId);

  // ── Overview ──────────────────────────────────────────────────────────
  const overview = buildOverview(scoring, pct, weakCount, freeMarks, strategy, attemptId);

  // ── Biggest win ───────────────────────────────────────────────────────
  const biggestWin = identifyBiggestWin(errorPatterns, freeMarks, longitudinalFlags, strategy, attemptId);

  // ── Warning ───────────────────────────────────────────────────────────
  const warningMessage = criticalFlag
    ? criticalFlag.message
    : highFlags.length > 0
    ? highFlags[0].message
    : null;

  // ── Motivational note ─────────────────────────────────────────────────
  const motivationalNote = buildMotivationalNote(scoring, freeMarks, countdown, weakCount, attemptId);

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
  attemptId: string
): string {
  const seed = attemptId + "_headline";

  if (criticalFlag) {
    const templates = [
      `Recurring gap in "${criticalFlag.topic}" needs immediate attention.`,
      `Struggling with "${criticalFlag.topic}" across multiple tests — this needs active review.`,
      `Alert: "${criticalFlag.topic}" has emerged as a persistent weak spot.`
    ];
    return templates[getDeterministicIndex(seed, templates.length)];
  }

  if (freeMarks.totalFreeMarks >= 20) {
    const templates = [
      `${freeMarks.totalFreeMarks} marks left on the table — and you already knew how to earn them.`,
      `Score leak alert: ${freeMarks.totalFreeMarks} marks lost purely to silly and calculation errors.`,
      `Recoverable points: ${freeMarks.totalFreeMarks} marks were lost due to exam room rush.`
    ];
    return templates[getDeterministicIndex(seed, templates.length)];
  }

  if (scoring.percentage >= 80) {
    const templates = [
      "Strong performance — now it's about eliminating the last few leaks.",
      "Outstanding attempt. You've established a solid foundation; let's polish the edge cases.",
      "Premium execution. Just a few small adjustments needed to reach the highest percentiles."
    ];
    return templates[getDeterministicIndex(seed, templates.length)];
  }

  if (scoring.percentage >= 60) {
    const templates = [
      "Solid foundation — targeted fixes can push you into the top percentile.",
      "Strong foundation established — targeted optimization will elevate your rank.",
      "Promising result. You have the concept baseline; now refine your execution speed."
    ];
    return templates[getDeterministicIndex(seed, templates.length)];
  }

  if (scoring.percentage >= 40) {
    const templates = [
      "Significant room to grow — the right strategy will accelerate your improvement.",
      "Substantial room to climb — the right revision strategy will accelerate your progress.",
      "Solid baseline, but a few critical concept leaks are pulling your score down."
    ];
    return templates[getDeterministicIndex(seed, templates.length)];
  }

  const templates = [
    "Early stage — every test is data. Let's see exactly where to focus.",
    "Initial baseline set. Treat every mistake here as a free lesson for the final exam.",
    "Don't chase high scores yet — build your foundational concepts topic by topic."
  ];
  return templates[getDeterministicIndex(seed, templates.length)];
}

function buildOverview(
  scoring: ScoringResult,
  pct: string,
  weakCount: number,
  freeMarks: FreeMarksResult,
  strategy: AttemptStrategy,
  attemptId: string
): string {
  const seed = attemptId + "_overview";
  const scoreStr = `${scoring.score}/${scoring.maxScore} Marks`;

  let timeSummary = "";
  if (strategy.overtimeSubjects.length > 0) {
    timeSummary = `Time allocation shows over-investment in ${strategy.overtimeSubjects.join(" and ")}, which may have compressed time on other sections.`;
  } else if (strategy.strategyScore >= 75) {
    timeSummary = "Your time management across subjects was well-balanced.";
  }

  const templates = [
    `You achieved a score of ${scoreStr} in this test, with ${weakCount} chapter${weakCount !== 1 ? "s" : ""} falling below the target threshold. Of these, ${freeMarks.totalFreeMarks} marks were lost to simple slips rather than knowledge gaps. ${timeSummary}`,
    `With a score of ${scoreStr} in this test, you've shown solid baseline coverage, but ${weakCount} key chapter${weakCount !== 1 ? "s" : ""} require revision. Careless slips cost you ${freeMarks.totalFreeMarks} marks that you already had the knowledge to secure. ${timeSummary}`,
    `This mock test result of ${scoreStr} highlights ${weakCount} area${weakCount !== 1 ? "s" : ""} for improvement. You dropped ${freeMarks.totalFreeMarks} marks on silly/calculation slips. ${timeSummary}`
  ];

  return templates[getDeterministicIndex(seed, templates.length)];
}

function identifyBiggestWin(
  errorPatterns: ErrorPattern[],
  freeMarks: FreeMarksResult,
  longitudinalFlags: LongitudinalFlag[],
  strategy: AttemptStrategy,
  attemptId: string
): string {
  const seed = attemptId + "_win";

  // Priority: critical longitudinal > free marks > strategy > error patterns
  const critical = longitudinalFlags.find((f) => f.urgency === "critical");
  if (critical) {
    const templates = [
      `Fix "${critical.topic}" — it's been your weakest point for ${critical.occurrences} tests. ${critical.actionRequired}`,
      `Critical Action: Address the gap in "${critical.topic}" before your next mock test. It has been a persistent drain on your score.`
    ];
    return templates[getDeterministicIndex(seed, templates.length)];
  }

  if (freeMarks.totalFreeMarks >= 15) {
    const templates = [
      `Recover your free marks: ${freeMarks.totalFreeMarks} marks lost to silly + calculation errors. These require zero new studying — just more careful execution. Slow down on easy questions.`,
      `Quickest score boost: Secure the ${freeMarks.totalFreeMarks} marks you lost to careless execution. No new revision needed, just more deliberate calculations.`
    ];
    return templates[getDeterministicIndex(seed, templates.length)];
  }

  if (strategy.overtimeSubjects.length > 0 && strategy.strategyScore < 70) {
    const templates = [
      `Fix your time strategy: you're over-investing in ${strategy.overtimeSubjects.join("/")}. ${strategy.recommendation}`,
      `Pacing optimization: Adjust your subject timing. Over-allocating time to ${strategy.overtimeSubjects.join("/")} is hurting your overall score.`
    ];
    return templates[getDeterministicIndex(seed, templates.length)];
  }

  const highPattern = errorPatterns.find((p) => p.severity === "high");
  if (highPattern) {
    return `${highPattern.name}: ${highPattern.tip}`;
  }

  const templates = [
    "Revisit your weakest topic this week with a focused 60-minute session before your next test.",
    "Syllabus patching: Review the core concept of your lowest-accuracy topic before taking another test."
  ];
  return templates[getDeterministicIndex(seed, templates.length)];
}

function buildMotivationalNote(
  scoring: ScoringResult,
  freeMarks: FreeMarksResult,
  countdown: ExamCountdown | null,
  weakCount: number,
  attemptId: string
): string {
  const seed = attemptId + "_motivational";
  const parts: string[] = [];

  if (freeMarks.totalFreeMarks > 0) {
    const templates = [
      `If you fix just the silly errors, your score jumps to ${freeMarks.projectedScore} out of ${scoring.maxScore} marks without learning a single new concept.`,
      `Imagine starting the next test with an extra ${freeMarks.totalFreeMarks} marks. You already have the knowledge — just execute carefully.`
    ];
    parts.push(templates[getDeterministicIndex(seed, templates.length)]);
  }

  if (countdown) {
    if (countdown.urgencyMode === "foundation") {
      parts.push(
        `With ${countdown.daysRemaining} days until ${countdown.examName}, you have time to build deeply. Focus on understanding, not memorization.`
      );
    } else if (countdown.urgencyMode === "sprint") {
      parts.push(
        `${countdown.daysRemaining} days to ${countdown.examName}. Every mock from here is a full dress rehearsal. Execute your study plan precisely.`
      );
    } else if (countdown.urgencyMode === "crisis") {
      parts.push(
        `${countdown.daysRemaining} days left. No new concepts — only consolidation and attempt strategy. Your foundation is set. Trust it.`
      );
    }
  }

  if (parts.length === 0) {
    const templates = [
      `The goal isn't a perfect score — it's a consistently improving one. ${weakCount} chapter${weakCount !== 1 ? "s" : ""} to fix. That's specific. That's solvable.`,
      `Every error solved now is a point saved on the final day. Keep pushing forward.`
    ];
    parts.push(templates[getDeterministicIndex(seed, templates.length)]);
  }

  return parts.join(" ");
}
