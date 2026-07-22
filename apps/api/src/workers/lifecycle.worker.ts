import { Worker, Job, Queue } from "bullmq";
import { getRedisOptions } from "../lib/queue/redis";
import { supabaseDB } from "../lib/supabase";

export const LIFECYCLE_QUEUE_NAME = "lifecycle_queue";

export const lifecycleQueue = new Queue(LIFECYCLE_QUEUE_NAME, {
  connection: getRedisOptions() as any,
  defaultJobOptions: {
    removeOnComplete: true,
    removeOnFail: { count: 50 },
  },
});

// Setup repeatable daily batch deactivation cron job (run daily at 00:05 IST)
export async function setupLifecycleCron() {
  // Clear any existing repeatable jobs with this name first to prevent duplicates
  const repeatableJobs = await lifecycleQueue.getRepeatableJobs();
  for (const job of repeatableJobs) {
    if (job.name === "check_batch_expiry") {
      await lifecycleQueue.removeRepeatableByKey(job.key);
    }
  }

  await lifecycleQueue.add(
    "check_batch_expiry",
    {},
    {
      repeat: {
        pattern: "5 0 * * *", // 00:05 every day
      },
    }
  );
  console.log("[lifecycleQueue] Repeatable cron job 'check_batch_expiry' scheduled.");
}

// Process expired batches in bounded pages so a mass-expiry day (e.g. end of
// term) doesn't load every row into memory at once.
const BATCH_PAGE_SIZE = 500;

export const lifecycleWorker = new Worker(
  LIFECYCLE_QUEUE_NAME,
  async (job: Job) => {
    if (job.name !== "check_batch_expiry") return { success: true, deactivated: 0 };

    console.log("[Worker] Running batch expiry checks...");
    const nowIso = new Date().toISOString();
    let totalDeactivated = 0;
    let page = 0;

    // Page through expired batches by ordering on id and using lt() on a cursor.
    // Supabase/PostgREST range pagination via .range() would skip/duplicate rows
    // if rows change mid-iteration, so we keyset-paginate on a stable cursor.
    let cursor: string | undefined;

    while (true) {
      let query = supabaseDB
        .from("batches")
        .select("id, name, ends_at")
        .eq("is_active", true)
        .lt("ends_at", nowIso)
        .order("id", { ascending: true })
        .limit(BATCH_PAGE_SIZE);

      if (cursor) query = query.gt("id", cursor);

      const { data: expiredBatches, error } = await query;

      if (error) {
        console.error("[Worker] Error fetching expired batches:", error.message);
        throw error;
      }

      if (!expiredBatches || expiredBatches.length === 0) {
        break; // no more pages
      }

      const batchIds = expiredBatches.map((b) => b.id);
      cursor = batchIds[batchIds.length - 1]; // advance keyset cursor

      // Update this page's batches to inactive.
      const { error: updateErr } = await supabaseDB
        .from("batches")
        .update({ is_active: false })
        .in("id", batchIds);

      if (updateErr) {
        console.error("[Worker] Error updating expired batches:", updateErr.message);
        throw updateErr;
      }

      // Record lifecycle events for this page.
      const events = expiredBatches.map((b) => ({
        batch_id: b.id,
        event_type: "expired",
        details: { ends_at: b.ends_at, auto_deactivated: true },
      }));
      const { error: eventErr } = await supabaseDB
        .from("batch_lifecycle_events")
        .insert(events);

      if (eventErr) {
        console.error("[Worker] Error logging batch lifecycle events:", eventErr.message);
        // Don't throw — the deactivation already succeeded; events are best-effort audit.
      }

      totalDeactivated += expiredBatches.length;
      console.log(`[Worker] Deactivated page of ${expiredBatches.length} batches (running total ${totalDeactivated}).`);

      // Last page — stop.
      if (expiredBatches.length < BATCH_PAGE_SIZE) break;
    }

    console.log(`[Worker] Done. Deactivated ${totalDeactivated} expired batches.`);
    return { success: true, deactivated: totalDeactivated };
  },
  {
    connection: getRedisOptions() as any,
    concurrency: 1,
  }
);

lifecycleWorker.on("failed", (job, err) => {
  console.error(`[lifecycleWorker] Job ${job?.id} failed with error:`, err.message);
});
