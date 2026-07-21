/**
 * useBatches.ts
 * React hook for batch CRUD operations — institute admin.
 * Calls GET /api/v1/batches and POST /api/v1/batches using the
 * authenticated user's Bearer token from Supabase session.
 */

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { API_URL } from "@/lib/api.client";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Batch {
  id: string;
  institute_id: string;
  name: string;
  exam: string;           // e.g. "jee-main", "neet-ug"
  description: string | null;
  max_students: number | null;
  max_teachers: number | null;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
}

export interface CreateBatchPayload {
  name: string;
  exam: string;
  starts_at?: string;
  ends_at?: string;
}

export interface UpdateBatchPayload {
  name?: string;
  starts_at?: string | null;
  ends_at?: string | null;
}

// ─── Helper ───────────────────────────────────────────────────────────────────

async function getToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getToken();
  if (!token) throw new Error("Not authenticated — please sign in");

  const sessionToken =
    typeof window !== "undefined"
      ? localStorage.getItem("classphere_session_token") ?? ""
      : "";

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(sessionToken ? { "x-session-token": sessionToken } : {}),
      ...(options.headers ?? {}),
    },
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.message ?? `API error ${res.status}`);
  }
  return data as T;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useBatches() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBatches = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<{ success: boolean; data: { batches: Batch[] } }>(
        "/api/v1/batches"
      );
      setBatches(data.data.batches);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBatches();
  }, [fetchBatches]);

  const createBatch = useCallback(
    async (
      payload: CreateBatchPayload
    ): Promise<{ success: boolean; message: string; batch?: Batch }> => {
      try {
        const response = await apiFetch<{ success: boolean; data: { batch: Batch } }>("/api/v1/batches", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        await fetchBatches(); // refresh list
        return { success: true, message: "Batch created successfully", batch: response.data.batch };
      } catch (err: any) {
        return { success: false, message: err.message };
      }
    },
    [fetchBatches]
  );

  const updateBatch = useCallback(async (id: string, payload: UpdateBatchPayload) => {
    try {
      await apiFetch(`/api/v1/batches/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
      await fetchBatches();
      return { success: true, message: "Batch updated." };
    } catch (err: any) { return { success: false, message: err.message }; }
  }, [fetchBatches]);

  const deactivateBatch = useCallback(async (id: string) => {
    try {
      await apiFetch(`/api/v1/batches/${id}`, { method: "DELETE" });
      await fetchBatches();
      return { success: true, message: "Batch deactivated." };
    } catch (err: any) { return { success: false, message: err.message }; }
  }, [fetchBatches]);

  return { batches, loading, error, refetch: fetchBatches, createBatch, updateBatch, deactivateBatch };
}
