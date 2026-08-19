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
// Override via environment variable if needed. Must track
// gemini_page_extractor.py's own DEFAULT_MODEL — this value is passed as
// --model below, which overrides that script's default, so this file was
// silently reverting every extraction back to the older, pricier
// gemini-2.5-flash after the Python script's own default had already been
// switched to gemini-3.1-flash-lite (cheaper, and matched the source page
// exactly in a side-by-side test where 2.5-flash swapped two answer options).
const MODEL = process.env.GEMINI_MODEL || "google/gemini-3.1-flash-lite";

export type ExamCategory = "jee_main" | "jee_advanced" | "neet" | "other";

// ── Child-process runner ──────────────────────────────────────────────────────

/**
 * Non-blocking runner — avoids blocking the BullMQ event loop.
 *
 * Spawns the interpreter directly (no `shell: true`). On Windows, a shelled
 * command runs as a child of cmd.exe, and cmd.exe does not forward
 * `child.kill()` down to the process it launched — the shell dies, the
 * Python process it started does not. That left a timed-out extraction
 * running invisibly in the background, still writing into the job's temp
 * folder while a BullMQ retry (or a dev-server restart) started a second
 * process pointed at the same folder — the two would then race on the same
 * files. Spawning the interpreter directly gives Node a handle on the real
 * process, so kill() actually terminates it.
 */
function runCommand(command: string, args: string[], timeoutMs: number, stage = "command"): Promise<string> {
  return new Promise((resolve, reject) => {
    const startedAt = Date.now();
    console.info(`[pdfExtractor][${stage}] Started (timeout ${Math.round(timeoutMs / 1000)}s).`);
    const child = spawn(command, args, {
      env: process.env,
      windowsHide: true,
    });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      console.error(`[pdfExtractor][${stage}] Timed out after ${Date.now() - startedAt}ms.`);
      reject(new Error(`Command timed out after ${timeoutMs}ms: ${[command, ...args].join(" ").slice(0, 160)}`));
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

/**
 * The whole rendered page a question came from (gemini_page_extractor.py's
 * _page_image), as a base64 data URL — or null if the file is missing, which
 * happens for a page whose render got cleaned up between passes.
 *
 * This is a full page, not a tight crop of just the one question: cropping to
 * a question's own bounding box would need real layout detection, which the
 * pipeline doesn't do. A full page is still exactly what a later AI-fix or
 * gap-fill call needs to check a question against how it actually printed,
 * which today it cannot do at all — the render is otherwise discarded the
 * moment the extraction job finishes.
 */
function resolvePageImage(pageImageRel: unknown, workDir: string): string | null {
  const rel = typeof pageImageRel === "string" ? pageImageRel.trim() : "";
  if (!rel) return null;
  const filePath = path.join(workDir, rel);
  if (!fs.existsSync(filePath)) return null;
  try {
    return fileToBase64(filePath);
  } catch (err) {
    console.warn(`[pdfExtractor] Could not read page image "${rel}":`, (err as Error)?.message ?? err);
    return null;
  }
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

function finalizeQuestions(jsonPath: string, imagesDir: string, workDir: string, suffix = ""): ExtractionResult {
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

    if (!q.source_crop_url) {
      const pageImage = resolvePageImage(q._page_image, workDir);
      if (pageImage) q.source_crop_url = pageImage;
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

  // Reject anything but the documented comma-separated 1-based range syntax
  // before it reaches the Python script's argv.
  if (effectivePages && !/^[0-9,\-\s]+$/.test(effectivePages)) {
    return { success: false, message: "Invalid page range. Use values such as 1-5,8.", questions: [] };
  }

  try {
    // ── 1. PyMuPDF ────────────────────────────────────────────────────────────
    console.log(`[pdfExtractor] PyMuPDF on: ${pdfPath}`);
    let pyMuPdfOutput = "";
    try {
      // 8 minutes: rendering every page to a high-res image for the Gemini
      // vision call is CPU-bound and scales with page count; 180s was tight
      // enough that ordinary multi-page papers could hit it under normal load.
      pyMuPdfOutput = await runCommand(
        "python",
        [path.join(scriptDir, "pymupdf_extractor.py"), pdfPath, outputDir],
        480_000,
        "pymupdf",
      );
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
      "python",
      [
        path.join(scriptDir, "gemini_page_extractor.py"),
        outputDir,
        "--model", MODEL,
        ...(effectivePages ? ["--pages", effectivePages] : []),
      ],
      600_000,
      "gemini-page-workers",
    );

    // ── 3. Normalise ──────────────────────────────────────────────────────────
    console.log("[pdfExtractor] Normalising…");
    await runCommand(
      "python",
      [path.join(scriptDir, "normalize_json.py"), finalJson, "--images-dir", imagesDir],
      300_000,
      "normalization",
    );

    // ── 4. Finalise & embed images ────────────────────────────────────────────
    return finalizeQuestions(finalJson, imagesDir, outputDir, ` [${MODEL} parallel page extraction]`);

  } catch (err: any) {
    console.error("[pdfExtractor] Pipeline error:", err);
    return { success: false, message: err.message || "Extraction failed.", questions: [] };
  }
}
