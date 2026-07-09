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
  created_at: string;
}

export interface CreateBatchPayload {
  name: string;
  exam: string;
  max_students?: number | null;
  max_teachers?: number | null;
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

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
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
    ): Promise<{ success: boolean; message: string }> => {
      try {
        await apiFetch("/api/v1/batches", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        await fetchBatches(); // refresh list
        return { success: true, message: "Batch created successfully" };
      } catch (err: any) {
        return { success: false, message: err.message };
      }
    },
    [fetchBatches]
  );

  return { batches, loading, error, refetch: fetchBatches, createBatch };
}
