export type ExtractionConfidence = "high" | "medium" | "low";

export interface SourceRegion {
  page: number;
  bbox?: [number, number, number, number] | null;
  role?: "stem" | "option" | "table" | "diagram" | "solution" | "answer_key" | "source_crop";
}

export interface ContentReviewMetadata {
  confidence?: ExtractionConfidence;
  needs_review?: boolean;
  review_reasons?: string[];
  source?: SourceRegion | null;
}

export type TableCellValue = string | number | {
  content: string;
  markdown?: boolean;
  header?: boolean;
  scope?: "row" | "col";
  align?: "left" | "center" | "right";
};

interface ContentBlockBase extends ContentReviewMetadata {
  id?: string;
  order: number;
}

export type QuestionContentBlock =
  | (ContentBlockBase & { type: "markdown" | "text"; content: string })
  | (ContentBlockBase & { type: "math"; latex: string; display?: boolean })
  | (ContentBlockBase & {
      type: "image" | "diagram";
      url: string;
      alt?: string | null;
      caption?: string | null;
      source_crop?: SourceCrop | null;
    })
  | (ContentBlockBase & {
      type: "table";
      caption?: string | null;
      headers?: TableCellValue[] | null;
      rows: TableCellValue[][];
      source_crop?: SourceCrop | null;
    })
  | (ContentBlockBase & SourceCrop & { type: "source_crop" });

export interface SourceCrop extends ContentReviewMetadata {
  url: string;
  alt?: string | null;
  caption?: string | null;
  page?: number | null;
  bbox?: [number, number, number, number] | null;
}

export interface ExtractionMetadata {
  version: "v4";
  profile?: Record<string, unknown> | null;
  confidence: ExtractionConfidence;
  needs_review: boolean;
  review_reasons: string[];
  source_pages: number[];
  generated_at: string;
}

const ALLOWED_BLOCK_TYPES = new Set(["markdown", "text", "math", "image", "diagram", "table", "source_crop"]);
const IMAGE_MARKDOWN = /!\[[^\]]*\]\(([^)\s]+)(?:\s+[^)]*)?\)/g;

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((item) => text(item)).filter(Boolean))];
}

function confidence(value: unknown, fallback: ExtractionConfidence = "medium"): ExtractionConfidence {
  if (value === "high" || value === "medium" || value === "low") return value;
  if (typeof value === "number" && Number.isFinite(value)) {
    const score = value > 1 ? value / 100 : value;
    if (score >= 0.9) return "high";
    if (score >= 0.7) return "medium";
    return "low";
  }
  return fallback;
}

function bbox(value: unknown): [number, number, number, number] | null {
  if (!Array.isArray(value) || value.length !== 4 || value.some((item) => !Number.isFinite(Number(item)))) return null;
  return value.map(Number) as [number, number, number, number];
}

function sourceRegion(value: unknown): SourceRegion | null {
  if (!value || typeof value !== "object") return null;
  const source = value as Record<string, unknown>;
  const page = Number(source.page);
  if (!Number.isInteger(page) || page < 1) return null;
  return {
    page,
    bbox: bbox(source.bbox),
    role: typeof source.role === "string" ? source.role as SourceRegion["role"] : undefined,
  };
}

function reviewMetadata(value: Record<string, unknown>): ContentReviewMetadata {
  const reasons = stringList(value.review_reasons ?? value._defects ?? value._warnings);
  const needsReview = Boolean(value.needs_review ?? value._needs_review ?? reasons.length > 0);
  return {
    confidence: confidence(value.confidence ?? value.extraction_confidence, needsReview ? "low" : "medium"),
    needs_review: needsReview,
    review_reasons: reasons,
    source: sourceRegion(value.source),
  };
}

function sourceCrop(value: unknown): SourceCrop | null {
  if (!value || typeof value !== "object") return null;
  const crop = value as Record<string, unknown>;
  const url = text(crop.url);
  if (!url) return null;
  return {
    url,
    alt: text(crop.alt) || null,
    caption: text(crop.caption) || null,
    page: Number.isInteger(Number(crop.page)) && Number(crop.page) > 0 ? Number(crop.page) : null,
    bbox: bbox(crop.bbox),
    ...reviewMetadata(crop),
  };
}

