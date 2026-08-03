import { uploadToR2 } from "./r2";

/**
 * Figures arriving as data URLs, moved to object storage.
 *
 * Two callers produce them. The extractor embeds base64 into question_images
 * while it works, because the file on disk is the only copy it has. A reviewer
 * replacing a wrong figure produces the same thing, because the browser reads
 * the chosen file as a data URL.
 *
 * Either way a data URL must not reach the database: a page of diagrams stored
 * inline bloats every row that carries it, is re-sent in full on every read,
 * and never touches the CDN.
 */

/** One image. A URL that is already stored is returned untouched. */
export async function uploadDataUrl(imageUrl: string | null): Promise<string | null> {
  if (!imageUrl || !imageUrl.startsWith("data:")) return imageUrl;
  const match = imageUrl.match(/^data:(image\/[a-zA-Z+.-]+);base64,(.+)$/);
  if (!match) return imageUrl;
  const [, mimeType, base64Data] = match;
  try {
    const buffer = Buffer.from(base64Data, "base64");
    const extension = mimeType.split("/")[1] || "png";
    const fileName = `question_image_${Date.now()}_${Math.random().toString(36).substring(7)}.${extension}`;
    return await uploadToR2(buffer, fileName, mimeType);
  } catch (err) {
    // Returning the data URL keeps the figure rather than losing it. It is the
    // wrong place for it, but a visible figure in the wrong storage is easier
    // to notice and repair than a question that quietly lost its diagram.
    console.error("[question-figures] Failed to upload base64 image:", err);
    return imageUrl;
  }
}

/** A whole figure list. Entries already stored pass through. */
export async function uploadDataUrlList(images: unknown): Promise<string[]> {
  if (!Array.isArray(images)) return [];
  const uploaded = await Promise.all(
    images.map((entry) => uploadDataUrl(String(entry ?? "").trim() || null)),
  );
  return uploaded.filter((url): url is string => Boolean(url));
}
