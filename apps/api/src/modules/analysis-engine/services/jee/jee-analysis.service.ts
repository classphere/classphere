import { AnalysisResult, ClassifiedAnswer } from "../../../../../../../packages/types/src/analysis.types";
import { getQuestionStats } from "../../../../lib/question-stats";
import { scoreAttempt } from "./jee-scoring.service";
import { classifyMistake } from "./jee-mistake-classifier";
import { computeTopicAccuracy } from "./jee-topic-accuracy";
import { calculateFreeMarks } from "./jee-free-marks";
import { db } from "../db.service";
import { recordAttemptForRevision } from "../../../revision/topic-review.service";
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
  const scheme = attempt.marking_scheme || { correct: 4, incorrect: -1, unattempted: 0 };
  const scoring = scoreAttempt(answers, { correct: scheme.correct, incorrect: scheme.incorrect, unattempted: scheme.unattempted });
  // How the rest of the cohort answered these same questions. Empty until a
  // question has been answered enough times to mean anything, at which point
  // the classifier can tell a common trap from an unusual slip.
  const questionStats = await getQuestionStats(
    [...new Set(scoring.answers.map((a) => a.question_id).filter(Boolean))],
  );
  const classified: ClassifiedAnswer[] = scoring.answers.map((a) => ({
    ...a,
    classification: classifyMistake(a, hasTimingData, questionStats[a.question_id]),
  }));

  const [batchAvgs, historicalProfile, seenQIds, batchAvg] = await Promise.all([
    db.getBatchAvgsByTopic(attempt.batch_id ?? ""),
    db.getStudentErrorProfile(attempt.student_id, attempt.exam_code ?? "jee-main"),
    db.getSeenQuestionIds(attempt.student_id, attempt.exam_code ?? "jee-main"),
    db.getBatchAverageScore(attempt.paper_id, attempt.batch_id ?? ""),
  ]);

  const topicStats    = computeTopicAccuracy(classified, batchAvgs);
  const errorPatterns = detectAllPatterns(classified);
  const freeMarks     = calculateFreeMarks(classified, scoring, { correct: scheme.correct, incorrect: scheme.incorrect, unattempted: scheme.unattempted });
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
    // Omitted entirely when there is no batch or too few peers — the UI hides
    // the comparison rather than showing a placeholder.
    ...(batchAvg ? { batchAvg } : {}),
  };

  const currentProfileEntries = buildCurrentTopicHistoryEntries(attemptId, topicStats);

  await Promise.all([
    db.upsertAnalysis(attemptId, attempt.student_id, attempt.exam_code ?? "jee-main", result),
    db.saveAnswerClassifications(attemptId, classified),
    db.persistStudentErrorProfile(attempt.student_id, attempt.exam_code ?? "jee-main", currentProfileEntries),
    // Sitting a test counts as revision: seed unseen topics and advance ones
    // already scheduled. Best-effort — a scheduling failure must never
    // invalidate an analysis that is otherwise complete.
    recordAttemptForRevision(attempt.student_id, attempt.exam_code ?? "jee-main", topicStats)
      .catch((error) => console.error("[jee-analysis] revision scheduling failed:", error)),
  ]);

  return result;
}
