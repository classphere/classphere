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

/**
 * Question type to write to the database. Always one of the canonical five,
 * because questions.question_type is NOT NULL and constrained.
 *
 * When the label is unrecognised the fallback comes from the question's own
 * shape rather than a fixed default. A question carrying options is a choice
 * question whatever its label says, and one carrying none expects a typed
 * answer — that is stronger evidence than a string the extractor guessed at,
 * and defaulting everything to mcq_single would silently grade numerical
 * questions as multiple choice.
 */
export function questionTypeForStorage(value: unknown, optionCount: number): QuestionType {
  return normaliseQuestionType(value) ?? (optionCount >= 2 ? "mcq_single" : "integer");
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
 * Null is the answer to "is this a real subject", which is what report axes
 * need to ask. It is deliberately not what gets stored — see below.
 *
 * "Biology" is accepted but is not a NEET section: NEET is examined as Botany
 * and Zoology. It survives as a holding value for questions whose stream has
 * not been determined.
 */
export function normaliseSubject(value: unknown): Subject | null {
  const key = squash(value);
  if (!key) return null;
  return SUBJECT_SYNONYMS[key] ?? null;
}

/**
 * The one value meaning "no subject could be determined".
 *
 * questions.subject is NOT NULL, so unknown needs a representable value rather
 * than null. The previous default was "General", which reads like a real
 * category and sorted in among the genuine subjects; this does not, so it can
 * be filtered out of every report by name and counted as work outstanding.
 */
export const UNCLASSIFIED_SUBJECT = "Unclassified";

/**
 * Subject to write to the database. Always a string, so ingestion cannot fail
 * on the NOT NULL constraint, and never an unrecognised spelling.
 */
export function subjectForStorage(value: unknown, fallback?: unknown): string {
  return normaliseSubject(value) ?? normaliseSubject(fallback) ?? UNCLASSIFIED_SUBJECT;
}

// ─── Difficulty ──────────────────────────────────────────────────────────────

/**
 * The analysis engine compares difficulty by exact lowercase string —
 * `question.difficulty === "easy"` in the error-pattern and attempt-strategy
 * services — so "Easy" and "Medium" are not merely untidy, they are invisible.
 * 5,773 questions were stored capitalised and silently excluded from every
 * difficulty-based finding.
 */
export const DIFFICULTIES = ["easy", "medium", "hard"] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

const DIFFICULTY_SYNONYMS: Record<string, Difficulty> = {
  easy: "easy", e: "easy", low: "easy", simple: "easy", basic: "easy",
  medium: "medium", med: "medium", m: "medium", moderate: "medium", average: "medium",
  hard: "hard", h: "hard", high: "hard", difficult: "hard", tough: "hard", advanced: "hard",
};

/** Canonical difficulty, or null when unrecognised. */
export function normaliseDifficulty(value: unknown): Difficulty | null {
  const key = squash(value);
  if (!key) return null;
  return DIFFICULTY_SYNONYMS[key] ?? null;
}

/**
 * Difficulty to store. Always one of the three, because the column feeds
 * comparisons that silently drop anything else.
 *
 * Unknown falls back to medium rather than null: an unlabelled question still
 * belongs somewhere, and medium is the value that skews a distribution least.
 */
export function difficultyForStorage(value: unknown, fallback?: unknown): Difficulty {
  return normaliseDifficulty(value) ?? normaliseDifficulty(fallback) ?? "medium";
}
