import { TopicStat, BoosterConfig } from "../../../../../../packages/types/src/analysis.types";

export function generateBoosterConfig(
  topicStats: TopicStat[],
  allSeenQuestionIds: string[]
): BoosterConfig {
  // Target top 3 weakest topics
  const weak = topicStats.filter(t => t.isWeak).slice(0, 3);

  // Difficulty mix: easier start if accuracy is very low
  const avgAccuracy = weak.reduce((s, t) => s + t.accuracy, 0) / (weak.length || 1);
  const diffMix = avgAccuracy < 25
    ? { easy: 7, medium: 6, hard: 2 }   // mostly easy — build confidence
    : { easy: 3, medium: 8, hard: 4 };  // standard mix

  return {
    chapters: [...new Set(weak.map(t => t.chapter))],
    topics: weak.map(t => t.topic),
    questionCount: 15,           // micro booster default (30 for full booster)
    difficultyMix: diffMix,
    reason: `Targeting your ${weak.length} weakest topics: ${weak.map(t => t.topic).join(", ")}`,
    excludeQuestionIds: allSeenQuestionIds,
  };
}
