import { AnalysisResult, ClassifiedAnswer } from "../../../../../../../packages/types/src/analysis.types";
import { scoreSscAttempt } from "./ssc-scoring.service";
import { classifySscMistake } from "./ssc-mistake-classifier";
import { computeSscTopicAccuracy } from "./ssc-topic-accuracy";
import { calculateFreeMarks } from "./ssc-free-marks";
import { analyzeSkips } from "./ssc-skip-analysis";
import { detectAllPatterns } from "./ssc-error-patterns";
import { generateStudyPlan } from "./ssc-study-plan";
import { generateBoosterConfig } from "./ssc-booster";
import {
  detectLongitudinalPatterns,
  buildCurrentTopicHistoryEntries,
} from "./ssc-longitudinal-profile";
import {
  computeSscSectionIntervals,
  detectSscBlockPanic,
  computeSscSweepQuality,
  computeCrossSectionFatigue,
} from "./ssc-behavioral-analysis";
import { generateSscNarrative } from "./ssc-narrative-summary";
import { mockDb as db } from "../db.mock";

/**
 * SSC CGL Tier 1 Analysis Entry Point
 * ─────────────────────────────────────────────────────────────
 * This is completely separate from analyzeAttempt() (the JEE/NEET engine).
 * It shares only generic utilities: free-marks, skip-analysis, error-patterns,
 * study-plan, booster, and longitudinal-profile — which are exam-agnostic.
 *
 * All SSC-specific logic (15-minute sections, block panic, sweep quality)
 * lives in the /ssc/ folder and is never imported into the JEE/NEET engine.
 */
