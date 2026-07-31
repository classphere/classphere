import { AnalysisResult, ClassifiedAnswer } from "../../../../../../../packages/types/src/analysis.types";
import { scoreAttempt } from "./neet-scoring.service";
import { classifyMistake } from "./neet-mistake-classifier";
import { computeTopicAccuracy } from "./neet-topic-accuracy";
import { calculateFreeMarks } from "./neet-free-marks";
import { db } from "../db.service";
import { recordAttemptForRevision } from "../../../revision/topic-review.service";
import { detectAllPatterns } from "./neet-error-patterns";
import { analyzeSkips } from "./neet-skip-analysis";
import { generateStudyPlan } from "./neet-study-plan";
import { generateBoosterConfig } from "./neet-booster";
import { detectLongitudinalPatterns, buildCurrentTopicHistoryEntries } from "./neet-longitudinal-profile";
import { analyzeAttemptStrategy } from "./neet-attempt-strategy";
import { generateNarrative } from "./neet-narrative-summary";
import { computeTimeIntervals, computeSubjectMovement, computeDifficultyBreakdown, classifyAttempts, detectPanicCascade } from "./neet-behavioral-analysis";

export async function analyzeNeetAttempt(attemptId: string, hasTimingData = true): Promise<AnalysisResult> {
  const start = Date.now();
  const { attempt, answers } = await db.getAttemptWithAnswers(attemptId);
  const scheme = attempt.marking_scheme || { correct: 4, incorrect: -1, unattempted: 0 };
  const scoring = scoreAttempt(answers, { correct: scheme.correct, incorrect: scheme.incorrect, unattempted: scheme.unattempted });
  const classified: ClassifiedAnswer[] = scoring.answers.map((a) => ({
    ...a,
    classification: classifyMistake(a, hasTimingData),
  }));

  const [batchAvgs, historicalProfile, seenQIds, batchAvg] = await Promise.all([
    db.getBatchAvgsByTopic(attempt.batch_id ?? ""),
    db.getStudentErrorProfile(attempt.student_id, attempt.exam_code ?? "neet"),
    db.getSeenQuestionIds(attempt.student_id, attempt.exam_code ?? "neet"),
    db.getBatchAverageScore(attempt.paper_id, attempt.batch_id ?? ""),
  ]);

  const topicStats    = computeTopicAccuracy(classified, batchAvgs);
  const errorPatterns = detectAllPatterns(classified);
  const freeMarks     = calculateFreeMarks(classified, scoring, { correct: scheme.correct, incorrect: scheme.incorrect, unattempted: scheme.unattempted });
  const skipAnalysis  = analyzeSkips(classified);
  const attemptStrategy = analyzeAttemptStrategy(classified, attempt.exam_code ?? "neet", attempt.total_duration_sec ?? 10800, hasTimingData);
  const longitudinalFlags = detectLongitudinalPatterns(topicStats, historicalProfile);
  const { intervals: timeIntervals, fatigueSummary } = computeTimeIntervals(classified, attempt.total_duration_sec ?? 10800);
  const subjectMovement       = computeSubjectMovement(classified);
  const difficultyBreakdown   = computeDifficultyBreakdown(classified);
  const attemptClassification = classifyAttempts(classified);
  const panicCascade          = detectPanicCascade(classified);

  const studyPlan = generateStudyPlan(topicStats, longitudinalFlags, freeMarks, null);
  const boosterConfig = generateBoosterConfig(topicStats, seenQIds);
  const narrative = generateNarrative(scoring, topicStats, errorPatterns, freeMarks, longitudinalFlags, attemptStrategy, attempt.exam_code ?? "neet", attemptId);

  const processingMs = Date.now() - start;

  const result: AnalysisResult = {
    scoring, classified, topicStats, errorPatterns, freeMarks, skipAnalysis, studyPlan, boosterConfig, processingMs,
    attemptStrategy, longitudinalFlags, narrative, timeIntervals, subjectMovement, difficultyBreakdown, attemptClassification, panicCascade, fatigueSummary,
    // Omitted entirely when there is no batch or too few peers — the UI hides
    // the comparison rather than showing a placeholder.
    ...(batchAvg ? { batchAvg } : {}),
  };

  const currentProfileEntries = buildCurrentTopicHistoryEntries(attemptId, topicStats);

  await Promise.all([
    db.upsertAnalysis(attemptId, attempt.student_id, attempt.exam_code ?? "neet", result),
    db.saveAnswerClassifications(attemptId, classified),
    db.persistStudentErrorProfile(attempt.student_id, attempt.exam_code ?? "neet", currentProfileEntries),
    // Sitting a test counts as revision: seed unseen topics and advance ones
    // already scheduled. Best-effort — a scheduling failure must never
    // invalidate an analysis that is otherwise complete.
    recordAttemptForRevision(attempt.student_id, attempt.exam_code ?? "neet", topicStats)
      .catch((error) => console.error("[neet-analysis] revision scheduling failed:", error)),
  ]);

  return result;
}
