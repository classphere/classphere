import { isChoiceQuestion } from "./question-taxonomy";
import { questionShapeDefects } from "./question-shape";

/**
 * What is wrong with a paper, question by question.
 *
 * The useful answer is not "12 questions have a problem" but *which* twelve and
 * *what* is wrong with each, so a reviewer opens five questions out of
 * seventy-five instead of reading all of them.
 *
 * Shared deliberately. Paper review exists on three surfaces — the Test
 * Department workspace, the Superadmin question bank, and publication itself —
 * and each had grown its own idea of what a valid paper is. The Test Department
 * counted subjects against an exam pattern; publish ran a different set of shape
 * checks and reported at most five deduplicated messages with no question
 * numbers; the Superadmin screen had no validation at all. A reviewer could pass
 * one and fail another on the same paper.
 *
 * Pure by design: it takes questions and returns findings, touches no database,
 * and can therefore be called from a validate endpoint, a publish guard, or a
 * test with equal ease.
 */

export type IssueSeverity = "error" | "warning";

export interface QuestionIssue {
  /** Machine-readable, so a UI can group or filter. */
  code: string;
  /** Written for whoever has the paper open. */
  message: string;
  severity: IssueSeverity;
}

export interface QuestionReport {
  question_id: string;
  question_number: number;
  position: number;
  subject: string | null;
  severity: IssueSeverity;
  issues: QuestionIssue[];
}

export interface PaperValidation {
  valid: boolean;
  /** Paper-level: counts against the exam's known structure. */
  errors: string[];
  warnings: string[];
  counts: Record<string, number>;
  total: number;
  examCode: string;
  summary: { total: number; clean: number; withIssues: number; withErrors: number };
  /** Only questions with something wrong. Errors first, then paper order. */
  questions: QuestionReport[];
}

/**
 * Known paper structures.
 *
 * JEE Advanced is deliberately present with `total: 0` — its question count
 * varies by year and by paper, so there is no count to check against and only
 * the per-question checks apply.
 */
export const EXAM_PATTERNS: Record<string, { subjects: string[]; counts: Record<string, number>; total: number }> = {
  "neet-ug": {
    subjects: ["Physics", "Chemistry", "Biology", "Botany", "Zoology"],
    counts: { Physics: 45, Chemistry: 45 },
    total: 180,
  },
  "jee-main": {
    subjects: ["Physics", "Chemistry", "Mathematics"],
    counts: { Physics: 25, Chemistry: 25, Mathematics: 25 },
    total: 75,
  },
  "jee-advanced": {
    subjects: ["Physics", "Chemistry", "Mathematics"],
    counts: {},
    total: 0,
  },
};

/**
 * The exam a paper belongs to.
 *
 * The stored code wins when we recognise it — it is the only thing that can
 * separate JEE Advanced from JEE Main, since both are Physics, Chemistry and
 * Mathematics. Subjects settle it only when the stored code is missing.
 */
export function detectExamCode(questions: Array<{ subject?: string | null }>, storedCode: string): string {
  const stored = String(storedCode ?? "").trim().toLowerCase();
  if (EXAM_PATTERNS[stored]) return stored;

  const subjects = new Set(questions.map((q) => (q.subject ?? "").toLowerCase().trim()).filter(Boolean));
  if (subjects.has("biology") || subjects.has("botany") || subjects.has("zoology") || subjects.has("bio")) return "neet-ug";
  if (subjects.has("mathematics") || subjects.has("maths") || subjects.has("math")) return "jee-main";
  return stored;
}

/**
 * Source-text coverage thresholds.
 *
 * Set by question_verification.py, which compares each question's prose against
 * the text PyMuPDF read off its page. Real transcription lands in the high 0.9s —
 * the gap below that is maths rewritten as LaTeX and ordinary wording drift.
 *
 * Two bands rather than one: a question that is mostly unfound is very likely
 * part-invented and must not be published unread, while a question a little
 * under is usually a heavily mathematical one and only wants a glance.
 */
const TEXT_MATCH_ERROR = 0.6;
const TEXT_MATCH_WARN = 0.82;

/** An odd number of unescaped `$` means a formula was cut in half. */
function unbalancedMath(value: string): boolean {
  return ((value ?? "").match(/(?<!\\)\$/g) ?? []).length % 2 !== 0;
}

