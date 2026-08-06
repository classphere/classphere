import { spawn } from "child_process";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { EXTRACTOR_SCRIPT_DIR } from "./pdfExtractor.service";

/**
 * Answers and worked solutions read off the paper's own back pages.
 *
 * Most real papers carry their key after the questions — sometimes a bare grid
 * of numbers, sometimes full worked solutions. The Test Department upload has
 * always parsed that, falling back to the question PDF when no separate key
 * file was given. The queued path never did, so a paper uploaded there arrived
 * with no answers at all and every question had to be keyed by hand.
 *
 * The parse itself is deterministic regex (parse_pdf_answer_key.py). A model
 * asked to read an answer key will answer confidently whether or not it read
 * it, and a wrong key silently marks correct work wrong.
 */

export interface ParsedAnswerKey {
  /** question number -> raw answers, exactly as printed. */
  answers: Record<string, string[]>;
  /** question number -> worked solution text, where the paper prints one. */
  solutions: Record<string, string>;
}

const EMPTY: ParsedAnswerKey = { answers: {}, solutions: {} };

function scriptPath(): string {
  return path.join(EXTRACTOR_SCRIPT_DIR, "parse_pdf_answer_key.py");
}

/** Run the deterministic parser over a PDF. Never throws — a missing key is normal. */
export function parseAnswerKeyFromPdf(pdfPath: string, maxQuestionNumber: number): Promise<ParsedAnswerKey> {
  return new Promise((resolve) => {
    const outPath = path.join(os.tmpdir(), `answer-key-${Date.now()}-${Math.random().toString(36).slice(2)}.json`);
    // Resolved before spawning: the child runs in the extractor directory so it
    // can import its siblings, which would otherwise silently reinterpret a
    // relative PDF path against that directory instead of the caller's.
    const child = spawn("python", [scriptPath(), path.resolve(pdfPath), outPath, String(maxQuestionNumber)], {
      cwd: EXTRACTOR_SCRIPT_DIR,
    });

    let stderr = "";
    child.stderr.on("data", (chunk) => { stderr += String(chunk); });

    const finish = (result: ParsedAnswerKey) => {
      try { if (fs.existsSync(outPath)) fs.unlinkSync(outPath); } catch { /* best effort */ }
      resolve(result);
    };

    child.on("error", (error) => {
      console.warn(`[answer-key] parser could not start: ${error.message}`);
      finish(EMPTY);
    });

    child.on("close", (code) => {
      if (code !== 0) {
        console.warn(`[answer-key] parser exited ${code}: ${stderr.trim().slice(0, 300)}`);
        return finish(EMPTY);
      }
      try {
        const parsed = JSON.parse(fs.readFileSync(outPath, "utf-8"));
        // v2 returns { answers, solutions }; v1 returned a flat map.
        finish({
          answers: parsed.answers ?? parsed ?? {},
          solutions: parsed.solutions ?? {},
        });
      } catch (error: any) {
        console.warn(`[answer-key] unreadable parser output: ${error?.message}`);
        finish(EMPTY);
      }
    });
  });
}

const NUM_TO_LETTER: Record<string, string> = { "1": "A", "2": "B", "3": "C", "4": "D" };

/**
 * An answer that cannot be an option index.
 *
 * Options run 1-4, so anything outside that — negative, decimal, or larger — is
 * the value itself rather than a position in a list.
 */
function isDefinitelyNumerical(value: string): boolean {
  const n = Number(value);
  return !Number.isNaN(n) && (n > 4 || n < 1 || !Number.isInteger(n));
}

/**
 * Turn the printed answer into what this question is actually keyed on.
 *
 * A key reading "3" means option C on a multiple-choice question and the
 * number three on a numerical one, and only the question knows which. This
 * mirrors the conversion the Test Department upload already applies, so a
 * paper is keyed the same way whichever door it came through.
 */
export function convertAnswers(raw: string[], _questionType: unknown, optionCount: number, examCode: string): string[] {
  // Order matters, and it is deliberately the order the Test Department upload
  // has always used. Concrete evidence first: a token outside 1-4 cannot be an
  // option index whatever the question claims to be, and a question carrying
  // four real options is a choice question whatever type it was tagged with.
  if (raw.some(isDefinitelyNumerical)) return raw;

  // NEET has no numerical questions at all, so 1-4 is always an option index —
  // safe to convert even where the extractor dropped the options.
  const isNeet = examCode.toLowerCase().includes("neet");
  if (isNeet || optionCount >= 2) {
    return raw.map((a) => NUM_TO_LETTER[a.toUpperCase().trim()] ?? a.toUpperCase().trim());
  }

  // No options: "4" is the answer's value, not option D. A numerical question
  // reaches exactly this branch, so nothing needs to trust the type tag.
  return raw;
}

