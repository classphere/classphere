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
