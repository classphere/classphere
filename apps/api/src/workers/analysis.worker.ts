import { Worker, Job } from "bullmq";
import { getRedisOptions } from "../lib/queue/redis";
import { ANALYSIS_QUEUE_NAME } from "../lib/queue/analysis.queue";
import { analyzeAttempt } from "../modules/analysis-engine/services/analysis.service";
import { db } from "../modules/analysis-engine/services/db.service";
import { supabaseAdmin } from "../lib/supabase";
import { notifyStudents } from "../modules/notifications/notifications.service";

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

export const analysisWorker = new Worker(
  ANALYSIS_QUEUE_NAME,
  async (job: Job) => {
    const { attemptId, studentId, examCode } = job.data;

    console.log(`[Worker] Starting analysis for attempt: ${attemptId}`);

    try {
      await analyzeAttempt(attemptId);
      void notifyResultReady(attemptId, studentId);

      console.log(`[Worker] Successfully analyzed attempt: ${attemptId}`);
      return { success: true };
    } catch (err: any) {
      console.error(`[Worker] Failed to analyze attempt ${attemptId}:`, err.message);
      throw err; // Trigger BullMQ retry
    }
  },
  {
    connection: getRedisOptions() as any,
    concurrency: 20, // Concurrency for processing active jobs
    drainDelay: 30, // Wait 30s when queue is empty before polling again (reduces idle commands)
    stalledInterval: 300000, // Check for stalled jobs every 5 mins instead of 30s (reduces idle EVALSHA commands)
    maxStalledCount: 2,
  }
);

analysisWorker.on("failed", (job, err) => {
  console.error(`[Worker] Job ${job?.id} failed with error:`, err.message);
});
