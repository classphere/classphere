import { execSync, spawn } from "child_process";
import * as fs from "fs";
import * as path from "path";

/** Non-blocking child-process runner. The old execSync calls blocked Node's
 * event loop for minutes, so BullMQ could not renew locks and concurrency=2 was
 * effectively concurrency=1. Production webhook phases use this runner; the
 * legacy synchronous extractPDF path remains for local compatibility. */
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
    child.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) resolve(stdout);
      else reject(new Error(`Command exited ${code}: ${stderr.slice(-1000) || stdout.slice(-1000)}`));
    });
  });
}

export interface ExtractionResult {
  success: boolean;
  message: string;
  questions: any[];
}

export interface ExtractionOptions {
  /** Force the existing Marker best-of-both path for profile-detected hybrid pages. */
  forceMarker?: boolean;
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
    const filePath = path.join(imagesDir, filename);
    if (fs.existsSync(filePath)) {
      const base64Url = fileToBase64(filePath);
      return `![image](${base64Url})`;
    }
    return match;
  });
}

/** Run Datalab Marker (force_ocr) into outDir, producing pipeline-format
 *  marker_raw.json. Throws on failure; exit code 2 (no DATALAB_API_KEY) is
 *  surfaced as a throw so callers can treat Marker as an optional no-op. */
function runMarker(scriptDir: string, pdfPath: string, outDir: string): void {
  const cmd = `python "${path.join(scriptDir, "marker_extractor.py")}" "${pdfPath}" ` +
              `--out "${outDir}" --force-ocr true`;
  execSync(cmd, { stdio: "inherit", timeout: 600000 });
}

/** Run Cerebras extraction + normalization over a source dir's marker_raw.json.
 *  `source` ("pymupdf" | "marker") tells the normalizer whether escalation is
 *  even applicable (a Marker result is never re-escalated). */
function runCerebrasAndNormalize(
  scriptDir: string, dir: string, jsonPath: string, imagesDir: string,
  pagesArg: string, source: string
): void {
  console.log(`[pdfExtractor] Cerebras extraction (${source})...`);
  execSync(`python "${path.join(scriptDir, "cerebras_from_marker.py")}" "${dir}"${pagesArg}`,
           { stdio: "inherit", timeout: 600000 });
  console.log(`[pdfExtractor] Normalizing (${source})...`);
  execSync(`python "${path.join(scriptDir, "normalize_json.py")}" "${jsonPath}" ` +
           `--images-dir "${imagesDir}" --source ${source}`,
           { stdio: "inherit", timeout: 600000 });
}

/** Normalize an already-extracted JSON (no Cerebras) — used on the merged set. */
function runCerebrasNormalizeOnly(
  scriptDir: string, jsonPath: string, imagesDir: string, source: string
): void {
  console.log(`[pdfExtractor] Normalizing merged set (${source})...`);
  execSync(`python "${path.join(scriptDir, "normalize_json.py")}" "${jsonPath}" ` +
           `--images-dir "${imagesDir}" --source ${source}`,
           { stdio: "inherit", timeout: 300000 });
}

async function runCerebrasAndNormalizeAsync(
  scriptDir: string, dir: string, jsonPath: string, imagesDir: string,
  pagesArg: string, source: string
): Promise<void> {
  console.log(`[pdfExtractor] Cerebras extraction (${source})...`);
  await runCommand(`python "${path.join(scriptDir, "cerebras_from_marker.py")}" "${dir}"${pagesArg}`,
                   600000);
  console.log(`[pdfExtractor] Normalizing (${source})...`);
  await runCommand(`python "${path.join(scriptDir, "normalize_json.py")}" "${jsonPath}" ` +
                   `--images-dir "${imagesDir}" --source ${source}`, 600000);
}

