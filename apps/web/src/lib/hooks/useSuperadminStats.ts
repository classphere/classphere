/**
 * useSuperadminStats.ts
 * React hook for live platform-wide KPI stats.
 * Lives in lib/hooks/ per ARCHITECTURE_V2.md §4.2.
 */

import { useState, useEffect, useCallback } from "react";
import { API_URL } from "@/lib/api.client";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SuperadminStats {
  totalInstitutes: number;
  totalStudents: number;
  totalAttempts: number;
  newInstitutesThisWeek: number;
  newStudentsThisWeek: number;
  enterprisePlans: number;
  estimatedMRR: number;
  systemUptime: string;
}

// ─── Shared internal fetch ─────────────────────────────────────────────────────

const INTERNAL_KEY = process.env.NEXT_PUBLIC_INTERNAL_API_KEY ?? "dev-superadmin-key-2024";

async function superadminFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: {
      "x-api-key": INTERNAL_KEY,
    },
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.message ?? `API error ${res.status}`);
  }
  return data as T;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useSuperadminStats() {
  const [stats, setStats] = useState<SuperadminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await superadminFetch<{ success: boolean; data: SuperadminStats }>(
        "/api/v1/superadmin/stats"
      );
      setStats(data.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { stats, loading, error, refetch: fetchStats };
}
