import { supabaseDB } from "../../lib/supabase";
import { getStudentExamCodes, resolveExamFilter } from "../../lib/student-exam";

type PaperWindow = {
  id: string;
  test_type?: string;
  created_by?: string | null;
  is_active: boolean;
  is_published: boolean;
  delivery_mode?: "public_practice" | "assigned_scheduled";
  available_from?: string | null;
  available_until?: string | null;
  exam_id?: string | null;
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
  } else if (paper.exam_id) {
    // assigned_scheduled papers are already exam-safe via the batch check
    // above — a batch has one exam, so membership implies entitlement.
    // public_practice papers (PYQs, chapter-wise practice) have no such
    // guard: this was the actual hole behind "a NEET student could see JEE
    // and SSC" — getPYQList/getPYQQuestions stopped a student from browsing
    // to a wrong-exam paper, but this function is what actually gates
    // starting an attempt (and is shared with the paper-read path in
    // tests.controller.ts's getTest), so a directly-posted paper_id for any
    // public_practice paper sailed through with no exam check at all.
    const entitled = await getStudentExamCodes(studentId);
    const { data: examRow } = await supabaseDB.from("exams").select("code").eq("id", paper.exam_id).maybeSingle();
    const { denied } = resolveExamFilter(examRow?.code, entitled);
    if (denied) return { allowed: false, status: 404, message: "Test is unavailable." };
  }

  const now = Date.now();
  const start = paper.available_from ?? assignmentStart;
  if (start && new Date(start).getTime() > now) return { allowed: false, status: 403, message: "This test has not started yet." };
  if (paper.available_until && new Date(paper.available_until).getTime() <= now) return { allowed: false, status: 403, message: "This test window has closed." };
  return { allowed: true, batchId, deliveryMode: paper.delivery_mode ?? "public_practice" };
}
