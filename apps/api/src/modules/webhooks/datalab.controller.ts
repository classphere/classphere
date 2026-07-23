import { Request, Response } from "express";
import crypto from "crypto";
import { env } from "../../config/env";
import { supabaseAdmin } from "../../lib/supabase";
import { enqueueMarkerContinuation } from "../../lib/queue/pdf-extraction.queue";

function safeEqual(a: string, b: string): boolean {
  const ah = crypto.createHash("sha256").update(a).digest();
  const bh = crypto.createHash("sha256").update(b).digest();
  return crypto.timingSafeEqual(ah, bh);
}

/**
 * POST /api/v1/webhooks/datalab/marker/:jobId
 *
 * Datalab sends only a completion notification. This handler verifies the
 * secret, validates request_id against persisted state, and enqueues an
 * idempotent continuation job. It never downloads/processes the result inside
 * the HTTP request and responds well within Datalab's 30-second timeout.
 */
export const handleMarkerWebhook = async (req: Request, res: Response): Promise<void> => {
  const expectedSecret = env.DATALAB_WEBHOOK_SECRET;
  if (!expectedSecret) {
    res.status(503).json({ success: false, message: "Datalab webhook is not configured" });
    return;
  }

  const { request_id, request_check_url, webhook_secret } = req.body ?? {};
  if (typeof webhook_secret !== "string" || !safeEqual(webhook_secret, expectedSecret)) {
    res.status(401).json({ success: false, message: "Invalid webhook secret" });
    return;
  }
  if (typeof request_id !== "string" || typeof request_check_url !== "string") {
    res.status(400).json({ success: false, message: "Missing request_id/request_check_url" });
    return;
  }

  const jobId = req.params.jobId;
  try {
    const { data: row, error } = await supabaseAdmin
      .from("pdf_extraction_jobs")
      .select("status, result, requested_by, pages")
      .eq("id", jobId)
      .maybeSingle();
    if (error) throw error;
    if (!row) {
      res.status(404).json({ success: false, message: "Extraction job not found" });
      return;
    }
    if (row.status === "done") {
      res.status(200).json({ success: true, duplicate: true });
      return;
    }

    const state = row.result?.pipeline;
    // Datalab can complete in under a second, before the start worker finishes
    // uploading/persisting the intermediate bundle. A 503 asks Datalab to retry
    // (their webhook policy retries 5xx/timeouts, not 4xx).
    if (!state?.request_id || !state?.bundle_key) {
      res.status(503).json({ success: false, message: "Pipeline state not ready; retry webhook" });
      return;
    }
    if (state.request_id !== request_id) {
      res.status(409).json({ success: false, message: "Datalab request id mismatch" });
      return;
    }
    // Do not trust an arbitrary callback URL from the request. Use the URL we
    // stored from our own Datalab submission; compare payload for consistency.
    if (state.request_check_url !== request_check_url) {
      res.status(409).json({ success: false, message: "Datalab check URL mismatch" });
      return;
    }

    try {
      await enqueueMarkerContinuation({
        jobId,
        r2Key: state.r2_key,
        pages: state.pages ?? row.pages ?? undefined,
        requestedBy: state.requested_by ?? row.requested_by ?? "",
        requestId: state.request_id,
        requestCheckUrl: state.request_check_url,
      });
    } catch (e: any) {
      // Deterministic BullMQ job id makes retries idempotent. If another webhook
      // already enqueued it, acknowledge instead of making Datalab retry forever.
      if (!String(e?.message || "").toLowerCase().includes("job")) throw e;
    }

    res.status(202).json({ success: true, queued: true });
  } catch (err: any) {
    console.error("[datalabWebhook]", err?.message ?? err);
    res.status(503).json({ success: false, message: "Could not enqueue Marker continuation" });
  }
};
