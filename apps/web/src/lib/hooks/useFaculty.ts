/**
 * useFaculty.ts
 * React hook for faculty CRUD operations — institute admin.
 * Calls GET /api/v1/faculty and POST /api/v1/faculty using the
 * authenticated user's Bearer token from Supabase session.
 */

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { API_URL } from "@/lib/api.client";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Faculty {
  id: string;
  institute_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  position: string;
  subject: string;
  batches_count: number;
  rating: number;
  is_active: boolean;
  created_at: string;
}

export interface CreateFacultyPayload {
  name: string;
  email: string;
  phone?: string;
  position: string;
  subject: string;
  batch_id: string;    // required — must belong to institute
  rating?: number;
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

export function useFaculty() {
  const [faculty, setFaculty] = useState<Faculty[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFaculty = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<{ success: boolean; data: { faculty: Faculty[] } }>(
        "/api/v1/faculty"
      );
      setFaculty(data.data.faculty);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFaculty();
  }, [fetchFaculty]);

  const addFaculty = useCallback(
    async (
      payload: CreateFacultyPayload
    ): Promise<{ success: boolean; message: string }> => {
      try {
        await apiFetch("/api/v1/faculty", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        await fetchFaculty(); // refresh list
        return { success: true, message: "Faculty member added successfully" };
      } catch (err: any) {
        return { success: false, message: err.message };
      }
    },
    [fetchFaculty]
  );

  return { faculty, loading, error, refetch: fetchFaculty, addFaculty };
}