export async function analyzeSscAttempt(
  attemptId: string,
  hasTimingData = true
): Promise<AnalysisResult> {
  const start = Date.now();

  // ── Fetch attempt data ─────────────────────────────────────────────────────
  const { attempt, answers } = await db.getAttemptWithAnswers(attemptId);

  // ── Stage 1: SSC Scoring (+2 / -0.5 / 0) ──────────────────────────────────
  const scoring = scoreSscAttempt(answers);

  // ── Stage 2: Classify every answer (SSC-specific thresholds) ──────────────
  const classified: ClassifiedAnswer[] = answers.map(a => ({
    ...a,
    classification: classifySscMistake(a, hasTimingData),
  }));

  // ── Stage 3: Parallel DB lookups ──────────────────────────────────────────
  const [batchAvgs, historicalProfile, seenQIds] = await Promise.all([
    db.getBatchAvgsByTopic(attempt.batch_id),
    db.getStudentErrorProfile(attempt.student_id, attempt.exam_id),
    db.getSeenQuestionIds(attempt.student_id, attempt.exam_id),
  ]);

  // ── Stage 4: Topic / Theme accuracy (lower gate: 2 attempts for SSC) ──────
  const topicStats = computeSscTopicAccuracy(classified, batchAvgs);

  // ── Stage 5: Shared analysis (error patterns, free marks, skips) ──────────
  const errorPatterns = detectAllPatterns(classified);
  const freeMarks     = calculateFreeMarks(classified, scoring, {
    correct: 2, incorrect: -0.5, unattempted: 0,
  });
  const skipAnalysis  = analyzeSkips(classified);

  // ── Stage 6: Longitudinal profiling (shared with JEE/NEET engine) ─────────
  const longitudinalFlags = detectLongitudinalPatterns(topicStats, historicalProfile);
  const countdown         = null; // surfaced inside narrative via getSscExamCountdown()

  // ── Stage 7: SSC-specific behavioral analysis ─────────────────────────────
  const sectionIntervals    = computeSscSectionIntervals(classified);
  const blockPanics         = detectSscBlockPanic(classified);
  const sweepQuality        = computeSscSweepQuality(classified);
  const crossSectionFatigue = computeCrossSectionFatigue(classified);

  // ── Stage 8: Study plan + booster (shared utilities) ─────────────────────
  const studyPlan     = generateStudyPlan(topicStats, longitudinalFlags, freeMarks, countdown);
  const boosterConfig = generateBoosterConfig(topicStats, seenQIds);

  // ── Stage 9: SSC Narrative ────────────────────────────────────────────────
  const narrative = generateSscNarrative(
    scoring,
    topicStats,
    freeMarks,
    longitudinalFlags,
    sweepQuality,
    blockPanics,
    crossSectionFatigue,
    attemptId
  );

  const processingMs = Date.now() - start;

  // ── Build result ──────────────────────────────────────────────────────────
  // We reuse the shared AnalysisResult type but populate SSC-specific fields
  // into the behavioral slots (timeIntervals → sectionIntervals, panicCascade → blockPanics[0]).
  const result: AnalysisResult = {
    scoring,
    classified,
    topicStats,
    errorPatterns,
    freeMarks,
    skipAnalysis,
    studyPlan,
    boosterConfig,
    processingMs,

    // v3 fields
    attemptStrategy: {
      // For SSC, time management across sections is fixed (all 15 min).
      // We populate this minimally — the real insight is in sweepQuality.
      pattern: "subject_grouped",
      subjectOrder: [...new Set(classified.map(a => a.question.subject))],
      timePerSubjectSec: {},
      optimalTimeSec: { "Quantitative Aptitude": 900, "General Intelligence & Reasoning": 900, "English Comprehension": 900, "General Awareness": 900 },
      timeDeviationPct: {},
      strategyScore: Math.round(sweepQuality.reduce((s, q) => s + q.sweepScore, 0) / Math.max(sweepQuality.length, 1)),
      insight: sweepQuality.map(q => q.insight).join(" | "),
      recommendation: "Focus on the 2-round sweep strategy within each 15-minute section.",
      overtimeSubjects: [],
      undertimeSubjects: [],
    },
    longitudinalFlags,
    narrative,

    // v4 behavioral slots — mapped to SSC-specific outputs
    timeIntervals:    sectionIntervals.map(si => ({
      intervalLabel: si.section,
      startSec: 0,
      endSec: 900,
      correct:   si.earlyMinutes.correct + si.midMinutes.correct + si.lateMinutes.correct,
      incorrect: si.earlyMinutes.incorrect + si.midMinutes.incorrect + si.lateMinutes.incorrect,
      skipped:   si.earlyMinutes.skipped + si.midMinutes.skipped + si.lateMinutes.skipped,
      total:     si.earlyMinutes.total + si.midMinutes.total + si.lateMinutes.total,
      accuracy:  si.earlyMinutes.accuracy,
    })),
    subjectMovement: classified
      .map(a => a.question.subject)
      .filter((v, i, arr) => arr.indexOf(v) === i)
      .map((s, idx) => ({ subject: s, durationSec: 900, sequenceIndex: idx })),
    difficultyBreakdown: [],
    attemptClassification: [],
    panicCascade: blockPanics[0]
      ? {
          detected: blockPanics.some(p => p.detected),
          startQuestionNumber: blockPanics.find(p => p.detected)?.triggerQuestion ?? null,
          endQuestionNumber:   null,
          incorrectInWindow:   blockPanics.find(p => p.detected)?.incorrectInWindow ?? 0,
          triggerSubject:      blockPanics.find(p => p.detected)?.section ?? null,
          description:         blockPanics.find(p => p.detected)?.description ?? "No panic cascade detected.",
          tip:                 blockPanics.find(p => p.detected)?.tip ?? "",
        }
      : {
          detected: false, startQuestionNumber: null, endQuestionNumber: null,
          incorrectInWindow: 0, triggerSubject: null,
          description: "No panic cascade detected.", tip: "",
        },
    fatigueSummary: crossSectionFatigue,
  };

  // ── Persist ───────────────────────────────────────────────────────────────
  const currentProfileEntries = buildCurrentTopicHistoryEntries(attemptId, topicStats);
  await Promise.all([
    db.upsertAnalysis(attemptId, {
      weak_topics:        topicStats.filter(t => t.isWeak),
      error_patterns:     errorPatterns,
      free_marks:         freeMarks,
      skip_analysis:      skipAnalysis,
      attempt_strategy:   result.attemptStrategy,
      longitudinal_flags: longitudinalFlags,
      study_plan:         studyPlan,
      next_test_config:   boosterConfig,
      model_used:         "ssc-rule-engine-v1",
      tokens_used:        0,
      processing_ms:      processingMs,
    }),
    db.saveAnswerClassifications(attemptId, classified),
    db.persistStudentErrorProfile(attempt.student_id, attempt.exam_id, currentProfileEntries),
  ]);

  return result;
}
