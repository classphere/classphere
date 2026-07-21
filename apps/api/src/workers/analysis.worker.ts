import { Worker, Job } from "bullmq";
import { getRedisOptions } from "../lib/queue/redis";
import { ANALYSIS_QUEUE_NAME } from "../lib/queue/analysis.queue";
import { analyzeAttempt } from "../modules/analysis-engine/services/analysis.service";
import { db } from "../modules/analysis-engine/services/db.service";

export const analysisWorker = new Worker(
  ANALYSIS_QUEUE_NAME,
  async (job: Job) => {
    const { attemptId, studentId, examCode } = job.data;
    
    console.log(`[Worker] Starting analysis for attempt: ${attemptId}`);
    
    try {
      await analyzeAttempt(attemptId);
      
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
