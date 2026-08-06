/** Canonical list of subjects for each supported exam code. */
export const EXAM_SUBJECTS: Record<string, string[]> = {
  "jee-main":          ["Physics", "Chemistry", "Mathematics"],
  "jee-advanced":      ["Physics", "Chemistry", "Mathematics"],
  "jee-main-advanced": ["Physics", "Chemistry", "Mathematics"],
  "neet-ug":           ["Physics", "Chemistry", "Biology"],
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
};

/** Subject accent colours — Tailwind-compatible CSS variable names. */
export const SUBJECT_COLOR: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  Physics:     { bg: "bg-blue-500/10",    text: "text-blue-500",    border: "border-blue-500/30",    dot: "bg-blue-500" },
  Chemistry:   { bg: "bg-green-500/10",   text: "text-green-500",   border: "border-green-500/30",   dot: "bg-green-500" },
  Mathematics: { bg: "bg-violet-500/10",  text: "text-violet-500",  border: "border-violet-500/30",  dot: "bg-violet-500" },
  Biology:     { bg: "bg-emerald-500/10", text: "text-emerald-500", border: "border-emerald-500/30", dot: "bg-emerald-500" },
};

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
  if (subs.has("biology") || subs.has("bio")) return "neet-ug";
  if (subs.has("mathematics") || subs.has("maths") || subs.has("math")) return "jee-main";
  return fallback;
}
