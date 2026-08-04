/**
 * api.client.ts
 * Single source of truth for all API communication.
 * Automatically attaches:
 *   - Authorization: Bearer <supabase_access_token>
 *   - x-session-token: <one-device session token from localStorage>
 *
 * Handles SESSION_CONFLICT globally — redirects to /login?reason=device_conflict
 * so the login page can show the user an appropriate message.
 */

const envUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
let resolvedApiUrl = envUrl && envUrl.length > 0 ? envUrl : "http://localhost:3001";
if (resolvedApiUrl.endsWith("/")) {
  resolvedApiUrl = resolvedApiUrl.slice(0, -1);
}
export const API_URL = resolvedApiUrl;

/** Versioned base — use this for all /api/v1/... calls */
export const API_V1_URL = `${API_URL}/api/v1`;

type FetchOptions = Omit<RequestInit, "body"> & { body?: unknown };

async function request<T = any>(
  path: string,
  options: FetchOptions & { token?: string } = {}
): Promise<T> {
  const { token, body, headers = {}, ...rest } = options;

  // Attach session token from localStorage for one-device enforcement
  const sessionToken =
    typeof window !== "undefined"
      ? localStorage.getItem("classphere_session_token") ?? ""
      : "";

  const res = await fetch(`${API_URL}${path}`, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(sessionToken ? { "x-session-token": sessionToken } : {}),
      ...(headers as Record<string, string>),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  // Handle one-device session conflict globally
  if (res.status === 401) {
    const errBody = await res.json().catch(() => ({}));
    if (typeof window !== "undefined") {
      if (errBody.code === "SESSION_CONFLICT") {
        // Another device took the session — warn the user
        localStorage.removeItem("classphere_session_token");
        window.location.href = "/login?reason=device_conflict";
        throw new Error("SESSION_CONFLICT");
      }
      if (errBody.code === "NO_SESSION_TOKEN") {
        // Session token missing — user needs to log in through our flow
        localStorage.removeItem("classphere_session_token");
        window.location.href = "/login";
        throw new Error("NO_SESSION_TOKEN");
      }
    }
    const text = JSON.stringify(errBody);
    throw new Error(`API 401: ${text}`);
  }

  // Platform maintenance. Sent to the maintenance screen rather than left to
  // render as a generic error on whatever page they happened to be on — a
  // signed-in user would otherwise see every widget fail one by one with no
  // explanation.
  //
  // In-flight test calls are exempt server-side, so a student mid-paper never
  // reaches this branch and is never pulled out of their paper. The maintenance
  // page itself makes no API calls, so there is nothing here to loop on, and
  // the path guard covers a stray call from a component still mounted during
  // the navigation.
  if (res.status === 503) {
    const body = await res.json().catch(() => ({} as any));
    if (body?.code === "MAINTENANCE_MODE") {
      if (typeof window !== "undefined" && !window.location.pathname.endsWith("/maintenance")) {
        window.location.href = "/maintenance";
      }
      throw new Error(body.message ?? "Classphere is under maintenance. Please try again shortly.");
    }
    throw new Error(`API 503: ${JSON.stringify(body)}`);
  }

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`API ${res.status}: ${text}`);
  }

  return res.json() as Promise<T>;
}

export const apiClient = {
  get: <T = any>(path: string, token?: string) =>
    request<T>(path, { method: "GET", token }),

  post: <T = any>(path: string, body: unknown, token?: string) =>
    request<T>(path, { method: "POST", body, token }),

  put: <T = any>(path: string, body: unknown, token?: string) =>
    request<T>(path, { method: "PUT", body, token }),

  patch: <T = any>(path: string, body: unknown, token?: string) =>
    request<T>(path, { method: "PATCH", body, token }),

  delete: <T = any>(path: string, token?: string) =>
    request<T>(path, { method: "DELETE", token }),

  deleteWithBody: <T = any>(path: string, body: unknown, token?: string) =>
    request<T>(path, { method: "DELETE", body, token }),
};
