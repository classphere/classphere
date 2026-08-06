/** Matches ![alt](url) markdown, capturing the url. */
const IMAGE_MARKDOWN = /!\[[^\]]*\]\(([^)\s]+)(?:\s+[^)]*)?\)/g;

function removeDuplicateInlineImage(text: string | null | undefined, imageUrl: string | null | undefined) {
  if (!text || !imageUrl) return text ?? "";
  return text
    .replace(IMAGE_MARKDOWN, (match, url: string) => url.trim() === imageUrl.trim() ? "" : match)
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Options carry one figure each, in image_url, and may also repeat it inline in
 * their text. This drops the inline copy so it is not rendered twice.
 *
 * A question's figures live in question_images, so every entry in that array is
 * compared rather than one url. The parameter used to be image_url, and kept
 * that name after the column was replaced by the array — which quietly turned
 * the question half of this function into a no-op, since nothing passes an
 * image_url any more.
 */
export function normalizeQuestionMedia<
  T extends { question_text?: string | null; question_images?: unknown; image_url?: string | null; options?: any }
>(question: T): T {
  const figures = Array.isArray(question.question_images)
    ? question.question_images
    : (question.image_url ? [question.image_url] : []);

  const questionText = figures.reduce<string>(
    (text, figure) => removeDuplicateInlineImage(text, typeof figure === "string" ? figure : null),
    question.question_text ?? "",
  );

  return {
    ...question,
    question_text: questionText,
    options: Array.isArray(question.options)
      ? question.options.map((option: any) => ({ ...option, text: removeDuplicateInlineImage(option?.text, option?.image_url) }))
      : question.options,
  };
}

/** Image URLs referenced by markdown in a text field, in order. */
export function imageUrlsInText(text: string | null | undefined): string[] {
  if (!text) return [];
  const found: string[] = [];
  for (const match of text.matchAll(IMAGE_MARKDOWN)) {
    const url = String(match[1] ?? "").trim();
    if (url) found.push(url);
  }
  return found;
}

/**
 * Remove inline image markdown once the URLs are held in an array.
 *
 * Applied at ingest rather than in the extractor, because the images have to
 * survive as markdown long enough for pdfExtractor.service.ts to resolve them;
 * by the time a question reaches ingest they have been uploaded to R2 and the
 * markdown has served its purpose.
 *
 * This is what stops a figure rendering twice. A hand-built bank with images
 * inline in question_text and a PDF-extracted paper both end up the same way:
 * text without figures, figures in the array, each rendered once.
 */
export function stripInlineImages(text: string | null | undefined): string {
  if (!text) return text ?? "";
  return text.replace(IMAGE_MARKDOWN, "").replace(/\n{3,}/g, "\n\n").trim();
}

/**
 * The figure list to store for a question.
 *
 * The processed text is authoritative: by the time it reaches here its inline
 * images have been uploaded to R2 and rewritten as real URLs. A payload that
 * supplies genuine URLs of its own is kept as well — that is the hand-built
 * JSON case — while bare filenames are discarded, since they resolve to
 * nothing once stored and the text already holds the usable version.
 */
export function figuresForStorage(processedText: string | null | undefined, supplied: unknown): string[] {
  const fromText = imageUrlsInText(processedText);
  const fromPayload = Array.isArray(supplied)
    ? supplied.map((value) => String(value ?? "").trim()).filter(Boolean)
    : [];
  const usable = fromPayload.filter((value) => /^(https?:|data:)/i.test(value));
  const merged = [...fromText];
  for (const url of usable) if (!merged.includes(url)) merged.push(url);
  return merged;
}
