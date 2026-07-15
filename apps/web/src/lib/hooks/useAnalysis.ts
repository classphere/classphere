/**
 * useAnalysis.ts
 * Hook for fetching an analysis result for a completed attempt.
 * Polls the /api/v1/analysis/:attempt_id endpoint until status is "ready".
 */

"use client";
import { useState, useEffect, useRef } from "react";
import { apiClient } from "@/lib/api.client";
interface UseAnalysisResult {
  analysis: any | null;
  status: "idle" | "pending" | "ready" | "error";
  error: string | null;
}

/**
 * Polls for analysis result until it's ready.
 * @param attemptId - the attempt ID to fetch analysis for
 * @param token - session token
 * @param enabled - set to false to skip fetching
 */
export function useAnalysis(
  attemptId: string | null,
  token: string | null,
  enabled = true
): UseAnalysisResult {
  const [analysis, setAnalysis] = useState<any | null>(null);
  const [status, setStatus] = useState<"idle" | "pending" | "ready" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!attemptId || !token || !enabled) return;

    setStatus("pending");
    setAnalysis(null);

    const poll = async () => {
      try {
        const res = await apiClient.get(`/api/v1/analysis/${attemptId}`, token);
        if (!res.success) {
          setError(res.message ?? "Error fetching analysis");
          setStatus("error");
          if (pollRef.current) clearInterval(pollRef.current);
          return;
        }

        if (res.data.status === "ready") {
          setAnalysis(res.data.analysis);
          setStatus("ready");
          if (pollRef.current) clearInterval(pollRef.current);
        }
        // "pending" → keep polling
      } catch (err: any) {
        setError(err.message ?? "Network error");
        setStatus("error");
        if (pollRef.current) clearInterval(pollRef.current);
      }
    };

    // Immediate first fetch
    poll();
    // Then poll every 3 seconds (analysis is usually ready immediately since it's sync)
    pollRef.current = setInterval(poll, 3000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [attemptId, token, enabled]);

  return { analysis, status, error };
}
