import { Worker, Job } from "bullmq";
import { loggedConnection } from "../lib/queue/redis";
import { ANALYSIS_QUEUE_NAME } from "../lib/queue/analysis.queue";
import { analyzeAttempt } from "../modules/analysis-engine/services/analysis.service";
import { db } from "../modules/analysis-engine/services/db.service";
import { supabaseAdmin } from "../lib/supabase";
import { notifyStudents } from "../modules/notifications/notifications.service";
import { refreshQuestionStats } from "../lib/question-stats";

async function notifyResultReady(attemptId: string, studentId: string): Promise<void> {
  try {
    const [{ data: attempt }, { data: user }] = await Promise.all([
      supabaseAdmin.from("attempts").select("paper_id, papers(title)").eq("id", attemptId).maybeSingle(),
      supabaseAdmin.from("users").select("institute_id").eq("id", studentId).maybeSingle(),
    ]);
    if (!user?.institute_id) return; // no institute to scope the notification to
    const paperTitle = (attempt as any)?.papers?.title ?? "Your test";
    await notifyStudents({
      instituteId: user.institute_id,
      userIds: [studentId],
      type: "result_ready",
      title: "Your result is ready",
      body: paperTitle,
      href: `/student/results/${attemptId}`,
      eventKey: `result_ready:${attemptId}`,
      metadata: { attempt_id: attemptId, paper_id: (attempt as any)?.paper_id ?? null },
    });
  } catch (error) {
    // A notification failure must never affect the analysis job's success —
    // the report itself is already saved; this is best-effort delivery only.
    console.error(`[Worker] result_ready notification failed for attempt ${attemptId}:`, error);
  }
}

export /**
 * Refresh the answer rollup for the questions in one attempt.
 *
 * Scoped rather than global: rebuilding all 56,000 questions after every
 * submission would be wasteful, and only the ones just answered can have
 * changed.
 */
async function refreshStatsForAttempt(attemptId: string): Promise<void> {
  try {
    const { data } = await supabaseAdmin
      .from("attempt_answers")
      .select("question_id")
      .eq("attempt_id", attemptId);
    const ids = [...new Set((data ?? []).map((row: any) => row.question_id).filter(Boolean))];
    if (ids.length === 0) return;
    const n = await refreshQuestionStats(ids);
    console.log(`[Worker] Refreshed answer stats for ${n} question(s) from attempt ${attemptId}`);
  } catch (err: any) {
    console.error(`[Worker] Answer-stats refresh failed for ${attemptId}:`, err.message);
  }
}

export const analysisWorker = new Worker(
  ANALYSIS_QUEUE_NAME,
  async (job: Job) => {
    const { attemptId, studentId, examCode } = job.data;

    console.log(`[Worker] Starting analysis for attempt: ${attemptId}`);

    try {
      await analyzeAttempt(attemptId);
      void notifyResultReady(attemptId, studentId);

      // Fold this submission into the per-question rollup, so observed
      // difficulty and the wrong-answer distribution stay current as students
      // work through a paper. Scoped to the questions this attempt touched.
      // Best-effort: a stale rollup is a slightly weaker insight next time,
      // not a failed analysis, so it must not retry the whole job.
      void refreshStatsForAttempt(attemptId);

      console.log(`[Worker] Successfully analyzed attempt: ${attemptId}`);
      return { success: true };
    } catch (err: any) {
      console.error(`[Worker] Failed to analyze attempt ${attemptId}:`, err.message);
      throw err; // Trigger BullMQ retry
    }
  },
  {
    connection: loggedConnection("analysisWorker") as any,
    concurrency: 20, // Concurrency for processing active jobs
    drainDelay: 30, // Wait 30s when queue is empty before polling again (reduces idle commands)
    stalledInterval: 300000, // Check for stalled jobs every 5 mins instead of 30s (reduces idle EVALSHA commands)
    maxStalledCount: 2,
  }
);

analysisWorker.on("failed", (job, err) => {
  console.error(`[Worker] Job ${job?.id} failed with error:`, err.message);
});
