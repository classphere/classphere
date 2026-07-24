import type { Question } from "@/components/test/TestTypes";

/**
 * Manual regression fixture for QuestionBody.
 *
 * apps/web currently has no frontend test command or test dependency. Render
 * these two records in any question surface when reviewing the patch:
 *
 * 1. `structuredQuestionFixture` must follow explicit `order`, render its
 *    semantic table, reject the javascript: image URL, and show the safe source
 *    crop instead. Option A must remain selectable even though legacy text is
 *    empty. Reviewer mode should expose confidence and needs-review metadata.
 * 2. `legacyQuestionFixture` has no blocks and must render exactly through the
 *    existing question_text + non-duplicated image_url path.
 */
export const structuredQuestionFixture: Question = {
  id: "00000000-0000-4000-8000-000000000004",
  question_number: 4,
  question_text: "Legacy text must not render while structured blocks are present.",
  image_url: "/fixtures/legacy-should-not-render.png",
  options: [
    {
      id: "A",
      text: "",
      content_blocks: [
        { type: "math", latex: String.raw`\frac{1}{2}mv^2`, display: false },
        { type: "text", content: "Kinetic energy" },
      ],
    },
    { id: "B", text: "Potential energy" },
  ],
  correct_answer: ["A"],
  explanation: "",
  question_type: "mcq_single",
  subject: "Physics",
  chapter: "Work, Energy and Power",
  topic: "Energy",
  difficulty: "medium",
  extraction_version: 4,
  extraction_confidence: 0.82,
  needs_review: true,
  review_reasons: ["Primary diagram URL was rejected; verify the source crop."],
  content_blocks: [
    {
      id: "answer-table",
      type: "table",
      order: 3,
      caption: "Measured values",
      headers: ["Quantity", "Value"],
      rows: [
        [{ content: "Mass, $m$", header: true }, "$2\\,kg$"],
        [{ content: "Speed, $v$", header: true }, "$3\\,m\\,s^{-1}$"],
      ],
    },
    {
      id: "stem",
      type: "markdown",
      order: 1,
      content: "A body has the following measured properties:",
      confidence: "high",
    },
    {
      id: "diagram",
      type: "diagram",
      order: 2,
      url: "javascript:alert('blocked')",
      alt: "Velocity diagram",
      caption: "Direction of motion",
      source_crop: {
        url: "/fixtures/question-4-source-crop.png",
        alt: "Source crop containing the velocity diagram",
        page: 2,
        bbox: [48, 112, 392, 340],
        confidence: "low",
        needs_review: true,
      },
    },
    {
      id: "prompt",
      type: "text",
      order: 4,
      content: "Choose the expression for its kinetic energy.",
    },
  ],
};

export const legacyQuestionFixture: Question = {
  id: "00000000-0000-4000-8000-000000000001",
  question_number: 1,
  question_text: "Legacy **Markdown** with inline math $x^2$.",
  image_url: "/fixtures/legacy-question.png",
  options: [
    { id: "A", text: "$x$" },
    { id: "B", text: "$x^2$" },
  ],
  correct_answer: ["B"],
  explanation: "",
  question_type: "mcq_single",
  subject: "Mathematics",
  chapter: "Algebra",
  topic: "Powers",
  difficulty: "easy",
};
