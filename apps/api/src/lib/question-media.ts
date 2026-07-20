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
