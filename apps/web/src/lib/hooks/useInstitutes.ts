/**
 * useInstitutes.ts
 * React hook for institute CRUD operations — superadmin CRM.
 * Lives in lib/hooks/ per ARCHITECTURE_V2.md §4.2.
 *
 * Auth: Uses x-api-key header for UI_BYPASS_MODE compatibility.
 * When real auth is wired: swap to apiClient.get(path, session.access_token).
 */

import { useState, useEffect, useCallback } from "react";
import { API_URL } from "@/lib/api.client";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Institute {
  id: string;
  name: string;
  slug: string | null;
  owner_id: string;
  owner_email: string | null;
  owner_name: string | null;
  plan: string;           // 'free' | 'trial' | 'active' | 'enterprise'
  logo_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  student_count: number;
}

export interface CreateInstitutePayload {
  name: string;
  adminEmail: string;
  adminUsername: string;
  type: string;
  price: number;
  isFreeTrial?: boolean;
  trialMonths?: number;
  logoUrl?: string;
}

// ─── Shared fetch helper with internal API key ────────────────────────────────
// Uses INTERNAL_API_KEY so it works even when UI_BYPASS_MODE = true
// (The mock token "mock-token" would fail JWT validation on the real API)

const INTERNAL_KEY = process.env.NEXT_PUBLIC_INTERNAL_API_KEY ?? "dev-superadmin-key-2024";

async function superadminFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "x-api-key": INTERNAL_KEY,
      ...(options?.headers ?? {}),
    },
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.message ?? `API error ${res.status}`);
  }
  return data as T;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useInstitutes() {
  const [institutes, setInstitutes] = useState<Institute[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInstitutes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await superadminFetch<{ success: boolean; data: { institutes: Institute[] } }>(
        "/api/v1/superadmin/institutes"
      );
      setInstitutes(data.data.institutes);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInstitutes();
  }, [fetchInstitutes]);

  const createInstitute = useCallback(
    async (payload: CreateInstitutePayload): Promise<{ success: boolean; message: string; tempPassword?: string }> => {
      try {
        const res = await superadminFetch<{ success: boolean; message: string; data: { institute: Institute; tempPassword: string } }>(
          "/api/v1/institutes",
          { method: "POST", body: JSON.stringify(payload) }
        );
        // Refresh the list after a successful create
        await fetchInstitutes();
        return { success: true, message: res.message, tempPassword: res.data.tempPassword };
      } catch (err: any) {
        return { success: false, message: err.message };
      }
    },
    [fetchInstitutes]
  );

  const uploadImage = useCallback(async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append("image", file);

    const res = await fetch(`${API_URL}/api/v1/superadmin/upload`, {
      method: "POST",
      headers: {
        "x-api-key": INTERNAL_KEY,
      },
      body: formData,
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message ?? "Upload failed");
    }
    return data.url;
  }, []);

  return { institutes, loading, error, refetch: fetchInstitutes, createInstitute, uploadImage };
}
