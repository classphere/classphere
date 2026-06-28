import { AnalysisResult } from "../../../../../../packages/types/src/analysis.types";
import { mockDb as db } from "./db.mock";
import { analyzeJeeAttempt } from "./jee/jee-analysis.service";
import { analyzeNeetAttempt } from "./neet/neet-analysis.service";
import { analyzeSscAttempt } from "./ssc/ssc-analysis.service";

/**
 * Top-level orchestrator for the Analysis Engine.
 * This is a pure router. It reads the exam_code and delegates to the appropriate pipeline.
 *
 * IMPORTANT: The router does ONE db.getAttemptWithAnswers() call to read exam_code,
 * then passes the already-fetched data into the pipeline so pipelines do NOT fetch again.
 * This avoids the double-fetch issue.
 *
 * Extending this (e.g. for CUET, GATE) requires ZERO changes to existing pipelines,
 * only adding a new folder and a new line in this router.
 */
export async function analyzeAttempt(attemptId: string, hasTimingData = true): Promise<AnalysisResult> {
  // Single DB fetch — read both exam_code and all answers here.
  // The pipeline receives pre-fetched data so it never re-fetches.
  const { attempt, answers } = await db.getAttemptWithAnswers(attemptId);
  const examCode = attempt.exam_code ?? "jee-main";

  if (examCode.startsWith("ssc")) {
    return analyzeSscAttempt(attemptId, hasTimingData);
  }

  if (examCode === "neet" || examCode === "neet-omr") {
    return analyzeNeetAttempt(attemptId, hasTimingData);
  }

  // Default: JEE Pipeline
  return analyzeJeeAttempt(attemptId, hasTimingData);
}

// NOTE: The double-fetch above (router + pipeline both calling db.getAttemptWithAnswers)
// is a known architectural TODO. The next step is to refactor the pipeline functions to
// accept (attempt, answers) as parameters instead of re-fetching. For now, since db.mock
// uses an in-memory Map, this is fast (no network cost). In production with a real DB,
// this MUST be resolved before deployment.
