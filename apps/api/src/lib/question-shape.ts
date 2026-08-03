import { isChoiceQuestion } from "./question-taxonomy";

/**
 * The shape checks Postgres cannot make.
 *
 * options, correct_answer and question_images are JSONB, and JSONB accepts any
 * valid JSON. Every one of these reaches the database today without complaint:
 *
 *   options: "A, B, C"                 a string where an array belongs
 *   correct_answer: ["E"]              an option the question does not have
 *   options: [{text: "x"}]             options with no id to select or score by
 *   correct_answer: [{deep: true}]     an object where a token belongs
 *
 * The second is the dangerous one. A question keyed to an option that does not
 * exist cannot be answered correctly by anyone — every student loses those
 * marks, no error is raised anywhere, and the paper looks fine until someone
 * reads a result sheet closely.
 *
 * These are all shapes a model can produce. The scalar columns are guarded by
 * NOT NULL and CHECK constraints; this is the same guard for the columns that
 * have none.
 */

export interface ShapeDefect {
  /** Machine-readable, so review UI can group and filter. */
  code: string;
  /** Written for whoever opens the paper in review. */
  message: string;
  /** A defect that must not reach a student, vs one worth flagging. */
  blocking: boolean;
}

function optionIds(options: unknown): string[] {
  if (!Array.isArray(options)) return [];
  return options
    .map((option) => (option && typeof option === "object" ? String((option as any).id ?? "").trim() : ""))
    .filter(Boolean);
}

/**
 * Everything structurally wrong with one question.
 *
 * Returns defects rather than throwing, because an upload is a draft and a
 * draft is allowed to be incomplete — that is what the review screen is for.
 * `blocking` marks the ones publication must refuse.
 */
export function questionShapeDefects(question: Record<string, any>): ShapeDefect[] {
  const defects: ShapeDefect[] = [];
  if (question?.is_gap === true) return defects; // a deliberately empty slot

  const { options, correct_answer: correctAnswer, question_images: images } = question ?? {};

  if (options !== null && options !== undefined && !Array.isArray(options)) {
    defects.push({
      code: "options_not_array",
      message: `options must be a list, not ${typeof options}.`,
      blocking: true,
    });
  }

  const ids = optionIds(options);
  if (Array.isArray(options) && options.length > 0 && ids.length !== options.length) {
    defects.push({
      code: "option_missing_id",
      message: `${options.length - ids.length} of ${options.length} options have no id, so they cannot be selected or scored.`,
      blocking: true,
    });
  }

  if (correctAnswer !== null && correctAnswer !== undefined && !Array.isArray(correctAnswer)) {
    defects.push({
      code: "answer_not_array",
      message: `correct_answer must be a list, not ${typeof correctAnswer}.`,
      blocking: true,
    });
  }

  if (Array.isArray(correctAnswer)) {
    const nonScalar = correctAnswer.filter((a) => a !== null && typeof a === "object");
    if (nonScalar.length > 0) {
      defects.push({
        code: "answer_not_scalar",
        message: `correct_answer contains ${nonScalar.length} value(s) that are not text or numbers.`,
        blocking: true,
      });
    }

    // Only meaningful once the question has real options to check against. A
    // numerical question's answer is a value and belongs to no option.
    if (isChoiceQuestion(question?.question_type) && ids.length >= 2) {
      const known = new Set(ids.map((id) => id.toUpperCase()));
      const unknown = correctAnswer
        .filter((a) => a === null || typeof a !== "object")
        .map((a) => String(a).trim().toUpperCase())
        .filter((a) => a && !known.has(a));
      if (unknown.length > 0) {
        defects.push({
          code: "answer_not_an_option",
          message:
            `correct_answer names ${unknown.join(", ")}, which ${unknown.length === 1 ? "is not an option" : "are not options"} ` +
            `on this question (it has ${ids.join(", ")}). No student can answer it correctly.`,
          blocking: true,
        });
      }
    }
  }

  if (images !== null && images !== undefined) {
    if (!Array.isArray(images)) {
      defects.push({
        code: "images_not_array",
        message: `question_images must be a list, not ${typeof images}.`,
        blocking: false,
      });
    } else if (images.some((src) => typeof src !== "string")) {
      defects.push({
        code: "image_not_a_url",
        message: "question_images contains a value that is not a URL.",
        blocking: false,
      });
    }
  }

  return defects;
}

/** Defects that must not reach a student. */
export function blockingShapeDefects(question: Record<string, any>): ShapeDefect[] {
  return questionShapeDefects(question).filter((defect) => defect.blocking);
}
