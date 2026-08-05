/**
 * Sustained-performance ranking.
 *
 * The third of the three boards: per-paper answers "how did I do on this test",
 * weekly answers "how much did I solve this week", and this answers "how strong
 * am I overall". It is deliberately not a sum of everything a student has ever
 * scored.
 *
 * An earlier version ranked on `total_score × accuracy`, a lifetime running
 * total. Because the total only grows, volume beat ability: forty papers at 45%
 * outranked six at 85%. It also compared raw scores across papers of completely
 * different difficulty, so a student who only sat easy chapter tests looked
 * stronger than one sitting full mocks.
 *
 * What replaces it, and why each part is there:
 *
 *   percentile (60%)  Standing among peers who sat the *same paper*. This is
 *                     what makes difficulty irrelevant — if a paper was brutal
 *                     and the whole batch scored 40%, nobody is penalised for
 *                     sitting it. Raw marks cannot express that.
 *   percentage (22%)  Absolute score still matters; a batch where everyone is
 *                     weak should not produce a chart-topping percentile alone.
 *   consistency (12%) Derived from score variance. Rewards the student who is
 *                     reliably strong over the one who spikes and collapses.
 *   trend (6%)        Recent three against the rest. A student climbing gets
 *                     credit for climbing.
 *
 * The window and floor matter as much as the weights: only the last
 * RECENT_WINDOW attempts count, and only students with at least MIN_TESTS are
 * ranked at all. Together they mean a student is judged on who they are now,
 * with enough evidence to be worth judging.
 *
 * Pure by design — no database access — so the batch leaderboard and the
 * institute dashboard's top performers cannot drift apart, and so the weighting
 * can be tested directly.
 */

/** Below this many submitted papers there is not enough evidence to rank someone. */
export const MIN_TESTS_FOR_LIFETIME_RANK = 3;

/** Only the most recent attempts count, so old form does not follow a student forever. */
export const RECENT_WINDOW = 8;

/** How much more the newest attempt weighs than the oldest one in the window. */
const RECENCY_STEP = 0.12;

export interface LifetimeAttempt {
  studentId: string;
  paperId: string;
  /** 0–100. Caller derives this from score / max_score. */
  percentage: number;
  submittedAt: string | null;
}

export interface LifetimeRankingEntry {
  student_id: string;
  rank: number;
  tests_taken: number;
  average_percentage: number;
  average_percentile: number;
  consistency: number;
  trend: number;
  performance_score: number;
}

/**
 * Rank a population by sustained performance.
 *
 * `attempts` must already be scoped to the population being compared — a batch,
 * or an institute. Percentiles are computed within exactly that set, so a
 * student's standing always means "among the people they are being ranked
 * against", never a wider or narrower group.
 */
export function rankLifetimePerformance(attempts: LifetimeAttempt[]): LifetimeRankingEntry[] {
  const byPaper = new Map<string, number[]>();
  const byStudent = new Map<string, LifetimeAttempt[]>();

  for (const attempt of attempts) {
    if (!attempt.paperId || !attempt.studentId) continue;
    if (!Number.isFinite(attempt.percentage)) continue;
    const percentage = Math.max(0, Math.min(100, attempt.percentage));
    const normalised = { ...attempt, percentage };
    byPaper.set(attempt.paperId, [...(byPaper.get(attempt.paperId) ?? []), percentage]);
    byStudent.set(attempt.studentId, [...(byStudent.get(attempt.studentId) ?? []), normalised]);
  }

  const scored = [...byStudent.entries()]
    .filter(([, studentAttempts]) => studentAttempts.length >= MIN_TESTS_FOR_LIFETIME_RANK)
    .map(([studentId, studentAttempts]) => {
      // Newest first, then capped — the window is the recent form, not the archive.
      const ordered = [...studentAttempts]
        .sort((a, b) => new Date(b.submittedAt ?? 0).getTime() - new Date(a.submittedAt ?? 0).getTime())
        .slice(0, RECENT_WINDOW);

      const weighted = ordered.reduce(
        (sum, attempt, index) => {
          const weight = 1 + (ordered.length - index - 1) * RECENCY_STEP;
          const peers = byPaper.get(attempt.paperId) ?? [];
          // Share of peers this attempt beat. With a single sitting there is no
          // one to compare against, so the raw percentage stands in rather than
          // handing out a fabricated 100th percentile.
          const higherOrEqual = peers.filter((peer) => peer >= attempt.percentage).length;
          const percentile = peers.length > 1
            ? ((peers.length - higherOrEqual) / (peers.length - 1)) * 100
            : attempt.percentage;
          return {
            weight: sum.weight + weight,
            percentage: sum.percentage + attempt.percentage * weight,
            percentile: sum.percentile + percentile * weight,
          };
        },
        { weight: 0, percentage: 0, percentile: 0 },
      );

      const averagePercentage = weighted.percentage / weighted.weight;
      const averagePercentile = weighted.percentile / weighted.weight;

      const variance =
        ordered.reduce((sum, attempt) => sum + (attempt.percentage - averagePercentage) ** 2, 0) / ordered.length;
      const consistency = Math.max(0, Math.min(100, 100 - Math.sqrt(variance) * 2));

      const recentCount = Math.min(3, ordered.length);
      const recentAverage =
        ordered.slice(0, recentCount).reduce((sum, attempt) => sum + attempt.percentage, 0) / recentCount;
      const earlier = ordered.slice(3);
      const earlierAverage = earlier.length
        ? earlier.reduce((sum, attempt) => sum + attempt.percentage, 0) / earlier.length
        : recentAverage;
      // Clamped so one exceptional paper cannot dominate the whole score.
      const trend = Math.max(-15, Math.min(15, recentAverage - earlierAverage));

      const performanceScore =
        averagePercentile * 0.6 +
        averagePercentage * 0.22 +
        consistency * 0.12 +
        ((trend + 15) / 30) * 100 * 0.06;

      return {
        student_id: studentId,
        rank: 0, // assigned after sorting
        tests_taken: studentAttempts.length,
        average_percentage: Math.round(averagePercentage),
        average_percentile: Math.round(averagePercentile),
        consistency: Math.round(consistency),
        trend: Math.round(trend),
        performance_score: Math.round(performanceScore),
      };
    });

  return scored
    .sort((a, b) => b.performance_score - a.performance_score || b.tests_taken - a.tests_taken)
    .map((entry, index) => ({ ...entry, rank: index + 1 }));
}
