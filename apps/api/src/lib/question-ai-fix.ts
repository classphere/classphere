import { env } from "../config/env";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
// Matches gemini_page_extractor.py's own default — cheaper than DeepSeek's
// per-token rate for the volume this runs at, and vision-capable, which
// DeepSeek is not.
const DEFAULT_MODEL = "google/gemini-3.1-flash-lite";

/**
 * A vision-capable user message when an image is available, a plain-text one
 * otherwise. fixQuestionWithAI is the one that actually has an image to send
 * in practice — an already-saved question commonly has source_crop_url from
 * extraction. generateGapFillWithAI's placeholder has no image today (a gap
 * has nothing to crop), but takes the same option for whenever it does.
 */
function userMessage(text: string, imageUrl?: string | null) {
  if (!imageUrl) return { role: "user" as const, content: text };
  return {
    role: "user" as const,
    content: [
      { type: "text", text },
      { type: "image_url", image_url: { url: imageUrl } },
    ],
  };
}

/**
 * Repairs a single question against a stated validation error. Two callers,
 * two different trust levels for the same prompt:
 *
 * - The superadmin JSON upload path (superadmin.controller.ts) used to
 *   hard-reject the whole file the moment one question failed
 *   validateQuestion. It calls this before the question ever touches
 *   Postgres and only ever accepts question_text, marks, or is_gap back —
 *   never options or correct_answer, no matter what the model returns.
 * - The paper-review workspace's "Fix with AI" action (test-department and
 *   tests controllers) calls this on an already-saved question and *does*
 *   accept options/correct_answer/question_type — that's the only way to
 *   repair the answer-key mismatches "matching" and "assertion_reason"
 *   questions commonly fail validation with, since their option shapes are
 *   the extractor's most error-prone case. Every field this path accepts
 *   forces the question to needs_review and a blocking
 *   "ai_generated_unverified" flag (see paper-validation.ts), so an AI
 *   mistake there cannot reach a student silently — publish stays refused
 *   until a human re-checks it.
 *
 * Each caller enforces its own whitelist over the response; this function
 * itself does not decide which fields are trusted where.
 */
const SYSTEM_PROMPT = `You repair a single question from a JEE/NEET question bank so it passes validation. You will be given the question's current JSON and the exact error it failed with — and, when available, an image of the question as it was originally printed. Fix ONLY what the stated error is about — do not touch fields the error doesn't mention.

Fields you may change, each only when the error is about it:
- "question_text": the question's text, Markdown, LaTeX as $...$ or $$...$$.
- "marks": either omit it entirely, or an object shaped { "correct": number, "incorrect": number, "unattempted"?: number, "partial"?: "per_correct_option" | null }.
- "options": an array of { "id": string, "text": string }. Fix structural problems only — missing/duplicate ids, wrong array shape, a stray non-option entry. Never rewrite an option's own wording or meaning.
- "correct_answer": an array of option id(s), each one matching an id in "options" exactly, or a single numeric value as a string for a numerical question. Work this out from the question's own text and options — for "assertion_reason" questions, from the assertion/reason statements; for "matching" questions, from the stated pairs — never guess randomly.
- "question_type": one of "mcq_single" | "mcq_multi" | "integer" | "matching" | "assertion_reason".

MATCHING questions are the most common thing you'll be asked to fix, and the most common mistake in what you're given is this: the List I / List II table's own row numbers (1, 2, 3, 4) got extracted into "options" instead of the four real answer choices. If you see that — options like {"id":"A","text":"1"} — the fix is: the List I/List II table belongs in question_text as a proper Markdown pipe table ("| Column I | Column II |\\n|---|---|\\n| ... | ... |"), and "options" should hold the four printed combination choices instead (e.g. "A-3, B-1, C-4, D-2"). If those four combinations aren't present anywhere in what you're given, you cannot recover them — return { "is_gap": true } rather than inventing plausible-looking combinations, since a wrong answer key here is worse than an honest gap.

ASSERTION-REASON questions: the Assertion (A) and Reason (R) statements belong in question_text, each on its own line. The four options are the paper's own wording for how A and R relate — extract them exactly as given, never a generic assumed wording.

If the question is genuinely too broken to honestly repair from what you're given — not just malformed, but missing the information needed to fix it — return { "is_gap": true } instead of inventing content.

Return ONLY a JSON object containing just the field(s) you changed — never prose or markdown fences around it.`;

export interface AIFixResult {
  /** question_text, marks, options, correct_answer, question_type, and/or is_gap — each caller enforces its own whitelist over these regardless. */
  fixed: Record<string, unknown>;
  note: string;
}

/**
 * Best-effort: any failure (no API key configured, network error, bad JSON,
 * model refusal) returns null. The caller falls back to marking the question
 * a gap (or stripping the bad marks override) for a human to resolve on the
 * review screen — this never blocks an upload on its own.
 */
