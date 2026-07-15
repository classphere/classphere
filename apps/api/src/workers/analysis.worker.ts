import { Worker, Job } from "bullmq";
import { connection } from "../lib/queue/redis";
import { ANALYSIS_QUEUE_NAME } from "../lib/queue/analysis.queue";
import { analyzeAttempt } from "../modules/analysis-engine/services/analysis.service";
import { db } from "../modules/analysis-engine/services/db.service";

export const analysisWorker = new Worker(
  ANALYSIS_QUEUE_NAME,
  async (job: Job) => {
    const { attemptId, studentId, examCode } = job.data;
    
    console.log(`[Worker] Starting analysis for attempt: ${attemptId}`);
    
    try {
      const analysisResult = await analyzeAttempt(attemptId);
      await db.upsertAnalysis(attemptId, studentId, examCode, analysisResult);
      
      console.log(`[Worker] Successfully analyzed attempt: ${attemptId}`);
      return { success: true };
    } catch (err: any) {
      console.error(`[Worker] Failed to analyze attempt ${attemptId}:`, err.message);
      throw err; // Trigger BullMQ retry
    }
  },
  {
    connection: connection as any,
    concurrency: 5, // Process up to 5 jobs simultaneously
  }
);

analysisWorker.on("failed", (job, err) => {
  console.error(`[Worker] Job ${job?.id} failed with error:`, err.message);
});
