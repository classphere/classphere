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
const MODEL = process.env.GEMINI_MODEL || "google/gemini-2.5-flash";

export type ExamCategory = "jee_main" | "jee_advanced" | "neet" | "other";

// ── Child-process runner ──────────────────────────────────────────────────────

/** Non-blocking runner — avoids blocking the BullMQ event loop. */
function runCommand(command: string, timeoutMs: number, stage = "command"): Promise<string> {
  return new Promise((resolve, reject) => {
    const startedAt = Date.now();
    console.info(`[pdfExtractor][${stage}] Started (timeout ${Math.round(timeoutMs / 1000)}s).`);
    const child = spawn(command, {
      shell: true,
      env: process.env,
      windowsHide: true,
    });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      console.error(`[pdfExtractor][${stage}] Timed out after ${Date.now() - startedAt}ms.`);
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
      if (code === 0) {
        console.info(`[pdfExtractor][${stage}] Completed in ${Date.now() - startedAt}ms.`);
        resolve(stdout);
      } else {
        console.error(`[pdfExtractor][${stage}] Failed in ${Date.now() - startedAt}ms with exit code ${code}.`);
        reject(new Error(`Command exited ${code}: ${stderr.slice(-1000) || stdout.slice(-1000)}`));
      }
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
 *   1. pymupdf_extractor.py  — page rendering, text and native image extraction
 *   2. gemini_page_extractor.py — parallel Gemini 2.5 Flash page extraction via OpenRouter
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
  const workingDir     = path.dirname(pdfPath);
  const outputDir      = path.join(workingDir, "extracted_data");
  const imagesDir      = path.join(outputDir, "marker_images");
  const finalJson      = path.join(outputDir, "all_extracted_data.json");
  const scriptDir      = EXTRACTOR_SCRIPT_DIR;

  fs.mkdirSync(outputDir, { recursive: true });

  // This value is interpolated into a shell command below; accept only the
  // documented comma-separated 1-based range syntax before doing so.
  if (effectivePages && !/^[0-9,\-\s]+$/.test(effectivePages)) {
    return { success: false, message: "Invalid page range. Use values such as 1-5,8.", questions: [] };
  }

  try {
    // ── 1. PyMuPDF ────────────────────────────────────────────────────────────
    console.log(`[pdfExtractor] PyMuPDF on: ${pdfPath}`);
    const pyCmd = `python "${path.join(scriptDir, "pymupdf_extractor.py")}" "${pdfPath}" "${outputDir}"`;
    let pyMuPdfOutput = "";
    try {
      pyMuPdfOutput = await runCommand(pyCmd, 180_000, "pymupdf");
    } catch (err: any) {
      pyMuPdfOutput = err?.message || String(err);
      console.error("[pdfExtractor] PyMuPDF error:", pyMuPdfOutput.slice(0, 500));

      // This file is the mandatory producer for marker_raw.json. Continuing to
      // the LLM stage after it fails only hides the real dependency/runtime
      // error behind a misleading "marker_raw.json not found" message.
      return {
        success: false,
        message: `PyMuPDF extraction failed: ${pyMuPdfOutput.slice(-800)}`,
        questions: [],
      };
    }

    if (pyMuPdfOutput.includes("Scanned PDF detected")) {
      return {
        success: false,
        message: "Scanned PDF detected — only digital (searchable) PDFs are supported.",
        questions: [],
      };
    }

    // ── 2. LLM extraction (thinking toggled by exam type) ─────────────────────
    console.log(`[pdfExtractor] Gemini page extraction via OpenRouter — model: ${MODEL}`);
    await runCommand(
      `python "${path.join(scriptDir, "gemini_page_extractor.py")}" "${outputDir}"` +
      ` --model "${MODEL}"${effectivePages ? ` --pages "${effectivePages}"` : ""}`,
      600_000,
      "gemini-page-workers",
    );

    // ── 3. Normalise ──────────────────────────────────────────────────────────
    console.log("[pdfExtractor] Normalising…");
    await runCommand(
      `python "${path.join(scriptDir, "normalize_json.py")}" "${finalJson}" ` +
      `--images-dir "${imagesDir}" --source pymupdf`,
      300_000,
      "normalization",
    );

    // ── 4. Finalise & embed images ────────────────────────────────────────────
    return finalizeQuestions(finalJson, imagesDir, ` [${MODEL} parallel page extraction]`);

  } catch (err: any) {
    console.error("[pdfExtractor] Pipeline error:", err);
    return { success: false, message: err.message || "Extraction failed.", questions: [] };
  }
}
