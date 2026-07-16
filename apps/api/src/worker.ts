import dotenv from "dotenv";
dotenv.config();

console.log("[Worker] Starting standalone Classphere Background Worker process...");

// Import worker to initialize the connection and start listening to queue jobs
import { analysisWorker } from "./workers/analysis.worker";
import { connection } from "./lib/queue/redis";

console.log("[Worker] Background analysis worker listening for jobs.");

const gracefulShutdown = async (signal: string) => {
  console.log(`[Worker] Received ${signal}. Shutting down worker gracefully...`);
  try {
    // Stop fetching new jobs and wait for running jobs to finish (REL-4)
    await analysisWorker.close();
    // Quit shared Redis connection
    await connection.quit();
    console.log("[Worker] Background worker shut down successfully.");
  } catch (err: any) {
    console.error("[Worker] Error during graceful shutdown:", err.message);
  }
  process.exit(0);
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
