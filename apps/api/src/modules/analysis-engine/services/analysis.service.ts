import { AnalysisResult } from "../../../../../../packages/types/src/analysis.types";
import { supabaseDB } from "../../../lib/supabase";
import { analyzeJeeAttempt } from "./jee/jee-analysis.service";
import { analyzeNeetAttempt } from "./neet/neet-analysis.service";
import { analyzeSscAttempt } from "./ssc/ssc-analysis.service";

/**
 * Top-level orchestrator for the Analysis Engine.
 * Routes to the correct exam pipeline based on exam_code.
 * Reads from real Supabase (db.service) instead of in-memory mock.
 */
export async function analyzeAttempt(attemptId: string, hasTimingData = true): Promise<AnalysisResult> {
  // Fetch only exam_code first to route to the correct sub-pipeline,
  // preventing double fetches of attempts/answers.
  const { data } = await supabaseDB
    .from("attempts")
    .select("exam_code")
    .eq("id", attemptId)
    .maybeSingle();
  
  const examCode = data?.exam_code ?? "jee-main";

  if (examCode.startsWith("ssc")) {
    return analyzeSscAttempt(attemptId, hasTimingData);
  }

  if (examCode === "neet" || examCode === "neet-ug" || examCode === "neet-omr") {
    return analyzeNeetAttempt(attemptId, hasTimingData);
  }

  // Default: JEE pipeline
  return analyzeJeeAttempt(attemptId, hasTimingData);
}
