/**
 * useTests.ts
 * Hook for fetching available test papers from the API.
 */

"use client";
import { useState, useEffect, useCallback } from "react";
import { apiClient } from "@/lib/api.client";

export interface TestPaper {
  id: string;
  title: string;
  test_type: string;
  subject: string | null;
  chapter: string | null;
  year: number | null;
  shift: string | null;
  total_questions: number;
  total_marks: number;
  duration_min: number;
  difficulty: string | null;
  exams?: { code: string; full_name: string };
}

interface UseTestsResult {
  tests: TestPaper[];
  total: number;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

/**
 * Fetches papers from /api/v1/questions/tests
 * @param token - session token
 * @param params - optional filters: exam code, type
 */
export function useTests(
  token: string | null,
  params?: { exam?: string; type?: string }
): UseTestsResult {
  const [tests, setTests] = useState<TestPaper[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const fetchTests = useCallback(async () => {
    if (!token) { setLoading(false); return; }

    setLoading(true);
    setError(null);

    try {
      const qs = new URLSearchParams();
      if (params?.exam) qs.set("exam", params.exam);
      if (params?.type) qs.set("type", params.type);

      const res = await apiClient.get(`/api/v1/questions/tests?${qs}`, token);

      if (res.success) {
        setTests(res.data.papers ?? []);
        setTotal(res.data.total ?? 0);
      } else {
        setError(res.message ?? "Failed to fetch tests");
      }
    } catch (err: any) {
      setError(err.message ?? "Network error");
    } finally {
      setLoading(false);
    }
  }, [token, params?.exam, params?.type, tick]);

  useEffect(() => { fetchTests(); }, [fetchTests]);

  return { tests, total, loading, error, refresh: () => setTick(t => t + 1) };
}
