import { AnalysisResult, ClassifiedAnswer } from "../../../../../../packages/types/src/analysis.types";
import { scoreAttempt } from "./scoring.service";
import { classifyMistake } from "./mistake-classifier";
import { computeTopicAccuracy } from "./topic-accuracy";
import { calculateFreeMarks } from "./free-marks";
import { mockDb as db } from "./db.mock";
import { detectAllPatterns } from "./error-patterns";
import { analyzeSkips } from "./skip-analysis";
import { generateStudyPlan } from "./study-plan";
import { generateBoosterConfig } from "./booster";
import {
  detectLongitudinalPatterns,
  buildCurrentTopicHistoryEntries,
} from "./longitudinal-profile";
import { analyzeAttemptStrategy } from "./attempt-strategy";
import { generateNarrative, getExamCountdown } from "./narrative-summary";

export async function analyzeAttempt(attemptId: string, hasTimingData = true): Promise<AnalysisResult> {
  const start = Date.now();

  // ── Single DB round-trip: fetch attempt + all answers + questions (JOIN) ──
  const { attempt, answers } = await db.getAttemptWithAnswers(attemptId);

  // ── Stage 1: Score ──────────────────────────────────────────────────────────
  const scoring = scoreAttempt(answers, attempt.marking_scheme);

  // ── Stage 2: Classify every answer ─────────────────────────────────────────
  const classified: ClassifiedAnswer[] = answers.map((a) => ({
    ...a,
    classification: classifyMistake(a, hasTimingData),
  }));

  // ── Stages 3–6: Parallel analysis (all consume classified) ─────────────────
  const [batchAvgs, historicalProfile, seenQIds] = await Promise.all([
    db.getBatchAvgsByTopic(attempt.batch_id),
    db.getStudentErrorProfile(attempt.student_id, attempt.exam_id),  // v3: longitudinal
    db.getSeenQuestionIds(attempt.student_id, attempt.exam_id),
  ]);

  const topicStats    = computeTopicAccuracy(classified, batchAvgs);
  const errorPatterns = detectAllPatterns(classified);
  const freeMarks     = calculateFreeMarks(classified, scoring, attempt.marking_scheme);
  const skipAnalysis  = analyzeSkips(classified);

  // ── Stage 6.5: v3 — Attempt Strategy ──────────────────────────────────────
  const attemptStrategy = analyzeAttemptStrategy(
    classified,
    attempt.exam_code ?? "jee-main",
    attempt.total_duration_sec ?? 10800,
    hasTimingData
  );

  // ── Stage 6.6: v3 — Longitudinal Pattern Detection ────────────────────────
  const longitudinalFlags = detectLongitudinalPatterns(topicStats, historicalProfile);

  // ── Stage 6.7: v3 — Exam Countdown ────────────────────────────────────────
  const countdown = getExamCountdown(attempt.exam_code ?? "jee-main");

  // ── Stages 7–8: Generate action items ──────────────────────────────────────
  const studyPlan = generateStudyPlan(
    topicStats,
    longitudinalFlags,
    freeMarks,
    countdown
  );
  const boosterConfig = generateBoosterConfig(topicStats, seenQIds);

  // ── Stage 8.5: v3 — Natural Language Narrative ────────────────────────────
  const narrative = generateNarrative(
    scoring,
    topicStats,
    errorPatterns,
    freeMarks,
    longitudinalFlags,
    attemptStrategy,
    attempt.exam_code ?? "jee-main",
    attemptId
  );

  const processingMs = Date.now() - start;

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
    // v3
    attemptStrategy,
    longitudinalFlags,
    narrative,
  };

  // ── Persist results ─────────────────────────────────────────────────────────
  const currentProfileEntries = buildCurrentTopicHistoryEntries(attemptId, topicStats);

  await Promise.all([
    db.upsertAnalysis(attemptId, {
      weak_topics:      topicStats.filter((t) => t.isWeak),
      error_patterns:   errorPatterns,
      free_marks:       freeMarks,
      skip_analysis:    skipAnalysis,
      attempt_strategy: attemptStrategy,
      longitudinal_flags: longitudinalFlags,
      study_plan:       studyPlan,
      next_test_config: boosterConfig,
      model_used:       "rule-engine-v3",
      tokens_used:      0,
      processing_ms:    processingMs,
    }),
    db.saveAnswerClassifications(attemptId, classified),
    // v3: persist longitudinal profile (replaces legacy updateStudentErrorProfile)
    db.persistStudentErrorProfile(
      attempt.student_id,
      attempt.exam_id,
      currentProfileEntries
    ),
  ]);

  return result;
}