export async function fixQuestionWithAI(
  question: Record<string, unknown>,
  errorMessage: string,
  /** The question's own source-page crop, when one was saved at extraction — lets the model check its fix against how the question actually looked in print, not just its own possibly-broken JSON. */
  imageUrl?: string | null,
): Promise<AIFixResult | null> {
  const apiKey = env.OPENROUTER_API_KEY;
  if (!apiKey) return null;

  const model = env.LLM_MODEL || DEFAULT_MODEL;

  try {
    const response = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
        "HTTP-Referer": "https://classphere.com",
        "X-Title": "Classphere question bank upload",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          userMessage(`Validation error: ${errorMessage}\n\nQuestion JSON:\n${JSON.stringify(question)}`, imageUrl),
        ],
        response_format: { type: "json_object" },
        temperature: 0,
      }),
      signal: AbortSignal.timeout(30_000),
    });

    if (!response.ok) {
      console.error(`[question-ai-fix] OpenRouter ${response.status}: ${await response.text().catch(() => "")}`);
      return null;
    }

    const payload: any = await response.json();
    const content = payload?.choices?.[0]?.message?.content;
    if (typeof content !== "string") return null;

    const fixed = JSON.parse(content);
    if (!fixed || typeof fixed !== "object" || Array.isArray(fixed)) return null;

    return { fixed, note: `AI-fixed (${model}${imageUrl ? ", checked against the source crop" : ""}): ${errorMessage}` };
  } catch (err: any) {
    console.error("[question-ai-fix] fix attempt failed:", err?.message ?? err);
    return null;
  }
}

/**
 * Gap placeholders — a question number the extractor's own anchor check found
 * printed in the PDF but could not read any content for. There is no broken
 * text to repair here, only an empty slot, so this is a different job from
 * fixQuestionWithAI: generate a stand-in question from context (subject,
 * chapter, neighboring questions on the same paper) rather than correct one
 * that already exists.
 *
 * The model is text-only (DeepSeek) and was never shown the source PDF page —
 * it cannot know what the real question said. What it returns is a plausible
 * draft in the same subject/style/difficulty, explicitly NOT a reproduction
 * of the actual exam question. The caller must keep it flagged unverified and
 * force review; this function does not decide that, it only generates.
 */
const GAP_FILL_SYSTEM_PROMPT = `A page of a JEE/NEET exam paper printed a question number that could not be read — the text, options, and answer are genuinely lost, not just malformed. You were NOT shown the source page and have no way to know what it actually said.

Generate a plausible, original stand-in question — same subject, chapter, difficulty, and style as the example questions you're given from the same paper — appropriate for the stated exam. This is explicitly a draft substitute for a human reviewer to either replace with the real question (by checking the source PDF themselves) or keep as a placeholder practice question. It must never be presented as a transcription of the real exam content, because it is not one.

Return ONLY a JSON object:
{
  "question_text": string (Markdown, LaTeX as $...$),
  "question_type": "mcq_single" | "mcq_multi" | "integer" | "matching" | "assertion_reason",
  "options": [{"id":"A","text":string}, ...] (exactly 4 for mcq_single/mcq_multi, [] for integer),
  "correct_answer": string[] (option id(s), or the numeric value as a string for integer type)
}
No prose, no markdown fences, no explanation outside the JSON.`;

export interface GapFillContext {
  examCode: string;
  subject?: string | null;
  chapter?: string | null;
  topic?: string | null;
  difficulty?: string | null;
  questionNumber?: number | null;
  /** 2-4 real questions from the same paper, for style/level/subject grounding. */
  neighbors: Array<{ question_number: number; question_text: string; question_type?: string | null }>;
}

export interface GapFillResult {
  question_text: string;
  question_type: string;
  options: Array<{ id: string; text: string }>;
  correct_answer: string[];
  note: string;
}

export async function generateGapFillWithAI(
  context: GapFillContext,
  /** No caller has one to pass today — a gap has nothing to crop — but the plumbing takes it for whenever a page-level image is available. */
  imageUrl?: string | null,
): Promise<GapFillResult | null> {
  const apiKey = env.OPENROUTER_API_KEY;
  if (!apiKey) return null;

  const model = env.LLM_MODEL || DEFAULT_MODEL;
  const userContent = JSON.stringify({
    exam: context.examCode,
    subject: context.subject ?? null,
    chapter: context.chapter ?? null,
    topic: context.topic ?? null,
    difficulty: context.difficulty ?? null,
    missing_question_number: context.questionNumber ?? null,
    example_questions_from_same_paper: context.neighbors,
  });

  try {
    const response = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
        "HTTP-Referer": "https://classphere.com",
        "X-Title": "Classphere gap-fill draft",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: GAP_FILL_SYSTEM_PROMPT },
          userMessage(userContent, imageUrl),
        ],
        response_format: { type: "json_object" },
        temperature: 0.4,
      }),
      signal: AbortSignal.timeout(30_000),
    });

    if (!response.ok) {
      console.error(`[question-ai-fix] gap-fill OpenRouter ${response.status}: ${await response.text().catch(() => "")}`);
      return null;
    }

    const payload: any = await response.json();
    const content = payload?.choices?.[0]?.message?.content;
    if (typeof content !== "string") return null;

    const parsed = JSON.parse(content);
    const text = String(parsed?.question_text ?? "").trim();
    const options = Array.isArray(parsed?.options) ? parsed.options : [];
    const answers = Array.isArray(parsed?.correct_answer)
      ? parsed.correct_answer.map((a: unknown) => String(a))
      : parsed?.correct_answer ? [String(parsed.correct_answer)] : [];
    if (!text) return null;

    return {
      question_text: text,
      question_type: String(parsed?.question_type ?? "mcq_single"),
      options: options
        .filter((o: any) => o && typeof o === "object")
        .map((o: any) => ({ id: String(o.id ?? ""), text: String(o.text ?? "") })),
      correct_answer: answers,
      note: `AI-generated draft (${model}) — not read from the source PDF; the real question could not be extracted. Verify or replace before publishing.`,
    };
  } catch (err: any) {
    console.error("[question-ai-fix] gap-fill attempt failed:", err?.message ?? err);
    return null;
  }
}