async function normalizeOnlyAsync(
  scriptDir: string, jsonPath: string, imagesDir: string, source: string
): Promise<void> {
  console.log(`[pdfExtractor] Normalizing merged set (${source})...`);
  await runCommand(`python "${path.join(scriptDir, "normalize_json.py")}" "${jsonPath}" ` +
                   `--images-dir "${imagesDir}" --source ${source}`, 300000);
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

export interface MarkerWaitState {
  state: "waiting_marker";
  source: "pymupdf" | "marker";
  requestId: string;
  requestCheckUrl: string;
}

export interface CompleteState {
  state: "complete";
  result: ExtractionResult;
}

export type PreparedExtraction = MarkerWaitState | CompleteState;

async function markerSubmitOnly(
  scriptDir: string, pdfPath: string, outDir: string, webhookUrl: string
): Promise<{ request_id: string; request_check_url: string }> {
  fs.mkdirSync(outDir, { recursive: true });
  const requestPath = path.join(outDir, "marker_request.json");
  await runCommand(`python "${path.join(scriptDir, "marker_extractor.py")}" "${pdfPath}" ` +
                   `--out "${outDir}" --force-ocr true --webhook-url "${webhookUrl}" ` +
                   `--submit-only --request-json "${requestPath}"`, 120000);
  return JSON.parse(fs.readFileSync(requestPath, "utf-8"));
}

async function markerFetchCompleted(
  scriptDir: string, outDir: string, requestCheckUrl: string
): Promise<void> {
  fs.mkdirSync(outDir, { recursive: true });
  await runCommand(`python "${path.join(scriptDir, "marker_extractor.py")}" ` +
                   `--out "${outDir}" --fetch-url "${requestCheckUrl}"`, 180000);
}

function finalizeQuestions(jsonPath: string, imagesDir: string, suffix = ""): ExtractionResult {
  if (!fs.existsSync(jsonPath)) {
    return { success: false, message: "Pipeline completed but no output JSON was found.", questions: [] };
  }
  const parsed = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
  const questions = parsed.questions || [];
  console.log(`[pdfExtractor] Embedding base64 images into ${questions.length} questions...`);
  for (const q of questions) {
    if (q.question_text) q.question_text = embedImagesInText(q.question_text, imagesDir);
    if (Array.isArray(q.options)) {
      for (const opt of q.options) {
        if (opt.text) opt.text = embedImagesInText(opt.text, imagesDir);
        if (opt.image_url) opt.image_url = embedImagesInText(`![image](${opt.image_url})`, imagesDir)
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

/** Phase 1 for production: run local PyMuPDF/Cerebras work, then either finish
 * immediately or submit Marker with a webhook and release the worker slot. */
export async function preparePDFExtraction(
  pdfPath: string,
  pagesRange: string | undefined,
  webhookUrl: string | undefined,
  options: ExtractionOptions = {},
): Promise<PreparedExtraction> {
  const workingDir = path.dirname(pdfPath);
  const outputDir = path.join(workingDir, "extracted_data");
  const imagesDir = path.join(outputDir, "marker_images");
  const finalJson = path.join(outputDir, "all_extracted_data.json");
  const scriptDir = path.join(__dirname);
  fs.mkdirSync(outputDir, { recursive: true });

  const pyCmd = `python "${path.join(scriptDir, "pymupdf_extractor.py")}" "${pdfPath}" "${outputDir}"`;
  let stdout = "";
  try {
    stdout = await runCommand(pyCmd, 180000);
  } catch (err: any) {
    stdout = err?.message || String(err);
    console.error("[pdfExtractor] PyMuPDF execution error:", stdout);
  }

  const pagesArg = pagesRange ? ` --pages "${pagesRange}"` : "";
  const scanned = stdout.includes("Scanned PDF detected");
  const hasDatalab = !!(process.env.DATALAB_API_KEY || "").trim();

  if (scanned) {
    if (!hasDatalab) {
      return { state: "complete", result: {
        success: false,
        message: "Scanned PDF detected but no DATALAB_API_KEY is configured.",
        questions: [],
      }};
    }
    if (webhookUrl) {
      const req = await markerSubmitOnly(scriptDir, pdfPath, outputDir, webhookUrl);
      return { state: "waiting_marker", source: "marker",
               requestId: req.request_id, requestCheckUrl: req.request_check_url };
    }
    // Local/legacy fallback when no public webhook URL is configured.
    runMarker(scriptDir, pdfPath, outputDir);
    await runCerebrasAndNormalizeAsync(scriptDir, outputDir, finalJson, imagesDir, pagesArg, "marker");
    return { state: "complete", result: finalizeQuestions(finalJson, imagesDir, " via Marker") };
  }

  // Digital PDF: PyMuPDF is the primary source and owns all final images.
  await runCerebrasAndNormalizeAsync(scriptDir, outputDir, finalJson, imagesDir, pagesArg, "pymupdf");
  const report = readReport(finalJson);
  const escalate = options.forceMarker === true || !!report?.escalation?.escalate;
  if (options.forceMarker && !hasDatalab) {
    console.warn("[pdfExtractor] Profile requested Marker escalation, but DATALAB_API_KEY is not configured; keeping PyMuPDF output.");
  }
  if (!escalate || !hasDatalab) {
    return { state: "complete", result: finalizeQuestions(finalJson, imagesDir) };
  }
  if (!webhookUrl) {
    // Local/legacy fallback: poll Marker synchronously, but reuse the PyMuPDF
    // result we already produced (do not recursively rerun the whole pipeline).
    const escDir = path.join(outputDir, "marker_escalation");
    const escImages = path.join(escDir, "marker_images");
    const escJson = path.join(escDir, "all_extracted_data.json");
    const mergedDir = path.join(outputDir, "merged");
    const mergedImages = path.join(mergedDir, "marker_images");
    const mergedJson = path.join(mergedDir, "all_extracted_data.json");
    runMarker(scriptDir, pdfPath, escDir);
    await runCerebrasAndNormalizeAsync(scriptDir, escDir, escJson, escImages, pagesArg, "marker");
    await runCommand(`python "${path.join(scriptDir, "merge_extractions.py")}" ` +
                     `--pymupdf "${outputDir}" --marker "${escDir}" --out "${mergedDir}"`,
                     120000);
    await normalizeOnlyAsync(scriptDir, mergedJson, mergedImages, "marker");
    return { state: "complete", result: finalizeQuestions(mergedJson, mergedImages, " via Marker merge") };
  }
  const escDir = path.join(outputDir, "marker_escalation");
  const req = await markerSubmitOnly(scriptDir, pdfPath, escDir, webhookUrl);
  return { state: "waiting_marker", source: "pymupdf",
           requestId: req.request_id, requestCheckUrl: req.request_check_url };
}

/** Phase 2: called by the continuation job after Datalab's verified webhook. */
export async function continuePDFExtraction(
  workingDir: string,
  requestCheckUrl: string,
  source: "pymupdf" | "marker",
  pagesRange?: string,
): Promise<ExtractionResult> {
  const outputDir = path.join(workingDir, "extracted_data");
  const primaryImages = path.join(outputDir, "marker_images");
  const primaryJson = path.join(outputDir, "all_extracted_data.json");
  const scriptDir = path.join(__dirname);
  const pagesArg = pagesRange ? ` --pages "${pagesRange}"` : "";

  if (source === "marker") {
    await markerFetchCompleted(scriptDir, outputDir, requestCheckUrl);
    await runCerebrasAndNormalizeAsync(scriptDir, outputDir, primaryJson, primaryImages, pagesArg, "marker");
    return finalizeQuestions(primaryJson, primaryImages, " via Marker webhook");
  }

  const escDir = path.join(outputDir, "marker_escalation");
  const escImages = path.join(escDir, "marker_images");
  const escJson = path.join(escDir, "all_extracted_data.json");
  const mergedDir = path.join(outputDir, "merged");
  const mergedImages = path.join(mergedDir, "marker_images");
  const mergedJson = path.join(mergedDir, "all_extracted_data.json");

  await markerFetchCompleted(scriptDir, escDir, requestCheckUrl);
  await runCerebrasAndNormalizeAsync(scriptDir, escDir, escJson, escImages, pagesArg, "marker");
  await runCommand(`python "${path.join(scriptDir, "merge_extractions.py")}" ` +
                   `--pymupdf "${outputDir}" --marker "${escDir}" --out "${mergedDir}"`,
                   120000);
  await normalizeOnlyAsync(scriptDir, mergedJson, mergedImages, "marker");
  return finalizeQuestions(mergedJson, mergedImages, " via Marker webhook merge");
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
  pagesRange?: string,
  options: ExtractionOptions = {},
): Promise<ExtractionResult> {
  const workingDir = path.dirname(pdfPath);
  const outputDir = path.join(workingDir, "extracted_data");
  const markerImagesDir = path.join(outputDir, "marker_images");
  const finalJsonPath = path.join(outputDir, "all_extracted_data.json");

  const scriptDir = path.join(__dirname);

  try {
    // ── 1. Run PyMuPDF Extractor ─────────────────────────────────────────────
    console.log(`[pdfExtractor] Running PyMuPDF Extractor on: ${pdfPath}`);
    const pyMuPDFCmd = `python "${path.join(scriptDir, "pymupdf_extractor.py")}" "${pdfPath}" "${outputDir}"`;
    let stdOut = "";
    try {
      // v3 extractor also renders vector-diagram regions — allow more time
      stdOut = execSync(pyMuPDFCmd, { stdio: "pipe", timeout: 180000 }).toString();
      console.log("[pdfExtractor] PyMuPDF Output:\n", stdOut);
    } catch (pyMuErr: any) {
      stdOut = pyMuErr.stdout?.toString() || pyMuErr.message;
      console.error("[pdfExtractor] PyMuPDF Execution Error:", stdOut);
    }

    const pagesArg = pagesRange ? ` --pages "${pagesRange}"` : "";
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
      runMarker(scriptDir, pdfPath, outputDir);
      source = "marker";
    }

    // ── 3+4. Cerebras extraction + normalization on the primary source ────────
    runCerebrasAndNormalize(scriptDir, outputDir, finalJsonPath, markerImagesDir,
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
      const escalate = options.forceMarker === true || !!report?.escalation?.escalate;
      if (escalate && hasDatalabKey) {
        const reasons = options.forceMarker
          ? "document profile detected pages requiring OCR"
          : ((report?.escalation?.reasons || []).join("; ") || "vector-math signature");
        console.log(`[pdfExtractor] Marker escalation requested (${reasons}). ` +
                    `Escalating to Datalab Marker (force_ocr)...`);
        const escDir = path.join(outputDir, "marker_escalation");
        const escImagesDir = path.join(escDir, "marker_images");
        const escJsonPath = path.join(escDir, "all_extracted_data.json");
        const mergedDir = path.join(outputDir, "merged");
        const mergedImagesDir = path.join(mergedDir, "marker_images");
        const mergedJsonPath = path.join(mergedDir, "all_extracted_data.json");
        try {
          fs.mkdirSync(escDir, { recursive: true });
          runMarker(scriptDir, pdfPath, escDir);
          runCerebrasAndNormalize(scriptDir, escDir, escJsonPath, escImagesDir,
                                  pagesArg, "marker");
          const escQ = readQuestions(escJsonPath);
          if (escQ.length > 0) {
            // Best-of-both merge: neither source dominates every question, so
            // pick per-question (fewer errors wins, tie → Marker). This keeps
            // Marker's recovered math AND PyMuPDF's questions where Marker drifts.
            console.log(`[pdfExtractor] Escalation extracted ${escQ.length} questions — merging best-of-both...`);
            execSync(`python "${path.join(scriptDir, "merge_extractions.py")}" ` +
                     `--pymupdf "${outputDir}" --marker "${escDir}" --out "${mergedDir}"`,
                     { stdio: "inherit", timeout: 120000 });
            // Re-normalize the merged set (source=marker → no further escalation)
            runCerebrasNormalizeOnly(scriptDir, mergedJsonPath, mergedImagesDir, "marker");
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
