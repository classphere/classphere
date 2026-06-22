import {
  ClassifiedAnswer,
  TimeIntervalStat,
  SubjectSwitch,
  DifficultyBreakdown,
  AttemptClassification,
  PanicCascade,
} from "../../../../../../packages/types/src/analysis.types";

// ─────────────────────────────────────────────────────────────────────────────
// 1. TIME INTERVALS — "Attempts Over 3 Hours" (Fatigue Curve)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Splits the exam into 30-min buckets using `start_timestamp` (Option B).
 * Each answer is placed in the bucket that corresponds to the clock offset
 * at which the student first opened that question.
 *
 * @param classified  All classified answers (must have start_timestamp set)
 * @param totalSec    Total exam duration in seconds (default 10800 = 3 hrs)
 * @returns { intervals, fatigueSummary }
 */
export function computeTimeIntervals(
  classified: ClassifiedAnswer[],
  totalSec = 10800
): { intervals: TimeIntervalStat[]; fatigueSummary: string } {
  const BUCKET_SEC = 1800; // 30 minutes
  const numBuckets = Math.ceil(totalSec / BUCKET_SEC);

  // Initialise buckets
  const buckets: TimeIntervalStat[] = Array.from({ length: numBuckets }, (_, i) => ({
    intervalLabel: i === 0 ? "First 30 mins" : `Next 30 mins`,
    startSec: i * BUCKET_SEC,
    endSec: Math.min((i + 1) * BUCKET_SEC, totalSec),
    correct: 0,
    incorrect: 0,
    skipped: 0,
    total: 0,
    accuracy: 0,
  }));

  // Assign each answer to its bucket
  for (const a of classified) {
    const ts = a.start_timestamp ?? 0; // fallback to 0 if not set
    const bucketIndex = Math.min(
      Math.floor(ts / BUCKET_SEC),
      numBuckets - 1
    );
    const bucket = buckets[bucketIndex];
    bucket.total++;
    if (!a.selected_answer) {
      bucket.skipped++;
    } else if (a.is_correct) {
      bucket.correct++;
    } else {
      bucket.incorrect++;
    }
  }

  // Compute accuracy per bucket
  for (const b of buckets) {
    const attempted = b.correct + b.incorrect;
    b.accuracy = attempted > 0 ? Math.round((b.correct / attempted) * 100) : 0;
  }

  // ── Fatigue Summary ──────────────────────────────────────────────────────
  const attempted = buckets.filter(b => b.correct + b.incorrect > 0);
  let fatigueSummary = "Timing data not available for this test.";

  if (attempted.length >= 2) {
    const first = attempted[0];
    const last  = attempted[attempted.length - 1];
    const drop  = first.accuracy - last.accuracy;

    if (drop > 30) {
      fatigueSummary = `Your accuracy dropped significantly from ${first.accuracy}% in the ${first.intervalLabel.toLowerCase()} to ${last.accuracy}% in the final interval — a ${drop}% fall. This is a classic fatigue signal.`;
    } else if (drop > 15) {
      fatigueSummary = `Accuracy eased from ${first.accuracy}% early on to ${last.accuracy}% by the end. A moderate dip — keep an eye on your pacing in long tests.`;
    } else if (drop < -10) {
      // Improved over time
      fatigueSummary = `Impressive — your accuracy actually improved from ${first.accuracy}% to ${last.accuracy}% as the test progressed. You got stronger as you warmed up.`;
    } else {
      fatigueSummary = `Consistent performance throughout the test — accuracy held steady around ${Math.round(attempted.reduce((s, b) => s + b.accuracy, 0) / attempted.length)}% across all intervals.`;
    }
  }

  return { intervals: buckets, fatigueSummary };
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. SUBJECT MOVEMENT — Navigation Timeline
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Detects how the student traversed subjects during the exam.
 * Uses start_timestamp to sort questions chronologically, then groups
 * consecutive questions by subject into "blocks".
 *
 * e.g. Ph→Ch→Ph→Math = 4 blocks in the Subject Movement timeline.
 */
export function computeSubjectMovement(classified: ClassifiedAnswer[]): SubjectSwitch[] {
  if (classified.length === 0) return [];

  // Sort by start_timestamp (chronological visit order)
  const sorted = [...classified].sort((a, b) => a.start_timestamp - b.start_timestamp);

  const switches: SubjectSwitch[] = [];
  let currentSubject = sorted[0].question.subject;
  let blockStartTs   = sorted[0].start_timestamp;
  let seqIndex       = 0;

  for (let i = 1; i <= sorted.length; i++) {
    const isLast    = i === sorted.length;
    const nextSubj  = isLast ? null : sorted[i].question.subject;

    if (isLast || nextSubj !== currentSubject) {
      const blockEndTs = isLast
        ? sorted[i - 1].start_timestamp + (sorted[i - 1].time_taken_sec || 60)
        : sorted[i].start_timestamp;

      switches.push({
        subject: currentSubject,
        durationSec: Math.max(0, blockEndTs - blockStartTs),
        sequenceIndex: seqIndex++,
      });

      if (!isLast) {
        currentSubject = nextSubj!;
        blockStartTs   = sorted[i].start_timestamp;
      }
    }
  }

  return switches;
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. DIFFICULTY BREAKDOWN — Per Subject & Overall
// ─────────────────────────────────────────────────────────────────────────────

type DiffSlot = { correct: number; incorrect: number; skipped: number; total: number };

function emptyDiff(): DiffSlot {
  return { correct: 0, incorrect: 0, skipped: 0, total: 0 };
}

/**
 * Groups answers by (subject, difficulty) and counts correct/incorrect/skipped.
 * Returns one DifficultyBreakdown for "Overall" + one per unique subject.
 */
export function computeDifficultyBreakdown(classified: ClassifiedAnswer[]): DifficultyBreakdown[] {
  // Accumulator: { [subject]: { easy, medium, hard } }
  const acc: Record<string, { easy: DiffSlot; medium: DiffSlot; hard: DiffSlot }> = {};
  const overall = { easy: emptyDiff(), medium: emptyDiff(), hard: emptyDiff() };

  for (const a of classified) {
    const subj = a.question.subject;
    const diff = a.question.difficulty as "easy" | "medium" | "hard";

    if (!acc[subj]) {
      acc[subj] = { easy: emptyDiff(), medium: emptyDiff(), hard: emptyDiff() };
    }

    const slot    = acc[subj][diff];
    const oslot   = overall[diff];

    for (const s of [slot, oslot]) {
      s.total++;
      if (!a.selected_answer)  { s.skipped++;   }
      else if (a.is_correct)   { s.correct++;   }
      else                     { s.incorrect++; }
    }
  }

  const results: DifficultyBreakdown[] = [
    { subject: "Overall", ...overall },
    ...Object.entries(acc).map(([subject, d]) => ({ subject, ...d })),
  ];

  return results;
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. ATTEMPT CLASSIFICATION — Perfect / Overtime / Wasted / Confused
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Labels every attempted question according to MathonGo's 4-category system.
 *
 * Definitions (relative to the per-subject average time):
 *   Perfect   — correct AND time_taken_sec ≤ avgTime × 1.5
 *   Overtime  — correct BUT time_taken_sec ≥ avgTime × 2.0  (score at risk next time)
 *   Wasted    — incorrect AND time_taken_sec ≥ avgTime × 1.5 (double penalty)
 *   Confused  — skipped (no answer) AND 15s ≤ time_taken_sec < avgTime × 2.0
 *
 * Returns one entry for "Overall" + one per unique subject.
 */
export function classifyAttempts(classified: ClassifiedAnswer[]): AttemptClassification[] {
  // Compute per-subject avg time (among attempted questions only)
  const timeBySubject: Record<string, number[]> = {};
  for (const a of classified) {
    if (!timeBySubject[a.question.subject]) timeBySubject[a.question.subject] = [];
    if (a.selected_answer || a.time_taken_sec > 5) {
      timeBySubject[a.question.subject].push(a.time_taken_sec);
    }
  }
  const avgBySubject: Record<string, number> = {};
  for (const [subj, times] of Object.entries(timeBySubject)) {
    avgBySubject[subj] = times.length > 0
      ? times.reduce((s, t) => s + t, 0) / times.length
      : 120; // default 2-min avg
  }

  const allTimes = classified.filter(a => a.selected_answer).map(a => a.time_taken_sec);
  const globalAvg = allTimes.length > 0
    ? allTimes.reduce((s, t) => s + t, 0) / allTimes.length
    : 120;

  // Accumulator
  const acc: Record<string, AttemptClassification> = {};
  const overallRow: AttemptClassification = {
    subject: "Overall", perfect: 0, overtime: 0, wasted: 0, confused: 0, total: 0,
  };

  for (const a of classified) {
    const subj = a.question.subject;
    if (!acc[subj]) {
      acc[subj] = { subject: subj, perfect: 0, overtime: 0, wasted: 0, confused: 0, total: 0 };
    }

    const avg = avgBySubject[subj] ?? globalAvg;
    const t   = a.time_taken_sec;

    for (const row of [acc[subj], overallRow]) {
      row.total++;
      if (a.is_correct) {
        if (t >= avg * 2.0) {
          row.overtime++;
        } else {
          row.perfect++;
        }
      } else if (a.selected_answer) {
        // Answered but wrong
        if (t >= avg * 1.5) {
          row.wasted++;
        }
        // If quick wrong: already classified as silly in mistake-classifier, skip here
      } else {
        // Skipped
        if (t >= 15 && t < avg * 2.0) {
          row.confused++;
        }
      }
    }
  }

  return [overallRow, ...Object.values(acc)];
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. PANIC CASCADE DETECTOR
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Scans a sliding window of WINDOW_SIZE consecutive questions (by visit order).
 *
 * Panic Cascade is detected when:
 *   • 4+ of 6 questions are wrong/skipped
 *   • AND the avg time in that window dropped ≥ 30% vs the prior window
 *     (student started rushing / clicking randomly)
 *
 * This models the "I panicked and just started tapping" behaviour seen in exam anxiety.
 */
export function detectPanicCascade(classified: ClassifiedAnswer[]): PanicCascade {
  const NO_PANIC: PanicCascade = {
    detected: false,
    startQuestionNumber: null,
    endQuestionNumber: null,
    incorrectInWindow: 0,
    triggerSubject: null,
    description: "No panic cascade detected — your performance was consistent throughout the test.",
    tip: "Keep maintaining your composure during tests.",
  };

  if (classified.length < 8) return NO_PANIC;

  const WINDOW = 6;
  const MIN_WRONG = 4;
  const TIME_DROP_THRESHOLD = 0.30; // 30% drop in avg time

  // Sort chronologically by start_timestamp
  const sorted = [...classified].sort((a, b) => a.start_timestamp - b.start_timestamp);

  const avgTime = (slice: ClassifiedAnswer[]) =>
    slice.reduce((s, a) => s + a.time_taken_sec, 0) / slice.length;

  const wrongCount = (slice: ClassifiedAnswer[]) =>
    slice.filter(a => !a.is_correct).length;

  for (let i = WINDOW; i <= sorted.length - 1; i++) {
    const prior   = sorted.slice(i - WINDOW, i);
    const current = sorted.slice(i, i + WINDOW);
    if (current.length < WINDOW) break;

    const wrongInCurrent = wrongCount(current);
    if (wrongInCurrent < MIN_WRONG) continue;

    const priorAvg   = avgTime(prior);
    const currentAvg = avgTime(current);
    const drop       = priorAvg > 0 ? (priorAvg - currentAvg) / priorAvg : 0;

    if (drop >= TIME_DROP_THRESHOLD) {
      // Panic cascade found — find the most represented subject in the window
      const subjectCounts: Record<string, number> = {};
      for (const a of current) {
        subjectCounts[a.question.subject] = (subjectCounts[a.question.subject] ?? 0) + 1;
      }
      const triggerSubject = Object.entries(subjectCounts)
        .sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

      const startQ = current[0].question.question_number;
      const endQ   = current[current.length - 1].question.question_number;

      return {
        detected: true,
        startQuestionNumber: startQ,
        endQuestionNumber: endQ,
        incorrectInWindow: wrongInCurrent,
        triggerSubject,
        description: `Panic cascade detected around questions ${startQ}–${endQ}. You got ${wrongInCurrent} of ${WINDOW} wrong AND your avg time dropped ${Math.round(drop * 100)}% — a sign of rushed, anxious answering${triggerSubject ? ` in ${triggerSubject}` : ""}.`,
        tip: "When you feel panic coming on, skip the question immediately, mark it for review, and move to a subject you're comfortable with. Regaining momentum on easier questions resets your focus.",
      };
    }
  }

  return NO_PANIC;
}
