import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { Readable } from "stream";

const R2_ACCESS_KEY_ID = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || process.env.R2_SECRET_ACCESS_KEY;
const R2_ENDPOINT = process.env.CLOUDFLARE_R2_ENDPOINT || process.env.R2_ENDPOINT;
const R2_BUCKET_NAME = process.env.CLOUDFLARE_R2_BUCKET_NAME || process.env.R2_BUCKET_NAME;
const R2_PUBLIC_URL = process.env.CLOUDFLARE_R2_PUBLIC_URL || process.env.R2_PUBLIC_URL;

// Since Cloudflare R2 is compatible with S3, we construct an S3Client
let r2Client: S3Client | null = null;

if (R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY && R2_ENDPOINT) {
  r2Client = new S3Client({
    region: "auto",
    endpoint: R2_ENDPOINT,
    forcePathStyle: true, // Required for Cloudflare R2 — avoids virtual-hosted subdomain style URLs
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
  });
}

/**
 * Uploads a file buffer to Cloudflare R2.
 * Falls back to base64 Data URL in development if R2 variables are not set.
 */
export async function uploadToR2(
  fileBuffer: Buffer,
  fileName: string,
  contentType: string
): Promise<string> {
  const cleanFileName = `${Date.now()}-${fileName.replace(/[^a-zA-Z0-9.-]/g, "_")}`;

  if (!r2Client || !R2_BUCKET_NAME) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Object storage is not configured. Configure Cloudflare R2 before uploading files.");
    }
    if (fileBuffer.byteLength > 2 * 1024 * 1024) {
      throw new Error("Object storage is not configured and this development upload exceeds 2 MB.");
    }
    console.warn("[Cloudflare R2] Using bounded development data URL fallback.");
    return `data:${contentType};base64,${fileBuffer.toString("base64")}`;
  }

  const command = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: cleanFileName,
    Body: fileBuffer,
    ContentType: contentType,
  });

  await r2Client.send(command);

  // Return the public URL for accessing the uploaded asset
  const baseUrl = R2_PUBLIC_URL || R2_ENDPOINT || "";
  const formattedBaseUrl = baseUrl ? (baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`) : "";
  
  // If using public URL custom domain, use that; else fallback to endpoint path style
  if (R2_PUBLIC_URL) {
    return `${formattedBaseUrl}${cleanFileName}`;
  } else {
    return `${formattedBaseUrl}${R2_BUCKET_NAME}/${cleanFileName}`;
  }
}

/**
 * Uploads a raw buffer to R2 at a specific key (no timestamp prefix).
 * Returns the key for later retrieval/deletion.
 */
export async function uploadToR2Raw(
  fileBuffer: Buffer,
  key: string,
  contentType: string
): Promise<string> {
  if (!r2Client || !R2_BUCKET_NAME) {
    throw new Error("R2 is not configured — cannot store temp PDF for async extraction.");
  }
  await r2Client.send(new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
    Body: fileBuffer,
    ContentType: contentType,
  }));
  return key;
}

/**
 * Downloads an object from R2 by key and returns it as a Buffer.
 */
export async function getR2Object(key: string): Promise<Buffer> {
  if (!r2Client || !R2_BUCKET_NAME) {
    throw new Error("R2 is not configured — cannot retrieve temp PDF.");
  }
  const response = await r2Client.send(new GetObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
  }));
  if (!response.Body) throw new Error(`R2 object ${key} has no body`);
  const chunks: Uint8Array[] = [];
  for await (const chunk of response.Body as Readable) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

/**
 * Deletes an object from R2 by key. Silent if the object doesn't exist.
 */
export async function deleteR2Object(key: string): Promise<void> {
  if (!r2Client || !R2_BUCKET_NAME) return;
  await r2Client.send(new DeleteObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
  })).catch(() => { /* silent */ });
}
