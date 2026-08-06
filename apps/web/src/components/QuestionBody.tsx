"use client";

import React, { useEffect, useMemo, useState } from "react";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import type {
  ContentReviewMetadata,
  ExtractionConfidence,
  QuestionContentBlock,
  QuestionTableCell,
  QuestionTableCellValue,
  SourceCrop,
} from "@/components/test/TestTypes";

const DATA_IMAGE_PATTERN = /^data:image\/(?:png|jpe?g|gif|webp);base64,[a-z0-9+/=\s]+$/i;
const SCHEME_PATTERN = /^[a-z][a-z\d+.-]*:/i;

export interface QuestionBodyProps extends ContentReviewMetadata {
  blocks?: QuestionContentBlock[] | null;
  legacyText?: string | null;
  /**
   * Every figure belonging to this question, in reading order.
   *
   * The extractor now moves figures out of the text into an array rather than
   * leaving them inline as markdown, so this is what renders them. legacyImageUrl
   * remains for rows uploaded before that change, which still carry one figure
   * inline or in image_url.
   */
  images?: string[] | null;
  legacyImageUrl?: string | null;
  legacyImageAlt?: string;
  reviewerMode?: boolean;
  compact?: boolean;
  className?: string;
}

/**
 * Returns a browser-safe media URL without rewriting it. Executable schemes,
 * protocol-relative URLs and non-image data URLs are deliberately rejected.
 */
export function getSafeQuestionMediaUrl(value?: string | null): string | null {
  if (typeof value !== "string") return null;
  const candidate = value.trim();
  if (!candidate || /[\u0000-\u001f\u007f]/.test(candidate) || candidate.startsWith("//")) return null;
  if (DATA_IMAGE_PATTERN.test(candidate)) return candidate;
  if (SCHEME_PATTERN.test(candidate)) {
    try {
      const parsed = new URL(candidate);
      return parsed.protocol === "https:" || parsed.protocol === "http:" ? candidate : null;
    } catch {
      return null;
    }
  }
  return candidate;
}

/** Stable ordering: explicit v4 order wins; array position is the fallback. */
export function orderQuestionContentBlocks(
  blocks?: QuestionContentBlock[] | null,
): QuestionContentBlock[] {
  if (!Array.isArray(blocks)) return [];
  return blocks
    .map((block, index) => ({ block, index }))
    .sort((left, right) => {
      const leftOrder = Number.isFinite(left.block.order) ? left.block.order! : left.index;
      const rightOrder = Number.isFinite(right.block.order) ? right.block.order! : right.index;
      return leftOrder - rightOrder || left.index - right.index;
    })
    .map(({ block }) => block);
}

function hasCellContent(value: QuestionTableCellValue): boolean {
  if (typeof value === "number") return true;
  if (typeof value === "string") return value.trim().length > 0;
  return Boolean(value && typeof value.content === "string" && value.content.trim());
}

/** Used by option buttons so content-rich v4 options remain selectable. */
export function hasRenderableQuestionContent(
  blocks?: QuestionContentBlock[] | null,
  legacyText?: string | null,
  legacyImageUrl?: string | null,
): boolean {
  if (Array.isArray(blocks) && blocks.some((block) => {
    switch (block.type) {
      case "markdown":
      case "text":
        return typeof block.content === "string" && block.content.trim().length > 0;
      case "math":
        return typeof block.latex === "string" && block.latex.trim().length > 0;
      case "image":
      case "diagram":
      case "source_crop":
        return typeof block.url === "string" && block.url.trim().length > 0;
      case "table":
        return Boolean(block.caption?.trim()) || Boolean(block.headers?.some(hasCellContent)) ||
          block.rows.some((row) => row.some(hasCellContent));
      default:
        return false;
    }
  })) return true;

  return Boolean(legacyText?.trim() || legacyImageUrl?.trim());
}

function confidenceLabel(confidence?: ExtractionConfidence | null): string | null {
  if (typeof confidence === "number" && Number.isFinite(confidence)) {
    const percentage = confidence <= 1 ? confidence * 100 : confidence;
    return `${Math.round(Math.max(0, Math.min(100, percentage)))}% confidence`;
  }
  if (typeof confidence === "string" && confidence.trim()) {
    return `${confidence.charAt(0).toUpperCase()}${confidence.slice(1)} confidence`;
  }
  return null;
}

