import { ClassifiedAnswer, TopicStat } from "../../../../../../packages/types/src/analysis.types";

export function computeTopicAccuracy(
  classified: ClassifiedAnswer[],
  batchAvgByTopic?: Map<string, number>
): TopicStat[] {
  // Group by "chapter::topic"
  const groups = new Map<string, ClassifiedAnswer[]>();
  for (const ans of classified) {
    const key = `${ans.question.chapter}::${ans.question.topic}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(ans);
  }

  const stats: TopicStat[] = [];

  for (const [key, group] of groups) {
    const [chapter, topic] = key.split("::");
    const attempted = group.filter(a => a.selected_answer !== null).length;
    const correct = group.filter(a => a.is_correct).length;
    const accuracy = attempted > 0 ? (correct / attempted) * 100 : 0;
    const batchAvg = batchAvgByTopic?.get(key) ?? 60; // default 60% if no data

    // Count each error type within this topic
    const errors = group.filter(a => !a.is_correct && a.selected_answer !== null);
    const errorBreakdown = {
      conceptual: errors.filter(e => e.classification.type === "conceptual").length,
      calculation: errors.filter(e => e.classification.type === "calculation").length,
      silly: errors.filter(e => e.classification.type === "silly").length,
      partial_solve: errors.filter(e => e.classification.type === "partial_solve").length,
    };

    // Weak = accuracy < 50% OR accuracy is >15 points below batch average
    const isWeak = accuracy < 50 || accuracy < batchAvg - 15;

    stats.push({
      chapter,
      topic,
      subject: group[0].question.subject,
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

  // Sort: weakest topics first
  return stats.sort((a, b) => a.accuracy - b.accuracy);
}

// Returns the most frequent value in an array
function modalValue<T>(arr: T[]): T {
  const freq = new Map<T, number>();
  for (const v of arr) freq.set(v, (freq.get(v) ?? 0) + 1);
  return [...freq.entries()].sort((a, b) => b[1] - a[1])[0][0];
}
