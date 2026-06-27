import {
  ScoringResult,
  TopicStat,
  FreeMarksResult,
  LongitudinalFlag,
  AnalysisNarrative,
  ExamCountdown,
} from "../../../../../../../packages/types/src/analysis.types";
import { SscSweepQuality, SscBlockPanic } from "./ssc-behavioral-analysis";

// ── SSC Exam Dates ───────────────────────────────────────────────────────────
// SSC CGL Tier 1 typically runs in March–April (Session 1) and Sept–Oct (Session 2)
const SSC_EXAM_SESSIONS: { name: string; month: number; day: number }[] = [
  { name: "SSC CGL Tier 1 (Session 1)", month: 3,  day: 20 },  // March 20
  { name: "SSC CGL Tier 1 (Session 2)", month: 9,  day: 10 },  // September 10
];

export function getSscExamCountdown(): ExamCountdown | null {
  const now         = new Date();
  const currentYear = now.getFullYear();

  let target: { name: string; date: Date } | null = null;
  for (const session of SSC_EXAM_SESSIONS) {
    const candidate = new Date(currentYear, session.month - 1, session.day);
    if (candidate > now) {
      target = { name: session.name, date: candidate };
      break;
    }
  }
  if (!target) {
    const next = new Date(currentYear + 1, SSC_EXAM_SESSIONS[0].month - 1, SSC_EXAM_SESSIONS[0].day);
    target = { name: SSC_EXAM_SESSIONS[0].name, date: next };
  }

  const daysRemaining = Math.ceil((target.date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  const urgencyMode = daysRemaining > 90 ? "foundation" : daysRemaining > 30 ? "growth" : daysRemaining > 14 ? "sprint" : "crisis";
  const urgencyLabel = {
    foundation: `Foundation Phase — ${daysRemaining} days to go`,
    growth:     `Growth Phase — ${daysRemaining} days to go`,
    sprint:     `Sprint Mode — ${daysRemaining} days left`,
    crisis:     `⚠️ Crisis Mode — only ${daysRemaining} days left`,
  }[urgencyMode];

  return {
    examName: target.name,
    examDate: target.date.toISOString().split("T")[0],
    daysRemaining,
    urgencyMode,
    urgencyLabel,
  };
}

// ── Deterministic hash ───────────────────────────────────────────────────────
function deterministicIndex(seed: string, length: number): number {
  if (!seed) return 0;
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h << 5) - h + seed.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h) % length;
}

// ── Main Narrative Generator ─────────────────────────────────────────────────

export function generateSscNarrative(
  scoring: ScoringResult,
  topicStats: TopicStat[],
  freeMarks: FreeMarksResult,
  longitudinalFlags: LongitudinalFlag[],
  sweepQuality: SscSweepQuality[],
  blockPanics: SscBlockPanic[],
  crossSectionFatigue: string,
  attemptId: string = ""
): AnalysisNarrative {
  const countdown     = getSscExamCountdown();
  const weakCount     = topicStats.filter(t => t.isWeak).length;
  const pct           = scoring.percentage.toFixed(0);
  const criticalFlag  = longitudinalFlags.find(f => f.urgency === "critical");
  const highFlags     = longitudinalFlags.filter(f => f.urgency === "high");
  const panicSections = blockPanics.filter(p => p.detected).map(p => p.section);
  const badSweeps     = sweepQuality.filter(s => s.sweepPattern !== "optimal");

  const headline    = buildSscHeadline(scoring, freeMarks, criticalFlag, panicSections, attemptId);
  const overview    = buildSscOverview(scoring, pct, weakCount, freeMarks, badSweeps, panicSections, crossSectionFatigue);
  const biggestWin  = identifySscBiggestWin(scoring, topicStats, freeMarks, sweepQuality, blockPanics);
  const warningMessage = criticalFlag?.message ?? (highFlags[0]?.message ?? null);
  const motivationalNote = buildSscMotivationalNote(scoring, freeMarks, countdown, weakCount, attemptId);

  return { headline, overview, biggestWin, warningMessage, motivationalNote, examCountdown: countdown };
}

// ── Headline ─────────────────────────────────────────────────────────────────

function buildSscHeadline(
  scoring: ScoringResult,
  freeMarks: FreeMarksResult,
  criticalFlag: LongitudinalFlag | undefined,
  panicSections: string[],
  attemptId: string
): string {
  const seed = attemptId + "_ssc_headline";

  if (criticalFlag) {
    const tpl = [
      `"${criticalFlag.topic}" is a persistent weak spot — stop and revise before the next mock.`,
      `Recurring gap in "${criticalFlag.topic}" across 3+ tests. This needs immediate targeted revision.`,
    ];
    return tpl[deterministicIndex(seed, tpl.length)];
  }

  if (panicSections.length > 0) {
    return `Panic cascade detected in ${panicSections.join(" and ")} — the 15-minute lock amplified your anxiety into marks lost.`;
  }

  if (freeMarks.totalFreeMarks >= 10) {
    const tpl = [
      `${freeMarks.totalFreeMarks} marks left on the table — and you already knew how to earn them.`,
      `Score leak: ${freeMarks.totalFreeMarks} marks lost to silly errors and calculation slips. The knowledge was there.`,
    ];
    return tpl[deterministicIndex(seed, tpl.length)];
  }

  if (scoring.percentage >= 80) {
    return "Strong performance — now it's about eliminating the last few leaks in the 15-minute sections.";
  }
  if (scoring.percentage >= 60) {
    return "Solid foundation — targeted revision on 2–3 themes can push you into the SSC merit list.";
  }
  if (scoring.percentage >= 40) {
    return "Significant room to grow — focus on your weakest themes and the 2-round sweep strategy.";
  }

  return "Early stage — treat every mock as a diagnostic. Fix one theme at a time.";
}

