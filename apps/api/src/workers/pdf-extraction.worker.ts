import { Worker, Job } from "bullmq";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { getRedisOptions } from "../lib/queue/redis";
import { PDF_EXTRACTION_QUEUE_NAME, PdfExtractionJobData } from "../lib/queue/pdf-extraction.queue";
import { extractPDFV4 } from "../services/extractor/pdfExtractorV4.service";
import { supabaseAdmin } from "../lib/supabase";
import { getR2Object, deleteR2Object } from "../lib/r2";

const TEMP_DIR = path.join(os.tmpdir(), "classphere-pdf-jobs");

async function updateJobStatus(
  jobId: string,
  fields: Record<string, unknown>,
  strict = false,
): Promise<void> {
  try {
    const { error } = await supabaseAdmin
      .from("pdf_extraction_jobs")
      .update(fields)
      .eq("id", jobId);
    if (error) throw error;
  } catch (err) {
    if (strict) throw err;
    console.warn(`[pdfWorker] Best-effort status update failed for ${jobId}`);
  }
}

async function processPdfJob(job: Job<PdfExtractionJobData>): Promise<void> {
  const { jobId, r2Key, pages, examCategory } = job.data;
  await updateJobStatus(jobId, { status: "processing", started_at: new Date().toISOString() });

  const workDir = path.join(TEMP_DIR, `job_${jobId}`);
  fs.mkdirSync(workDir, { recursive: true });
  const pdfPath = path.join(workDir, "temp.pdf");

  try {
    fs.writeFileSync(pdfPath, await getR2Object(r2Key));

    const result = await extractPDFV4(pdfPath, pages, { examCategory });

    if (!result.success || !result.questions?.length) {
      throw new Error(result.message || "Extraction produced no questions");
    }

    await updateJobStatus(jobId, {
      status: "done",
      result: {
        questions: result.questions,
        message: result.message,
        ...(result.profile ? { profile: result.profile, extractor_version: "v4" } : {}),
      },
      completed_at: new Date().toISOString(),
    }, true);

    await deleteR2Object(r2Key);
    console.log(`[pdfWorker] Job ${jobId} done — ${result.questions.length} questions`);
  } finally {
    try { fs.rmSync(workDir, { recursive: true, force: true }); } catch { /* ignore */ }
  }
}

export const pdfExtractionWorker = new Worker<PdfExtractionJobData>(
  PDF_EXTRACTION_QUEUE_NAME,
  processPdfJob,
  {
    connection: getRedisOptions() as any,
    concurrency: 2,
    drainDelay: 60,
    lockDuration: 30 * 60 * 1000, // Gemini calls can be long — 30 min lock
    stalledInterval: 600_000,
    maxStalledCount: 1,
  }
);

pdfExtractionWorker.on("failed", async (job, err) => {
  console.error(`[pdfWorker] Job ${job?.id} failed:`, err.message);
  if (job?.data?.jobId) {
    const isFinalAttempt = (job.attemptsMade ?? 0) >= (job.opts?.attempts ?? 1);
    if (isFinalAttempt) {
      await updateJobStatus(job.data.jobId, {
        status: "failed",
        error: err.message,
        completed_at: new Date().toISOString(),
      });
      await deleteR2Object(job.data.r2Key).catch(() => {});
    }
  }
});