function tableCell(value: unknown): TableCellValue | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") return value;
  if (!value || typeof value !== "object") return null;
  const cell = value as Record<string, unknown>;
  const content = typeof cell.content === "string" ? cell.content : "";
  return {
    content,
    markdown: cell.markdown !== false,
    header: Boolean(cell.header),
    scope: cell.scope === "row" || cell.scope === "col" ? cell.scope : undefined,
    align: cell.align === "center" || cell.align === "right" ? cell.align : "left",
  };
}

function tableRow(value: unknown): TableCellValue[] {
  if (!Array.isArray(value)) return [];
  return value.map(tableCell).filter((cell): cell is TableCellValue => cell !== null);
}

export function normalizeContentBlocks(value: unknown): QuestionContentBlock[] {
  if (!Array.isArray(value)) return [];
  const blocks: QuestionContentBlock[] = [];

  for (let index = 0; index < value.length; index += 1) {
    const raw = value[index];
    if (!raw || typeof raw !== "object") continue;
    const block = raw as Record<string, unknown>;
    const type = text(block.type);
    if (!ALLOWED_BLOCK_TYPES.has(type)) continue;
    const order = Number.isFinite(Number(block.order)) ? Number(block.order) : index;
    const common = { id: text(block.id) || undefined, order, ...reviewMetadata(block) };

    if (type === "markdown" || type === "text") {
      const content = typeof block.content === "string" ? block.content : "";
      if (content.trim()) blocks.push({ ...common, type, content });
      continue;
    }
    if (type === "math") {
      const latex = text(block.latex);
      if (latex) blocks.push({ ...common, type, latex, display: block.display !== false });
      continue;
    }
    if (type === "image" || type === "diagram") {
      const url = text(block.url);
      const fallback = sourceCrop(block.source_crop);
      if (url || fallback) {
        blocks.push({ ...common, type, url, alt: text(block.alt) || null, caption: text(block.caption) || null, source_crop: fallback });
      }
      continue;
    }
    if (type === "table") {
      const rows = Array.isArray(block.rows) ? block.rows.map(tableRow).filter((row) => row.length > 0) : [];
      const headers = Array.isArray(block.headers) ? tableRow(block.headers) : null;
      if (rows.length || headers?.length) {
        blocks.push({ ...common, type, caption: text(block.caption) || null, headers, rows, source_crop: sourceCrop(block.source_crop) });
      }
      continue;
    }
    const crop = sourceCrop(block);
    if (crop) blocks.push({ ...common, ...crop, type: "source_crop", order });
  }

  return blocks.sort((left, right) => left.order - right.order);
}

function containsInlineImage(markdown: string, url: string): boolean {
  if (!markdown || !url) return false;
  return [...markdown.matchAll(IMAGE_MARKDOWN)].some((match) => match[1]?.trim() === url.trim());
}

export function deriveLegacyContentBlocks(input: Record<string, unknown>): QuestionContentBlock[] {
  const blocks: QuestionContentBlock[] = [];
  const questionText = typeof input.question_text === "string" ? input.question_text : "";
  const imageUrl = text(input.image_url);
  const metadata = reviewMetadata(input);
  let order = 0;

  if (questionText.trim()) blocks.push({ type: "markdown", content: questionText, order: order++, ...metadata });
  if (imageUrl && !containsInlineImage(questionText, imageUrl)) {
    blocks.push({ type: "image", url: imageUrl, alt: "Question figure", order: order++, ...metadata });
  }

  const crop = sourceCrop(input.source_crop);
  if (crop && (metadata.needs_review || blocks.length === 0)) {
    blocks.push({ type: "source_crop", order: order++, ...crop });
  }
  return blocks;
}

function cellMarkdown(value: TableCellValue): string {
  const raw = typeof value === "object" ? value.content : String(value);
  return raw.replace(/\|/g, "\\|").replace(/\r?\n/g, "<br>");
}

