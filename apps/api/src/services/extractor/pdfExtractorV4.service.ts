import { spawn } from "child_process";
import * as fs from "fs";
import * as path from "path";
import { extractPDF } from "./pdfExtractor.service";
import type { ExtractionResult, ExtractionOptions } from "./pdfExtractor.service";
import { enrichQuestionContentV4 } from "../../lib/question-content";
import { applyAnswerKey, parseAnswerKeyFromPdf, shouldParseAnswerKey } from "./answer-key.service";

export interface DocumentProfile {
  profile_version: number;
  document_kind: "digital" | "scanned" | "hybrid";
  page_count: number;
  page_kind_counts: Record<string, number>;
  two_column_pages: number[];
  answer_key_pages: number[];
  instruction_pages: number[];
  /**
   * Marks read off the paper's own instructions page, when it states them.
   * A proposal, not a decision — the upload form shows it pre-filled beside
   * the text it came from and a person confirms it. Empty for NEET and JEE
   * Main, which have no per-section marking to read.
   */
  marking_scheme_hint: {
    scheme: Record<string, { correct: number; incorrect: number; unattempted?: number; partial?: string }>;
    evidence: Record<string, string>;
    unread: string[];
  };
  solution_pages: number[];
  numbering_reset_count: number;
  numbering_reset_pages: number[];
  ocr_pages: number[];
  escalation_reasons: string[];
  pages: Array<Record<string, unknown>>;
}

function v4Enabled(): boolean {
  return /^(1|true|yes|on|v4)$/i.test((process.env.PDF_EXTRACTOR_V4 || "").trim());
}

function profilerScriptPath(): string {
  const candidates = [
    path.join(__dirname, "document_profile.py"),
    path.join(process.cwd(), "dist", "services", "extractor", "document_profile.py"),
    path.join(process.cwd(), "apps", "api", "dist", "services", "extractor", "document_profile.py"),
    path.join(process.cwd(), "src", "services", "extractor", "document_profile.py"),
  ];
  const script = candidates.find((c) => fs.existsSync(c));
  if (!script) throw new Error("document_profile.py is missing from the API runtime bundle");
  return script;
}

function profilePDF(pdfPath: string): Promise<DocumentProfile> {
  return new Promise((resolve, reject) => {
    let script: string;
    try {
      script = profilerScriptPath();
    } catch (error) {
      reject(error);
      return;
    }
    const child = spawn("python", [script, pdfPath], {
      env: process.env,
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    const timeout = setTimeout(() => {
      child.kill("SIGTERM");
      reject(new Error("PDF document profiling timed out"));
    }, 90_000);

    child.stdout.on("data", (chunk) => { stdout += chunk.toString(); });
    child.stderr.on("data", (chunk) => { stderr += chunk.toString(); });
    child.on("error", (error) => { clearTimeout(timeout); reject(error); });
    child.on("close", (code) => {
      clearTimeout(timeout);
      if (code !== 0) {
        reject(new Error(stderr.trim() || `PDF document profiler exited ${code}`));
        return;
      }
      try {
        resolve(JSON.parse(stdout) as DocumentProfile);
      } catch {
        reject(new Error("PDF document profiler returned invalid JSON"));
      }
    });
  });
}

function compactPageRange(pages: number[]): string | undefined {
  const sorted = [...new Set(pages.filter((p) => Number.isInteger(p) && p > 0))].sort((a, b) => a - b);
  if (!sorted.length) return undefined;
  const ranges: string[] = [];
  let start = sorted[0];
  let prev = sorted[0];
  for (const page of sorted.slice(1)) {
    if (page === prev + 1) { prev = page; continue; }
    ranges.push(start === prev ? String(start) : `${start}-${prev}`);
    start = prev = page;
  }
  ranges.push(start === prev ? String(start) : `${start}-${prev}`);
  return ranges.join(",");
}

function questionPageRange(profile?: DocumentProfile | null): string | undefined {
  if (!profile?.pages?.length) return undefined;
  const excluded = new Set([...profile.answer_key_pages, ...profile.solution_pages]);
  if (!excluded.size) return undefined;
  const pages = profile.pages
    .map((p) => Number(p.page))
    .filter((p) => Number.isInteger(p) && !excluded.has(p));
  return compactPageRange(pages);
}

function enrichResult(result: ExtractionResult, profile?: DocumentProfile | null): ExtractionResult {
  if (!result.success || !Array.isArray(result.questions)) return result;
  return {
    ...result,
    message: `${result.message.replace(/\s+$/, "")} [extractor v4]`,
    questions: result.questions.map((q) =>
      enrichQuestionContentV4(
        q && typeof q === "object" ? q as Record<string, unknown> : {},
        profile as unknown as Record<string, unknown> | null,
      )
    ),
  };
}

export interface ExtractionResultV4 extends ExtractionResult {
  profile?: DocumentProfile | null;
  effectivePages?: string;
}

/**
 * V4 entry point used by the BullMQ worker.
 *
 * Adds document profiling (auto page-range exclusion of answer keys / solutions)
 * and enriches the question content envelope. With PDF_EXTRACTOR_V4 unset this
 * is a strict pass-through to the core extractPDF pipeline.
 */
export async function extractPDFV4(
  pdfPath: string,
  pagesRange?: string,
  options: ExtractionOptions = {},
): Promise<ExtractionResultV4> {
  if (!v4Enabled()) {
    const result = await extractPDF(pdfPath, pagesRange, options);
    return result;
  }

  let profile: DocumentProfile | null = null;
  try {
    profile = await profilePDF(pdfPath);
  } catch (error: any) {
    console.warn(`[pdfExtractorV4] Profiling failed; falling back to no-profile path: ${error?.message || error}`);
  }

  const effectivePages = pagesRange || questionPageRange(profile);
  const result = await extractPDF(pdfPath, effectivePages, options);

  // A paper that carries its own answer key after the questions needs no
  // separate key file. The question pages were excluded from those back pages
  // above, so the key is still there to read.
  if (result.success && Array.isArray(result.questions) && shouldParseAnswerKey(result.questions, profile)) {
    const key = await parseAnswerKeyFromPdf(pdfPath, result.questions.length);
    const applied = applyAnswerKey(result.questions, key, String(options.examCategory ?? ""));
    if (applied.answersFilled || applied.solutionsFilled) {
      console.log(
        `[pdfExtractorV4] Read from the paper's own key: ${applied.answersFilled} answers, ` +
        `${applied.solutionsFilled} solutions.`,
      );
    }
  }

  return { ...enrichResult(result, profile), profile, effectivePages };
}
