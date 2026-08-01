import { supabaseDB } from "./supabase";

/**
 * Which exams a student is entitled to see questions for.
 *
 * Derived from the batches they are actually enrolled in, not from
 * users.exam_target. The institute placing a student in "NEET 2027" is the
 * authoritative fact; exam_target is a self-reported field that defaults to
 * "JEE" at registration and was never updated afterwards, so students sitting
 * in NEET batches carried a JEE target and were served JEE content.
 *
 * "JEE" is not a valid exam code either — normaliseExamCode falls through to
 * jee-main for anything it does not recognise, so the mismatch never surfaced
 * as an error, only as the wrong questions.
 */

/** A combined batch entitles the student to both papers. */
const EXPANSIONS: Record<string, string[]> = {
  "jee-main-advanced": ["jee-main", "jee-advanced", "jee-main-advanced"],
};

export async function getStudentExamCodes(studentId: string): Promise<string[]> {
  const { data, error } = await supabaseDB
    .from("batch_students")
    .select("batches(exam, is_active, starts_at, ends_at)")
    .eq("student_id", studentId)
    .is("left_at", null);

  if (error) {
    console.error("[student-exam] batch lookup failed:", error.message);
    return [];
  }

  const now = Date.now();
  const codes = new Set<string>();
  for (const row of data ?? []) {
    const batch: any = Array.isArray((row as any).batches) ? (row as any).batches[0] : (row as any).batches;
    if (!batch?.exam || !batch.is_active) continue;
    // An expired batch entitles the student to nothing new — the same rule the
    // test and DPP gates already apply.
    if (batch.starts_at && Date.parse(batch.starts_at) > now) continue;
    if (batch.ends_at && Date.parse(batch.ends_at) <= now) continue;

    const code = String(batch.exam).trim();
    for (const expanded of EXPANSIONS[code] ?? [code]) codes.add(expanded);
  }
  return [...codes];
}

/**
 * The exam filter to apply for this request.
 *
 * Returns the requested exam when the student is entitled to it, their own
 * exams when they asked for nothing, and null when they asked for one they are
 * not entitled to — which the caller should treat as "no results" rather than
 * as "no filter". Falling back to unfiltered is how a NEET student ends up
 * with JEE questions by editing a query string.
 *
 * Students with no active batch get no restriction: self-signup users have no
 * institute placing them anywhere, and locking them out of practice entirely
 * would be a worse failure than showing them everything.
 */
export function resolveExamFilter(
  requested: string | undefined,
  entitled: string[],
): { codes: string[] | null; denied: boolean } {
  if (entitled.length === 0) return { codes: requested ? [requested] : null, denied: false };
  if (!requested) return { codes: entitled, denied: false };
  return entitled.includes(requested)
    ? { codes: [requested], denied: false }
    : { codes: [], denied: true };
}
