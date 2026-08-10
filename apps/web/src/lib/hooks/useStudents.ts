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
  /** Existing students the sheet reassigned to a different batch. */
  moved: number;
  skipped: number;
  errors: string[];
  /** "Name — Old Batch → New Batch", so a reassignment can be reviewed, not just counted. */
  moves: string[];
}

/**
 * The batch a student is already in, returned when adding them somewhere else
 * is refused. Retrying with `move: true` is what the confirm dialog does.
 */
export interface EnrolmentConflict {
  batch_id: string;
  batch_name: string;
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
    async (file: File, batchId?: string): Promise<{ success: boolean; message: string; result?: ImportResult }> => {
      try {
        const token = await getToken();
        if (!token) throw new Error("Not authenticated");

        const sessionToken = getSessionToken();
        const formData = new FormData();
        formData.append("file", file);
        if (batchId) formData.append("batch_id", batchId);

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

  /**
   * Add a student to a batch.
   *
   * A student holds one batch at a time, so the server refuses when they are
   * already enrolled elsewhere rather than guessing whether this was a move or
   * a misclick. That refusal comes back as `conflict` — not an error — so the
   * caller can confirm and retry with `move: true`.
   */
  const createStudent = useCallback(
    async (
      data: { name: string; phone: string; dob: string; batch_id: string },
      options: { move?: boolean } = {},
    ): Promise<{ success: boolean; message: string; conflict?: EnrolmentConflict }> => {
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
          body: JSON.stringify(options.move ? { ...data, move: true } : data),
        });

        const json = await res.json();

        if (res.status === 409 && json.code === "ALREADY_ENROLLED") {
          return { success: false, message: json.message, conflict: json.data?.current_batch };
        }

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
