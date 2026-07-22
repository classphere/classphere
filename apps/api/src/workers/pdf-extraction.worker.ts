import { Worker, Job } from "bullmq";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { getRedisOptions } from "../lib/queue/redis";
import { PDF_EXTRACTION_QUEUE_NAME, PdfExtractionJobData } from "../lib/queue/pdf-extraction.queue";
import { extractPDF } from "../services/extractor/pdfExtractor.service";
import { supabaseAdmin } from "../lib/supabase";
import { getR2Object, deleteR2Object } from "../lib/r2";

const TEMP_DIR = path.join(os.tmpdir(), "classphere-pdf-jobs");

async function updateJobStatus(
  jobId: string,
  fields: Record<string, unknown>
): Promise<void> {
  try {
    await supabaseAdmin.from("pdf_extraction_jobs").update(fields).eq("id", jobId);
  } catch {
    /* best effort — don't let a status update failure crash the worker */
  }
}

async function processPdfJob(job: Job<PdfExtractionJobData>) {
  const { jobId, r2Key, pages } = job.data;

  await updateJobStatus(jobId, {
    status: "processing",
    started_at: new Date().toISOString(),
  });

  const workDir = path.join(TEMP_DIR, `job_${jobId}`);
  fs.mkdirSync(workDir, { recursive: true });
  const pdfPath = path.join(workDir, "temp.pdf");

  try {
    const pdfBuffer = await getR2Object(r2Key);
    fs.writeFileSync(pdfPath, pdfBuffer);

    const result = await extractPDF(pdfPath, pages);

    if (!result.success || !result.questions?.length) {
      throw new Error(result.message || "Extraction produced no questions");
    }

    await updateJobStatus(jobId, {
      status: "done",
      result: { questions: result.questions, message: result.message },
      completed_at: new Date().toISOString(),
    });

    console.log(`[pdfWorker] Job ${jobId} done — ${result.questions.length} questions`);
  } finally {
    try { fs.rmSync(workDir, { recursive: true, force: true }); } catch { /* ignore */ }
    try { await deleteR2Object(r2Key); } catch { /* ignore */ }
  }
}

export const pdfExtractionWorker = new Worker<PdfExtractionJobData>(
  PDF_EXTRACTION_QUEUE_NAME,
  processPdfJob,
  {
    connection: getRedisOptions() as any,
    concurrency: 2,
    drainDelay: 60,
    stalledInterval: 600000,
    maxStalledCount: 1,
  }
);

pdfExtractionWorker.on("failed", async (job, err) => {
  console.error(`[pdfWorker] Job ${job?.id} failed:`, err.message);
  if (job?.data?.jobId) {
    await updateJobStatus(job.data.jobId, {
      status: "failed",
      error: err.message,
      completed_at: new Date().toISOString(),
    });
  }
  if (job?.data?.r2Key && (job.attemptsMade ?? 0) >= (job.opts?.attempts ?? 1)) {
    try { await deleteR2Object(job.data.r2Key); } catch { /* ignore */ }
  }
});
