import { Worker, Job } from "bullmq";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { loggedConnection } from "../lib/queue/redis";
import { PDF_EXTRACTION_QUEUE_NAME, PdfExtractionJobData } from "../lib/queue/pdf-extraction.queue";
import { extractPDFV4 } from "../services/extractor/pdfExtractorV4.service";
import { supabaseAdmin } from "../lib/supabase";
import { getR2Object, deleteR2Object } from "../lib/r2";

const TEMP_DIR = path.join(os.tmpdir(), "classphere-pdf-jobs");

/**
 * These failures are caused by the uploaded input, not a transient worker or
 * provider issue. Completing the BullMQ job after saving the failure prevents
 * its configured retry from being claimed by a stale/other worker process.
 */
function isTerminalInputFailure(message: string): boolean {
  return /scanned pdf detected|only digital \(searchable\) pdfs are supported|invalid page range/i.test(message);
}

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
  const startedAt = Date.now();
  const logStage = (stage: string, message: string) =>
    console.info(`[pdfWorker][${jobId}][+${Date.now() - startedAt}ms][${stage}] ${message}`);
  logStage("start", `Processing queue job ${job.id}${pages ? ` for pages ${pages}` : ""}.`);
  await updateJobStatus(jobId, { status: "processing", started_at: new Date().toISOString() });

  const workDir = path.join(TEMP_DIR, `job_${jobId}`);
  fs.mkdirSync(workDir, { recursive: true });
  const pdfPath = path.join(workDir, "temp.pdf");

  try {
    logStage("download", `Downloading ${r2Key} from object storage.`);
    const pdfBuffer = await getR2Object(r2Key);
    logStage("download", `Downloaded ${(pdfBuffer.byteLength / 1024 / 1024).toFixed(2)} MB.`);
    fs.writeFileSync(pdfPath, pdfBuffer);

    logStage("extract", "Starting PyMuPDF page rendering and parallel Gemini extraction via OpenRouter.");
    const result = await extractPDFV4(pdfPath, pages, { examCategory });

    if (!result.success || !result.questions?.length) {
      const message = result.message || "Extraction produced no questions";
      if (isTerminalInputFailure(message)) {
        logStage("rejected", message);
        await updateJobStatus(jobId, {
          status: "failed",
          error: message,
          completed_at: new Date().toISOString(),
        }, true);
        await deleteR2Object(r2Key).catch(() => {});
        return;
      }
      throw new Error(message);
    }

    const completeness = result.completeness ?? null;
    const missing = completeness?.missing_total ?? 0;

    await updateJobStatus(jobId, {
      status: "done",
      result: {
        questions: result.questions,
        message: result.message,
        ...(completeness ? { completeness, needs_review: missing > 0 } : {}),
        ...(result.profile ? { profile: result.profile, extractor_version: "v4" } : {}),
      },
      completed_at: new Date().toISOString(),
    }, true);

    await deleteR2Object(r2Key);
    if (missing > 0) {
      // The PDF's own numbered anchors say questions are here that we could not
      // extract. Log it loudly — a partial paper reaching students unnoticed is
      // worse than a visibly failed job.
      logStage("incomplete", `INCOMPLETE: ${result.questions.length} extracted, ${missing} missing ` +
        `(completeness ${((completeness?.completeness ?? 0) * 100).toFixed(1)}%) — ` +
        `missing by page: ${JSON.stringify(completeness?.missing_by_page ?? {})}`);
    }
    logStage("complete", `Extraction completed with ${result.questions.length} questions.`);
    console.log(`[pdfWorker] Job ${jobId} done — ${result.questions.length} questions` +
      (missing > 0 ? ` (${missing} missing — needs review)` : ""));
  } catch (error: any) {
    logStage("error", error?.message || String(error));
    throw error;
  } finally {
    try { fs.rmSync(workDir, { recursive: true, force: true }); } catch { /* ignore */ }
  }
}

export const pdfExtractionWorker = new Worker<PdfExtractionJobData>(
  PDF_EXTRACTION_QUEUE_NAME,
  processPdfJob,
  {
    connection: loggedConnection("pdfExtractionWorker") as any,
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
    if (!isFinalAttempt) {
      await updateJobStatus(job.data.jobId, {
        // Keep the established status vocabulary; the saved error explains that
        // BullMQ will retry while the controller reports the job as queued.
        status: "pending",
        error: `Attempt ${job.attemptsMade ?? 1} failed and will retry: ${err.message}`,
      });
      return;
    }
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
