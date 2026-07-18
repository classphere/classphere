import dotenv from "dotenv";

// This module must be imported by every process before clients are constructed.
// `override: false` intentionally preserves platform-provided production values.
dotenv.config({ override: false });

export function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`[config] Missing required environment variable: ${name}`);
  return value;
}
