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

export const lifecycleWorker = new Worker(
  LIFECYCLE_QUEUE_NAME,
  async (job: Job) => {
    if (job.name === "check_batch_expiry") {
      console.log("[Worker] Running batch expiry checks...");
      const nowIso = new Date().toISOString();

      // Fetch all active batches whose ends_at has passed
      const { data: expiredBatches, error } = await supabaseDB
        .from("batches")
        .select("id, name, ends_at")
        .eq("is_active", true)
        .lt("ends_at", nowIso);

      if (error) {
        console.error("[Worker] Error fetching expired batches:", error.message);
        throw error;
      }

      if (!expiredBatches || expiredBatches.length === 0) {
        console.log("[Worker] No newly expired batches found.");
        return { success: true, deactivated: 0 };
      }

      console.log(`[Worker] Found ${expiredBatches.length} expired batches to deactivate.`);
      const batchIds = expiredBatches.map((b) => b.id);

      // Update batches to set is_active = false
      const { error: updateErr } = await supabaseDB
        .from("batches")
        .update({ is_active: false })
        .in("id", batchIds);

      if (updateErr) {
        console.error("[Worker] Error updating expired batches:", updateErr.message);
        throw updateErr;
      }

      // Record lifecycle events in batch_lifecycle_events
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
      }

      console.log(`[Worker] Successfully deactivated ${expiredBatches.length} expired batches.`);
      return { success: true, deactivated: expiredBatches.length };
    }
  },
  {
    connection: getRedisOptions() as any,
    concurrency: 1,
  }
);

lifecycleWorker.on("failed", (job, err) => {
  console.error(`[lifecycleWorker] Job ${job?.id} failed with error:`, err.message);
});
