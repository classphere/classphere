/**
 * useSuperadminStats.ts
 * React hook for live platform-wide KPI stats.
 * Lives in lib/hooks/ per ARCHITECTURE_V2.md §4.2.
 */

import { useState, useEffect, useCallback } from "react";
import { apiClient } from "@/lib/api.client";
import { useAuth } from "@/lib/auth-context";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SuperadminStats {
  totalInstitutes: number;
  totalStudents: number;
  totalAttempts: number;
  newInstitutesThisWeek: number;
  newStudentsThisWeek: number;
  activeInstitutes: number;
  trialInstitutes: number;
  billedStudents: number;
  /** Rate x students summed over active subscriptions, in paise. */
  estimatedARRPaise: number;
  systemUptime: string;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useSuperadminStats() {
  const { session } = useAuth();
  const token = session?.access_token;

  const [stats, setStats] = useState<SuperadminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get<{ success: boolean; data: SuperadminStats; message?: string }>(
        "/api/v1/superadmin/stats",
        token
      );
      if (res.success) {
        setStats(res.data);
      } else {
        setError(res.message ?? "Failed to fetch stats");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { stats, loading, error, refetch: fetchStats };
}
