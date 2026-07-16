import {
  ClassifiedAnswer,
  LongitudinalFlag,
  StudentErrorProfile,
  TopicErrorHistoryEntry,
  TopicStat,
} from "../../../../../../../packages/types/src/analysis.types";

/**
 * Builds the updated error-profile entry for the CURRENT attempt
 * (this gets persisted back to DB after analysis).
 */
export function buildCurrentTopicHistoryEntries(
  attemptId: string,
  topicStats: TopicStat[]
): Record<string, TopicErrorHistoryEntry> {
  const now = Date.now();
  const result: Record<string, TopicErrorHistoryEntry> = {};

  for (const stat of topicStats) {
    const key = `${stat.chapter}::${stat.topic}`;
    const dominantError = getDominantError(stat.errorBreakdown);

    result[key] = {
      attemptId,
      attemptDate: now,
      accuracy: stat.accuracy,
      wasWeak: stat.isWeak,
      dominantErrorType: dominantError,
      questionsAttempted: stat.attempted,
      subject: stat.subject,
      chapter: stat.chapter,
    };
  }

  return result;
}

/**
 * Core function: compares current attempt's topic stats against the
 * student's historical profile to detect patterns.
 */
export function detectLongitudinalPatterns(
  topicStats: TopicStat[],
  profile: StudentErrorProfile | null
): LongitudinalFlag[] {
  // No history yet — first attempt, nothing to compare
  if (!profile || Object.keys(profile.topicHistory).length === 0) {
    return [];
  }

  const flags: LongitudinalFlag[] = [];

  for (const stat of topicStats) {
    const key = `${stat.chapter}::${stat.topic}`;
    const history = profile.topicHistory[key];

    // Not enough prior data for this topic
    if (!history || history.length < 2) {
      continue;
    }

    // Sort history ascending by date (oldest first)
    const sorted = [...history].sort((a, b) => a.attemptDate - b.attemptDate);
    const recentHistory = sorted.slice(-5); // look at last 5 attempts max
    const accuracyTrend = recentHistory.map((h) => h.accuracy);

    // ── Pattern 1: Recurring Blind Spot ────────────────────────────────────
    // Topic flagged as weak in 3+ consecutive recent attempts AND still weak now
    const consecutiveWeak = countTrailingWeak(recentHistory);
    if (consecutiveWeak >= 3 && stat.isWeak) {
      flags.push({
        type: "recurring_blind_spot",
        topic: stat.topic,
        chapter: stat.chapter,
        subject: stat.subject,
        occurrences: consecutiveWeak,
        accuracyTrend,
        message: `You've struggled with "${stat.topic}" in ${consecutiveWeak} consecutive tests. ` +
          `This is not a revision gap — it's a fundamental knowledge gap. Your accuracy hasn't crossed 50% in any of these tests.`,
        urgency: consecutiveWeak >= 5 ? "critical" : "high",
        actionRequired: `Go back to first principles for "${stat.topic}". ` +
          `Solve 5 very basic (NCERT-level) questions first, then build up. Consider asking a teacher directly.`,
      });
      continue; // no need to also raise "no_improvement" for same topic
    }

    // ── Pattern 2: No Improvement ───────────────────────────────────────────
    // Topic was weak in last 3 tests, accuracy not improving (delta < 5%)
    if (consecutiveWeak >= 3) {
      const oldest = recentHistory[0].accuracy;
      const newest = stat.accuracy;
      const improvement = newest - oldest;
      if (improvement < 5) {
        flags.push({
          type: "no_improvement",
          topic: stat.topic,
          chapter: stat.chapter,
          subject: stat.subject,
          occurrences: consecutiveWeak,
          accuracyTrend,
          message: `You've attempted "${stat.topic}" ${consecutiveWeak} times and your accuracy hasn't improved ` +
            `(${oldest.toFixed(0)}% → ${newest.toFixed(0)}%). Your current study approach isn't working for this topic.`,
          urgency: "high",
          actionRequired: `Change your approach: don't do more practice questions. Instead, study the concept from a ` +
            `different source (video, different book). The method you're using isn't clicking.`,
        });
      }
    }

    // ── Pattern 3: Regression ───────────────────────────────────────────────
    // Topic was performing well (avg > 60%), now dropped below 40%
    if (history.length >= 2) {
      const prevAvg = recentHistory.slice(0, -1).reduce((s, h) => s + h.accuracy, 0) /
        (recentHistory.length - 1);
      if (prevAvg > 60 && stat.accuracy < 40) {
        flags.push({
          type: "regression",
          topic: stat.topic,
          chapter: stat.chapter,
          subject: stat.subject,
          occurrences: 1,
          accuracyTrend,
          message: `"${stat.topic}" was your strength (avg ${prevAvg.toFixed(0)}% previously), ` +
            `but you dropped to ${stat.accuracy.toFixed(0)}% this test. ` +
            `Something you understood before has become confused — possibly mixed up with a related concept.`,
          urgency: "medium",
          actionRequired: `Quick revision of "${stat.topic}" — focus on the definition and boundary conditions of the concept. ` +
            `You likely confused it with "${stat.chapter}" concepts you studied recently.`,
        });
      }
    }

    // ── Pattern 4: Newly Weak ───────────────────────────────────────────────
    // Was consistently OK, appeared weak for the first time this test
    const wasAlwaysFine = recentHistory.every((h) => !h.wasWeak);
    if (wasAlwaysFine && stat.isWeak && history.length >= 2) {
      flags.push({
        type: "newly_weak",
        topic: stat.topic,
        chapter: stat.chapter,
        subject: stat.subject,
        occurrences: 1,
        accuracyTrend,
        message: `"${stat.topic}" appeared weak for the first time this test. ` +
          `You've handled this topic fine before — this may be exam fatigue, a harder question set, or a gap in an advanced application.`,
        urgency: "medium",
        actionRequired: `Don't panic — revisit the specific questions you got wrong and check if it was a question-format issue ` +
          `(advanced application) or a genuine gap. One round of revision should recover this.`,
      });
    }
  }

  // Sort: critical first, then high, then medium
  return flags.sort((a, b) => urgencyOrder(b.urgency) - urgencyOrder(a.urgency));
}

// ── Helpers ────────────────────────────────────────────────────────────────

/**
 * Counts how many of the MOST RECENT entries in sorted history
 * have wasWeak = true (trailing consecutive weak).
 */
function countTrailingWeak(sorted: TopicErrorHistoryEntry[]): number {
  let count = 0;
  for (let i = sorted.length - 1; i >= 0; i--) {
    if (sorted[i].wasWeak) count++;
    else break;
  }
  return count;
}

function getDominantError(
  breakdown: { conceptual: number; calculation: number; silly: number; partial_solve: number }
): string {
  const entries = Object.entries(breakdown) as [string, number][];
  const sorted = entries.sort((a, b) => b[1] - a[1]);
  return sorted[0]?.[1] > 0 ? sorted[0][0] : "conceptual";
}

function urgencyOrder(u: "medium" | "high" | "critical"): number {
  return u === "critical" ? 3 : u === "high" ? 2 : 1;
}
