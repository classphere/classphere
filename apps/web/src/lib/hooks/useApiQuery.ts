"use client";

import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { apiClient } from "@/lib/api.client";

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  message?: string;
}

/**
 * Cached GET against the API, keyed by path.
 *
 * Replaces the `useEffect` + `useState` + manual loading-flag pattern that every
 * page repeated. Beyond removing the boilerplate, the win is the cache: a page
 * that has been visited within `staleTime` renders instantly instead of showing
 * a spinner and refetching.
 *
 * The query waits for a session, so it never fires the unauthenticated request
 * that the old effects guarded against by hand.
 */
/**
 * The exact cache key for a path.
 *
 * `invalidateQueries({ queryKey: [path] })` matches by prefix and does not need
 * this, but `setQueryData` requires the full key — so anything writing to the
 * cache by hand should build its key here rather than repeat the shape.
 */
export const apiQueryKey = (path: string, authed = true) => [path, authed ? "auth" : "anon"];

export function useApiQuery<T>(
  path: string | null,
  options?: Omit<UseQueryOptions<T, Error>, "queryKey" | "queryFn">,
) {
  const { session } = useAuth();
  const token = session?.access_token;

  return useQuery<T, Error>({
    // Token is part of the key so switching account never serves the previous
    // user's cached data.
    queryKey: apiQueryKey(path as string, Boolean(token)),
    queryFn: async () => {
      const response = (await apiClient.get(path as string, token)) as ApiEnvelope<T>;
      if (!response.success) throw new Error(response.message ?? "Request failed");
      return response.data;
    },
    enabled: Boolean(path) && Boolean(token),
    ...options,
  });
}
