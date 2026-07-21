import { supabaseDB } from "../../lib/supabase";

type PaperWindow = {
  id: string;
  test_type?: string;
  created_by?: string | null;
  is_active: boolean;
  is_published: boolean;
  delivery_mode?: "public_practice" | "assigned_scheduled";
  available_from?: string | null;
  available_until?: string | null;
};

export type StudentTestAccess = {
  allowed: true;
  batchId: string | null;
  deliveryMode: "public_practice" | "assigned_scheduled";
} | { allowed: false; status: 403 | 404; message: string };

/** Server-side gate used for both paper reads and attempt creation. */
export async function getStudentTestAccess(studentId: string, paper: PaperWindow): Promise<StudentTestAccess> {
  // Personal boosters are generated from a student's own analysis. They are
  // intentionally unpublished and must never become visible to another student.
  if (paper.test_type === "booster" || paper.test_type === "topic-practice") {
    if (!paper.is_active || paper.created_by !== studentId) {
      return { allowed: false, status: 404, message: "This personal practice set is unavailable." };
    }
    return { allowed: true, batchId: null, deliveryMode: "public_practice" };
  }
  if (!paper.is_active || !paper.is_published) return { allowed: false, status: 404, message: "Test is unavailable." };

  let batchId: string | null = null;
  let assignmentStart: string | null = null;
  if ((paper.delivery_mode ?? "public_practice") === "assigned_scheduled") {
    const [{ data: assignments }, { data: memberships }] = await Promise.all([
      supabaseDB.from("test_batch_assignments").select("batch_id, scheduled_at").eq("test_id", paper.id),
      supabaseDB.from("batch_students").select("batch_id").eq("student_id", studentId),
    ]);
    const memberIds = new Set((memberships ?? []).map((row: any) => row.batch_id));
    const assignment = (assignments ?? []).find((row: any) => memberIds.has(row.batch_id));
    if (!assignment) return { allowed: false, status: 403, message: "This test is not assigned to one of your batches." };
    const { data: batch } = await supabaseDB.from("batches").select("is_active, starts_at, ends_at").eq("id", assignment.batch_id).maybeSingle();
    const now = Date.now();
    if (!batch?.is_active || (batch.starts_at && Date.parse(batch.starts_at) > now) || (batch.ends_at && Date.parse(batch.ends_at) <= now)) {
      return { allowed: false, status: 403, message: "This batch is no longer active." };
    }
    batchId = assignment.batch_id;
    assignmentStart = assignment.scheduled_at ?? null;
  }

  const now = Date.now();
  const start = paper.available_from ?? assignmentStart;
  if (start && new Date(start).getTime() > now) return { allowed: false, status: 403, message: "This test has not started yet." };
  if (paper.available_until && new Date(paper.available_until).getTime() <= now) return { allowed: false, status: 403, message: "This test window has closed." };
  return { allowed: true, batchId, deliveryMode: paper.delivery_mode ?? "public_practice" };
}
