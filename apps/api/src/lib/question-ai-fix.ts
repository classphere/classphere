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
