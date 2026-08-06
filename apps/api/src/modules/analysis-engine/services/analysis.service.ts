import { AnalysisResult } from "../../../../../../packages/types/src/analysis.types";
import { supabaseAdmin } from "../../../lib/supabase";
import { analyzeJeeAttempt } from "./jee/jee-analysis.service";
import { analyzeNeetAttempt } from "./neet/neet-analysis.service";

/**
 * Top-level orchestrator for the Analysis Engine.
 * Routes to the correct exam pipeline based on exam_code.
 *
 * Only JEE and NEET are supported. The SSC pipeline was removed while the
 * product focuses on those two; it remains in git history if it is needed
 * again. An unrecognised exam_code falls through to the JEE pipeline, which
 * is the historical default.
 */
export async function analyzeAttempt(attemptId: string, hasTimingData = true): Promise<AnalysisResult> {
  // Fetch only exam_code first to route to the correct sub-pipeline,
  // preventing double fetches of attempts/answers.
  const { data } = await supabaseAdmin
    .from("attempts")
    .select("exam_code")
    .eq("id", attemptId)
    .maybeSingle();
  
  const examCode = data?.exam_code ?? "jee-main";

  if (examCode === "neet" || examCode === "neet-ug" || examCode === "neet-omr") {
    return analyzeNeetAttempt(attemptId, hasTimingData);
  }

  // Default: JEE pipeline
  return analyzeJeeAttempt(attemptId, hasTimingData);
}