// ── Overview ─────────────────────────────────────────────────────────────────

function buildSscOverview(
  scoring: ScoringResult,
  pct: string,
  weakCount: number,
  freeMarks: FreeMarksResult,
  badSweeps: SscSweepQuality[],
  panicSections: string[],
  crossSectionFatigue: string
): string {
  const parts: string[] = [];
  const totalQ   = scoring.correctCount + scoring.incorrectCount + scoring.skippedCount;
  const attempted = scoring.correctCount + scoring.incorrectCount;
  const attemptRate = totalQ > 0 ? Math.round((attempted / totalQ) * 100) : 0;

  parts.push(`You scored ${scoring.score}/${scoring.maxScore} marks (${pct}%), attempting ${attemptRate}% of the paper across 4 locked sections.`);

  if (freeMarks.sillyCount > 0) {
    parts.push(`${freeMarks.sillyCount} marks lost to reading errors — questions you answered too quickly without processing. Slow down by 5 seconds on your first read.`);
  }

  if (badSweeps.length > 0) {
    const names = badSweeps.map(s => s.section).join(", ");
    parts.push(`Inefficient sweep order detected in ${names}. You tackled hard questions before securing the easy marks — this amplifies time pressure in a 15-minute section.`);
  }

  if (panicSections.length > 0) {
    parts.push(`A panic cascade in ${panicSections.join(" and ")} resulted in a cluster of rapid wrong answers, adding -0.5 penalties that compounded quickly.`);
  }

  parts.push(crossSectionFatigue);

  return parts.filter(Boolean).join(" ");
}

// ── Biggest Win ──────────────────────────────────────────────────────────────

function identifySscBiggestWin(
  scoring: ScoringResult,
  topicStats: TopicStat[],
  freeMarks: FreeMarksResult,
  sweepQuality: SscSweepQuality[],
  blockPanics: SscBlockPanic[]
): string {
  // Priority 1: Panic cascade (most immediate tactical fix)
  const worstPanic = blockPanics.find(p => p.detected);
  if (worstPanic) {
    return `Panic control in ${worstPanic.section}: When the section feels like it's running out, skip immediately — never answer 3 in a row without confidence. The -0.5 compounds.`;
  }

  // Priority 2: Many silly mistakes
  if (freeMarks.sillyCount >= 3) {
    return `Silly mistake reduction: Add a 5-second rule — always re-read the final line of the question before marking an option. ${freeMarks.sillyCount} mistakes × 2.5 marks each = ${freeMarks.sillyCount * 2.5} marks recoverable.`;
  }

  // Priority 3: Bad sweep in Quant (most impactful section)
  const quantSweep = sweepQuality.find(s => s.section === "Quantitative Aptitude" && s.sweepPattern !== "optimal");
  if (quantSweep) {
    return "Sweep strategy in Quantitative Aptitude: Always do a Round 1 (only <30s sure-shot questions), then return for calculative ones in Round 2. This alone can recover 6–10 marks per mock.";
  }

  // Priority 4: Weakest theme
  const weakThemes = topicStats.filter(t => t.attempted >= 2 && t.isWeak);
  if (weakThemes.length > 0) {
    const worst = weakThemes[0];
    return `Concept revision: Re-read the "${worst.topic}" chapter from your standard source (Lucent/R.S. Aggarwal) and solve 10 targeted questions before the next mock.`;
  }

  return "Pacing optimization: Ensure every section starts with a full Round 1 sweep of easy questions. Carry-forward unused time is impossible — every section is its own battle.";
}

// ── Motivational Note ────────────────────────────────────────────────────────

function buildSscMotivationalNote(
  scoring: ScoringResult,
  freeMarks: FreeMarksResult,
  countdown: ExamCountdown | null,
  weakCount: number,
  attemptId: string
): string {
  const seed  = attemptId + "_ssc_motivational";
  const parts: string[] = [];

  if (freeMarks.totalFreeMarks > 0) {
    const tpl = [
      `Fix just the silly errors, and your score jumps to ${freeMarks.projectedScore}/${scoring.maxScore} — without learning a single new concept.`,
      `${freeMarks.totalFreeMarks} marks are waiting for you in the next mock. The knowledge is already there — just execute calmly.`,
    ];
    parts.push(tpl[deterministicIndex(seed, tpl.length)]);
  }

  if (countdown) {
    if (countdown.urgencyMode === "foundation") {
      parts.push(`With ${countdown.daysRemaining} days until ${countdown.examName}, you have time to build concepts properly. Don't rush mocks — fix one theme per week.`);
    } else if (countdown.urgencyMode === "sprint") {
      parts.push(`${countdown.daysRemaining} days to ${countdown.examName}. Shift to full mocks + deep analysis mode. No new topics — only revision and strategy.`);
    } else if (countdown.urgencyMode === "crisis") {
      parts.push(`${countdown.daysRemaining} days left. Trust your preparation. Focus only on mock analysis and eliminating silly mistakes. The strategy now matters more than new knowledge.`);
    }
  }

  if (parts.length === 0) {
    const tpl = [
      `${weakCount} theme${weakCount !== 1 ? "s" : ""} to fix. That's specific. That's solvable. One per week.`,
      `Every error analyzed today is a mark saved on exam day. Keep the discipline.`,
    ];
    parts.push(tpl[deterministicIndex(seed, tpl.length)]);
  }

  return parts.join(" ");
}
