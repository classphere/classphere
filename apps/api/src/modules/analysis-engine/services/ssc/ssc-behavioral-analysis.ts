import { ClassifiedAnswer } from "../../../../../../../packages/types/src/analysis.types";
import { SSC_SECTION_CONFIG } from "./ssc-scoring.service";

/**
 * SSC Behavioral Analysis
 * ─────────────────────────────────────────────────────────────
 * Unlike JEE (3-hour exam → 30-min buckets), SSC has 4 separate
 * 15-minute locked sections. Behavioral analysis is done per-section.
 *
 * This file provides:
 *  1. computeSscSectionIntervals — pacing within each 15-min block
 *  2. detectSscBlockPanic — panic cascade within a single section
 *  3. computeSscAttemptSweepQuality — did they do Round 1 → Round 2 properly?
 *  4. computeSscOverallFatigue — did accuracy drop across the 4 sections?
 */

// ─────────────────────────────────────────────────────────────────────────────
// 1. PER-SECTION TIME INTERVALS
// ─────────────────────────────────────────────────────────────────────────────

export interface SscSectionInterval {
  section: string;
  /** 0-5 min */
  earlyMinutes:  { correct: number; incorrect: number; skipped: number; total: number; accuracy: number };
  /** 5-10 min */
  midMinutes:    { correct: number; incorrect: number; skipped: number; total: number; accuracy: number };
  /** 10-15 min */
  lateMinutes:   { correct: number; incorrect: number; skipped: number; total: number; accuracy: number };
  /** Did accuracy drop by >20% from early to late? */
  fatigueDetected: boolean;
  fatigueSummary: string;
}

function emptyBucket() {
  return { correct: 0, incorrect: 0, skipped: 0, total: 0, accuracy: 0 };
}

/**
 * For each SSC section, splits the 15 minutes into 3 × 5-minute buckets
 * using start_timestamp relative to the section's start.
 *
 * SSC sections run in order: GA → Reasoning → Quant → English
 * We detect the section start by the minimum start_timestamp in that section.
 */
