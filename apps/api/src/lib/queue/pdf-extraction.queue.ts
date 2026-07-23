import { Queue } from "bullmq";
import { getRedisOptions } from "./redis";

export const PDF_EXTRACTION_QUEUE_NAME = "pdf_extraction_queue";

export interface PdfExtractionJobData {
  /** start = run primary PyMuPDF/Cerebras and maybe submit Marker.
   *  continue_marker = fetch completed Marker result and finalize merge. */
  phase?: "start" | "continue_marker";
  jobId: string;       // Supabase row id in pdf_extraction_jobs
  r2Key: string;       // Original temp PDF in R2
  pages?: string;      // Optional page range e.g. "1-5"
  requestedBy: string; // user id for audit
  // Continuation-only fields supplied by the verified webhook.
  requestId?: string;
  requestCheckUrl?: string;
}

export const pdfExtractionQueue = new Queue(PDF_EXTRACTION_QUEUE_NAME, {
  connection: getRedisOptions() as any,
  defaultJobOptions: {
    attempts: 2,
    backoff: {
      type: "exponential",
      delay: 5000,
    },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 200, age: 48 * 3600 },
  },
});

export async function enqueuePdfExtraction(data: PdfExtractionJobData) {
  return pdfExtractionQueue.add("extract", { ...data, phase: data.phase ?? "start" }, {
    jobId: `pdf-${data.jobId}`,
  });
}

const markerJobId = (requestId: string) => `pdf-marker-${requestId}`;

/** Schedule one low-frequency recovery attempt. It uses the SAME deterministic
 * job id as the webhook continuation; the webhook simply promotes this delayed
 * job, so webhook/recovery can never process concurrently. */
export async function scheduleMarkerRecovery(data: PdfExtractionJobData & {
  requestId: string;
  requestCheckUrl: string;
}) {
  return pdfExtractionQueue.add("continue_marker", {
    ...data,
    phase: "continue_marker",
  }, {
    jobId: markerJobId(data.requestId),
    delay: 12 * 60 * 1000,
    attempts: 6,
    backoff: { type: "fixed", delay: 5 * 60 * 1000 },
  });
}

/** Webhook continuation, idempotent. If the recovery job already exists in the
 * delayed set, promote it to run now. Repeated webhooks find the same job. */
export async function enqueueMarkerContinuation(data: PdfExtractionJobData & {
  requestId: string;
  requestCheckUrl: string;
}) {
  const id = markerJobId(data.requestId);
  const existing = await pdfExtractionQueue.getJob(id);
  if (existing) {
    const state = await existing.getState();
    if (state === "delayed") await existing.promote();
    return existing;
  }
  return pdfExtractionQueue.add("continue_marker", {
    ...data,
    phase: "continue_marker",
  }, {
    jobId: id,
    attempts: 6,
    backoff: { type: "fixed", delay: 5 * 60 * 1000 },
  });
}
