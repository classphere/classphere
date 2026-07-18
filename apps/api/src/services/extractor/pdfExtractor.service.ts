import { execFile } from "child_process";
import { promisify } from "util";
import * as fs from "fs";
import * as path from "path";

export interface ExtractionResult {
  success: boolean;
  message: string;
  questions: any[];
}

const execFileAsync = promisify(execFile);
const PAGE_RANGE = /^\d+(?:\s*-\s*\d+)?(?:\s*,\s*\d+(?:\s*-\s*\d+)?)*$/;

function validatePageRange(pages?: string): string | undefined {
  if (!pages?.trim()) return undefined;
  const normalized = pages.trim();
  if (!PAGE_RANGE.test(normalized)) {
    throw new Error("Invalid page range. Use values such as '1-3,5'.");
  }
  return normalized;
}

async function runPython(scriptPath: string, args: string[], timeout: number): Promise<string> {
  const { stdout, stderr } = await execFileAsync("python", [scriptPath, ...args], {
    timeout,
    maxBuffer: 10 * 1024 * 1024,
  });
  if (stderr) console.warn(`[pdfExtractor] ${stderr}`);
  return stdout;
}

function safeImagePath(imagesDir: string, filename: string): string | null {
  if (!filename || path.isAbsolute(filename) || filename.includes("\0")) return null;
  const root = path.resolve(imagesDir);
  const candidate = path.resolve(root, filename);
  return candidate.startsWith(`${root}${path.sep}`) ? candidate : null;
}

/**
 * Encodes a local file to a base64 Data URL.
 */
function fileToBase64(filePath: string): string {
  const bitmap = fs.readFileSync(filePath);
  const ext = path.extname(filePath).toLowerCase();
  let mimeType = "image/png";
  if (ext === ".jpg" || ext === ".jpeg") mimeType = "image/jpeg";
  else if (ext === ".gif") mimeType = "image/gif";
  else if (ext === ".webp") mimeType = "image/webp";
  return `data:${mimeType};base64,${bitmap.toString("base64")}`;
}

/**
 * Replaces markdown image tags referencing local file names with base64 data URLs.
 */
function embedImagesInText(text: string, imagesDir: string): string {
  if (!text) return text;
  // Match both placeholder styles:
  //   markdown  ![image](filename.png)   (pipeline-internal format)
  //   bracket   [image: filename.png]    (platform schema format)
  const placeholderRegex = /!\[image\]\(([^)]+)\)|\[image:\s*([^\]]+)\]/g;
  return text.replace(placeholderRegex, (match, mdName, brName) => {
    const filename = (mdName || brName || "").trim();
    if (!filename || filename.startsWith("data:")) return match;
    const filePath = safeImagePath(imagesDir, filename);
    if (filePath && fs.existsSync(filePath)) {
      const base64Url = fileToBase64(filePath);
      return `![image](${base64Url})`;
    }
    return match;
  });
}

/** Run Datalab Marker (force_ocr) into outDir, producing pipeline-format
 *  marker_raw.json. Throws on failure; exit code 2 (no DATALAB_API_KEY) is
 *  surfaced as a throw so callers can treat Marker as an optional no-op. */
async function runMarker(scriptDir: string, pdfPath: string, outDir: string): Promise<void> {
  await runPython(path.join(scriptDir, "marker_extractor.py"), [pdfPath, "--out", outDir, "--force-ocr", "true"], 600000);
}

/** Run Cerebras extraction + normalization over a source dir's marker_raw.json.
 *  `source` ("pymupdf" | "marker") tells the normalizer whether escalation is
 *  even applicable (a Marker result is never re-escalated). */
async function runCerebrasAndNormalize(
  scriptDir: string, dir: string, jsonPath: string, imagesDir: string,
  pagesArg: string | undefined, source: string
): Promise<void> {
  console.log(`[pdfExtractor] Cerebras extraction (${source})...`);
  await runPython(path.join(scriptDir, "cerebras_from_marker.py"), [dir, ...(pagesArg ? ["--pages", pagesArg] : [])], 600000);
  console.log(`[pdfExtractor] Normalizing (${source})...`);
  await runPython(path.join(scriptDir, "normalize_json.py"), [jsonPath, "--images-dir", imagesDir, "--source", source], 600000);
}

/** Normalize an already-extracted JSON (no Cerebras) — used on the merged set. */
async function runCerebrasNormalizeOnly(
  scriptDir: string, jsonPath: string, imagesDir: string, source: string
): Promise<void> {
  console.log(`[pdfExtractor] Normalizing merged set (${source})...`);
  await runPython(path.join(scriptDir, "normalize_json.py"), [jsonPath, "--images-dir", imagesDir, "--source", source], 300000);
}

