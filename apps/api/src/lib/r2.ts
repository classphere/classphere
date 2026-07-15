import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

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
    console.warn("[Cloudflare R2] Credentials not configured. Falling back to data URL for development.");
    const base64 = fileBuffer.toString("base64");
    return `data:${contentType};base64,${base64}`;
  }

  const command = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: cleanFileName,
    Body: fileBuffer,
    ContentType: contentType,
  });

  await r2Client.send(command);

  // Return the public URL for accessing the uploaded asset
  const baseUrl = R2_PUBLIC_URL || R2_ENDPOINT;
  const formattedBaseUrl = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  
  // If using public URL custom domain, use that; else fallback to endpoint path style
  if (R2_PUBLIC_URL) {
    return `${formattedBaseUrl}${cleanFileName}`;
  } else {
    return `${formattedBaseUrl}${R2_BUCKET_NAME}/${cleanFileName}`;
  }
}
