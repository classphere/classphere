/**
 * The canonical vocabulary for question types and subjects.
 *
 * These tags decide which axis a student's weakness lands on in the subject
 * and question-type analysis, so a synonym is not a cosmetic problem — it
 * silently splits one category in two and understates both.
 *
 * The table had accumulated `mcq_single` alongside `MCQ`, and `mcq_multi`
 * alongside `MSQ`, because the extractor prompt asks the model for one
 * vocabulary while the rest of the system uses another, and the ingest path
 * wrote whatever arrived. Normalising the stored rows without fixing the
 * writers would simply re-drift, so every write goes through here.
 */

export const QUESTION_TYPES = [
  "mcq_single",
  "mcq_multi",
  "integer",
  "matching",
  "assertion_reason",
] as const;

export type QuestionType = (typeof QUESTION_TYPES)[number];

/**
 * Synonyms seen in the wild, from the extractor prompt, bulk JSON uploads and
 * hand entry. Keys are compared lowercased with separators stripped, so "MCQ",
 * "mcq", "Single Correct" and "single-correct" all land together.
 */
const TYPE_SYNONYMS: Record<string, QuestionType> = {
  mcq: "mcq_single",
  mcqsingle: "mcq_single",
  singlecorrect: "mcq_single",
  single: "mcq_single",
  scq: "mcq_single",
  objective: "mcq_single",

  msq: "mcq_multi",
  mcqmulti: "mcq_multi",
  // The codebase asked for `mcq_multiple` while the table stored `mcq_multi`,
  // so validation for multi-correct questions never matched anything.
  mcqmultiple: "mcq_multi",
  multiplecorrect: "mcq_multi",
  multicorrect: "mcq_multi",

  integer: "integer",
  numerical: "integer",
  numericalvalue: "integer",
  nvq: "integer",
  numeric: "integer",
  fillintheblank: "integer",

  matching: "matching",
  matrixmatch: "matching",
  match: "matching",
  matchthefollowing: "matching",

  assertionreason: "assertion_reason",
  assertion: "assertion_reason",
  reasonassertion: "assertion_reason",
};

const squash = (value: unknown) =>
  String(value ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");

/**
 * Best-effort canonical type.
 *
 * Returns null rather than guessing when nothing matches, so an unrecognised
 * tag surfaces as missing instead of being silently filed as a single-correct
 * MCQ and quietly distorting the analysis.
 */
export function normaliseQuestionType(value: unknown): QuestionType | null {
  const key = squash(value);
  if (!key) return null;
  // Every canonical value squashes to a key that is itself in the table
  // (mcq_single -> mcqsingle), so one lookup handles synonyms and already
  // canonical input alike.
  return TYPE_SYNONYMS[key] ?? null;
}

/** Types whose answer is chosen from options, so having none is a defect. */
export const CHOICE_TYPES: QuestionType[] = ["mcq_single", "mcq_multi", "matching", "assertion_reason"];

export function isChoiceQuestion(value: unknown): boolean {
  const type = normaliseQuestionType(value);
  return type !== null && CHOICE_TYPES.includes(type);
}

// ─── Subjects ────────────────────────────────────────────────────────────────

export const SUBJECTS = ["Physics", "Chemistry", "Mathematics", "Botany", "Zoology", "Biology"] as const;
export type Subject = (typeof SUBJECTS)[number];

const SUBJECT_SYNONYMS: Record<string, Subject> = {
  physics: "Physics",
  phy: "Physics",
  chemistry: "Chemistry",
  chem: "Chemistry",
  mathematics: "Mathematics",
  maths: "Mathematics",
  math: "Mathematics",
  botany: "Botany",
  bot: "Botany",
  zoology: "Zoology",
  zoo: "Zoology",
  biology: "Biology",
  bio: "Biology",
};

/**
 * Canonical subject, or null when unrecognised.
 *
 * Null matters: the ingest path used to fall back to the string "General",
 * which is not a subject any exam has. Those rows belong to no axis on any
 * chart and were invisible rather than obviously wrong.
 *
 * "Biology" is accepted but is not a NEET section — NEET is examined as Botany
 * and Zoology. It survives as a holding value for questions whose stream has
 * not been determined.
 */
export function normaliseSubject(value: unknown): Subject | null {
  const key = squash(value);
  if (!key) return null;
  return SUBJECT_SYNONYMS[key] ?? null;
}