function tableMarkdown(block: Extract<QuestionContentBlock, { type: "table" }>): string {
  const width = Math.max(block.headers?.length ?? 0, ...block.rows.map((row) => row.length), 1);
  const headers = (block.headers?.length ? block.headers : Array.from({ length: width }, () => ""))
    .concat(Array.from({ length: Math.max(0, width - (block.headers?.length ?? 0)) }, () => ""))
    .slice(0, width);
  const lines = [
    `| ${headers.map(cellMarkdown).join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...block.rows.map((row) => {
      const padded = row.concat(Array.from({ length: Math.max(0, width - row.length) }, () => "")).slice(0, width);
      return `| ${padded.map(cellMarkdown).join(" | ")} |`;
    }),
  ];
  return [block.caption ? `**${block.caption}**` : "", ...lines].filter(Boolean).join("\n");
}

export function projectBlocksToLegacyMarkdown(blocks: QuestionContentBlock[]): string {
  return normalizeContentBlocks(blocks).map((block) => {
    if (block.type === "markdown" || block.type === "text") return block.content;
    if (block.type === "math") return block.display === false ? `$${block.latex}$` : `$$${block.latex}$$`;
    if (block.type === "image" || block.type === "diagram" || block.type === "source_crop") {
      return block.url ? `![${block.alt || "image"}](${block.url})` : "";
    }
    return tableMarkdown(block);
  }).filter(Boolean).join("\n\n");
}

function compactProfileForQuestion(
  profile: Record<string, unknown> | null | undefined,
  sourcePages: number[],
): Record<string, unknown> | null {
  if (!profile) return null;
  const allowedPages = new Set(sourcePages);
  const pageProfiles = Array.isArray(profile.pages)
    ? profile.pages
        .filter((page) => page && typeof page === "object" && allowedPages.has(Number((page as Record<string, unknown>).page)))
        .map((page) => {
          const value = page as Record<string, unknown>;
          return {
            page: Number(value.page),
            content_kind: value.content_kind,
            likely_columns: value.likely_columns,
            role: value.role,
            requires_ocr: value.requires_ocr,
            escalation_reasons: stringList(value.escalation_reasons),
          };
        })
    : [];
  return {
    profile_version: profile.profile_version,
    document_kind: profile.document_kind,
    page_count: profile.page_count,
    page_kind_counts: profile.page_kind_counts,
    escalation_reasons: stringList(profile.escalation_reasons),
    source_page_profiles: pageProfiles,
  };
}

export function enrichQuestionContentV4(input: Record<string, unknown>, profile?: Record<string, unknown> | null): Record<string, unknown> {
  // Preserve genuine structured blocks emitted by a future layout extractor,
  // but do not duplicate legacy base64 markdown in the queued job payload.
  // Upload controllers create the lossless legacy projection after media has
  // been persisted to R2, so one image is never stored twice in job JSON.
  const contentBlocks = normalizeContentBlocks(input.content_blocks);
  const options = Array.isArray(input.options)
    ? input.options.map((option) => {
        if (!option || typeof option !== "object") return option;
        const raw = option as Record<string, unknown>;
        const optionBlocks = normalizeContentBlocks(raw.content_blocks);
        return optionBlocks.length ? { ...raw, content_blocks: optionBlocks } : raw;
      })
    : input.options;

  const reasons = stringList(input.review_reasons ?? input._defects ?? input._warnings);
  const needsReview = Boolean(input.needs_review ?? input._needs_review ?? reasons.length > 0);
  const blockPages = contentBlocks.map((block) => block.source?.page);
  const extractedPages = Array.isArray(input._pages) ? input._pages : [];
  const pages = [...new Set([...extractedPages, ...blockPages]
    .map(Number)
    .filter((page): page is number => Number.isInteger(page) && page > 0))];
  const extractionMetadata: ExtractionMetadata = {
    version: "v4",
    profile: compactProfileForQuestion(profile, pages),
    confidence: confidence(input.extraction_confidence, needsReview ? "low" : "medium"),
    needs_review: needsReview,
    review_reasons: reasons,
    source_pages: pages,
    generated_at: new Date().toISOString(),
  };

  return {
    ...input,
    options,
    ...(contentBlocks.length ? { content_blocks: contentBlocks } : {}),
    extractor_version: "v4",
    extraction_metadata: extractionMetadata,
    source_reference: {
      ...(input.source_reference && typeof input.source_reference === "object" ? input.source_reference as Record<string, unknown> : {}),
      extractor_version: "v4",
      extraction_flags: reasons,
      source_pages: pages,
    },
  };
}
