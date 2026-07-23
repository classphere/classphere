import { Worker, Job } from "bullmq";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { getRedisOptions } from "../lib/queue/redis";
import { PDF_EXTRACTION_QUEUE_NAME, PdfExtractionJobData, scheduleMarkerRecovery } from "../lib/queue/pdf-extraction.queue";
import { preparePDFExtraction, continuePDFExtraction } from "../services/extractor/pdfExtractor.service";
import { supabaseAdmin } from "../lib/supabase";
import { getR2Object, deleteR2Object } from "../lib/r2";
import { uploadPipelineBundle, downloadPipelineBundle, deletePipelineBundle } from "../lib/queue/pipeline-artifacts";
import { env } from "../config/env";

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

async function loadPipelineState(jobId: string): Promise<any> {
  const { data, error } = await supabaseAdmin
    .from("pdf_extraction_jobs")
    .select("result")
    .eq("id", jobId)
    .single();
  if (error || !data?.result?.pipeline) {
    throw new Error(`Missing persisted pipeline state for job ${jobId}`);
  }
  return data.result.pipeline;
}

async function processStart(job: Job<PdfExtractionJobData>) {
  const { jobId, r2Key, pages, requestedBy } = job.data;
  await updateJobStatus(jobId, { status: "processing", started_at: new Date().toISOString() });

  const workDir = path.join(TEMP_DIR, `job_${jobId}`);
  fs.mkdirSync(workDir, { recursive: true });
  const pdfPath = path.join(workDir, "temp.pdf");

  try {
    fs.writeFileSync(pdfPath, await getR2Object(r2Key));
    const webhookUrl = env.DATALAB_WEBHOOK_BASE_URL && env.DATALAB_WEBHOOK_SECRET
      ? `${env.DATALAB_WEBHOOK_BASE_URL.replace(/\/$/, "")}/${jobId}`
      : undefined;

    const prepared = await preparePDFExtraction(pdfPath, pages, webhookUrl);
    if (prepared.state === "complete") {
      if (!prepared.result.success || !prepared.result.questions?.length) {
        throw new Error(prepared.result.message || "Extraction produced no questions");
      }
      await updateJobStatus(jobId, {
        status: "done",
        result: { questions: prepared.result.questions, message: prepared.result.message },
        completed_at: new Date().toISOString(),
      }, true);
      await deleteR2Object(r2Key);
      console.log(`[pdfWorker] Job ${jobId} done — ${prepared.result.questions.length} questions`);
      return;
    }

    // Persist local PyMuPDF/Cerebras intermediates and release this worker slot.
    const bundleKey = `temp-pdf-jobs/${jobId}-pipeline.bundle.gz`;
    await uploadPipelineBundle(path.join(workDir, "extracted_data"), bundleKey);
    await updateJobStatus(jobId, {
      status: "processing",
      result: {
        pipeline: {
          stage: "waiting_marker",
          source: prepared.source,
          request_id: prepared.requestId,
          request_check_url: prepared.requestCheckUrl,
          bundle_key: bundleKey,
          r2_key: r2Key,
          pages: pages ?? null,
          requested_by: requestedBy,
          submitted_at: new Date().toISOString(),
        },
      },
    }, true);
    // Recovery safety net: one delayed check after 12 minutes. The webhook
    // promotes this exact deterministic job id immediately; no tight polling.
    try {
      await scheduleMarkerRecovery({
        jobId,
        r2Key,
        pages,
        requestedBy,
        requestId: prepared.requestId,
        requestCheckUrl: prepared.requestCheckUrl,
      });
    } catch (err: any) {
      // Webhook remains primary; don't resubmit Datalab just because the optional
      // recovery timer couldn't be scheduled.
      console.warn(`[pdfWorker] Could not schedule Marker recovery for ${jobId}: ${err?.message || err}`);
    }
    console.log(`[pdfWorker] Job ${jobId} waiting for Datalab webhook (${prepared.requestId}); worker slot released.`);
  } finally {
    // Keep the original R2 PDF on failure so BullMQ retries have source data.
    // It is deleted explicitly on success/waiting completion, or by the final
    // failed-event cleanup after all attempts are exhausted.
    try { fs.rmSync(workDir, { recursive: true, force: true }); } catch { /* ignore */ }
  }
}

async function processContinuation(job: Job<PdfExtractionJobData>) {
  const { jobId } = job.data;
  const state = await loadPipelineState(jobId);
  if (state.stage !== "waiting_marker" && state.stage !== "continuing_marker") {
    if (state.stage === "complete") return; // duplicate webhook after completion
    throw new Error(`Unexpected pipeline stage: ${state.stage}`);
  }
  if (job.data.requestId && state.request_id !== job.data.requestId) {
    throw new Error("Datalab request id does not match persisted pipeline state");
  }

  const workDir = path.join(TEMP_DIR, `job_${jobId}-marker`);
  fs.mkdirSync(workDir, { recursive: true });
  const extractedDir = path.join(workDir, "extracted_data");

  await updateJobStatus(jobId, {
    status: "processing",
    result: { pipeline: { ...state, stage: "continuing_marker" } },
  }, true);

  try {
    await downloadPipelineBundle(state.bundle_key, extractedDir);
    const result = await continuePDFExtraction(
      workDir,
      job.data.requestCheckUrl || state.request_check_url,
      state.source,
      state.pages || undefined,
    );
    if (!result.success || !result.questions?.length) {
      throw new Error(result.message || "Marker continuation produced no questions");
    }
    await updateJobStatus(jobId, {
      status: "done",
      result: {
        questions: result.questions,
        message: result.message,
        pipeline: { stage: "complete", request_id: state.request_id },
      },
      completed_at: new Date().toISOString(),
    }, true);
    await Promise.allSettled([
      deleteR2Object(state.r2_key),
      deletePipelineBundle(state.bundle_key),
    ]);
    console.log(`[pdfWorker] Marker continuation ${jobId} done — ${result.questions.length} questions`);
  } finally {
    try { fs.rmSync(workDir, { recursive: true, force: true }); } catch { /* ignore */ }
  }
}

async function processPdfJob(job: Job<PdfExtractionJobData>) {
  if ((job.data.phase ?? "start") === "continue_marker" || job.name === "continue_marker") {
    return processContinuation(job);
  }
  return processStart(job);
}

export const pdfExtractionWorker = new Worker<PdfExtractionJobData>(
  PDF_EXTRACTION_QUEUE_NAME,
  processPdfJob,
  {
    connection: getRedisOptions() as any,
    concurrency: 2,
    drainDelay: 60,
    lockDuration: 15 * 60 * 1000,
    stalledInterval: 600000,
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
      try {
        const state = await loadPipelineState(job.data.jobId);
        await Promise.allSettled([
          deleteR2Object(job.data.r2Key),
          state.r2_key ? deleteR2Object(state.r2_key) : Promise.resolve(),
          state.bundle_key ? deletePipelineBundle(state.bundle_key) : Promise.resolve(),
        ]);
      } catch {
        // Pipeline state may not exist if phase 1 failed early; still remove the
        // original PDF after all retries are exhausted.
        await deleteR2Object(job.data.r2Key).catch(() => {});
      }
    }
  }
});
