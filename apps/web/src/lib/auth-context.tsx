"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { Session, User } from "@supabase/supabase-js";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AppUser {
  id: string;
  email: string;
  name: string;
  role: "student" | "teacher" | "institute_admin" | "super_admin";
  avatar_url: string | null;
  institute_id: string | null;
  batch?: string | null;
}

interface AuthContextValue {
  user: AppUser | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

// Routes that never require auth
const PUBLIC_ROUTES = ["/login", "/signup", "/superadmin/login", "/invite"];

// ─── Session Token Helpers ────────────────────────────────────────────────────

const SESSION_TOKEN_KEY = "classphere_session_token";

export function getStoredSessionToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(SESSION_TOKEN_KEY);
}

export function storeSessionToken(token: string): void {
  if (typeof window !== "undefined") localStorage.setItem(SESSION_TOKEN_KEY, token);
}

export function clearSessionToken(): void {
  if (typeof window !== "undefined") localStorage.removeItem(SESSION_TOKEN_KEY);
}

// ─── Role-based home routes ───────────────────────────────────────────────────

function homePath(role: string): string {
  switch (role) {
    case "super_admin":     return "/superadmin";
    case "institute_admin": return "/institute";
    case "teacher":         return "/institute";
    default:                return "/dashboard";  // student
  }
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  // Fetch the app-level user profile from our backend
  const fetchUserProfile = useCallback(async (supabaseUser: User, token: string): Promise<AppUser | null> => {
    try {
      const sessionToken = getStoredSessionToken();
      const res = await fetch(`${API_URL}/api/v1/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "x-user-id": supabaseUser.id,
          ...(sessionToken ? { "x-session-token": sessionToken } : {}),
        },
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        // Handle device conflict — redirect with reason so the login page shows a message
        if (body.code === "SESSION_CONFLICT" || body.code === "NO_SESSION_TOKEN") {
          clearSessionToken();
          router.push("/login?reason=device_conflict");
          return null;
        }
        return null;
      }

      const data = await res.json();
      return data.data?.user ?? null;
    } catch {
      return null;
    }
  }, [router]);

  const refreshUser = useCallback(async () => {
    const { data: { session: s } } = await supabase.auth.getSession();
    if (s?.user && s?.access_token) {
      const profile = await fetchUserProfile(s.user, s.access_token);
      setUser(profile);
    }
  }, [fetchUserProfile]);

  // Redirect logic based on role
  const handleRouting = useCallback((appUser: AppUser | null, path: string) => {
    const isPublicPath = PUBLIC_ROUTES.some((r) => path.startsWith(r)) || path === "/";

    if (!appUser) {
      if (!isPublicPath) {
        router.push("/login");
      }
      return;
    }

    // Super admin → always go to /superadmin
    if (appUser.role === "super_admin" && !path.startsWith("/superadmin")) {
      router.push("/superadmin");
      return;
    }

    // Non-super-admin cannot access /superadmin routes
    if (appUser.role !== "super_admin" && path.startsWith("/superadmin")) {
      router.push(homePath(appUser.role));
      return;
    }

    // Logged-in user on public/landing page → redirect to their home
    if (isPublicPath) {
      router.push(homePath(appUser.role));
    }
  }, [router]);

  useEffect(() => {
    let mounted = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, s) => {
      if (!mounted) return;

      if (s?.user && s?.access_token) {
        const profile = await fetchUserProfile(s.user, s.access_token);
        if (mounted) {
          setSession(s);
          setUser(profile);
          setLoading(false);
          handleRouting(profile, pathname);
        }
      } else {
        if (mounted) {
          setSession(null);
          setUser(null);
          setLoading(false);
          handleRouting(null, pathname);
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [pathname, handleRouting, fetchUserProfile]);

  const signOut = useCallback(async () => {
    clearSessionToken();
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    router.push("/login");
  }, [router]);

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
