/**
 * Canonical list of subjects for each supported exam code.
 *
 * NEET-UG lists both — "Botany"/"Zoology" (the real exam's own split) and
 * "Biology" (one combined subject). Different coachings upload it differently
 * and there's no way to tell which a given paper should be from the exam code
 * alone, so the review editor needs to let either be picked. This used to
 * list only the generic "Biology", so a Botany/Zoology question's subject
 * never matched an option here and the Subject dropdown silently showed "—"
 * for every question from a paper that split it.
 */
export const EXAM_SUBJECTS: Record<string, string[]> = {
  "jee-main":          ["Physics", "Chemistry", "Mathematics"],
  "jee-advanced":      ["Physics", "Chemistry", "Mathematics"],
  "jee-main-advanced": ["Physics", "Chemistry", "Mathematics"],
  "neet-ug":           ["Physics", "Chemistry", "Botany", "Zoology", "Biology"],
  // Fallback for unknown exams
  "default":           ["Physics", "Chemistry", "Mathematics"],
};

/** Human-readable labels for each exam code. */
export const EXAM_LABELS: Record<string, string> = {
  "jee-main":          "JEE Main",
  "jee-advanced":      "JEE Advanced",
  "jee-main-advanced": "JEE Main + Advanced",
  "neet-ug":           "NEET UG",
};

/** Subject abbreviations for compact UI (sidebar cells, badges). */
export const SUBJECT_ABBR: Record<string, string> = {
  Physics:     "PHY",
  Chemistry:   "CHE",
  Mathematics: "MAT",
  Biology:     "BIO",
  Botany:      "BOT",
  Zoology:     "ZOO",
};

/** Subject accent colours — Tailwind-compatible CSS variable names. */
export const SUBJECT_COLOR: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  Physics:     { bg: "bg-blue-500/10",    text: "text-blue-500",    border: "border-blue-500/30",    dot: "bg-blue-500" },
  Chemistry:   { bg: "bg-green-500/10",   text: "text-green-500",   border: "border-green-500/30",   dot: "bg-green-500" },
  Mathematics: { bg: "bg-violet-500/10",  text: "text-violet-500",  border: "border-violet-500/30",  dot: "bg-violet-500" },
  Biology:     { bg: "bg-emerald-500/10", text: "text-emerald-500", border: "border-emerald-500/30", dot: "bg-emerald-500" },
  Botany:      { bg: "bg-emerald-500/10", text: "text-emerald-500", border: "border-emerald-500/30", dot: "bg-emerald-500" },
  Zoology:     { bg: "bg-amber-500/10",   text: "text-amber-600",   border: "border-amber-500/30",   dot: "bg-amber-500" },
};

/**
 * Exams that score every question the same, and what that score is.
 *
 * NEET and JEE Main are +4 correct, -1 wrong, for every question of every type.
 * That is a property of the exam, not of the paper, so a reviewer should never
 * be asked to type it in — four identical numbers is four chances to mistype
 * one, and the paper would then score wrongly for every student who sat it.
 *
 * JEE Advanced is deliberately absent. Single-correct and multiple-correct
 * questions in the same Advanced paper carry different marks, and the numbers
 * change between years, so they belong to the paper and it has to say.
 *
 * Mirrors DEFAULTS in apps/api/src/lib/marking-scheme.ts, which is what
 * actually scores attempts. Keep the two in step.
 */
export const UNIFORM_MARKS: Record<string, { correct: number; incorrect: number }> = {
  "jee-main":          { correct: 4, incorrect: -1 },
  "neet-ug":           { correct: 4, incorrect: -1 },
  "jee-main-advanced": { correct: 4, incorrect: -1 },
};

/** True when the exam has no standard scheme and the paper must supply one. */
export function requiresExplicitScheme(examCode: string | null | undefined): boolean {
  return !UNIFORM_MARKS[String(examCode ?? "").trim().toLowerCase()];
}

/**
 * The exam's standard scheme as a paper-wide default, or null if it has none.
 *
 * Shaped like a stored marking_scheme so the composition table can price a
 * paper that never stated one, rather than showing every row as "not set".
 */
export function uniformScheme(
  examCode: string | null | undefined,
): { default: { correct: number; incorrect: number; unattempted: number } } | null {
  const marks = UNIFORM_MARKS[String(examCode ?? "").trim().toLowerCase()];
  return marks ? { default: { ...marks, unattempted: 0 } } : null;
}

export const DIFFICULTY_OPTIONS = [
  { value: "easy",   label: "Easy" },
  { value: "medium", label: "Medium" },
  { value: "hard",   label: "Hard" },
];

/**
 * The exam a paper belongs to.
 *
 * The code stored on the paper wins whenever it is one we recognise. It was
 * chosen by whoever uploaded the paper, and it is the only thing that can tell
 * JEE Advanced from JEE Main: both are Physics, Chemistry and Mathematics, so
 * no amount of looking at subjects will separate them.
 *
 * Subjects are consulted only when the stored code is missing or unrecognised.
 * Then they still settle the one question they can answer — Biology means NEET,
 * Mathematics means JEE — and "jee-main" is the safer guess of the two JEE
 * papers, being the uniform +4/-1 scheme rather than Advanced's per-section one.
 *
 * This used to run the other way round, deriving from subjects first and using
 * the stored code only as a fallback. Because Advanced papers contain
 * Mathematics, every one of them was relabelled JEE Main -- which drove the
 * editor's subject list and, through examCode, anything keyed on the exam.
 */
export function detectExamCode(questions: { subject?: string }[], fallback: string): string {
  const stored = String(fallback ?? "").trim().toLowerCase();
  if (EXAM_LABELS[stored]) return stored;

  const subs = new Set(
    questions.map((q) => (q.subject ?? "").toLowerCase().trim()).filter(Boolean)
  );
  if (subs.has("biology") || subs.has("bio") || subs.has("botany") || subs.has("zoology")) return "neet-ug";
  if (subs.has("mathematics") || subs.has("maths") || subs.has("math")) return "jee-main";
  return fallback;
}
