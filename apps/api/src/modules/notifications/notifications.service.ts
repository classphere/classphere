import { supabaseDB } from "../../lib/supabase";
import { firebaseMessaging } from "../../lib/firebase";

type StudentNotification = {
  instituteId: string;
  userIds: string[];
  type: "dpp_assigned" | "test_published" | "study_material_published" | "system";
  title: string;
  body?: string;
  href?: string;
  eventKey: string;
  metadata?: Record<string, unknown>;
};

/** Persist first; Realtime and later native push are delivery channels, not truth. */
export async function notifyStudents(input: StudentNotification): Promise<void> {
  const userIds = [...new Set(input.userIds.filter(Boolean))];
  if (!userIds.length) return;
  const rows = userIds.map((userId) => ({
    user_id: userId, institute_id: input.instituteId, type: input.type,
    title: input.title, body: input.body ?? null, href: input.href ?? null,
    event_key: input.eventKey, metadata: input.metadata ?? {},
  }));
  const { error } = await supabaseDB.from("notifications").upsert(rows, {
    onConflict: "user_id,event_key", ignoreDuplicates: true,
  });
  if (error) throw error;
  void deliverNativePush(input, userIds);
}

async function deliverNativePush(input: StudentNotification, userIds: string[]): Promise<void> {
  const messaging = firebaseMessaging();
  if (!messaging || !userIds.length) return;
  try {
    const { data: devices, error } = await supabaseDB.from("push_devices").select("id, token")
      .in("user_id", userIds).is("disabled_at", null);
    if (error || !devices?.length) return;
    for (let offset = 0; offset < devices.length; offset += 500) {
      const group = devices.slice(offset, offset + 500);
      const result = await messaging.sendEachForMulticast({
        tokens: group.map((device: any) => device.token),
        notification: { title: input.title, body: input.body },
        data: { href: input.href ?? "/student/dashboard", type: input.type, eventKey: input.eventKey },
        android: { priority: "high", notification: { channelId: "classphere_updates" } },
      });
      const invalidIds = result.responses.flatMap((response, index) => {
        const code = response.error?.code;
        return !response.success && ["messaging/registration-token-not-registered", "messaging/invalid-registration-token"].includes(code ?? "") ? [group[index].id] : [];
      });
      if (invalidIds.length) await supabaseDB.from("push_devices").update({ disabled_at: new Date().toISOString() }).in("id", invalidIds);
    }
  } catch (error) {
    // A provider outage must never make a DPP/test publication fail. The
    // in-app notification remains available and can be retried by future work.
    console.error("[notifications] native push delivery failed:", error);
  }
}
