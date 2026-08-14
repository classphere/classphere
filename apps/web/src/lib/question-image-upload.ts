/**
 * Converts every base64 diagram in an extracted question array to an R2 URL
 * before the array is sent to /superadmin/upload-questions.
 *
 * The extractor writes each diagram as a base64 data URL directly into the
 * question JSON, wherever it comes from — a PDF extraction job's result or a
 * pre-extracted chapter file dropped into bulk upload. Sending that straight
 * through meant the request body scaled with how image-heavy a chapter was,
 * not how many questions it had: a 969-question organic chemistry chapter,
 * one structural formula per question, blew past every body-size limit tried
 * (25mb, 60mb, 150mb) because there's no real ceiling to raise the number
 * against.
 *
 * Uploading each image here first and sending its URL instead keeps the body
 * text-only regardless of diagram density. This mirrors processBase64ImageUrl
 * / processBase64ImageList server-side (superadmin.controller.ts) exactly —
 * those already no-op on a value that isn't a data: URL, so a question that
 * arrives pre-converted is untouched there, and every caller of
 * /upload-questions (BulkUpload.tsx, AIExtractor.tsx) should run its
 * questions through this before submitting.
 */

import { API_V1_URL } from "@/lib/api.client";

const INLINE_IMAGE_REGEX = /!\[image\]\(data:(image\/[a-zA-Z+.-]+);base64,([^)]+)\)/g;
const IMAGE_UPLOAD_CONCURRENCY = 4;

/** Uploads one base64 data URL to R2, returning its public URL. Anything that
 *  isn't a data: URL (already converted, or simply absent) passes through
 *  unchanged. Retries once — a single flaky request shouldn't cost a whole
 *  large file's worth of otherwise-successful uploads. */
export async function uploadImageToR2(
  dataUrl: string | null | undefined,
  token: string,
  attempt = 1,
): Promise<string | null | undefined> {
  if (!dataUrl || !dataUrl.startsWith("data:")) return dataUrl;
  try {
    const blob = await (await fetch(dataUrl)).blob();
    const ext = (blob.type.split("/")[1] || "png").split("+")[0];
    const formData = new FormData();
    formData.append("image", blob, `image.${ext}`);
    const res = await fetch(`${API_V1_URL}/superadmin/upload`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    const data = await res.json();
    if (!res.ok || !data.success || !data.url) {
      throw new Error(data.message || `Image upload failed (${res.status})`);
    }
    return data.url as string;
  } catch (err) {
    if (attempt < 2) return uploadImageToR2(dataUrl, token, attempt + 1);
    throw err;
  }
}

/** Same conversion, for base64 embedded inline in a text field as markdown —
 *  the legacy path processBase64ImagesInText handles server-side. */
async function processInlineImages(text: string | undefined, token: string): Promise<string | undefined> {
  if (!text) return text;
  const matches = [...text.matchAll(INLINE_IMAGE_REGEX)];
  if (!matches.length) return text;
  let updated = text;
  for (const [full, mime, data] of matches) {
    const url = await uploadImageToR2(`data:${mime};base64,${data}`, token);
    if (url) updated = updated.replace(full, `![image](${url})`);
  }
  return updated;
}

async function convertQuestionImages(q: any, token: string): Promise<any> {
  const [question_text, explanation, image_url, question_images, explanation_images, options] = await Promise.all([
    processInlineImages(q.question_text, token),
    processInlineImages(q.explanation, token),
    uploadImageToR2(q.image_url, token),
    Promise.all((q.question_images ?? []).map((u: string) => uploadImageToR2(u, token)))
      .then((arr) => arr.filter(Boolean) as string[]),
    Promise.all((q.explanation_images ?? []).map((u: string) => uploadImageToR2(u, token)))
      .then((arr) => arr.filter(Boolean) as string[]),
    Promise.all((q.options ?? []).map(async (opt: any) => ({
      ...opt,
      text: await processInlineImages(opt.text, token),
      image_url: await uploadImageToR2(opt.image_url, token),
    }))),
  ]);
  return { ...q, question_text, explanation, image_url, question_images, explanation_images, options };
}

/** Bounded-concurrency map — thousands of images at once would hammer R2 and
 *  the browser's connection pool; one at a time would take forever. */
async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return results;
}

/** Converts every question's images to R2 URLs, reporting a live partial
 *  array so the caller can commit progress into its own state as it goes — a
 *  retry after a failure then only re-uploads whatever didn't finish, since
 *  an already-converted image is a plain URL and every conversion step above
 *  no-ops on those. `onProgress` is optional for callers that don't need a
 *  live counter (e.g. a single PDF's worth of questions, done in a blink). */
export async function convertQuestionsForUpload(
  questions: any[],
  token: string,
  onProgress?: (partial: any[], done: number, total: number) => void,
): Promise<any[]> {
  const working = questions.map((q) => ({ ...q }));
  const total = working.length;
  let done = 0;
  await mapWithConcurrency(working, IMAGE_UPLOAD_CONCURRENCY, async (q, i) => {
    working[i] = await convertQuestionImages(q, token);
    done++;
    if (onProgress && (done === total || done % 15 === 0)) onProgress(working, done, total);
  });
  return working;
}
