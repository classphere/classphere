import {
  TopicStat,
  StudyDay,
  LongitudinalFlag,
  FreeMarksResult,
  ExamCountdown,
} from "../../../../../../../packages/types/src/analysis.types";

/**
 * Generates a personalized study plan.
 *
 * Urgency modes (driven by exam countdown):
 *   foundation  (>90 days)  — full conceptual rebuild, 90-min sessions
 *   growth      (30–90 days) — mixed theory + drills, 75-min
 *   sprint      (14–30 days) — fix free marks first, 60-min high-speed drills
 *   crisis      (<14 days)   — ONLY attempt-strategy + silly/calc fixes. No new concepts.
 */
export function generateStudyPlan(
  topicStats: TopicStat[],
  longitudinalFlags: LongitudinalFlag[] = [],
  freeMarks: FreeMarksResult | null = null,
  countdown: ExamCountdown | null = null,
  planDays = 7
): StudyDay[] {
  const urgencyMode = countdown?.urgencyMode ?? "growth";

  // ── Crisis Mode (<14 days) ─────────────────────────────────────────────
  // Don't recommend new concept study — only fixable errors
  if (urgencyMode === "crisis") {
    return generateCrisisPlan(topicStats, freeMarks, planDays);
  }

  // ── Normal modes: priority-scored topic selection ──────────────────────
  const scoredTopics = scoreTopicsByPriority(topicStats, longitudinalFlags, freeMarks, urgencyMode);
  const prioritized = scoredTopics.slice(0, planDays - 1);

  const plan: StudyDay[] = [];

  for (let i = 0; i < prioritized.length; i++) {
    const { stat, isLongitudinalFlag } = prioritized[i];
    const dominant = getDominantErrorType(stat.errorBreakdown);
    const activity = getActivityForErrorType(dominant, stat.topic, stat.chapter, urgencyMode);

    // Duration: scales with weakness severity + urgency mode
    let durationMinutes: number;
    if (urgencyMode === "foundation") {
      durationMinutes = stat.accuracy < 25 ? 90 : stat.accuracy < 50 ? 90 : 75;
    } else if (urgencyMode === "sprint") {
      durationMinutes = 60;
    } else {
      durationMinutes = stat.accuracy < 25 ? 90 : stat.accuracy < 50 ? 75 : 60;
    }

    plan.push({
      day: i + 1,
      topic: stat.topic,
      chapter: stat.chapter,
      subject: stat.subject,
      activity: isLongitudinalFlag
        ? `⚠️ RECURRING ISSUE: ${activity}`
        : activity,
      durationMinutes,
      focusErrorType: dominant,
    });
  }

  // Final day: always a mixed revision test
  plan.push({
    day: plan.length + 1,
    topic: "Revision Test",
    chapter: "All weak topics",
    subject: "Mixed",
    activity: `Attempt a ${urgencyMode === "sprint" ? "20" : "25"}-question mixed test covering all weak topics from this plan. Simulate full exam conditions.`,
    durationMinutes: urgencyMode === "sprint" ? 45 : 60,
    focusErrorType: "mixed",
  });

  return plan;
}

// ── Crisis mode (exam ≤ 14 days away) ────────────────────────────────────────

function generateCrisisPlan(
  topicStats: TopicStat[],
  freeMarks: FreeMarksResult | null,
  planDays: number
): StudyDay[] {
  const plan: StudyDay[] = [];

  // Day 1: Attempt strategy and exam-day mindset
  plan.push({
    day: 1,
    topic: "Exam Strategy",
    chapter: "Time Management",
    subject: "Mixed",
    activity:
      "Review your attempt strategy. Practice one full mock and enforce: " +
      "Round 1 = sure-shot questions only. Round 2 = moderate. Round 3 = hard. " +
      "Do NOT go linear. Set strict per-subject time budgets.",
    durationMinutes: 60,
    focusErrorType: "mixed",
  });

  // Day 2: Silly mistake elimination
  if (freeMarks && freeMarks.sillyCount > 0) {
    plan.push({
      day: 2,
      topic: "Silly Mistake Elimination",
      chapter: "Careless Errors",
      subject: "Mixed",
      activity:
        `You lost ${freeMarks.sillyCount * 5} marks to silly errors last test. ` +
        "Drill 20 easy-medium questions with this rule: read the question TWICE before selecting. " +
        "Check units, signs, and what quantity is actually being asked.",
      durationMinutes: 45,
      focusErrorType: "silly",
    });
  }

  // Day 3: Calculation accuracy
  if (freeMarks && freeMarks.calculationCount > 0) {
    plan.push({
      day: 3,
      topic: "Calculation Accuracy",
      chapter: "Arithmetic",
      subject: "Mixed",
      activity:
        `${freeMarks.calculationCount} calculation errors cost you marks you 'knew'. ` +
        "Write every step. Don't skip intermediate results. " +
        "Slow down on numerical problems by 15 seconds.",
      durationMinutes: 45,
      focusErrorType: "calculation",
    });
  }

  // Remaining days: top-2 weakest topics, quick revision only (no deep study)
  const topWeak = topicStats.filter((t) => t.isWeak).slice(0, 2);
  for (let i = 0; i < topWeak.length && plan.length < planDays - 1; i++) {
    const t = topWeak[i];
    plan.push({
      day: plan.length + 1,
      topic: t.topic,
      chapter: t.chapter,
      subject: t.subject,
      activity:
        `Quick revision only: review your notes/formula sheet for "${t.topic}". ` +
        "Solve 5–8 PYQ questions on this topic. Don't start new concepts — consolidate what you know.",
      durationMinutes: 45,
      focusErrorType: "conceptual",
    });
  }

  // Last day: full mock
  plan.push({
    day: plan.length + 1,
    topic: "Full Mock Test",
    chapter: "All subjects",
    subject: "Mixed",
    activity:
      "Take one full-length mock at exact exam time (9 AM or 3 PM). " +
      "Strict conditions, no breaks. Analyse time allocation only — don't study new content after.",
    durationMinutes: 180,
    focusErrorType: "mixed",
  });

  return plan.slice(0, planDays);
}

