import * as fs from "fs";
import * as path from "path";
import { gzipSync, gunzipSync } from "zlib";
import { uploadToR2Raw, getR2Object, deleteR2Object } from "../r2";

interface BundleFile { path: string; data: string }
interface Bundle { version: 1; files: BundleFile[] }

function walk(dir: string, base = dir): BundleFile[] {
  const out: BundleFile[] = [];
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) out.push(...walk(full, base));
    else if (stat.isFile()) {
      out.push({
        path: path.relative(base, full).replace(/\\/g, "/"),
        data: fs.readFileSync(full).toString("base64"),
      });
    }
  }
  return out;
}

/** Persist a pipeline directory between the start and webhook-continuation
 * phases. JSON+gzip is portable on Windows/Linux and avoids an archive dep. */
export async function uploadPipelineBundle(dir: string, key: string): Promise<void> {
  const bundle: Bundle = { version: 1, files: walk(dir) };
  const compressed = gzipSync(Buffer.from(JSON.stringify(bundle)), { level: 6 });
  await uploadToR2Raw(compressed, key, "application/gzip");
}

export async function downloadPipelineBundle(key: string, destDir: string): Promise<void> {
  const compressed = await getR2Object(key);
  const bundle = JSON.parse(gunzipSync(compressed).toString("utf8")) as Bundle;
  if (bundle.version !== 1 || !Array.isArray(bundle.files)) {
    throw new Error("Unsupported PDF pipeline bundle format");
  }
  fs.mkdirSync(destDir, { recursive: true });
  for (const file of bundle.files) {
    // Prevent path traversal from corrupt bundles.
    const normalized = path.posix.normalize(file.path);
    if (normalized.startsWith("../") || path.isAbsolute(normalized)) {
      throw new Error(`Unsafe bundle path: ${file.path}`);
    }
    const out = path.join(destDir, ...normalized.split("/"));
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, Buffer.from(file.data, "base64"));
  }
}

export async function deletePipelineBundle(key: string): Promise<void> {
  await deleteR2Object(key);
}