function readReport(jsonPath: string): any {
  const reportPath = jsonPath.replace(/\.json$/, ".report.json");
  try {
    if (fs.existsSync(reportPath)) return JSON.parse(fs.readFileSync(reportPath, "utf-8"));
  } catch { /* ignore */ }
  return null;
}

function readQuestions(jsonPath: string): any[] {
  try {
    if (fs.existsSync(jsonPath)) return JSON.parse(fs.readFileSync(jsonPath, "utf-8")).questions || [];
  } catch { /* ignore */ }
  return [];
}

/**
 * Runs the full PDF extraction pipeline using Python scripts.
 * 1. PyMuPDF text & native image extraction (fast, free, exact on clean text).
 * 2. Scanned PDF → Datalab Marker (force_ocr) as the OCR source.
 * 3. Cerebras LLM extraction + normalization on the primary source.
 * 4b. Vector-math auto-escalation: if the PyMuPDF result shows the vector-math
 *     signature and DATALAB_API_KEY is set, re-run through Marker (force_ocr)
 *     and use that result. No key → graceful no-op (keep PyMuPDF result).
 * 5. Embeds local image outputs inside questions as base64 URLs.
 */
export async function extractPDF(
  pdfPath: string,
  pagesRange?: string
): Promise<ExtractionResult> {
  const workingDir = path.dirname(pdfPath);
  const outputDir = path.join(workingDir, "extracted_data");
  const markerImagesDir = path.join(outputDir, "marker_images");
  const finalJsonPath = path.join(outputDir, "all_extracted_data.json");

  const scriptDir = path.join(__dirname);

  try {
    // ── 1. Run PyMuPDF Extractor ─────────────────────────────────────────────
    console.log(`[pdfExtractor] Running PyMuPDF Extractor on: ${pdfPath}`);
    let stdOut = "";
    try {
      // v3 extractor also renders vector-diagram regions — allow more time
      stdOut = await runPython(path.join(scriptDir, "pymupdf_extractor.py"), [pdfPath, outputDir], 180000);
      console.log("[pdfExtractor] PyMuPDF Output:\n", stdOut);
    } catch (pyMuErr: any) {
      stdOut = pyMuErr.stdout?.toString() || pyMuErr.message;
      console.error("[pdfExtractor] PyMuPDF Execution Error:", stdOut);
    }

    const pagesArg = validatePageRange(pagesRange);
    let scanned = stdOut.includes("Scanned PDF detected");
    const hasDatalabKey = !!(process.env.DATALAB_API_KEY || "").trim();

    // ── 2. Scanned PDF → Marker is the ONLY source (needs OCR) ────────────────
    let source: "pymupdf" | "marker" = "pymupdf";
    if (scanned) {
      if (!hasDatalabKey) {
        return {
          success: false,
          message:
            "Scanned PDF detected but no DATALAB_API_KEY is configured for OCR. " +
            "Please upload a digital PDF or set DATALAB_API_KEY.",
          questions: [],
        };
      }
      console.log("[pdfExtractor] Scanned PDF — running Datalab Marker (force_ocr)...");
      await runMarker(scriptDir, pdfPath, outputDir);
      source = "marker";
    }

    // ── 3+4. Cerebras extraction + normalization on the primary source ────────
    await runCerebrasAndNormalize(scriptDir, outputDir, finalJsonPath, markerImagesDir,
                            pagesArg, source);

    // ── 4b. Vector-math ESCALATION ────────────────────────────────────────────
    // If PyMuPDF's result shows the vector-math signature, and a Datalab key is
    // available, re-extract the whole paper through Marker (force_ocr) — which
    // reads the drawn math from pixels — and use that result instead.
    let resultDir = outputDir;
    let resultImagesDir = markerImagesDir;
    let resultJsonPath = finalJsonPath;

    if (source === "pymupdf") {
      const report = readReport(finalJsonPath);
      const escalate = !!report?.escalation?.escalate;
      if (escalate && hasDatalabKey) {
        const reasons = (report.escalation.reasons || []).join("; ");
        console.log(`[pdfExtractor] Vector-math signature detected (${reasons}). ` +
                    `Escalating to Datalab Marker (force_ocr)...`);
        const escDir = path.join(outputDir, "marker_escalation");
        const escImagesDir = path.join(escDir, "marker_images");
        const escJsonPath = path.join(escDir, "all_extracted_data.json");
        const mergedDir = path.join(outputDir, "merged");
        const mergedImagesDir = path.join(mergedDir, "marker_images");
        const mergedJsonPath = path.join(mergedDir, "all_extracted_data.json");
        try {
          fs.mkdirSync(escDir, { recursive: true });
          await runMarker(scriptDir, pdfPath, escDir);
          await runCerebrasAndNormalize(scriptDir, escDir, escJsonPath, escImagesDir,
                                  pagesArg, "marker");
          const escQ = readQuestions(escJsonPath);
          if (escQ.length > 0) {
            // Best-of-both merge: neither source dominates every question, so
            // pick per-question (fewer errors wins, tie → Marker). This keeps
            // Marker's recovered math AND PyMuPDF's questions where Marker drifts.
            console.log(`[pdfExtractor] Escalation extracted ${escQ.length} questions — merging best-of-both...`);
            await runPython(path.join(scriptDir, "merge_extractions.py"),
                            ["--pymupdf", outputDir, "--marker", escDir, "--out", mergedDir], 120000);
            // Re-normalize the merged set (source=marker → no further escalation)
            await runCerebrasNormalizeOnly(scriptDir, mergedJsonPath, mergedImagesDir, "marker");
            if (readQuestions(mergedJsonPath).length > 0) {
              resultDir = mergedDir;
              resultImagesDir = mergedImagesDir;
              resultJsonPath = mergedJsonPath;
            }
          } else {
            console.warn("[pdfExtractor] Escalation produced no questions — keeping PyMuPDF result.");
          }
        } catch (escErr: any) {
          // Marker no-op (exit 2 / no key) or any failure → keep PyMuPDF result
          console.warn("[pdfExtractor] Escalation skipped/failed — keeping PyMuPDF result:",
                       escErr?.message || escErr);
        }
      } else if (escalate && !hasDatalabKey) {
        console.warn("[pdfExtractor] ⚠ Vector-math signature detected but DATALAB_API_KEY is NOT set — " +
                     "returning the PyMuPDF result, which will have garbled math on vector-drawn " +
                     "questions. Set DATALAB_API_KEY to auto-escalate and fix them.");
      }
    }

    // Promote the chosen result to the CANONICAL paths so file-based consumers
    // (e.g. a frontend reading extracted_data/all_extracted_data.json) always
    // get the FINAL merged result — never the PyMuPDF intermediate.
    if (resultJsonPath !== finalJsonPath && fs.existsSync(resultJsonPath)) {
      try {
        fs.copyFileSync(resultJsonPath, finalJsonPath);
        if (fs.existsSync(resultImagesDir)) {
          fs.mkdirSync(markerImagesDir, { recursive: true });
          for (const f of fs.readdirSync(resultImagesDir)) {
            fs.copyFileSync(path.join(resultImagesDir, f), path.join(markerImagesDir, f));
          }
        }
        resultJsonPath = finalJsonPath;
        resultImagesDir = markerImagesDir;
        console.log("[pdfExtractor] Promoted merged result to canonical output path.");
      } catch (e: any) {
        console.warn("[pdfExtractor] Could not promote merged result to canonical path:", e?.message || e);
      }
    }

    // ── 5. Parse final output & embed images ─────────────────────────────────
    if (!fs.existsSync(resultJsonPath)) {
      return {
        success: false,
        message: "Pipeline completed but no output JSON was found.",
        questions: [],
      };
    }

    const parsed = JSON.parse(fs.readFileSync(resultJsonPath, "utf-8"));
    const questions = parsed.questions || [];

    // Convert local files to base64 Data URLs so frontend can render inline
    console.log(`[pdfExtractor] Embedding base64 images into ${questions.length} questions...`);
    for (const q of questions) {
      if (q.question_text) q.question_text = embedImagesInText(q.question_text, resultImagesDir);
      if (Array.isArray(q.options)) {
        for (const opt of q.options) {
          if (opt.text) opt.text = embedImagesInText(opt.text, resultImagesDir);
          if (opt.image_url) opt.image_url = embedImagesInText(`![image](${opt.image_url})`, resultImagesDir)
            .replace(/^!\[image\]\(|\)$/g, "");
        }
      }
      if (q.explanation) q.explanation = embedImagesInText(q.explanation, resultImagesDir);
    }

    return {
      success: true,
      message: `Extracted ${questions.length} questions successfully` +
               (resultDir !== outputDir ? " (via Marker escalation)." : "."),
      questions,
    };
  } catch (err: any) {
    console.error("[pdfExtractor] Error running extraction pipeline:", err);
    return {
      success: false,
      message: err.message || "Failed to extract PDF.",
      questions: [],
    };
  }
}