function ReviewIndicators({
  confidence,
  needs_review: needsReview,
  review_reasons: reviewReasons,
}: ContentReviewMetadata) {
  const label = confidenceLabel(confidence);
  if (!label && !needsReview && !reviewReasons?.length) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-semibold" aria-label="Extraction review status">
      {label && (
        <span className="rounded-full border border-s-stroke2 bg-b-surface2 px-2 py-0.5 text-t-secondary">
          {label}
        </span>
      )}
      {needsReview && (
        <span
          className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-amber-700"
          title={reviewReasons?.join("; ") || undefined}
        >
          Needs review
        </span>
      )}
      {!needsReview && reviewReasons?.length ? (
        <span className="text-t-tertiary" title={reviewReasons.join("; ")}>
          {reviewReasons.length} review note{reviewReasons.length === 1 ? "" : "s"}
        </span>
      ) : null}
    </div>
  );
}

interface QuestionImageProps extends ContentReviewMetadata {
  src?: string | null;
  fallback?: SourceCrop | null;
  alt: string;
  caption?: string | null;
  compact: boolean;
  reviewerMode: boolean;
  sourceCrop?: boolean;
}

function QuestionImage({
  src,
  fallback,
  alt,
  caption,
  compact,
  reviewerMode,
  sourceCrop = false,
  confidence,
  needs_review: needsReview,
  review_reasons: reviewReasons,
}: QuestionImageProps) {
  const primaryUrl = getSafeQuestionMediaUrl(src);
  const fallbackUrl = getSafeQuestionMediaUrl(fallback?.url);
  const [failedPrimary, setFailedPrimary] = useState(false);
  const [failedFallback, setFailedFallback] = useState(false);

  useEffect(() => {
    setFailedPrimary(false);
    setFailedFallback(false);
  }, [primaryUrl, fallbackUrl]);

  const useFallback = (!primaryUrl || failedPrimary) && Boolean(fallbackUrl) && !failedFallback;
  const activeUrl = useFallback ? fallbackUrl : failedPrimary ? null : primaryUrl;
  const activeAlt = useFallback ? fallback?.alt?.trim() || `${alt} source crop` : alt;
  const activeCaption = useFallback ? fallback?.caption || caption : caption;
  const activeMetadata: ContentReviewMetadata = useFallback
    ? {
        confidence: fallback?.confidence ?? confidence,
        needs_review: fallback?.needs_review ?? needsReview,
        review_reasons: fallback?.review_reasons ?? reviewReasons,
      }
    : { confidence, needs_review: needsReview, review_reasons: reviewReasons };

  if (!activeUrl) {
    return (
      <div
        role="img"
        aria-label={`${alt} unavailable`}
        className="rounded-[10px] border border-dashed border-s-stroke2 bg-b-surface2/50 px-4 py-3 text-caption italic text-t-tertiary"
      >
        Image unavailable
      </div>
    );
  }

  return (
    <figure className="min-w-0 space-y-2">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={activeUrl}
        alt={activeAlt}
        className={`${compact ? "max-h-36" : "max-h-[420px]"} max-w-full rounded-[10px] border ${sourceCrop || useFallback ? "border-dashed" : "border-solid"} border-s-stroke2 bg-white object-contain ${compact ? "p-2" : ""}`}
        referrerPolicy="no-referrer"
        loading="lazy"
        decoding="async"
        onError={() => {
          if (useFallback) setFailedFallback(true);
          else setFailedPrimary(true);
        }}
      />
      {activeCaption && <figcaption className="text-caption text-t-secondary">{activeCaption}</figcaption>}
      {reviewerMode && <ReviewIndicators {...activeMetadata} />}
    </figure>
  );
}

function normalizeMath(latex: string, display: boolean): string {
  const value = latex.trim();
  if (/^(?:\$\$[\s\S]*\$\$|\\\[[\s\S]*\\\]|\$[^$]*\$|\\\([\s\S]*\\\))$/.test(value)) return value;
  return display ? `$$${value}$$` : `$${value}$`;
}

