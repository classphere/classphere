import { AnalysisResult, ClassifiedAnswer } from "../../../../../packages/types/src/analysis.types";
import { scoreAttempt } from "./scoring.service";
import { classifyMistake } from "./mistake-classifier";
import { computeTopicAccuracy } from "./topic-accuracy";
import { calculateFreeMarks } from "./free-marks";
import { mockDb as db } from "./db.mock";
import { detectAllPatterns } from "./error-patterns";
import { analyzeSkips } from "./skip-analysis";
import { generateStudyPlan } from "./study-plan";
import { generateBoosterConfig } from "./booster";

export async function analyzeAttempt(attemptId: string): Promise<AnalysisResult> {
  const start = Date.now();

  // Single DB round-trip: fetch attempt + all answers + questions (JOIN)
  const { attempt, answers } = await db.getAttemptWithAnswers(attemptId);

  // ── Stage 1: Score ────────────────────────────────────────────────────────
  const scoring = scoreAttempt(answers, attempt.marking_scheme);

  // ── Stage 2: Classify every answer ────────────────────────────────────────
  const classified: ClassifiedAnswer[] = answers.map((a) => ({
    ...a,
    classification: classifyMistake(a),
  }));

  // ── Stages 3-6: Parallel analysis (all consume classified) ───────────────
  const [batchAvgs] = await Promise.all([
    db.getBatchAvgsByTopic(attempt.batch_id), // for comparison benchmarks
  ]);

  const topicStats = computeTopicAccuracy(classified, batchAvgs);
  const errorPatterns = detectAllPatterns(classified);
  const freeMarks = calculateFreeMarks(classified, scoring, attempt.marking_scheme);
  const skipAnalysis = analyzeSkips(classified);

  // ── Stages 7-8: Generate action items ─────────────────────────────────────
  const seenQIds = await db.getSeenQuestionIds(attempt.student_id, attempt.exam_id);
  const studyPlan = generateStudyPlan(topicStats);
  const boosterConfig = generateBoosterConfig(topicStats, seenQIds);

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
  };

  // ── Persist results ────────────────────────────────────────────────────────
  await Promise.all([
    db.upsertAnalysis(attemptId, {
      weak_topics: topicStats.filter((t) => t.isWeak),
      error_patterns: errorPatterns,
      free_marks: freeMarks,
      skip_analysis: skipAnalysis,
      study_plan: studyPlan,
      next_test_config: boosterConfig,
      model_used: "rule-engine-v2",
      tokens_used: 0,
      processing_ms: processingMs,
    }),
    db.saveAnswerClassifications(attemptId, classified),
    db.updateStudentErrorProfile(attempt.student_id, attempt.exam_id, classified),
  ]);

  return result;
}
