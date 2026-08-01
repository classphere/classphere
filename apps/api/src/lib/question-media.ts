/** Keep legacy inline markdown images and image_url from rendering one figure twice. */
const IMAGE_MARKDOWN = /!\[[^\]]*\]\(([^)\s]+)(?:\s+[^)]*)?\)/g;

function removeDuplicateInlineImage(text: string | null | undefined, imageUrl: string | null | undefined) {
  if (!text || !imageUrl) return text ?? "";
  return text
    .replace(IMAGE_MARKDOWN, (match, url: string) => url.trim() === imageUrl.trim() ? "" : match)
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function normalizeQuestionMedia<T extends { question_text?: string | null; image_url?: string | null; options?: any }>(question: T): T {
  return {
    ...question,
    question_text: removeDuplicateInlineImage(question.question_text, question.image_url),
    options: Array.isArray(question.options)
      ? question.options.map((option: any) => ({ ...option, text: removeDuplicateInlineImage(option?.text, option?.image_url) }))
      : question.options,
  };
}

/**
 * Reconcile the two ways a question's figures arrive.
 *
 * The extractor emits `question_images` as an array; the table has carried a
 * single `image_url` since the beginning and 37 API sites plus 7 renderers
 * read it. Rather than migrate them all at once, both are kept in step:
 * image_url is the first figure, question_images is all of them.
 *
 * Whichever the payload supplies, the other is derived — so an older upload
 * with only image_url still populates the array, and a new one with only the
 * array still satisfies every existing reader.
 */
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
 * The figure list for a stored question.
 *
 * The extractor's array holds bare filenames — "_page_2_Figure_1.jpeg" — because
 * finalizeQuestions embeds base64 into the text fields and never updates the
 * arrays alongside them. Those filenames resolve to nothing once stored, so
 * they are not what should be persisted.
 *
 * The processed text is authoritative instead: by the time it reaches here its
 * inline images have been uploaded to R2 and rewritten as real URLs. A payload
 * that supplies genuine URLs of its own is kept as-is, which is the hand-built
 * JSON case.
 */
export function figuresForStorage(processedText: string | null | undefined, supplied: unknown): string[] {
  const fromText = imageUrlsInText(processedText);
  const fromPayload = Array.isArray(supplied)
    ? supplied.map((value) => String(value ?? "").trim()).filter(Boolean)
    : [];
  // Only absolute URLs or data URIs are usable; anything else is a local
  // filename from the extractor and is superseded by the text.
  const usable = fromPayload.filter((value) => /^(https?:|data:)/i.test(value));
  const merged = [...fromText];
  for (const url of usable) if (!merged.includes(url)) merged.push(url);
  return merged;
}

export function reconcileQuestionImages(
  imageUrl: unknown,
  images: unknown,
): { image_url: string | null; question_images: string[] } {
  const fromArray = Array.isArray(images)
    ? images.map((value) => String(value ?? "").trim()).filter(Boolean)
    : [];
  const single = String(imageUrl ?? "").trim();

  // A single image_url not already in the array belongs at the front: it is
  // the figure every existing reader is currently showing.
  const ordered = single && !fromArray.includes(single) ? [single, ...fromArray] : fromArray;

  return { image_url: ordered[0] ?? null, question_images: ordered };
}
