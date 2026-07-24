import { spawn } from "child_process";
import * as fs from "fs";
import * as path from "path";
import {
  continuePDFExtraction,
  extractPDF,
  preparePDFExtraction,
} from "./pdfExtractor.service";
import type { CompleteState, ExtractionResult, MarkerWaitState } from "./pdfExtractor.service";
import { enrichQuestionContentV4 } from "../../lib/question-content";

export interface DocumentProfile {
  profile_version: number;
  document_kind: "digital" | "scanned" | "hybrid";
  page_count: number;
  page_kind_counts: Record<string, number>;
  two_column_pages: number[];
  answer_key_pages: number[];
  solution_pages: number[];
  ocr_pages: number[];
  escalation_reasons: string[];
  pages: Array<Record<string, unknown>>;
}

export type PreparedExtractionV4 =
  | (MarkerWaitState & { profile?: DocumentProfile | null; effectivePages?: string })
  | (CompleteState & { profile?: DocumentProfile | null; effectivePages?: string });

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
  const script = candidates.find((candidate) => fs.existsSync(candidate));
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

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
      if (stdout.length > 5_000_000) {
        child.kill("SIGTERM");
        reject(new Error("PDF document profile exceeded the safe output limit"));
      }
    });
    child.stderr.on("data", (chunk) => { stderr += chunk.toString(); });
    child.on("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
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
  const sorted = [...new Set(pages.filter((page) => Number.isInteger(page) && page > 0))].sort((a, b) => a - b);
  if (!sorted.length) return undefined;
  const ranges: string[] = [];
  let start = sorted[0];
  let previous = sorted[0];
  for (const page of sorted.slice(1)) {
    if (page === previous + 1) {
      previous = page;
      continue;
    }
    ranges.push(start === previous ? String(start) : `${start}-${previous}`);
    start = previous = page;
  }
  ranges.push(start === previous ? String(start) : `${start}-${previous}`);
  return ranges.join(",");
}

function questionPageRange(profile?: DocumentProfile | null): string | undefined {
  if (!profile?.pages?.length) return undefined;
  const excluded = new Set([...profile.answer_key_pages, ...profile.solution_pages]);
  if (!excluded.size) return undefined;
  const pages = profile.pages
    .map((page) => Number(page.page))
    .filter((page) => Number.isInteger(page) && !excluded.has(page));
  return compactPageRange(pages);
}

function enrichResult(result: ExtractionResult, profile?: DocumentProfile | null): ExtractionResult {
  if (!result.success || !Array.isArray(result.questions)) return result;
  return {
    ...result,
    message: `${result.message.replace(/\s+$/, "")} [extractor v4]`,
    questions: result.questions.map((question) => enrichQuestionContentV4(
      question && typeof question === "object" ? question as Record<string, unknown> : {},
      profile as unknown as Record<string, unknown> | null,
    )),
  };
}

/**
 * Version-gated adapter around the proven v3 extractor.
 *
 * V4 adds document/page routing metadata and a lossless ordered-content envelope;
 * the legacy fields are never rewritten. With PDF_EXTRACTOR_V4 unset, this is a
 * strict pass-through to the existing production path.
 */
export async function preparePDFExtractionV4(
  pdfPath: string,
  pagesRange: string | undefined,
  webhookUrl: string | undefined,
): Promise<PreparedExtractionV4> {
  if (!v4Enabled()) return preparePDFExtraction(pdfPath, pagesRange, webhookUrl);

  let profile: DocumentProfile | null = null;
  try {
    profile = await profilePDF(pdfPath);
  } catch (error: any) {
    console.warn(`[pdfExtractorV4] Document profiling failed; preserving legacy extraction: ${error?.message || error}`);
  }

  // Respect an explicit user range. Otherwise exclude confidently classified
  // answer-key and worked-solution pages before question segmentation.
  const effectivePages = pagesRange || questionPageRange(profile);
  const prepared = await preparePDFExtraction(pdfPath, effectivePages, webhookUrl);
  if (prepared.state === "complete") {
    return { ...prepared, profile, effectivePages, result: enrichResult(prepared.result, profile) };
  }
  return { ...prepared, profile, effectivePages };
}

export async function continuePDFExtractionV4(
  workingDir: string,
  requestCheckUrl: string,
  source: "pymupdf" | "marker",
  pagesRange?: string,
  profile?: DocumentProfile | null,
): Promise<ExtractionResult> {
  const result = await continuePDFExtraction(workingDir, requestCheckUrl, source, pagesRange);
  return v4Enabled() ? enrichResult(result, profile) : result;
}

export async function extractPDFV4(pdfPath: string, pagesRange?: string): Promise<ExtractionResult> {
  if (!v4Enabled()) return extractPDF(pdfPath, pagesRange);
  let profile: DocumentProfile | null = null;
  try {
    profile = await profilePDF(pdfPath);
  } catch (error: any) {
    console.warn(`[pdfExtractorV4] Document profiling failed; preserving legacy extraction: ${error?.message || error}`);
  }
  return enrichResult(await extractPDF(pdfPath, pagesRange || questionPageRange(profile)), profile);
}
