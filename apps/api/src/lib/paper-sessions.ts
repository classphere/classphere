/**
 * paper-sessions.ts
 *
 * Detects a source PDF that is actually more than one exam.
 *
 * A "PYQ compilation" — several exam sessions bound into one PDF, common from
 * platforms that publish multi-shift previous-year papers — reads perfectly
 * well to the extractor: every question is real, every question is correctly
 * transcribed, and question_number just keeps being a positive integer the
 * whole way through. Nothing about a single question looks wrong. The paper
 * creation step then assigns position sequentially by array order and never
 * looks at question_number again, so a two-session PDF becomes one paper
 * carrying both sessions end to end — a JEE Main upload meant to produce a
 * 75-question, 180-minute mock test instead produced 146 questions under one
 * timer, silently, with nothing to catch it before a student sat it.
 *
 * The signal is the one place this kind of document leaves a fingerprint: a
 * real exam's numbering runs continuously across every subject (JEE Main is
 * 1..75 straight through, not reset per subject) and never goes backwards. A
 * sustained drop back near 1 after the count has already reached a real
 * exam's size is not extraction noise — it is a second exam beginning.
 */

export interface RawExtractedQuestion {
  question_number?: number | string | null;
  [key: string]: unknown;
}

/**
 * Minimum question_number the running count must reach before a drop is even
 * considered. Below this, a paper is small enough that a single reconciliation
 * artifact could plausibly look like a "restart" — this is exactly the size a
 * real exam session would have to be for concatenation to be worth detecting.
 */
const MIN_SESSION_SIZE = 30;

/** How far below the running max a question_number must fall to count as a drop. */
const DROP_THRESHOLD = 20;

/**
 * How many consecutive questions after a drop must keep counting upward for it
 * to be treated as a genuine restart rather than one bad read.
 *
 * A single mis-extracted question_number (the model misread "75" as "5") is
 * exactly as sudden as a real restart but does not sustain — the next question
 * goes back to something in the 70s, not 6, 7, 8. Requiring the following
 * questions to continue climbing from the low point is what tells these apart
 * without needing a source-document check.
 */
const CONFIRM_RUN = 3;

function toNumber(value: unknown): number | null {
  const n = typeof value === "string" ? parseInt(value, 10) : Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * Indices in `questions` where a new exam session begins, in ascending order.
 * Index 0 is never included — the first session starts at the array's start by
 * definition, so a "break before index 0" would be meaningless.
 *
 * Splitting on these indices and nothing else is the caller's job; this only
 * finds where the cuts belong.
 */
export function findSessionBreaks(questions: RawExtractedQuestion[]): number[] {
  const breaks: number[] = [];
  let runningMax = 0;

  for (let i = 0; i < questions.length; i++) {
    const current = toNumber(questions[i]?.question_number);
    if (current === null) continue;

    const isDrop = runningMax >= MIN_SESSION_SIZE && current <= runningMax - DROP_THRESHOLD;

    if (isDrop) {
      // A single misread question_number (the model read "75" as "5") is
      // exactly as sudden as a real restart, and the sequence resuming
      // correctly afterward — "5, 76, 77, 78…" — climbs just like a genuine
      // one would. Climbing alone does not tell them apart.
      //
      // What does: a real restart stays low and climbs gradually from its own
      // new start ("1, 2, 3…"), because there is no old sequence to return to.
      // A misread snaps straight back toward the old ceiling on the very next
      // question, because the old sequence was never actually interrupted.
      // Requiring the confirm window to stay below the old ceiling is what
      // rejects the misread case while still accepting a real one.
      let confirmed = 0;
      let last = current;
      let checked = 0;
      let staysLow = true;
      for (let j = i + 1; j < questions.length && confirmed < CONFIRM_RUN && checked < CONFIRM_RUN * 2; j++) {
        const next = toNumber(questions[j]?.question_number);
        checked++;
        if (next === null) continue;
        if (next <= last || next >= runningMax - DROP_THRESHOLD / 2) { staysLow = false; break; }
        confirmed++;
        last = next;
      }

      if (confirmed >= CONFIRM_RUN && staysLow) {
        breaks.push(i);
        runningMax = current; // the new session's own count starts fresh
        continue;
      }
      // Not sustained, or it snapped back toward the old ceiling — a single
      // bad read, not a restart. Keep the old max rather than letting a noisy
      // low value reset it.
    }

    runningMax = Math.max(runningMax, current);
  }

  return breaks;
}

/** Split a flat question array at the given break indices, in order. */
export function splitAtBreaks<T>(items: T[], breaks: number[]): T[][] {
  if (breaks.length === 0) return [items];
  const bounds = [0, ...breaks, items.length];
  const groups: T[][] = [];
  for (let i = 0; i < bounds.length - 1; i++) {
    groups.push(items.slice(bounds[i], bounds[i + 1]));
  }
  return groups.filter((g) => g.length > 0);
}
