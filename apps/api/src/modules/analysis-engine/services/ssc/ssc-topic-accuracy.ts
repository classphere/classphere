import { ClassifiedAnswer, TopicStat } from "../../../../../../../packages/types/src/analysis.types";

/**
 * SSC Topic Accuracy
 * ─────────────────────────────────────────────────────────────
 * Groups classified answers by (Subject → Chapter → Topic) hierarchy.
 * For SSC, a topic is considered weak if:
 *   • Attempted ≥ 2 questions (lower gate than JEE's 3, because 25 Qs per section)
 *   • Accuracy < 50% OR accuracy < batchAvg - 15%
 *
 * Additionally, we track the "Theme" level — the chapter — because
 * SSC GK/GA revision is chapter-level (e.g., "Fundamental Rights") not
 * question-level (individual facts are too granular to revise systematically).
 */
export function computeSscTopicAccuracy(
  classified: ClassifiedAnswer[],
  batchAvgByTopic?: Map<string, number>
): TopicStat[] {
  // Group by chapter (the "theme" students revise)
  const groups = new Map<string, ClassifiedAnswer[]>();
  for (const ans of classified) {
    const key = ans.question.chapter || "General";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(ans);
  }

  const stats: TopicStat[] = [];

  for (const [chapter, group] of groups) {
    const attempted = group.filter(a => a.selected_answer !== null && a.selected_answer !== "").length;
    const correct   = group.filter(a => a.is_correct).length;
    const accuracy  = attempted > 0 ? (correct / attempted) * 100 : 0;
    const batchAvg  = batchAvgByTopic?.get(chapter) ?? 55; // SSC default batch avg is slightly lower than JEE

    const errors = group.filter(a => !a.is_correct && a.selected_answer !== null && a.selected_answer !== "");
    const errorBreakdown = {
      conceptual:    errors.filter(e => e.classification?.type === "conceptual").length,
      calculation:   errors.filter(e => e.classification?.type === "calculation").length,
      silly:         errors.filter(e => e.classification?.type === "silly").length,
      partial_solve: errors.filter(e => e.classification?.type === "partial_solve").length,
    };

    // SSC weak gate: ≥ 2 questions attempted (not 3 like JEE)
    const isWeak = attempted >= 2 && (accuracy < 50 || accuracy < batchAvg - 15);

    stats.push({
      chapter:    group[0].question.subject,   // Subject used as subtitle
      topic:      chapter,                      // Chapter = displayed theme
      subject:    group[0].question.subject,
      attempted,
      correct,
      accuracy,
      avgTimeSec: group.reduce((s, a) => s + a.time_taken_sec, 0) / group.length,
      difficulty: modalValue(group.map(a => a.question.difficulty)),
      isWeak,
      batchAvg,
      errorBreakdown,
    });
  }

  // Sort: weakest chapters first
  return stats.sort((a, b) => a.accuracy - b.accuracy);
}

function modalValue<T>(arr: T[]): T {
  if (arr.length === 0) return "medium" as any;
  const freq = new Map<T, number>();
  for (const v of arr) freq.set(v, (freq.get(v) ?? 0) + 1);
  return [...freq.entries()].sort((a, b) => b[1] - a[1])[0][0];
}
