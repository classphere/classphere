/**
 * useStudents.ts
 * React hook for student listing and CSV import — institute admin.
 */

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { API_URL } from "@/lib/api.client";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Student {
  id: string;
  name: string;
  phone: string | null;
  date_of_birth: string | null;   // DDMMYYYY
  created_at: string;
  batches: string[];               // list of batch names
}

export interface ImportResult {
  imported: number;
  updated: number;
  skipped: number;
  errors: string[];
}

// ─── Helper ───────────────────────────────────────────────────────────────────

async function getToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

function getSessionToken(): string {
  return typeof window !== "undefined"
    ? localStorage.getItem("classphere_session_token") ?? ""
    : "";
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useStudents() {
  const [students, setStudents] = useState<Student[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      if (!token) throw new Error("Not authenticated");

      const sessionToken = getSessionToken();
      const res = await fetch(`${API_URL}/api/v1/students`, {
        headers: {
          Authorization: `Bearer ${token}`,
          ...(sessionToken ? { "x-session-token": sessionToken } : {}),
        },
      });

      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message ?? "Failed to fetch students");

      setStudents(json.data.students);
      setTotal(json.data.total);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  const importStudents = useCallback(
    async (file: File): Promise<{ success: boolean; message: string; result?: ImportResult }> => {
      try {
        const token = await getToken();
        if (!token) throw new Error("Not authenticated");

        const sessionToken = getSessionToken();
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch(`${API_URL}/api/v1/students/import`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            ...(sessionToken ? { "x-session-token": sessionToken } : {}),
            // NOTE: Do NOT set Content-Type here — browser sets it with the boundary for multipart
          },
          body: formData,
        });

        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json.message ?? "Import failed");

        await fetchStudents(); // refresh list
        return { success: true, message: json.message, result: json.data };
      } catch (err: any) {
        return { success: false, message: err.message };
      }
    },
    [fetchStudents]
  );

  const createStudent = useCallback(
    async (data: { name: string; phone: string; dob: string; batch_id: string }): Promise<{ success: boolean; message: string }> => {
      try {
        const token = await getToken();
        if (!token) throw new Error("Not authenticated");

        const sessionToken = getSessionToken();
        const res = await fetch(`${API_URL}/api/v1/students`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            ...(sessionToken ? { "x-session-token": sessionToken } : {}),
          },
          body: JSON.stringify(data),
        });

        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json.message ?? "Failed to create student");

        await fetchStudents(); // refresh list
        return { success: true, message: json.message };
      } catch (err: any) {
        return { success: false, message: err.message };
      }
    },
    [fetchStudents]
  );

  return { students, total, loading, error, refetch: fetchStudents, importStudents, createStudent };
}
