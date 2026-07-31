/**
 * Spaced repetition scheduling — an SM-2 variant tuned for exam preparation.
 *
 * The scheduled unit is a topic, not a question. A review "grade" is therefore
 * the accuracy the student scored on a fresh set of questions drawn from that
 * topic, rather than a self-reported "easy/hard" button. That removes the
 * self-assessment bias SM-2 normally carries: the schedule reacts to measured
 * performance only.
 *
 * Differences from textbook SM-2, and why:
 *  - Second interval is 3 days rather than 6. JEE/NEET preparation runs on a
 *    compressed timeline against a fixed exam date, so early reinforcement
 *    matters more than long-term retention efficiency.
 *  - Intervals are capped, so nothing disappears for months before the exam.
 *  - Grades come from accuracy, mapped onto SM-2's 0–5 quality scale.
 */

/** A review is judged passed at or above this accuracy. */
export const PASS_ACCURACY = 60;

/** SM-2's floor. Below this, intervals stop growing meaningfully. */
export const MIN_EASE = 1.3;
export const MAX_EASE = 2.8;

/**
 * No topic waits longer than this. Textbook SM-2 would happily push a
 * well-known topic out by a year; an aspirant sitting the exam in months needs
 * to see it again well before that.
 */
export const MAX_INTERVAL_DAYS = 45;

/** Interval applied after the first successful review. */
const FIRST_INTERVAL_DAYS = 1;
/** Interval applied after the second successful review. */
const SECOND_INTERVAL_DAYS = 3;

export interface ReviewState {
  intervalDays: number;
  ease: number;
  repetitions: number;
  lapses: number;
}

export interface ScheduledReview extends ReviewState {
  /** When this topic should next be surfaced. */
  dueAt: Date;
  /** False when the review was failed and the topic was reset. */
  passed: boolean;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/**
 * Map an accuracy percentage onto SM-2's 0–5 quality scale.
 * 100% -> 5, 60% (the pass mark) -> 3, 0% -> 0.
 */
export function accuracyToQuality(accuracyPct: number): number {
  const accuracy = clamp(accuracyPct, 0, 100);
  return clamp(Math.round(accuracy / 20), 0, 5);
}

/**
 * Advance a topic's schedule after a review.
 *
 * @param state       current scheduling state (use `initialState()` for a new topic)
 * @param accuracyPct accuracy on the questions just answered, 0–100
 * @param now         injected for testability
 */
export function scheduleNextReview(
  state: ReviewState,
  accuracyPct: number,
  now: Date = new Date(),
): ScheduledReview {
  const quality = accuracyToQuality(accuracyPct);
  const passed = accuracyPct >= PASS_ACCURACY;

  // SM-2 ease update. A perfect review nudges ease up; a barely-passed one
  // pulls it down, so topics that are consistently a struggle keep returning
  // sooner even once the student scrapes a pass.
  const easeDelta = 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02);
  const ease = clamp(state.ease + easeDelta, MIN_EASE, MAX_EASE);

  if (!passed) {
    // Lapse: the topic goes back to the start of the ladder and returns
    // tomorrow. Ease keeps its (reduced) value, so a repeatedly failed topic
    // grows its intervals more slowly on the way back up.
    return {
      intervalDays: FIRST_INTERVAL_DAYS,
      ease,
      repetitions: 0,
      lapses: state.lapses + 1,
      dueAt: addDays(now, FIRST_INTERVAL_DAYS),
      passed: false,
    };
  }

  const repetitions = state.repetitions + 1;
  let intervalDays: number;
  if (repetitions === 1) {
    intervalDays = FIRST_INTERVAL_DAYS;
  } else if (repetitions === 2) {
    intervalDays = SECOND_INTERVAL_DAYS;
  } else {
    intervalDays = Math.round(Math.max(state.intervalDays, 1) * ease);
  }
  intervalDays = clamp(intervalDays, 1, MAX_INTERVAL_DAYS);

  return {
    intervalDays,
    ease,
    repetitions,
    lapses: state.lapses,
    dueAt: addDays(now, intervalDays),
    passed: true,
  };
}

/**
 * Seed state for a topic the student has just encountered in a test, before it
 * has ever been formally revised.
 *
 * A topic they bombed should come back tomorrow; one they aced does not need to
 * reappear for a while. Seeding from the observed accuracy avoids flooding a
 * strong student's first revision day with topics they already know.
 */
export function seedFromAttempt(accuracyPct: number, now: Date = new Date()): ScheduledReview {
  const accuracy = clamp(accuracyPct, 0, 100);
  const ease = clamp(2.5 + (0.1 - (5 - accuracyToQuality(accuracy)) * 0.08), MIN_EASE, MAX_EASE);

  // Weak topics return tomorrow, shaky ones in a few days, solid ones after a week.
  const intervalDays = accuracy < PASS_ACCURACY ? 1 : accuracy < 85 ? 3 : 7;

  return {
    intervalDays,
    ease,
    // Counts as one successful review only if they actually passed it.
    repetitions: accuracy >= PASS_ACCURACY ? 1 : 0,
    lapses: 0,
    dueAt: addDays(now, intervalDays),
    passed: accuracy >= PASS_ACCURACY,
  };
}

export function initialState(): ReviewState {
  return { intervalDays: 0, ease: 2.5, repetitions: 0, lapses: 0 };
}

function addDays(from: Date, days: number): Date {
  const next = new Date(from.getTime());
  next.setDate(next.getDate() + days);
  return next;
}
