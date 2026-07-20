import { supabaseDB } from "../../lib/supabase";

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
}
