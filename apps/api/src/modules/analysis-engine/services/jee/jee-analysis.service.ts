import { AnalysisResult, ClassifiedAnswer } from "../../../../../../../packages/types/src/analysis.types";
import { scoreAttempt } from "./jee-scoring.service";
import { classifyMistake } from "./jee-mistake-classifier";
import { computeTopicAccuracy } from "./jee-topic-accuracy";
import { calculateFreeMarks } from "./jee-free-marks";
import { mockDb as db } from "../db.mock";
import { detectAllPatterns } from "./jee-error-patterns";
import { analyzeSkips } from "./jee-skip-analysis";
import { generateStudyPlan } from "./jee-study-plan";
import { generateBoosterConfig } from "./jee-booster";
import { detectLongitudinalPatterns, buildCurrentTopicHistoryEntries } from "./jee-longitudinal-profile";
import { analyzeAttemptStrategy } from "./jee-attempt-strategy";
import { generateNarrative } from "./jee-narrative-summary";
import { computeTimeIntervals, computeSubjectMovement, computeDifficultyBreakdown, classifyAttempts, detectPanicCascade } from "./jee-behavioral-analysis";

export async function analyzeJeeAttempt(attemptId: string, hasTimingData = true): Promise<AnalysisResult> {
  const start = Date.now();
  const { attempt, answers } = await db.getAttemptWithAnswers(attemptId);
  const scoring = scoreAttempt(answers, attempt.marking_scheme);
  const classified: ClassifiedAnswer[] = answers.map((a) => ({
    ...a,
    classification: classifyMistake(a, hasTimingData),
  }));

  const [batchAvgs, historicalProfile, seenQIds] = await Promise.all([
    db.getBatchAvgsByTopic(attempt.batch_id),
    db.getStudentErrorProfile(attempt.student_id, attempt.exam_id),
    db.getSeenQuestionIds(attempt.student_id, attempt.exam_id),
  ]);

  const topicStats    = computeTopicAccuracy(classified, batchAvgs);
  const errorPatterns = detectAllPatterns(classified);
  const freeMarks     = calculateFreeMarks(classified, scoring, attempt.marking_scheme);
  const skipAnalysis  = analyzeSkips(classified);
  const attemptStrategy = analyzeAttemptStrategy(classified, attempt.exam_code ?? "jee-main", attempt.total_duration_sec ?? 10800, hasTimingData);
  const longitudinalFlags = detectLongitudinalPatterns(topicStats, historicalProfile);
  const { intervals: timeIntervals, fatigueSummary } = computeTimeIntervals(classified, attempt.total_duration_sec ?? 10800);
  const subjectMovement       = computeSubjectMovement(classified);
  const difficultyBreakdown   = computeDifficultyBreakdown(classified);
  const attemptClassification = classifyAttempts(classified);
  const panicCascade          = detectPanicCascade(classified);

  const studyPlan = generateStudyPlan(topicStats, longitudinalFlags, freeMarks, null);
  const boosterConfig = generateBoosterConfig(topicStats, seenQIds);
  const narrative = generateNarrative(scoring, topicStats, errorPatterns, freeMarks, longitudinalFlags, attemptStrategy, attempt.exam_code ?? "jee-main", attemptId);

  const processingMs = Date.now() - start;

  const result: AnalysisResult = {
    scoring, classified, topicStats, errorPatterns, freeMarks, skipAnalysis, studyPlan, boosterConfig, processingMs,
    attemptStrategy, longitudinalFlags, narrative, timeIntervals, subjectMovement, difficultyBreakdown, attemptClassification, panicCascade, fatigueSummary,
  };

  const currentProfileEntries = buildCurrentTopicHistoryEntries(attemptId, topicStats);

  await Promise.all([
    db.upsertAnalysis(attemptId, {
      weak_topics: topicStats.filter((t) => t.isWeak),
      error_patterns: errorPatterns,
      free_marks: freeMarks,
      skip_analysis: skipAnalysis,
      attempt_strategy: attemptStrategy,
      longitudinal_flags: longitudinalFlags,
      study_plan: studyPlan,
      next_test_config: boosterConfig,
      model_used: "jee-pipeline-v1",
      tokens_used: 0,
      processing_ms: processingMs,
    }),
    db.saveAnswerClassifications(attemptId, classified),
    db.persistStudentErrorProfile(attempt.student_id, attempt.exam_id, currentProfileEntries),
  ]);

  return result;
}
