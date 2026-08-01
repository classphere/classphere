/**
 * Exam identity on the client.
 *
 * Screens were comparing `examTarget === "neet"`, but no field ever holds that
 * string: users.exam_target defaulted to "JEE" at registration and the real
 * codes are jee-main, jee-advanced, jee-main-advanced and neet-ug. The
 * comparison was therefore false for every student ever, so NEET students were
 * shown JEE totals and JEE subject lines.
 */

export type ExamCode = "jee-main" | "jee-advanced" | "jee-main-advanced" | "neet-ug";

export function normaliseExamCode(value: string | null | undefined): ExamCode {
  const code = (value ?? "").trim().toLowerCase();
  if (code === "neet" || code === "neet-ug" || code === "neet-omr") return "neet-ug";
  if (code === "jee-advanced" || code === "jee advanced") return "jee-advanced";
  if (code === "jee-main-advanced") return "jee-main-advanced";
  return "jee-main";
}

export const isNeet = (value: string | null | undefined) => normaliseExamCode(value) === "neet-ug";

export const EXAM_LABELS: Record<ExamCode, string> = {
  "jee-main": "JEE Main",
  "jee-advanced": "JEE Advanced",
  "jee-main-advanced": "JEE Main + Advanced",
  "neet-ug": "NEET-UG",
};

/**
 * The full-paper total for each exam.
 *
 * Only a fallback. A real attempt carries its own max_score — practice papers
 * and chapter tests are routinely 176 or 4 marks, not 300 or 720 — so the
 * attempt's own figure is used whenever there is one, and this stands in only
 * before a student has taken anything.
 */
export const EXAM_TOTAL_MARKS: Record<ExamCode, number> = {
  "jee-main": 300,
  "jee-advanced": 360,
  "jee-main-advanced": 300,
  "neet-ug": 720,
};

/** Subjects examined, in the order a report should read them. */
export const EXAM_SUBJECTS: Record<ExamCode, string[]> = {
  "jee-main": ["Physics", "Chemistry", "Mathematics"],
  "jee-advanced": ["Physics", "Chemistry", "Mathematics"],
  "jee-main-advanced": ["Physics", "Chemistry", "Mathematics"],
  "neet-ug": ["Physics", "Chemistry", "Botany", "Zoology"],
};
