import { AnalysisResult } from "../../../../../../packages/types/src/analysis.types";
import { db } from "./db.service";                // ← real Supabase (was db.mock)
import { analyzeJeeAttempt } from "./jee/jee-analysis.service";
import { analyzeNeetAttempt } from "./neet/neet-analysis.service";
import { analyzeSscAttempt } from "./ssc/ssc-analysis.service";

/**
 * Top-level orchestrator for the Analysis Engine.
 * Routes to the correct exam pipeline based on exam_code.
 * Reads from real Supabase (db.service) instead of in-memory mock.
 */
export async function analyzeAttempt(attemptId: string, hasTimingData = true): Promise<AnalysisResult> {
  // Single DB fetch — read both exam_code and all answers here.
  const { attempt } = await db.getAttemptWithAnswers(attemptId);
  const examCode = attempt.exam_code ?? "jee-main";

  if (examCode.startsWith("ssc")) {
    return analyzeSscAttempt(attemptId, hasTimingData);
  }

  if (examCode === "neet" || examCode === "neet-ug" || examCode === "neet-omr") {
    return analyzeNeetAttempt(attemptId, hasTimingData);
  }

  // Default: JEE pipeline
  return analyzeJeeAttempt(attemptId, hasTimingData);
}
