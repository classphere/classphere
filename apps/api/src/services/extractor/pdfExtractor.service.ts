import { spawn } from "child_process";
import * as fs from "fs";
import * as path from "path";

/**
 * Absolute path to the Python extractor scripts directory.
 * Other modules MUST import this constant instead of computing their own path.
 */
export const EXTRACTOR_SCRIPT_DIR: string = path.join(__dirname);

// ── OpenRouter model ID ──────────────────────────────────────────────────────
// Override via environment variable if needed.
const MODEL = process.env.LLM_MODEL || "deepseek/deepseek-v4-flash";

export type ExamCategory = "jee_main" | "jee_advanced" | "neet" | "other";

/** Toggle thinking ON for JEE/Advanced/other, OFF for NEET. */
function thinkingForExam(exam?: ExamCategory): "on" | "off" {
  if (exam === "neet") return "off";
  return "on";
}

// ── Child-process runner ──────────────────────────────────────────────────────

/** Non-blocking runner — avoids blocking the BullMQ event loop. */
function runCommand(command: string, timeoutMs: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, {
      shell: true,
      env: process.env,
      windowsHide: true,
    });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      reject(new Error(`Command timed out after ${timeoutMs}ms: ${command.slice(0, 160)}`));
    }, timeoutMs);
    child.stdout?.on("data", (chunk) => {
      const text = chunk.toString();
      stdout += text;
      process.stdout.write(text);
    });
    child.stderr?.on("data", (chunk) => {
      const text = chunk.toString();
      stderr += text;
      process.stderr.write(text);
    });
    child.on("error", (err) => { clearTimeout(timer); reject(err); });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) resolve(stdout);
      else reject(new Error(`Command exited ${code}: ${stderr.slice(-1000) || stdout.slice(-1000)}`));
    });
  });
}

// ── Shared types ──────────────────────────────────────────────────────────────

export interface ExtractionResult {
  success: boolean;
  message: string;
  questions: any[];
}

export interface ExtractionOptions {
  /** Restrict extraction to these pages (e.g. "1-5,8"). */
  pagesRange?: string;
  /** Exam type used to select the LLM model. Defaults to JEE (R1). */
  examCategory?: ExamCategory;
}

// ── Image embedding ───────────────────────────────────────────────────────────

function fileToBase64(filePath: string): string {
  const bitmap = fs.readFileSync(filePath);
  const ext    = path.extname(filePath).toLowerCase();
  let mimeType = "image/png";
  if (ext === ".jpg" || ext === ".jpeg") mimeType = "image/jpeg";
  else if (ext === ".gif")  mimeType = "image/gif";
  else if (ext === ".webp") mimeType = "image/webp";
  return `data:${mimeType};base64,${bitmap.toString("base64")}`;
}

function embedImagesInText(text: string, imagesDir: string): string {
  if (!text) return text;
  const re = /!\[image\]\(([^)]+)\)|\[image:\s*([^\]]+)\]/g;
  return text.replace(re, (match, mdName, brName) => {
    const filename = (mdName || brName || "").trim();
    if (!filename || filename.startsWith("data:")) return match;
    const filePath = path.join(imagesDir, filename);
    if (fs.existsSync(filePath)) return `![image](${fileToBase64(filePath)})`;
    return match;
  });
}

function finalizeQuestions(jsonPath: string, imagesDir: string, suffix = ""): ExtractionResult {
  if (!fs.existsSync(jsonPath)) {
    return { success: false, message: "Pipeline completed but no output JSON was found.", questions: [] };
  }
  const parsed    = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
  const questions = parsed.questions || [];
  console.log(`[pdfExtractor] Embedding images into ${questions.length} questions…`);
  for (const q of questions) {
    if (q.question_text) q.question_text = embedImagesInText(q.question_text, imagesDir);
    if (Array.isArray(q.options)) {
      for (const opt of q.options) {
        if (opt.text) opt.text = embedImagesInText(opt.text, imagesDir);
        if (opt.image_url)
          opt.image_url = embedImagesInText(`![image](${opt.image_url})`, imagesDir)
            .replace(/^!\[image\]\(|\)$/g, "");
      }
    }
    if (q.explanation) q.explanation = embedImagesInText(q.explanation, imagesDir);
  }
  return {
    success: questions.length > 0,
    message: questions.length > 0
      ? `Extracted ${questions.length} questions successfully${suffix}.`
      : "Extraction produced no questions.",
    questions,
  };
}

// ── Main pipeline ─────────────────────────────────────────────────────────────

/**
 * Full PDF extraction pipeline (digital PDFs only):
 *
 *   1. pymupdf_extractor.py  — text & native image extraction
 *   2. llm_extractor.py      — DeepSeek R1 (JEE) or V3 (NEET) via OpenRouter
 *   3. normalize_json.py     — schema normalisation & dedup
 *   4. Embed images as base64 data URLs
 *
 * Scanned PDFs are rejected — only digital (searchable) PDFs are supported.
 */
export async function extractPDF(
  pdfPath: string,
  pagesRange?: string,
  options: ExtractionOptions = {},
): Promise<ExtractionResult> {
  const effectivePages = options.pagesRange ?? pagesRange;
  const thinking       = thinkingForExam(options.examCategory);
  const workingDir     = path.dirname(pdfPath);
  const outputDir      = path.join(workingDir, "extracted_data");
  const imagesDir      = path.join(outputDir, "marker_images");
  const finalJson      = path.join(outputDir, "all_extracted_data.json");
  const scriptDir      = EXTRACTOR_SCRIPT_DIR;

  fs.mkdirSync(outputDir, { recursive: true });

  try {
    // ── 1. PyMuPDF ────────────────────────────────────────────────────────────
    console.log(`[pdfExtractor] PyMuPDF on: ${pdfPath}`);
    const pyCmd = `python "${path.join(scriptDir, "pymupdf_extractor.py")}" "${pdfPath}" "${outputDir}"`;
    let stdOut = "";
    try {
      stdOut = await runCommand(pyCmd, 180_000);
    } catch (err: any) {
      stdOut = err?.message || String(err);
      console.error("[pdfExtractor] PyMuPDF error:", stdOut.slice(0, 500));
    }

    if (stdOut.includes("Scanned PDF detected")) {
      return {
        success: false,
        message: "Scanned PDF detected — only digital (searchable) PDFs are supported.",
        questions: [],
      };
    }

    // ── 2. LLM extraction (thinking toggled by exam type) ─────────────────────
    const pagesArg = effectivePages ? ` --pages "${effectivePages}"` : "";
    console.log(`[pdfExtractor] LLM extraction — model: ${MODEL}, thinking: ${thinking.toUpperCase()}`);
    await runCommand(
      `python "${path.join(scriptDir, "llm_extractor.py")}" "${outputDir}"` +
      ` --model "${MODEL}" --thinking ${thinking}${pagesArg}`,
      600_000,
    );

    // ── 3. Normalise ──────────────────────────────────────────────────────────
    console.log("[pdfExtractor] Normalising…");
    await runCommand(
      `python "${path.join(scriptDir, "normalize_json.py")}" "${finalJson}" ` +
      `--images-dir "${imagesDir}" --source pymupdf`,
      300_000,
    );

    // ── 4. Finalise & embed images ────────────────────────────────────────────
    return finalizeQuestions(finalJson, imagesDir, ` [${MODEL} (thinking=${thinking})]`);

  } catch (err: any) {
    console.error("[pdfExtractor] Pipeline error:", err);
    return { success: false, message: err.message || "Extraction failed.", questions: [] };
  }
}
