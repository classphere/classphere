export type ExtractionConfidence = "high" | "medium" | "low" | number;

export interface ContentReviewMetadata {
  confidence?: ExtractionConfidence | null;
  needs_review?: boolean;
  review_reasons?: string[] | null;
}

export interface SourceCrop extends ContentReviewMetadata {
  url: string;
  alt?: string | null;
  caption?: string | null;
  page?: number | null;
  bbox?: [number, number, number, number] | null;
}

export interface QuestionTableCell {
  content: string;
  markdown?: boolean;
  header?: boolean;
  scope?: "row" | "col";
  align?: "left" | "center" | "right";
}

export type QuestionTableCellValue = string | number | QuestionTableCell;

interface QuestionContentBlockBase extends ContentReviewMetadata {
  id?: string;
  order?: number;
}

export interface MarkdownContentBlock extends QuestionContentBlockBase {
  type: "markdown";
  content: string;
}

export interface TextContentBlock extends QuestionContentBlockBase {
  type: "text";
  content: string;
}

export interface MathContentBlock extends QuestionContentBlockBase {
  type: "math";
  latex: string;
  display?: boolean;
}

export interface ImageContentBlock extends QuestionContentBlockBase {
  type: "image" | "diagram";
  url: string;
  alt?: string | null;
  caption?: string | null;
  source_crop?: SourceCrop | null;
}

export interface TableContentBlock extends QuestionContentBlockBase {
  type: "table";
  caption?: string | null;
  headers?: QuestionTableCellValue[] | null;
  rows: QuestionTableCellValue[][];
  source_crop?: SourceCrop | null;
}

export interface SourceCropContentBlock extends QuestionContentBlockBase, SourceCrop {
  type: "source_crop";
}

/** Ordered, additive v4 content. Legacy text/image fields remain authoritative when absent. */
export type QuestionContentBlock =
  | MarkdownContentBlock
  | TextContentBlock
  | MathContentBlock
  | ImageContentBlock
  | TableContentBlock
  | SourceCropContentBlock;

export interface Option {
  id: string;
  text: string;
  image_url?: string | null;
  content_blocks?: QuestionContentBlock[] | null;
  source_crop?: SourceCrop | null;
  extraction_confidence?: ExtractionConfidence | null;
  needs_review?: boolean;
  review_reasons?: string[] | null;
}

export interface Question {
  id: string;
  question_number: number;
  question_text: string;
  image_url?: string | null;
  options: Option[] | null;
  correct_answer: string[];
  explanation?: string;
  question_type: string;
  subject: string;
  chapter: string;
  topic: string;
  difficulty: "easy" | "medium" | "hard";
  content_blocks?: QuestionContentBlock[] | null;
  source_crop?: SourceCrop | null;
  extraction_version?: number | string | null;
  extractor_version?: string | null;
  extraction_metadata?: {
    confidence?: ExtractionConfidence | null;
    needs_review?: boolean;
    review_reasons?: string[] | null;
    source_pages?: number[] | null;
    profile?: Record<string, unknown> | null;
  } | null;
  source_crop_url?: string | null;
  extraction_confidence?: ExtractionConfidence | null;
  needs_review?: boolean;
  review_reasons?: string[] | null;
  _needs_review?: boolean;
  _defects?: string[] | null;
  _warnings?: string[] | null;
}

export interface TestMeta {
  id: string;
  exam?: string;
  year?: number;
  shift?: string;
  title?: string;
  test_type?: string;
  questions: number;
  duration: number;
}

export type AnswerMap = Record<string, string>;

export type QuestionStatus =
  | "not_visited"
  | "not_answered"
  | "answered"
  | "marked_for_review"
  | "answered_and_marked_for_review"
  | "unanswered"
  | "review";

export type StatusMap = Record<string, QuestionStatus>;
