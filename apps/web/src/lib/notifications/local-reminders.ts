import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";

/** Minimal shape we need from Next's router — avoids coupling to its internal type. */
interface PushRouter {
  push: (href: string) => void;
}

const REMINDER_LEAD_MINUTES = 30;
const DPP_REMINDER_HOUR = 18; // fire at 6 PM local time if DPPs are still pending

/** Capacitor local notification ids must be 32-bit ints — derive a stable one from any string. */
function stableId(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 31 + input.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) || 1;
}

const DPP_REMINDER_ID = stableId("dpp-daily-reminder");

async function ensurePermission(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  try {
    const current = await LocalNotifications.checkPermissions();
    if (current.display === "granted") return true;
    if (current.display !== "prompt" && current.display !== "prompt-with-rationale") return false;
    const result = await LocalNotifications.requestPermissions();
    return result.display === "granted";
  } catch {
    return false;
  }
}

/**
 * Schedules a reminder REMINDER_LEAD_MINUTES before a scheduled test's start
 * time. Uses a stable id per test so calling this again (e.g. next time the
 * tests page loads) reschedules rather than duplicating.
 */
export async function scheduleTestReminder(test: { id: string; title: string; scheduledAt: string | null }): Promise<void> {
  if (!test.scheduledAt) return;
  const startAtMs = new Date(test.scheduledAt).getTime();
  if (!Number.isFinite(startAtMs)) return;
  const fireAtMs = startAtMs - REMINDER_LEAD_MINUTES * 60 * 1000;
  if (fireAtMs <= Date.now()) return; // too close to / past start to usefully remind

  if (!(await ensurePermission())) return;
  try {
    await LocalNotifications.schedule({
      notifications: [{
        id: stableId(`test:${test.id}`),
        title: "Test starting soon",
        body: `${test.title} starts in ${REMINDER_LEAD_MINUTES} minutes`,
        schedule: { at: new Date(fireAtMs) },
        extra: { href: "/student/tests" },
      }],
    });
  } catch (error) {
    console.error("[local-reminders] failed to schedule test reminder", error);
  }
}

/**
 * Schedules (or cancels, if none pending) a single daily reminder for
 * outstanding DPPs. Re-running this replaces the previous day's reminder
 * with a fresh count/time rather than stacking notifications.
 */
export async function scheduleDppReminder(pendingCount: number): Promise<void> {
  if (pendingCount <= 0) {
    await cancelDppReminder();
    return;
  }
  if (!(await ensurePermission())) return;

  const now = new Date();
  const fireAt = new Date(now);
  fireAt.setHours(DPP_REMINDER_HOUR, 0, 0, 0);
  if (fireAt.getTime() <= now.getTime()) fireAt.setDate(fireAt.getDate() + 1);

  try {
    await LocalNotifications.schedule({
      notifications: [{
        id: DPP_REMINDER_ID,
        title: "Daily practice pending",
        body: pendingCount === 1 ? "You have 1 DPP left to complete today" : `You have ${pendingCount} DPPs left to complete`,
        schedule: { at: fireAt },
        extra: { href: "/student/dpps" },
      }],
    });
  } catch (error) {
    console.error("[local-reminders] failed to schedule DPP reminder", error);
  }
}

export async function cancelDppReminder(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await LocalNotifications.cancel({ notifications: [{ id: DPP_REMINDER_ID }] });
  } catch {
    // best-effort cleanup only
  }
}

/** Deep-links into the app when a local reminder notification is tapped. */
export function registerLocalNotificationTapHandler(router: PushRouter): { remove: () => Promise<void> } | null {
  if (!Capacitor.isNativePlatform()) return null;
  const listenerPromise = LocalNotifications.addListener("localNotificationActionPerformed", (action) => {
    const href = action.notification.extra?.href;
    if (typeof href === "string" && href.startsWith("/")) router.push(href);
  });
  return {
    remove: async () => {
      const listener = await listenerPromise;
      await listener.remove();
    },
  };
}
