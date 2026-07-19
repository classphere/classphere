/**
 * useAttempts.ts
 * Hook for fetching the current student's attempt history.
 */

"use client";
import { useState, useEffect, useCallback } from "react";
import { apiClient } from "@/lib/api.client";

export interface AttemptSummary {
  id: string;
  paper_id: string;
  exam_code: string;
  status: "in_progress" | "submitted";
  score: number | null;
  max_score: number | null;
  submitted_at: string | null;
  created_at: string;
}

interface UseAttemptsResult {
  attempts: AttemptSummary[];
  total: number;
  loading: boolean;
  error: string | null;
  page: number;
  setPage: (p: number) => void;
  refresh: () => void;
}

export function useAttempts(
  token: string | null,
  params?: { status?: string; limit?: number }
): UseAttemptsResult {
  const [attempts, setAttempts] = useState<AttemptSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [tick, setTick] = useState(0);

  const limit = params?.limit ?? 20;

  const fetchAttempts = useCallback(async () => {
    if (!token) { setLoading(false); return; }

    setLoading(true);
    setError(null);

    try {
      const qs = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (params?.status) qs.set("status", params.status);

      const res = await apiClient.get(`/api/v1/attempts/my?${qs}`, token);

      if (res.success) {
        setAttempts(res.data.attempts ?? []);
        setTotal(res.data.total ?? 0);
      } else {
        setError(res.message ?? "Failed to fetch attempts");
      }
    } catch (err: any) {
      setError(err.message ?? "Network error");
    } finally {
      setLoading(false);
    }
  }, [token, page, limit, params?.status, tick]);

  useEffect(() => { fetchAttempts(); }, [fetchAttempts]);

  return { attempts, total, loading, error, page, setPage, refresh: () => setTick(t => t + 1) };
}

/**
 * startAttempt — creates an attempt record and returns the attempt ID.
 */
export async function startAttempt(
  paperId: string,
  token: string,
  testMode: "practice" | "attempt" = "attempt",
): Promise<{ attempt_id: string; resumed?: boolean }> {
  const res = await apiClient.post("/api/v1/attempts", { paper_id: paperId, test_mode: testMode }, token);
  if (!res.success) throw new Error(res.message ?? "Failed to start attempt");
  const attempt = res.data.attempt;
  return { attempt_id: attempt.id, resumed: res.data.resumed };
}

/**
 * saveAttempt — auto-save answers during a test.
 * answers: { [question_id]: { selected_answer, marked_review, time_taken_sec, start_timestamp } }
 */
export async function saveAttempt(
  attemptId: string,
  answers: Record<string, { selected_answer: string | null; marked_review?: boolean; time_taken_sec?: number; start_timestamp?: number }>,
  token: string
): Promise<void> {
  await apiClient.patch(`/api/v1/attempts/${attemptId}`, { answers }, token);
}
