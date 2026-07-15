import { Queue } from "bullmq";
import { connection } from "./redis";

export const ANALYSIS_QUEUE_NAME = "analysis_queue";

export const analysisQueue = new Queue(ANALYSIS_QUEUE_NAME, {
  connection: connection as any,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 2000, // 2s, 4s, 8s
    },
    removeOnComplete: true,
    removeOnFail: false,
  },
});
