import { env } from "../config/env";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MODEL = "deepseek/deepseek-v4-flash-0731";

/**
 * A superadmin JSON upload used to hard-reject the whole file the moment one
 * question failed validateQuestion (missing question_text, or a malformed
 * marks override) — the caller had to open the file, find the row, and
 * re-upload from scratch. This asks the configured text model to repair just
 * that one question before it ever touches Postgres.
 *
 * Deliberately narrow: the model is only ever trusted for question_text and
 * marks — the two fields validateQuestion can fail a question for — never
 * for options or correct_answer, where a confident-looking mistake would
 * silently mis-score a real attempt. See fixQuestionWithAI's caller.
 */
const SYSTEM_PROMPT = `You repair a single question from a JEE/NEET question-bank JSON upload so it passes validation. You will be given the question's current JSON and the exact error it failed with.

The only two fields you may change:
- "question_text": the question's text, Markdown, LaTeX as $...$ or $$...$$. Fix it only if it is missing, empty, or the stated error is about it.
- "marks": either omit it entirely, or an object shaped { "correct": number, "incorrect": number, "unattempted"?: number, "partial"?: "per_correct_option" | null }. Fix it only if the stated error is about marks.

If question_text is genuinely absent from the source and cannot be honestly reconstructed from what's given, return { "is_gap": true } instead of inventing a question.

Return ONLY a JSON object containing just the field(s) you changed (question_text, or marks, or is_gap) — never options, correct_answer, or any other field, and never prose or markdown fences around it.`;

export interface AIFixResult {
  /** Only ever question_text, marks, and/or is_gap — the caller enforces this regardless. */
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
          {
            role: "user",
            content: `Validation error: ${errorMessage}\n\nQuestion JSON:\n${JSON.stringify(question)}`,
          },
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

    return { fixed, note: `AI-fixed (${model}): ${errorMessage}` };
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

export async function generateGapFillWithAI(context: GapFillContext): Promise<GapFillResult | null> {
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
          { role: "user", content: userContent },
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
