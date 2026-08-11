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
  /** How many students the batch actually holds — not max_students, which is a cap. */
  student_count?: number;
  faculty_count?: number;
  max_teachers: number | null;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  /** Exam year this cohort sits for — how the institute batch list is grouped. */
  target_year: number | null;
  /** The class the cohort JOINED in. The class they are in now is derived — see currentClassLevel. */
  entry_class_level: "class_11" | "class_12" | "dropper" | null;
  /** When the batch was archived. Null while live. */
  archived_at?: string | null;
  created_at: string;
}

export interface CreateBatchPayload {
  name: string;
  exam: string;
  target_year?: number;
  entry_class_level?: string;
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

/**
 * @param archived list archived batches instead of live ones. Archiving used to
 *   hide a batch outright, so a roster that ended was simply gone.
 */
export function useBatches(archived = false) {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBatches = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<{ success: boolean; data: { batches: Batch[] } }>(
        archived ? "/api/v1/batches?archived=true" : "/api/v1/batches"
      );
      setBatches(data.data.batches);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [archived]);

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

  /**
   * Move students out of one batch and into another.
   *
   * Server-side this is a departure plus an enrolment, so the student keeps one
   * continuous history rather than appearing to be a new joiner.
   */
  const moveStudents = useCallback(
    async (
      sourceBatchId: string,
      studentIds: string[],
      targetBatchId: string,
    ): Promise<{ success: boolean; message: string }> => {
      try {
        const response = await apiFetch<{ success: boolean; message: string }>(
          `/api/v1/batches/${sourceBatchId}/students/move`,
          { method: "POST", body: JSON.stringify({ student_ids: studentIds, target_batch_id: targetBatchId }) },
        );
        await fetchBatches();
        return { success: true, message: response.message ?? "Students moved" };
      } catch (err: any) {
        return { success: false, message: err.message ?? "Could not move students" };
      }
    },
    [fetchBatches],
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
      const response = await apiFetch<{ message: string }>(`/api/v1/batches/${id}`, { method: "DELETE" });
      await fetchBatches();
      return { success: true, message: response.message ?? "Batch archived." };
    } catch (err: any) { return { success: false, message: err.message }; }
  }, [fetchBatches]);

  /** Bring an archived batch back, with whichever students are still unassigned. */
  const restoreBatch = useCallback(async (id: string) => {
    try {
      const response = await apiFetch<{ message: string }>(`/api/v1/batches/${id}/restore`, { method: "POST" });
      await fetchBatches();
      return { success: true, message: response.message ?? "Batch restored." };
    } catch (err: any) { return { success: false, message: err.message }; }
  }, [fetchBatches]);

  return { batches, loading, error, refetch: fetchBatches, createBatch, updateBatch, deactivateBatch, restoreBatch, moveStudents };
}