/** Everything wrong with one question. */
export function questionIssues(question: Record<string, any>): QuestionIssue[] {
  const issues: QuestionIssue[] = [];
  const add = (code: string, message: string, severity: IssueSeverity = "error") =>
    issues.push({ code, message, severity });

  const text = String(question.question_text ?? "").trim();
  const options = Array.isArray(question.options) ? question.options : [];
  const answers = Array.isArray(question.correct_answer) ? question.correct_answer : [];

  if (!text) {
    add("empty_question", question.is_gap
      ? "Empty slot. The extractor found this question number in the PDF but returned no question for it — check the source page, then either type it in or remove it."
      : "Question text is empty.");
  }
  if (answers.length === 0) add("no_answer", "No correct answer set.");
  if (isChoiceQuestion(question.question_type) && options.length < 2) {
    add("too_few_options", `Only ${options.length} option(s). Check whether the rest continue on the next page of the PDF.`);
  }

  const blank = options.filter((o: any) => !String(o?.text ?? "").trim() && !String(o?.image_url ?? "").trim());
  if (options.length > 0 && blank.length > 0) {
    add("empty_option", `${blank.length} of ${options.length} options are empty — no text and no figure.`);
  }
  if (question.question_type === "mcq_single" && answers.length > 1) {
    add("answer_count", `Single-correct question has ${answers.length} answers marked.`);
  }

  // The shapes Postgres cannot reject: an answer naming an option that does not
  // exist, options with no id to score by, and so on.
  for (const defect of questionShapeDefects(question)) {
    add(defect.code, defect.message, defect.blocking ? "error" : "warning");
  }

  if (unbalancedMath(text)) {
    add("unbalanced_math", "Unclosed $ in the question text — a formula is probably truncated.", "warning");
  }
  const badOption = options.findIndex((o: any) => unbalancedMath(String(o?.text ?? "")));
  if (badOption >= 0) {
    add("unbalanced_math", `Unclosed $ in option ${options[badOption]?.id ?? badOption + 1}.`, "warning");
  }

  if (!String(question.subject ?? "").trim() || question.subject === "Unclassified") {
    add("no_subject", "No subject assigned.", "warning");
  }
  if (!String(question.chapter ?? "").trim()) add("no_chapter", "No chapter assigned.", "warning");

  // How much of this question's wording was actually found on its source page.
  // Every other check here reads the question in isolation and passes on one the
  // model partly invented, because an invented question is perfectly well
  // formed. This is the only signal that compares it against the PDF.
  const textMatch = Number(question.source_reference?.text_match);
  if (Number.isFinite(textMatch) && textMatch < TEXT_MATCH_ERROR) {
    add("text_mismatch",
      `Only ${Math.round(textMatch * 100)}% of this question's wording appears on its source page. ` +
      `Read it against the PDF before publishing — it may have been partly written rather than transcribed.`);
  } else if (Number.isFinite(textMatch) && textMatch < TEXT_MATCH_WARN) {
    add("text_mismatch",
      `${Math.round(textMatch * 100)}% of this question's wording appears on its source page. ` +
      `Worth a glance against the PDF.`, "warning");
  }

  for (const reason of (question.extraction_metadata?.review_reasons ?? []) as string[]) {
    add("extractor_flag", reason, "warning");
  }
  for (const flag of (question.source_reference?.extraction_flags ?? []) as string[]) {
    // Already put right by a reviewer since extraction.
    if (flag === "answer_key_missing" && answers.length > 0) continue;
    add("extractor_flag", String(flag).replace(/_/g, " "), "warning");
  }

  return issues;
}

/** Questions whose defects must not reach a student. */
export function blockingQuestionIssues(question: Record<string, any>): QuestionIssue[] {
  return questionIssues(question).filter((issue) => issue.severity === "error");
}

/**
 * Validate a whole paper.
 *
 * `questions` must carry `position` alongside the question's own columns — the
 * caller joins paper_questions, which is where the paper's own numbering lives.
 */
export function validatePaperQuestions(
  questions: Array<Record<string, any>>,
  storedExamCode: string,
): PaperValidation {
  const examCode = detectExamCode(questions, storedExamCode);
  const pattern = EXAM_PATTERNS[examCode];

  const counts: Record<string, number> = {};
  for (const question of questions) {
    const subject = question.subject || "Unknown";
    counts[subject] = (counts[subject] ?? 0) + 1;
  }

  const errors: string[] = [];
  const warnings: string[] = [];

  if (pattern) {
    if (pattern.total > 0 && questions.length !== pattern.total) {
      errors.push(`Expected ${pattern.total} questions total, found ${questions.length}.`);
    }
    for (const [subject, expected] of Object.entries(pattern.counts)) {
      const found = counts[subject] ?? 0;
      if (found !== expected) errors.push(`Expected ${subject}: ${expected}, found ${found}.`);
    }
    for (const subject of Object.keys(counts).filter((s) => !pattern.subjects.includes(s))) {
      warnings.push(`${counts[subject]} question(s) have subject "${subject}", which is not expected for ${examCode}.`);
    }
  } else {
    warnings.push(
      examCode
        ? `No validation pattern defined for exam "${examCode}" — check the question count by hand.`
        : "The paper's exam could not be determined, so question counts were not checked.",
    );
  }

  const reviewed: QuestionReport[] = questions
    .map((question, index) => {
      const issues = questionIssues(question);
      return {
        question_id: String(question.id ?? ""),
        question_number: Number(question.question_number ?? question.position ?? index + 1),
        position: Number(question.position ?? index + 1),
        subject: question.subject ?? null,
        severity: (issues.some((i) => i.severity === "error") ? "error" : "warning") as IssueSeverity,
        issues,
      };
    })
    .filter((entry) => entry.issues.length > 0)
    .sort((a, b) =>
      (a.severity === b.severity ? 0 : a.severity === "error" ? -1 : 1) || a.position - b.position);

  const withErrors = reviewed.filter((entry) => entry.severity === "error");

  return {
    valid: errors.length === 0 && withErrors.length === 0,
    errors,
    warnings,
    counts,
    total: questions.length,
    examCode,
    summary: {
      total: questions.length,
      clean: questions.length - reviewed.length,
      withIssues: reviewed.length,
      withErrors: withErrors.length,
    },
    questions: reviewed,
  };
}
