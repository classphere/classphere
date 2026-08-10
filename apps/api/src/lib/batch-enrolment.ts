/**
 * batch-enrolment.ts
 *
 * One student, one active batch.
 *
 * `batch_students` is keyed on (batch_id, student_id), which stops the same
 * student being added to the same batch twice but says nothing about the same
 * student across two different batches. Every write path grew its own version
 * of "link them to the batch" and none of them looked sideways, so adding a
 * student who was already enrolled elsewhere quietly produced two live
 * enrolments. That student then drew exam codes and assigned tests from both
 * cohorts, and showed up twice in roster totals.
 *
 * The invariant is now enforced by a partial unique index (migration 51). This
 * module is how callers stay on the right side of it: ask before enrolling
 * (`findConflictingEnrolment`) when the admin should confirm, or enrol and
 * vacate in one step (`enrolExclusively`) when the move is what they asked for.
 *
 * Departure is always `left_at`, never a delete — billing reconstructs past
 * periods from these rows.
 */

import { supabaseDB } from "./supabase";

export interface ActiveEnrolment {
  batch_id: string;
  batch_name: string;
}

/**
 * The batch this student is currently in, if it is not `targetBatchId`.
 *
 * Returns null when they are unenrolled, or already in the target — both of
 * which mean "go ahead", so callers can treat null as no conflict.
 */
export async function findConflictingEnrolment(
  studentId: string,
  targetBatchId: string,
): Promise<ActiveEnrolment | null> {
  const { data, error } = await supabaseDB
    .from("batch_students")
    .select("batch_id, batches(name)")
    .eq("student_id", studentId)
    .neq("batch_id", targetBatchId)
    .is("left_at", null)
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;

  const batch = (data as any).batches;
  return {
    batch_id: String((data as any).batch_id),
    // The join returns an object or a single-element array depending on how
    // PostgREST resolves the relationship; both shapes appear in practice.
    batch_name: (Array.isArray(batch) ? batch[0]?.name : batch?.name) ?? "another batch",
  };
}

/**
 * Enrol a student in a batch, ending every other active enrolment they hold.
 *
 * Returns the batch they were moved out of, so the caller can report a move as
 * a move rather than as a plain add. Clearing `left_at` on the target is what
 * makes this also work for a student returning to a batch they once left.
 */
export async function enrolExclusively(
  studentId: string,
  batchId: string,
): Promise<{ movedFrom: ActiveEnrolment | null; error: string | null }> {
  const movedFrom = await findConflictingEnrolment(studentId, batchId);

  if (movedFrom) {
    const { error: leaveErr } = await supabaseDB
      .from("batch_students")
      .update({ left_at: new Date().toISOString() })
      .eq("student_id", studentId)
      .neq("batch_id", batchId)
      .is("left_at", null);
    if (leaveErr) return { movedFrom: null, error: leaveErr.message };
  }

  const { error: joinErr } = await supabaseDB
    .from("batch_students")
    .upsert({ batch_id: batchId, student_id: studentId, left_at: null }, { onConflict: "batch_id,student_id" });
  if (joinErr) return { movedFrom: null, error: joinErr.message };

  return { movedFrom, error: null };
}
