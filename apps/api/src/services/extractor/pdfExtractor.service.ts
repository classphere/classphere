import { spawn } from "child_process";
import { createHash } from "crypto";
import * as fs from "fs";
import * as path from "path";

/**
 * Absolute path to the Python extractor scripts directory.
 * In production, Dockerfile copies Python scripts to dist/services/extractor/ alongside
 * the compiled JS — so __dirname is already correct in both dev and prod.
 */
export const EXTRACTOR_SCRIPT_DIR: string = __dirname;

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

/**
 * Written by the reconciliation pass in gemini_page_extractor.py, which diffs
 * the model's output against the question-number anchors PyMuPDF detected in
 * the PDF text itself. This is what lets the pipeline distinguish "extracted
 * every question" from "extracted some questions".
 */
export interface ExtractionCompleteness {
  expected_total: number;
  extracted_total: number;
  anchors_matched: number;
  missing_total: number;
  missing_by_page: Record<string, number[]>;
  truncated_pages: number[];
  /** Pages that exhausted their retries — their questions are absent entirely. */
  failed_pages: number[];
  completeness: number;
  normalized_total?: number;
}

export interface ExtractionResult {
  success: boolean;
  message: string;
  questions: any[];
  completeness?: ExtractionCompleteness | null;
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

/**
 * Turn a list of extracted filenames into data URLs.
 *
 * normalize_json.py has already catalogued every figure into question_images
 * and explanation_images, so the array is the direct source — scanning the
 * text for markdown was only ever a way of reaching the same filenames before
 * those arrays existed.
 *
 * A filename with no file on disk is dropped rather than kept: it would reach
 * the database as a bare name that resolves to nothing, and an absent figure
 * is easier to spot than a broken one.
 */
function embedImageList(images: unknown, imagesDir: string): string[] {
  if (!Array.isArray(images)) return [];
  const embedded: string[] = [];

  // The same picture can arrive under two filenames. A question whose figure
  // sits past the page break is now read with both pages in view, and the same
  // diagram is catalogued once per page it appears on, so the model can name
  // both. Deduplicating on filename would not catch it — the names differ — and
  // the reviewer sees one figure twice with no way to tell which to delete.
  //
  // Compared by content, so two names for identical bytes collapse to one and
  // two genuinely different figures both survive.
  const seen = new Set<string>();
  const keep = (value: string, fingerprint: string) => {
    if (seen.has(fingerprint)) return;
    seen.add(fingerprint);
    embedded.push(value);
  };

  for (const entry of images) {
    const filename = String(entry ?? "").trim();
    if (!filename) continue;
    if (filename.startsWith("data:") || /^https?:/i.test(filename)) {
      keep(filename, filename);
      continue;
    }
    const filePath = path.join(imagesDir, filename);
    if (!fs.existsSync(filePath)) {
      console.warn(`[pdfExtractor] Figure "${filename}" not found in ${imagesDir}; dropping it.`);
      continue;
    }
    const bytes = fs.readFileSync(filePath);
    keep(fileToBase64(filePath), createHash("sha1").update(bytes).digest("hex"));
  }

  const dropped = images.length - embedded.length;
  if (dropped > 0) console.log(`[pdfExtractor] Collapsed ${dropped} repeated figure(s) to their single original.`);
  return embedded;
}

function finalizeQuestions(jsonPath: string, imagesDir: string, suffix = ""): ExtractionResult {
  if (!fs.existsSync(jsonPath)) {
    return { success: false, message: "Pipeline completed but no output JSON was found.", questions: [] };
  }
  const parsed    = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
  const questions = parsed.questions || [];
  const completeness: ExtractionCompleteness | null = parsed.completeness ?? null;
  console.log(`[pdfExtractor] Embedding images into ${questions.length} questions…`);
  for (const q of questions) {
    // Figures come from the arrays normalize_json.py built. The text fields no
    // longer carry image markdown at all, so there is nothing left to scan and
    // nothing stored twice.
    q.question_images = embedImageList(q.question_images, imagesDir);
    q.explanation_images = embedImageList(q.explanation_images, imagesDir);

    if (Array.isArray(q.options)) {
      for (const opt of q.options) {
        // An option carries at most one figure and keeps it in image_url, so
        // the text scan still applies here.
        if (opt.text) opt.text = embedImagesInText(opt.text, imagesDir);
        if (opt.image_url)
          opt.image_url = embedImagesInText(`![image](${opt.image_url})`, imagesDir)
            .replace(/^!\[image\]\(|\)$/g, "");
      }
    }
  }
  if (!questions.length) {
    return { success: false, message: "Extraction produced no questions.", questions, completeness };
  }

  // A partial extraction is still a failure of the user's actual intent, so say
  // so in the message rather than reporting a clean success for 22 of 54 questions.
  const missing = completeness?.missing_total ?? 0;
  const shortfall = missing > 0
    ? ` — ${missing} question(s) detected in the PDF could not be extracted` +
      ` (${Object.entries(completeness?.missing_by_page ?? {})
        .map(([page, numbers]) => `p${page}: ${numbers.join(", ")}`)
        .join("; ")})`
    : "";

  return {
    success: true,
    message: `Extracted ${questions.length} questions successfully${suffix}${shortfall}.`,
    questions,
    completeness,
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
