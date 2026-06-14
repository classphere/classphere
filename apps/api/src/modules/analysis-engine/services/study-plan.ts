import { TopicStat, StudyDay } from "../../../../../../packages/types/src/analysis.types";

export function generateStudyPlan(
  topicStats: TopicStat[],
  planDays = 7
): StudyDay[] {
  // Take up to 6 weakest topics (leave 1 day for revision)
  const weak = topicStats.filter((t) => t.isWeak).slice(0, planDays - 1);
  const plan: StudyDay[] = [];

  for (let i = 0; i < weak.length; i++) {
    const t = weak[i];
    const dominant = getDominantErrorType(t.errorBreakdown);

    // Activity is error-type-aware, not just accuracy-based
    const activity = getActivityForErrorType(dominant, t.topic, t.chapter);

    // Duration scales with severity of weakness
    const durationMinutes = t.accuracy < 25 ? 90 : t.accuracy < 50 ? 75 : 60;

    plan.push({
      day: i + 1,
      topic: t.topic,
      chapter: t.chapter,
      subject: t.subject,
      activity,
      durationMinutes,
      focusErrorType: dominant,
    });
  }

  // Always end with a mixed revision test
  plan.push({
    day: plan.length + 1,
    topic: "Revision",
    chapter: "All weak topics",
    subject: "Mixed",
    activity: "Attempt a 25-question mixed test covering all weak topics from this plan.",
    durationMinutes: 60,
    focusErrorType: "mixed",
  });

  return plan;
}

function getDominantErrorType(breakdown: TopicStat["errorBreakdown"]): string {
  const sorted = Object.entries(breakdown).sort((a, b) => b[1] - a[1]);
  return sorted[0]?.[0] ?? "conceptual";
}

function getActivityForErrorType(type: string, topic: string, chapter: string): string {
  switch (type) {
    case "conceptual":
      return `Revise theory for "${topic}". Solve 15 basic problems from scratch. Focus on understanding the WHY behind each formula.`;
    case "calculation":
      return `Do 20 calculation-heavy drills on "${topic}". Write out every step. Check units and significant figures. Verify each step before moving to the next.`;
    case "silly":
      return `Attempt 15 questions on "${topic}" under strict 90-second time pressure per question. Read every option before selecting. No rushing.`;
    case "partial_solve":
      return `Practice 10 multi-step problems on "${topic}". Always verify your intermediate result AND final answer against the options. Ask: did I answer what was actually asked?`;
    default:
      return `Mixed practice on "${topic}" in ${chapter}. Focus on your identified weak areas.`;
  }
}
