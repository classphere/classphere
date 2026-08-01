/**
 * useInstitutes.ts
 * React hook for institute CRUD operations — superadmin CRM.
 * Lives in lib/hooks/ per ARCHITECTURE_V2.md §4.2.
 */

import { useState, useEffect, useCallback } from "react";
import { API_URL, apiClient } from "@/lib/api.client";
import { useAuth } from "@/lib/auth-context";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Institute {
  id: string;
  name: string;
  slug: string | null;
  owner_id: string;
  owner_email: string | null;
  owner_name: string | null;
  /** @deprecated Pricing lives on `subscription`; kept only for legacy invoice rows. */
  plan: string;
  logo_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  student_count: number;
  enabled_exam_codes?: string[] | null;
  subscription: SubscriptionTerms | null;
  /** Rate x students, or the flat fee. Computed server-side so every screen agrees. */
  annual_value_paise: number;
}

export type SubscriptionStatus = "trialing" | "active" | "past_due" | "cancelled";

export interface SubscriptionTerms {
  status: SubscriptionStatus;
  billing_mode: "per_student" | "flat";
  /** Annual rate per student in paise. 59000 = Rs 590/student/year. */
  price_per_student_paise: number;
  flat_annual_paise: number | null;
  trial_ends_at: string | null;
  current_period_end: string | null;
}

export interface SubscriptionUpdate {
  status?: SubscriptionStatus;
  billing_mode?: "per_student" | "flat";
  price_per_student_paise?: number;
  flat_annual_paise?: number | null;
  trial_ends_at?: string | null;
}

export interface CreateInstitutePayload {
  name: string;
  adminEmail: string;
  adminUsername: string;
  preferredSubdomain?: string;
  trialMonths?: number;
  logoUrl?: string;
  enabledExamCodes: string[];
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useInstitutes() {
  const { session } = useAuth();
  const token = session?.access_token;

  const [institutes, setInstitutes] = useState<Institute[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInstitutes = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get<{ success: boolean; data: { institutes: Institute[] }; message?: string }>(
        "/api/v1/superadmin/institutes",
        token
      );
      if (res.success) {
        setInstitutes(res.data.institutes);
      } else {
        setError(res.message ?? "Failed to fetch institutes");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchInstitutes();
  }, [fetchInstitutes]);

  const createInstitute = useCallback(
    async (payload: CreateInstitutePayload): Promise<{ success: boolean; message: string; tempPassword?: string }> => {
      if (!token) {
        return { success: false, message: "Authentication required" };
      }
      try {
        const res = await apiClient.post<{ success: boolean; message: string; data: { institute: Institute; tempPassword: string } }>(
          "/api/v1/institutes",
          payload,
          token
        );
        // Refresh the list after a successful create
        await fetchInstitutes();
        return { success: true, message: res.message, tempPassword: res.data.tempPassword };
      } catch (err: any) {
        return { success: false, message: err.message };
      }
    },
    [token, fetchInstitutes]
  );

  const uploadImage = useCallback(async (file: File): Promise<string> => {
    if (!token) {
      throw new Error("Authentication required");
    }
    const formData = new FormData();
    formData.append("image", file);

    const res = await fetch(`${API_URL}/api/v1/superadmin/upload`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message ?? "Upload failed");
    }
    return data.url;
  }, [token]);

  /**
   * Set an institute's commercial terms. Separate from updateInstitute because
   * only a super admin may price an account — the route rejects anyone else.
   */
  const updateSubscription = useCallback(
    async (id: string, payload: SubscriptionUpdate): Promise<{ success: boolean; message: string }> => {
      if (!token) return { success: false, message: "Authentication required" };
      try {
        const res = await apiClient.patch<{ success: boolean; message: string }>(
          `/api/v1/institutes/${id}/subscription`,
          payload,
          token,
        );
        await fetchInstitutes();
        return { success: res.success, message: res.message ?? "Pricing updated" };
      } catch (err: any) {
        return { success: false, message: err.message ?? "Could not update pricing" };
      }
    },
    [token, fetchInstitutes],
  );

  const updateInstitute = useCallback(
    async (id: string, payload: Partial<Institute>): Promise<{ success: boolean; message: string }> => {
      if (!token) return { success: false, message: "Authentication required" };
      try {
        const res = await apiClient.patch<{ success: boolean; message: string }>(
          `/api/v1/institutes/${id}`,
          payload,
          token
        );
        await fetchInstitutes();
        return { success: true, message: res.message || "Institute updated successfully" };
      } catch (err: any) {
        return { success: false, message: err.message };
      }
    },
    [token, fetchInstitutes]
  );

  const deleteInstitute = useCallback(
    async (id: string): Promise<{ success: boolean; message: string }> => {
      if (!token) return { success: false, message: "Authentication required" };
      try {
        const res = await apiClient.delete<{ success: boolean; message: string }>(
          `/api/v1/institutes/${id}`,
          token
        );
        await fetchInstitutes();
        return { success: true, message: res.message || "Institute deleted successfully" };
      } catch (err: any) {
        return { success: false, message: err.message };
      }
    },
    [token, fetchInstitutes]
  );

  return { 
    institutes, 
    loading, 
    error, 
    refetch: fetchInstitutes, 
    createInstitute, 
    uploadImage,
    updateSubscription,
    updateInstitute,
    deleteInstitute
  };
}
