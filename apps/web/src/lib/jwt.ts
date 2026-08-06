export interface JwtClaims {
  app_metadata?: { role?: string; institute_id?: string | null; [key: string]: unknown };
  user_metadata?: { role?: string; [key: string]: unknown };
  [key: string]: unknown;
}

/**
 * Decodes a JWT's payload without verifying its signature. Verification is the
 * server's job (see apps/api/src/middleware/auth.middleware.ts) — this is only
 * used client-side to read non-sensitive routing hints (role, institute_id)
 * out of a token we already trust because Supabase just handed it to us.
 */
export function decodeJwtClaims(token: string): JwtClaims | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0"))
        .join("")
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}