// ── Priority Scoring ──────────────────────────────────────────────────────────

interface ScoredTopic {
  stat: TopicStat;
  priorityScore: number;
  isLongitudinalFlag: boolean;
}

function scoreTopicsByPriority(
  topicStats: TopicStat[],
  longitudinalFlags: LongitudinalFlag[],
  freeMarks: FreeMarksResult | null,
  urgencyMode: string
): ScoredTopic[] {
  const longitudinalTopics = new Set(longitudinalFlags.map((f) => f.topic));
  const criticalTopics = new Set(
    longitudinalFlags.filter((f) => f.urgency === "critical").map((f) => f.topic)
  );

  const scored = topicStats
    .filter((t) => t.isWeak)
    .map((stat) => {
      let score = 0;

      // Core weakness weight (0–30 pts)
      score += (100 - stat.accuracy) * 0.3;

      // Volume of questions (marks at stake) — 0–20 pts
      score += Math.min(stat.attempted * 3, 20);

      // Longitudinal bonus (recurring = urgent)
      if (criticalTopics.has(stat.topic)) score += 40;
      else if (longitudinalTopics.has(stat.topic)) score += 25;

      // Free marks priority in sprint mode
      if (urgencyMode === "sprint" && stat.errorBreakdown.silly + stat.errorBreakdown.calculation > 2) {
        score += 20;
      }

      return {
        stat,
        priorityScore: score,
        isLongitudinalFlag: longitudinalTopics.has(stat.topic),
      };
    });

  return scored.sort((a, b) => b.priorityScore - a.priorityScore);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getDominantErrorType(breakdown: TopicStat["errorBreakdown"]): string {
  const sorted = Object.entries(breakdown).sort((a, b) => b[1] - a[1]);
  return sorted[0]?.[1] > 0 ? sorted[0][0] : "conceptual";
}

function getActivityForErrorType(
  type: string,
  topic: string,
  chapter: string,
  urgencyMode: string
): string {
  // Sprint mode: shorter, faster drills
  const sprintSuffix = urgencyMode === "sprint" ? " Time limit: 45 minutes max." : "";

  switch (type) {
    case "conceptual":
      if (urgencyMode === "foundation") {
        return `Revise theory for "${topic}" from first principles. Read NCERT + one coaching module. Solve 15 basic problems. Focus on understanding WHY each formula works, not just what it is.`;
      }
      return `Revise theory for "${topic}". Solve 12 problems from scratch. Focus on the WHY behind each formula.${sprintSuffix}`;

    case "calculation":
      return `Do 15 calculation-heavy drills on "${topic}". Write every step on paper. Check units, significant figures, and sign conventions. Verify each step before moving to the next.${sprintSuffix}`;

    case "silly":
      return `Attempt 12 questions on "${topic}" under strict 90-second time pressure per question. Read every option before selecting. Mark the question number next to your rough work.${sprintSuffix}`;

    case "partial_solve":
      return `Practice 10 multi-step problems on "${topic}". For every question, verify your intermediate step AND final answer against the options. Ask: "Did I answer what was actually asked?"${sprintSuffix}`;

    default:
      return `Mixed practice on "${topic}" in ${chapter}. Focus on your identified weak patterns.${sprintSuffix}`;
  }
}