function tableCell(value: QuestionTableCellValue): QuestionTableCell {
  if (typeof value === "number") return { content: String(value), markdown: false };
  if (typeof value === "string") return { content: value };
  return value;
}

function TableCellContent({ cell }: { cell: QuestionTableCell }) {
  if (cell.markdown === false) return <span className="whitespace-pre-wrap">{cell.content}</span>;
  return <MarkdownRenderer>{cell.content}</MarkdownRenderer>;
}

function QuestionTable({
  block,
  reviewerMode,
}: {
  block: Extract<QuestionContentBlock, { type: "table" }>;
  reviewerMode: boolean;
}) {
  const tableLabel = block.caption?.trim() || "Question data table";
  return (
    <div className="space-y-2">
      <div
        className="max-w-full overflow-x-auto rounded-[10px] border border-s-stroke2"
        role="region"
        aria-label={tableLabel}
        tabIndex={0}
      >
        <table className="min-w-full border-collapse text-left text-sm text-t-primary">
          {block.caption && (
            <caption className="border-b border-s-stroke2 bg-b-surface2 px-3 py-2 text-left text-caption font-semibold text-t-secondary">
              {block.caption}
            </caption>
          )}
          {block.headers?.length ? (
            <thead className="bg-b-surface2">
              <tr>
                {block.headers.map((value, index) => {
                  const cell = tableCell(value);
                  return (
                    <th
                      key={`header-${index}`}
                      scope="col"
                      className={`border-b border-r border-s-stroke2 px-3 py-2 align-top font-semibold last:border-r-0 ${cell.align === "center" ? "text-center" : cell.align === "right" ? "text-right" : "text-left"}`}
                    >
                      <TableCellContent cell={cell} />
                    </th>
                  );
                })}
              </tr>
            </thead>
          ) : null}
          <tbody>
            {block.rows.map((row, rowIndex) => (
              <tr key={`row-${rowIndex}`} className="border-b border-s-stroke2 last:border-b-0">
                {row.map((value, cellIndex) => {
                  const cell = tableCell(value);
                  const CellTag = cell.header ? "th" : "td";
                  return (
                    <CellTag
                      key={`cell-${cellIndex}`}
                      scope={cell.header ? cell.scope || "row" : undefined}
                      className={`border-r border-s-stroke2 px-3 py-2 align-top last:border-r-0 ${cell.header ? "bg-b-surface2 font-semibold" : "bg-b-surface1"} ${cell.align === "center" ? "text-center" : cell.align === "right" ? "text-right" : "text-left"}`}
                    >
                      <TableCellContent cell={cell} />
                    </CellTag>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {block.source_crop && (block.needs_review || block.confidence === "low") && (
        <details className="rounded-[10px] border border-dashed border-s-stroke2 bg-b-surface2/40 p-3">
          <summary className="cursor-pointer text-caption font-semibold text-t-secondary">
            View original table crop
          </summary>
          <div className="mt-3">
            <QuestionImage
              src={block.source_crop.url}
              alt={block.source_crop.alt?.trim() || "Original table crop"}
              caption={block.source_crop.caption}
              compact={false}
              reviewerMode={reviewerMode}
              sourceCrop
              confidence={block.source_crop.confidence}
              needs_review={block.source_crop.needs_review}
              review_reasons={block.source_crop.review_reasons}
            />
          </div>
        </details>
      )}
      {reviewerMode && <ReviewIndicators {...block} />}
    </div>
  );
}

function ContentBlock({
  block,
  index,
  compact,
  reviewerMode,
}: {
  block: QuestionContentBlock;
  index: number;
  compact: boolean;
  reviewerMode: boolean;
}) {
  const metadata = reviewerMode ? <ReviewIndicators {...block} /> : null;

  switch (block.type) {
    case "markdown":
    case "text":
      return (
        <div className="space-y-2">
          <MarkdownRenderer>{block.content}</MarkdownRenderer>
          {metadata}
        </div>
      );
    case "math":
      return (
        <div className="space-y-2">
          <div className="max-w-full overflow-x-auto py-1" aria-label={`Mathematical expression ${index + 1}`}>
            <MarkdownRenderer>{normalizeMath(block.latex, block.display !== false)}</MarkdownRenderer>
          </div>
          {metadata}
        </div>
      );
    case "image":
    case "diagram":
      return (
        <QuestionImage
          src={block.url}
          fallback={block.source_crop}
          alt={block.alt?.trim() || (block.type === "diagram" ? "Question diagram" : "Question image")}
          caption={block.caption}
          compact={compact}
          reviewerMode={reviewerMode}
          confidence={block.confidence}
          needs_review={block.needs_review}
          review_reasons={block.review_reasons}
        />
      );
    case "table":
      return <QuestionTable block={block} reviewerMode={reviewerMode} />;
    case "source_crop":
      return (
        <QuestionImage
          src={block.url}
          alt={block.alt?.trim() || "Question source crop"}
          caption={block.caption}
          compact={compact}
          reviewerMode={reviewerMode}
          sourceCrop
          confidence={block.confidence}
          needs_review={block.needs_review}
          review_reasons={block.review_reasons}
        />
      );
    default:
      return null;
  }
}

/**
 * Shared renderer for CBT, review and future question surfaces.
 * If no usable v4 blocks exist, it intentionally follows the legacy behavior:
 * MarkdownRenderer(question_text), then a non-duplicated image_url.
 */
export function QuestionBody({
  blocks,
  legacyText,
  images,
  legacyImageUrl,
  legacyImageAlt = "Figure",
  reviewerMode = false,
  compact = false,
  className = "",
  confidence,
  needs_review: needsReview,
  review_reasons: reviewReasons,
}: QuestionBodyProps) {
  const orderedBlocks = useMemo(() => orderQuestionContentBlocks(blocks), [blocks]);
  const useBlocks = orderedBlocks.some((block) => hasRenderableQuestionContent([block]));

  if (!useBlocks) {
    // Figures come from the array when there is one. Anything still inline in
    // the text is skipped here — MarkdownRenderer draws it — so a row from
    // before the extractor change does not show the same picture twice.
    const figures = (images ?? []).filter(
      (src) => src && !legacyText?.includes(`](${src})`),
    );
    const legacyImageIsInline = Boolean(
      legacyImageUrl && legacyText?.includes(`](${legacyImageUrl})`),
    );
    const showLegacySingle =
      Boolean(legacyImageUrl) && !legacyImageIsInline && !figures.includes(legacyImageUrl as string);

    return (
      <div className={`${compact ? "space-y-2" : "space-y-4"} min-w-0 ${className}`.trim()}>
        {legacyText ? <MarkdownRenderer>{legacyText}</MarkdownRenderer> : null}
        {figures.map((src) => (
          <QuestionImage
            key={src}
            src={src}
            alt={legacyImageAlt}
            compact={compact}
            reviewerMode={reviewerMode}
            confidence={confidence}
            needs_review={needsReview}
            review_reasons={reviewReasons}
          />
        ))}
        {showLegacySingle ? (
          <QuestionImage
            src={legacyImageUrl}
            alt={legacyImageAlt}
            compact={compact}
            reviewerMode={reviewerMode}
            confidence={confidence}
            needs_review={needsReview}
            review_reasons={reviewReasons}
          />
        ) : null}
        {reviewerMode && !legacyImageUrl ? (
          <ReviewIndicators
            confidence={confidence}
            needs_review={needsReview}
            review_reasons={reviewReasons}
          />
        ) : null}
      </div>
    );
  }

  return (
    <div className={`${compact ? "space-y-2" : "space-y-4"} min-w-0 ${className}`.trim()}>
      {orderedBlocks.map((block, index) => (
        <ContentBlock
          key={block.id || `${block.type}-${index}`}
          block={block}
          index={index}
          compact={compact}
          reviewerMode={reviewerMode}
        />
      ))}
      {reviewerMode && (
        <ReviewIndicators
          confidence={confidence}
          needs_review={needsReview}
          review_reasons={reviewReasons}
        />
      )}
    </div>
  );
}
