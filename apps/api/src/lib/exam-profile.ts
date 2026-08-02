/**
 * What a paper is worth, and how long it runs.
 *
 * These were required fields on the upload, which meant whoever prepared the
 * JSON had to state them — and the stored papers show how that goes: a
 * 106-question paper marked out of 360, a 179-question paper marked out of the
 * same 360, a 75-question JEE Main paper marked out of 360 rather than 300.
 * The numbers are derivable from the exam and the question count, so they are
 * derived.
 *
 * Both remain overridable. A paper with a non-standard marking scheme should
 * say so explicitly rather than be silently recomputed.
 */

export interface ExamProfile {
  /** Marks for a correct answer. Four across JEE and NEET. */
  marksPerQuestion: number;
  /** The real sitting, used when an upload matches it question for question. */
  fullPaper: { questions: number; marks: number; durationMin: number };
}

const PROFILES: Record<string, ExamProfile> = {
  // 180 questions, 720 marks, 180 minutes.
  "neet-ug": {
    marksPerQuestion: 4,
    fullPaper: { questions: 180, marks: 720, durationMin: 180 },
  },
  // 75 questions, 300 marks, 180 minutes.
  "jee-main": {
    marksPerQuestion: 4,
    fullPaper: { questions: 75, marks: 300, durationMin: 180 },
  },
  // Advanced has no fixed structure — question count and total vary by year and
  // by paper, so there is nothing to pin the total to except the questions
  // themselves. Three hours per paper is the one constant.
  "jee-advanced": {
    marksPerQuestion: 4,
    fullPaper: { questions: 54, marks: 216, durationMin: 180 },
  },
  "jee-main-advanced": {
    marksPerQuestion: 4,
    fullPaper: { questions: 75, marks: 300, durationMin: 180 },
  },
};

const FALLBACK: ExamProfile = {
  marksPerQuestion: 4,
  fullPaper: { questions: 75, marks: 300, durationMin: 180 },
};

export function examProfile(examCode: string | null | undefined): ExamProfile {
  return PROFILES[String(examCode ?? "").trim().toLowerCase()] ?? FALLBACK;
}

/**
 * Total marks for an upload of `questionCount` questions.
 *
 * An upload matching the real sitting gets the real total, so a 180-question
 * NEET paper is out of 720 rather than a computed 720 that happens to agree.
 * Anything else — a chapter set, a chunk of a larger bank — is counted from its
 * own questions.
 */
export function deriveTotalMarks(examCode: string | null | undefined, questionCount: number): number {
  const profile = examProfile(examCode);
  if (questionCount === profile.fullPaper.questions) return profile.fullPaper.marks;
  return questionCount * profile.marksPerQuestion;
}

/**
 * Duration in minutes for an upload of `questionCount` questions.
 *
 * Full paper gets the real sitting length. A partial set is scaled by the
 * exam's own pace — NEET allows a minute a question, JEE Main nearer two and a
 * half — so a 20-question practice set is not handed three hours.
 */
export function deriveDurationMin(examCode: string | null | undefined, questionCount: number): number {
  const profile = examProfile(examCode);
  const { questions, durationMin } = profile.fullPaper;
  if (questionCount === questions) return durationMin;
  const perQuestion = durationMin / questions;
  return Math.max(1, Math.round(questionCount * perQuestion));
}
