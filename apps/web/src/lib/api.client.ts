/**
 * api.client.ts
 * Single source of truth for all API communication.
 * Import `apiClient` (for authenticated calls) or `API_URL` (for raw fetch) from here.
 * Never redefine `process.env.NEXT_PUBLIC_API_URL` in a page file.
 */

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

/** Versioned base — use this for all /api/v1/... calls */
export const API_V1_URL = `${API_URL}/api/v1`;

type FetchOptions = Omit<RequestInit, "body"> & { body?: unknown };

async function request<T = unknown>(
  path: string,
  options: FetchOptions & { token?: string } = {}
): Promise<T> {
  const { token, body, headers = {}, ...rest } = options;

  const res = await fetch(`${API_URL}${path}`, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(headers as Record<string, string>),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`API ${res.status}: ${text}`);
  }

  return res.json() as Promise<T>;
}

export const apiClient = {
  get: <T = unknown>(path: string, token?: string) =>
    request<T>(path, { method: "GET", token }),

  post: <T = unknown>(path: string, body: unknown, token?: string) =>
    request<T>(path, { method: "POST", body, token }),

  put: <T = unknown>(path: string, body: unknown, token?: string) =>
    request<T>(path, { method: "PUT", body, token }),

  patch: <T = unknown>(path: string, body: unknown, token?: string) =>
    request<T>(path, { method: "PATCH", body, token }),

  delete: <T = unknown>(path: string, token?: string) =>
    request<T>(path, { method: "DELETE", token }),
};