export function computeSscSectionIntervals(classified: ClassifiedAnswer[]): SscSectionInterval[] {
  // Group by subject (section)
  const bySection: Record<string, ClassifiedAnswer[]> = {};
  for (const a of classified) {
    const s = a.question.subject;
    if (!bySection[s]) bySection[s] = [];
    bySection[s].push(a);
  }

  const result: SscSectionInterval[] = [];

  for (const [section, answers] of Object.entries(bySection)) {
    const visited = answers.filter(a => a.start_timestamp !== undefined && a.start_timestamp >= 0);
    if (visited.length === 0) continue;

    // Section start = minimum start_timestamp among all questions in this section
    const sectionStartTs = Math.min(...visited.map(a => a.start_timestamp));

    const early = emptyBucket();
    const mid   = emptyBucket();
    const late  = emptyBucket();

    for (const a of visited) {
      const offsetSec = a.start_timestamp - sectionStartTs;
      const bucket = offsetSec < 300 ? early : offsetSec < 600 ? mid : late;

      bucket.total++;
      if (!a.selected_answer)   bucket.skipped++;
      else if (a.is_correct)    bucket.correct++;
      else                      bucket.incorrect++;
    }

    // Compute accuracy for each bucket
    for (const b of [early, mid, late]) {
      const attempted = b.correct + b.incorrect;
      b.accuracy = attempted > 0 ? Math.round((b.correct / attempted) * 100) : 0;
    }

    const fatigueDetected = (early.correct + early.incorrect) > 0
      && (late.correct + late.incorrect) > 0
      && (early.accuracy - late.accuracy) > 20;

    let fatigueSummary: string;
    if (fatigueDetected) {
      fatigueSummary = `Accuracy in ${section} dropped from ${early.accuracy}% (first 5 min) to ${late.accuracy}% (last 5 min). The section lock pressure caused rushed, incorrect attempts at the end.`;
    } else if ((late.correct + late.incorrect) === 0 && late.skipped > 0) {
      fatigueSummary = `You ran out of time in the last 5 minutes of the ${section} section. ${late.skipped} questions were locked away unattempted.`;
    } else {
      fatigueSummary = `Consistent pacing in ${section} — no significant accuracy drop detected across the 15-minute window.`;
    }

    result.push({ section, earlyMinutes: early, midMinutes: mid, lateMinutes: late, fatigueDetected, fatigueSummary });
  }

  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. BLOCK-LEVEL PANIC CASCADE
// ─────────────────────────────────────────────────────────────────────────────

export interface SscBlockPanic {
  section: string;
  detected: boolean;
  triggerQuestion: number | null;
  incorrectInWindow: number;
  description: string;
  tip: string;
}

/**
 * Detects a panic cascade within a single 15-minute section.
 * Criteria: 3+ of 5 consecutive questions (by visit order) are wrong/skipped
 * AND avg time dropped ≥ 25% compared to prior 5 questions.
 *
 * This is a tighter threshold than JEE (4/6) because SSC sections are shorter
 * and 3 wrong answers in a row in a 15-min block is highly disruptive.
 */
export function detectSscBlockPanic(classified: ClassifiedAnswer[]): SscBlockPanic[] {
  const bySection: Record<string, ClassifiedAnswer[]> = {};
  for (const a of classified) {
    const s = a.question.subject;
    if (!bySection[s]) bySection[s] = [];
    bySection[s].push(a);
  }

  const results: SscBlockPanic[] = [];

  for (const [section, answers] of Object.entries(bySection)) {
    const visited = answers
      .filter(a => a.start_timestamp !== undefined && a.start_timestamp >= 0)
      .sort((a, b) => a.start_timestamp - b.start_timestamp);

    const NO_PANIC: SscBlockPanic = {
      section,
      detected: false,
      triggerQuestion: null,
      incorrectInWindow: 0,
      description: `No panic cascade in ${section}. Performance was controlled throughout the 15-minute block.`,
      tip: "Keep composure — consistent pacing is what wins in SSC.",
    };

    if (visited.length < 6) {
      results.push(NO_PANIC);
      continue;
    }

    const WINDOW = 5;
    const MIN_WRONG = 3;
    const TIME_DROP = 0.25;

    const avgTime = (slice: ClassifiedAnswer[]) =>
      slice.reduce((s, a) => s + a.time_taken_sec, 0) / slice.length;

    let found = false;
    for (let i = WINDOW; i <= visited.length - 1; i++) {
      const prior   = visited.slice(i - WINDOW, i);
      const current = visited.slice(i, i + WINDOW);
      if (current.length < WINDOW) break;

      const wrongInCurrent = current.filter(a => !a.is_correct).length;
      if (wrongInCurrent < MIN_WRONG) continue;

      const priorAvg   = avgTime(prior);
      const currentAvg = avgTime(current);
      const drop       = priorAvg > 0 ? (priorAvg - currentAvg) / priorAvg : 0;

      if (drop >= TIME_DROP) {
        found = true;
        const triggerQ = current[0].question.question_number;
        results.push({
          section,
          detected: true,
          triggerQuestion: triggerQ,
          incorrectInWindow: wrongInCurrent,
          description: `Panic cascade in ${section} starting at Question ${triggerQ}. You got ${wrongInCurrent} of ${WINDOW} wrong AND your answering speed dropped by ${Math.round(drop * 100)}% — a clear sign of rushed, anxious clicking before the section locked.`,
          tip: `When you feel the panic in a section, immediately skip to a question you know confidently. Getting one right resets your focus. Never guess 3 in a row — the -0.5 penalty compounds fast.`,
        });
        break;
      }
    }

    if (!found) results.push(NO_PANIC);
  }

  return results;
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. SWEEP QUALITY — Did they do Round 1 → Round 2?
// ─────────────────────────────────────────────────────────────────────────────

export interface SscSweepQuality {
  section: string;
  easyQuestionsAttemptedInFirstHalf: number;
  hardQuestionsAttemptedInFirstHalf: number;
  sweepPattern: "optimal" | "linear" | "reverse";
  sweepScore: number; // 0–100
  insight: string;
}

/**
 * Checks if the student attempted easy questions in the first half of the
 * section and left hard/calculative ones for the second half.
 * 
 * First half = first 7-8 questions visited (chronologically).
 * Optimal = ≥70% of first-half attempts were easy/medium difficulty.
 */
export function computeSscSweepQuality(classified: ClassifiedAnswer[]): SscSweepQuality[] {
  const bySection: Record<string, ClassifiedAnswer[]> = {};
  for (const a of classified) {
    const s = a.question.subject;
    if (!bySection[s]) bySection[s] = [];
    bySection[s].push(a);
  }

  const results: SscSweepQuality[] = [];

  for (const [section, answers] of Object.entries(bySection)) {
    const visited = answers
      .filter(a => a.start_timestamp !== undefined && a.start_timestamp >= 0)
      .sort((a, b) => a.start_timestamp - b.start_timestamp);

    if (visited.length < 5) continue;

    const halfMark = Math.floor(visited.length / 2);
    const firstHalf = visited.slice(0, halfMark);
    const easyInFirst = firstHalf.filter(a => a.question.difficulty === "easy" || a.question.difficulty === "medium").length;
    const hardInFirst = firstHalf.filter(a => a.question.difficulty === "hard").length;
    const easyRatio   = firstHalf.length > 0 ? easyInFirst / firstHalf.length : 0;

    let sweepPattern: SscSweepQuality["sweepPattern"];
    let sweepScore: number;
    let insight: string;

    if (easyRatio >= 0.7) {
      sweepPattern = "optimal";
      sweepScore   = 90;
      insight      = `Excellent sweep strategy in ${section}. You correctly prioritized easy and medium questions in the first half, leaving hard ones for Round 2.`;
    } else if (hardInFirst > easyInFirst) {
      sweepPattern = "reverse";
      sweepScore   = 40;
      insight      = `Reversed sweep in ${section}. You tackled hard questions first, which likely caused time pressure and forced you to rush through easy marks later in the section.`;
    } else {
      sweepPattern = "linear";
      sweepScore   = 60;
      insight      = `Linear approach in ${section}. You went question-by-question in order without difficulty-filtering. Practice the 2-round sweep: first pass = only sure-shot questions in < 30s.`;
    }

    results.push({ section, easyQuestionsAttemptedInFirstHalf: easyInFirst, hardQuestionsAttemptedInFirstHalf: hardInFirst, sweepPattern, sweepScore, insight });
  }

  return results;
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. CROSS-SECTION FATIGUE (across the 4 sections in order)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Detects if the student's accuracy degraded across sections as the exam progressed.
 * Sections are ordered by the SSC_SECTIONS order (or by start_timestamp of first question).
 */
export function computeCrossSectionFatigue(classified: ClassifiedAnswer[]): string {
  const bySection: Record<string, { correct: number; attempted: number }> = {};
  for (const a of classified) {
    const s = a.question.subject;
    if (!bySection[s]) bySection[s] = { correct: 0, attempted: 0 };
    if (a.selected_answer) {
      bySection[s].attempted++;
      if (a.is_correct) bySection[s].correct++;
    }
  }

  const sectionAccuracies = Object.entries(bySection).map(([section, d]) => ({
    section,
    accuracy: d.attempted > 0 ? Math.round((d.correct / d.attempted) * 100) : 0,
  }));

  if (sectionAccuracies.length < 2) return "Not enough data for cross-section fatigue analysis.";

  const first = sectionAccuracies[0];
  const last  = sectionAccuracies[sectionAccuracies.length - 1];
  const drop  = first.accuracy - last.accuracy;

  if (drop > 25) {
    return `Significant cross-section fatigue: your accuracy fell from ${first.accuracy}% in ${first.section} to ${last.accuracy}% in ${last.section} — a ${drop}% drop. Mental stamina is a factor. Practice 2–3 full-length timed mocks without breaks.`;
  } else if (drop > 10) {
    return `Moderate cross-section drop: accuracy eased from ${first.accuracy}% (${first.section}) to ${last.accuracy}% (${last.section}). Build stamina with full-length daily mocks.`;
  } else if (drop < -10) {
    return `You actually improved across sections — accuracy rose from ${first.accuracy}% (${first.section}) to ${last.accuracy}% (${last.section}). Excellent warm-up and composure.`;
  }
  return `Consistent performance across all 4 sections. Accuracy held steady around ${Math.round(sectionAccuracies.reduce((s, x) => s + x.accuracy, 0) / sectionAccuracies.length)}%.`;
}