export interface ApplyResult {
  answersFilled: number;
  solutionsFilled: number;
  /** Set when the key was read but rejected as too sparse to be one. */
  rejected?: string;
}

/**
 * How much of the paper a key must cover before it is believed.
 *
 * A real answer key answers nearly every question. Scattered matches do not,
 * and the regexes that read a key are broad enough to find "answers" in
 * ordinary question text: run over a 51-question paper carrying no key at all,
 * the parser returned 14, read off equations and paragraph labels.
 *
 * Applying those would mark correct work wrong on a seventh of the paper, with
 * nothing to show anyone where it came from. Below this share the whole reading
 * is discarded rather than partly trusted — a paper with no answers is an
 * obvious problem, and a paper with a few wrong ones is not.
 */
export const MIN_KEY_COVERAGE = 0.6;

/**
 * Fill in answers and solutions the questions do not already have.
 *
 * Deliberately does not overwrite. An answer the extractor read off the
 * question page came from the paper too, and a key parsed out of a solutions
 * section is the more error-prone of the two readings.
 */
export function applyAnswerKey(
  questions: Array<Record<string, any>>,
  key: ParsedAnswerKey,
  examCode: string,
): ApplyResult {
  let answersFilled = 0;
  let solutionsFilled = 0;

  // Judged against the questions it claims to answer, before anything is
  // written. A key covering a seventh of the paper is not a key.
  const numbers = new Set(questions.map((q, i) => String(q.question_number ?? i + 1)));
  const matched = Object.keys(key.answers).filter((qnum) => numbers.has(qnum)).length;
  const coverage = questions.length > 0 ? matched / questions.length : 0;
  if (matched > 0 && coverage < MIN_KEY_COVERAGE) {
    const percent = Math.round(coverage * 100);
    console.warn(
      `[answer-key] Discarded: matched ${matched} of ${questions.length} questions (${percent}%), ` +
      `below the ${Math.round(MIN_KEY_COVERAGE * 100)}% a real key covers. Reading it as scattered false matches.`,
    );
    return { answersFilled: 0, solutionsFilled: 0, rejected: `coverage ${percent}%` };
  }

  questions.forEach((question, index) => {
    // The number printed on the paper, falling back to position for a paper
    // whose questions were never numbered.
    const qnum = String(question.question_number ?? index + 1);

    const existing = Array.isArray(question.correct_answer) ? question.correct_answer : [];
    const raw = key.answers[qnum];
    if (existing.length === 0 && Array.isArray(raw) && raw.length > 0) {
      const options = Array.isArray(question.options) ? question.options : [];
      question.correct_answer = convertAnswers(raw, question.question_type, options.length, examCode);
      answersFilled += 1;
    }

    const solution = key.solutions[qnum];
    if (typeof solution === "string" && solution.trim() && !String(question.explanation ?? "").trim()) {
      question.explanation = solution.trim();
      solutionsFilled += 1;
    }
  });

  return { answersFilled, solutionsFilled };
}

/**
 * Whether it is worth looking for a key inside the question PDF.
 *
 * Page roles alone are not a reliable trigger: on a real paper the profiler
 * left 16 of 21 pages "unknown" and found no answer-key page at all, because
 * the heading it looks for is not always printed. So the deciding signal is
 * the outcome — questions that came back with no answer — and the page roles
 * only strengthen it.
 */
export function shouldParseAnswerKey(
  questions: Array<Record<string, any>>,
  profile?: { answer_key_pages?: number[]; solution_pages?: number[] } | null,
): boolean {
  if (questions.length === 0) return false;
  if ((profile?.answer_key_pages?.length ?? 0) > 0) return true;
  if ((profile?.solution_pages?.length ?? 0) > 0) return true;

  const unanswered = questions.filter(
    (q) => !Array.isArray(q.correct_answer) || q.correct_answer.length === 0,
  ).length;
  return unanswered / questions.length >= 0.5;
}
