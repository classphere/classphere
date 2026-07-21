import { Queue } from "bullmq";
import { getRedisOptions } from "./redis";

export const ANALYSIS_QUEUE_NAME = "analysis_queue";

export const analysisQueue = new Queue(ANALYSIS_QUEUE_NAME, {
  connection: getRedisOptions() as any,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 2000, // 2s, 4s, 8s
    },
    removeOnComplete: true,
    removeOnFail: {
      count: 1000, // Keep max 1000 failed jobs to prevent Redis memory bloat
      age: 24 * 3600, // Clear failed jobs older than 24 hours
    },
  },
});

export async function enqueueAnalysis(attemptId: string, studentId: string, examCode: string) {
  const jobId = `analysis-${attemptId}`; // Avoid reserved colon separator (REL-1)

  const existingJob = await analysisQueue.getJob(jobId);
  if (existingJob) {
    const state = await existingJob.getState();
    if (state === "failed") {
      // Remove failed job first so we can re-queue and run it again
      await existingJob.remove();
    } else if (state === "completed" || state === "active" || state === "waiting" || state === "delayed") {
      // Skip enqueuing if the job is already active or waiting
      return existingJob;
    }
  }

  return analysisQueue.add(
    "analyze",
    { attemptId, studentId, examCode },
    { jobId }
  );
}
