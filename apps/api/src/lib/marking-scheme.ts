import { QUESTION_TYPES, QuestionType, normaliseQuestionType } from "./question-taxonomy";

/**
 * What one question is worth.
 *
 * The system carried a single flat scheme for a whole paper —
 * { correct: 4, incorrect: -1 } hardcoded at attempt creation — which is true
 * of NEET and of JEE Main, and false of JEE Advanced, where a single-correct
 * question is +3/-1 while a multiple-correct one is +4/-2 with partial credit
 * and a numerical carries no negative at all.
 */
export interface QuestionMarking {
  correct: number;
  incorrect: number;
  unattempted: number;
  /**
   * Partial credit rule for multiple-correct questions.
   *
   * "per_correct_option": choosing only correct options, but not all of them,
   * scores one mark for each — three of four correct scores 3, one of three
   * scores 1. Choosing any wrong option forfeits this and takes `incorrect`.
   */
  partial?: "per_correct_option" | null;
}

/** Marks by question type. A type absent from the map falls back to the paper's default. */
export type MarkingScheme = Partial<Record<QuestionType, QuestionMarking>> & {
  default?: QuestionMarking;
};

const uniform = (correct: number, incorrect: number): MarkingScheme => ({
  default: { correct, incorrect, unattempted: 0 },
});

/**
 * Default scheme per exam, applied at upload when the paper does not state one.
 *
 * NEET and JEE Main are uniform: every question is +4 correct, -1 wrong.
 *
 * JEE Advanced is deliberately absent. Its marks differ by question type and
 * change between years, so there is no default that is right for every paper —
 * guessing one would silently re-score real attempts. An Advanced paper must
 * state its scheme, and the upload rejects it otherwise.
 */
const DEFAULTS: Record<string, MarkingScheme> = {
  "neet-ug": uniform(4, -1),
  "jee-main": uniform(4, -1),
  "jee-main-advanced": uniform(4, -1),
};

export function defaultMarkingScheme(examCode: string | null | undefined): MarkingScheme | null {
  return DEFAULTS[String(examCode ?? "").trim().toLowerCase()] ?? null;
}

/** True when the exam has no safe default and the paper must supply one. */
export function requiresExplicitScheme(examCode: string | null | undefined): boolean {
  return defaultMarkingScheme(examCode) === null;
}

const FALLBACK: QuestionMarking = { correct: 4, incorrect: -1, unattempted: 0 };

/**
 * The marks for one question.
 *
 * A question may carry its own `marks`, which wins. That is the escape hatch
 * for a paper with two sections of the same question type scored differently —
 * rare, but real in JEE Advanced, and impossible to express by type alone.
 * Nothing needs it for NEET or JEE Main, where every question is +4/-1.
 */
export function marksFor(
  scheme: MarkingScheme | null | undefined,
  questionType: unknown,
  override?: Partial<QuestionMarking> | null,
): QuestionMarking {
  const type = normaliseQuestionType(questionType);
  const base = (scheme ? (type ? scheme[type] : undefined) ?? scheme.default : undefined) ?? FALLBACK;
  if (!override || typeof override !== "object") return base;
  return {
    correct: typeof override.correct === "number" ? override.correct : base.correct,
    incorrect: typeof override.incorrect === "number" ? override.incorrect : base.incorrect,
    unattempted: typeof override.unattempted === "number" ? override.unattempted : base.unattempted,
    partial: override.partial !== undefined ? override.partial : base.partial,
  };
}

/**
 * Validate a scheme supplied by an upload.
 *
 * Returns the problems rather than throwing, so a bad paper reports every
 * mistake at once instead of one per attempt.
 */
export function validateMarkingScheme(scheme: unknown): string[] {
  const errors: string[] = [];
  if (scheme === null || scheme === undefined) return errors;
  if (typeof scheme !== "object" || Array.isArray(scheme)) {
    return ["marking_scheme must be an object keyed by question type"];
  }

  const allowedKeys = [...QUESTION_TYPES, "default"];
  for (const [key, value] of Object.entries(scheme as Record<string, unknown>)) {
    if (!allowedKeys.includes(key as any)) {
      errors.push(`marking_scheme has unknown key "${key}"; expected one of: ${allowedKeys.join(", ")}`);
      continue;
    }
    if (typeof value !== "object" || value === null) {
      errors.push(`marking_scheme.${key} must be an object`);
      continue;
    }
    const entry = value as Record<string, unknown>;
    for (const field of ["correct", "incorrect"]) {
      if (typeof entry[field] !== "number" || !Number.isFinite(entry[field] as number)) {
        errors.push(`marking_scheme.${key}.${field} must be a number`);
      }
    }
    if (entry.partial !== undefined && entry.partial !== null && entry.partial !== "per_correct_option") {
      errors.push(`marking_scheme.${key}.partial must be "per_correct_option" or null`);
    }
  }
  return errors;
}

/**
 * Score one answer against its type's marks.
 *
 * `selected` and `correct` are already normalised option ids.
 */
export function scoreQuestion(
  questionType: unknown,
  selected: string[],
  correct: string[],
  scheme: MarkingScheme | null | undefined,
  override?: Partial<QuestionMarking> | null,
): { marks: number; isCorrect: boolean } {
  const marking = marksFor(scheme, questionType, override);

  if (selected.length === 0) return { marks: marking.unattempted ?? 0, isCorrect: false };

  // No key means the question cannot be graded. Neutral rather than negative:
  // a gap in our data must not cost a student marks.
  if (correct.length === 0) return { marks: 0, isCorrect: false };

  const correctSet = new Set(correct);
  const chosenWrong = selected.some((option) => !correctSet.has(option));
  const chosenAllCorrect = selected.length === correct.length && !chosenWrong;

  if (chosenAllCorrect) return { marks: marking.correct, isCorrect: true };
  if (chosenWrong) return { marks: marking.incorrect, isCorrect: false };

  // Only correct options, but not all of them. Partial credit where the scheme
  // allows it — otherwise an incomplete answer is simply wrong.
  if (marking.partial === "per_correct_option") {
    return { marks: Math.min(selected.length, marking.correct), isCorrect: false };
  }
  return { marks: marking.incorrect, isCorrect: false };
}

/**
 * A paper's total: the sum of what each question is worth.
 *
 * Replaces multiplying the question count by four, which is right only when
 * every question carries the same marks.
 */
export function totalMarksForQuestions(
  questions: Array<{ question_type?: unknown; marks?: Partial<QuestionMarking> | null }>,
  scheme: MarkingScheme | null | undefined,
): number {
  return questions.reduce(
    (sum, question) => sum + marksFor(scheme, question.question_type, question.marks).correct,
    0,
  );
}

/** Validate a per-question override. Same shape as a scheme entry, all fields optional. */
export function validateQuestionMarks(marks: unknown): string[] {
  if (marks === null || marks === undefined) return [];
  if (typeof marks !== "object" || Array.isArray(marks)) return ["marks must be an object"];
  const errors: string[] = [];
  const entry = marks as Record<string, unknown>;
  for (const field of ["correct", "incorrect", "unattempted"]) {
    if (entry[field] !== undefined && (typeof entry[field] !== "number" || !Number.isFinite(entry[field] as number))) {
      errors.push(`marks.${field} must be a number`);
    }
  }
  if (entry.partial !== undefined && entry.partial !== null && entry.partial !== "per_correct_option") {
    errors.push(`marks.partial must be "per_correct_option" or null`);
  }
  return errors;
}
