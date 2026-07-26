import "./config/env";

import { analysisWorker } from "./workers/analysis.worker";
import { lifecycleWorker, setupLifecycleCron } from "./workers/lifecycle.worker";
import { pdfExtractionWorker } from "./workers/pdf-extraction.worker";
import { connection } from "./lib/queue/redis";

export function startWorkers() {
  console.log("[Worker] Initializing Classphere Background Workers (Analysis, Lifecycle, PDF Extraction)...");
  analysisWorker.on("error", (err) => console.error("[analysisWorker] Error:", err.message));
  lifecycleWorker.on("error", (err) => console.error("[lifecycleWorker] Error:", err.message));
  pdfExtractionWorker.on("error", (err) => console.error("[pdfExtractionWorker] Error:", err.message));

  setupLifecycleCron().catch(err => console.error("[Worker] Cron setup failed:", err));
  console.log("[Worker] All background workers listening for queue jobs.");
}

export async function stopWorkers() {
  console.log("[Worker] Shutting down background workers gracefully...");
  try {
    await analysisWorker.close();
    await lifecycleWorker.close();
    await pdfExtractionWorker.close();
    await connection.quit();
    console.log("[Worker] Background workers shut down successfully.");
  } catch (err: any) {
    console.error("[Worker] Error during worker shutdown:", err.message);
  }
}

// If run directly as standalone script (node dist/worker.js or ts-node-dev src/worker.ts)
if (require.main === module) {
  startWorkers();
  const handleSignal = async (signal: string) => {
    console.log(`[Worker] Received ${signal}. Shutting down standalone worker...`);
    await stopWorkers();
    process.exit(0);
  };
  process.on("SIGTERM", () => handleSignal("SIGTERM"));
  process.on("SIGINT", () => handleSignal("SIGINT"));
}
