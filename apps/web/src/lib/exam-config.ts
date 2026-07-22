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
 * Detect the exam code from the subjects actually present in a paper's questions,
 * falling back to a provided code only when subjects are ambiguous/missing.
 *
 * Mirrors the backend's subject-based detection (see test-department.controller
 * validatePaper + attempts.controller loadPaperQuestions) so a mis-assigned
 * exam_id FK in the DB doesn't poison the editor's subject list or downstream
 * analysis routing. NEET papers (Biology) and JEE papers (Mathematics) are
 * distinguished correctly even when the DB exam row is wrong.
 */
export function detectExamCode(questions: { subject?: string }[], fallback: string): string {
  const subs = new Set(
    questions.map((q) => (q.subject ?? "").toLowerCase().trim()).filter(Boolean)
  );
  if (subs.has("biology") || subs.has("bio")) return "neet-ug";
  if (subs.has("mathematics") || subs.has("maths") || subs.has("math")) return "jee-main";
  return fallback;
}
