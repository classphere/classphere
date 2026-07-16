import { ClassifiedAnswer, TopicStat } from "../../../../../../../packages/types/src/analysis.types";

export function computeTopicAccuracy(
  classified: ClassifiedAnswer[],
  batchAvgByTopic?: Map<string, number>
): TopicStat[] {
  // Group by chapter::topic composite key to avoid collisions (ENGINE-4)
  const groups = new Map<string, ClassifiedAnswer[]>();
  for (const ans of classified) {
    const key = `${ans.question.chapter || "General"}::${ans.question.topic || "General"}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(ans);
  }

  const stats: TopicStat[] = [];

  for (const [compositeKey, group] of groups) {
    const [chapter, topic] = compositeKey.split("::");
    const attempted = group.filter(a => a.selected_answer !== null && a.selected_answer !== "").length;
    const correct = group.filter(a => a.is_correct).length;
    const accuracy = attempted > 0 ? (correct / attempted) * 100 : 0;
    const batchAvg = batchAvgByTopic?.get(compositeKey) ?? batchAvgByTopic?.get(chapter) ?? 60; // default 60% if no data

    // Count each error type within this topic
    const errors = group.filter(a => !a.is_correct && a.selected_answer !== null && a.selected_answer !== "");
    const errorBreakdown = {
      conceptual: errors.filter(e => e.classification?.type === "conceptual").length,
      calculation: errors.filter(e => e.classification?.type === "calculation").length,
      silly: errors.filter(e => e.classification?.type === "silly").length,
      partial_solve: errors.filter(e => e.classification?.type === "partial_solve").length,
    };

    // A topic is only weak if it meets the minimum attempt gate (attempted >= 3)
    // AND accuracy < 50% or significantly below batch average
    const isWeak = attempted >= 3 && (accuracy < 50 || accuracy < batchAvg - 15);
    const avgTimeSec = group.length > 0 ? group.reduce((s, a) => s + a.time_taken_sec, 0) / group.length : 0;

    stats.push({
      chapter: chapter,
      topic: topic || group[0]?.question.topic || "",
      subject: group[0]?.question.subject ?? "",
      attempted,
      correct,
      accuracy,
      avgTimeSec,
      difficulty: modalValue(group.map(a => a.question.difficulty)),
      isWeak,
      batchAvg,
      errorBreakdown,
    });
  }

  // Sort: weakest topics first
  return stats.sort((a, b) => a.accuracy - b.accuracy);
}

// Returns the most frequent value in an array
function modalValue<T>(arr: T[]): T {
  if (arr.length === 0) return "medium" as any;
  const freq = new Map<T, number>();
  for (const v of arr) freq.set(v, (freq.get(v) ?? 0) + 1);
  return [...freq.entries()].sort((a, b) => b[1] - a[1])[0][0];
}
