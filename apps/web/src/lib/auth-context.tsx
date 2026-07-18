"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { Session, User } from "@supabase/supabase-js";
import { API_URL } from "@/lib/api.client";

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

// Routes that never require auth
// Note: on the admin subdomain, /login is rewritten to /superadmin/login by middleware,
// so both forms must be public.
const PUBLIC_ROUTES = ["/login", "/signup", "/superadmin/login"];

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
    case "super_admin":     return "/"; // middleware rewrites / → /superadmin on admin subdomain
    case "institute_admin": return "/institute";
    case "teacher":         return "/teacher";
    default:                return "/student/dashboard"; // student
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
        // Handle device conflict — redirect with reason so the login page shows a message (FE-3)
        if (body.code === "SESSION_CONFLICT") {
          clearSessionToken();
          router.push("/login?reason=device_conflict");
          return null;
        }
        // NO_SESSION_TOKEN: silently fail and let the auth state handle the redirect
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

  // ── Subdomain detection ───────────────────────────────────────────────────
  // On admin subdomain: browser URL is /login, /, /institutes — middleware rewrites to /superadmin/*
  // On institute subdomain: browser URL is /login, /dashboard — middleware rewrites to /[slug]/*
  const hostname = typeof window !== "undefined" ? window.location.hostname : "";
  const isAdminSubdomain = /^admin\./.test(hostname) || hostname === "admin.localhost";

  // Extract institute slug from hostname (e.g. "test" from test.classphere.com or test.localhost)
  const instituteSlug = !isAdminSubdomain && hostname.includes(".")
    ? hostname.split(".")[0].replace(/:\d+$/, "")
    : "";
  const isInstituteSubdomain = !!instituteSlug && instituteSlug !== "localhost" && instituteSlug !== "127";

  // Domain prefix for building href paths on institute subdomains.
  // On test.classphere.com, Next.js serves /test/dashboard, but the browser path is /dashboard.
  // We do NOT prefix in router.push() — the middleware handles the rewrite from clean URL → domain path.
  // So router.push("/dashboard") from test.classphere.com works correctly.

  // Redirect logic based on role
  const handleRouting = useCallback((appUser: AppUser | null, path: string) => {
    // Strip domain prefix from path if present, for clean route matching
    // e.g. path could be /test/login on server but /login on client
    const domainPrefix = isInstituteSubdomain ? `/${instituteSlug}` : "";
    const cleanPath = domainPrefix && path.startsWith(domainPrefix)
      ? path.slice(domainPrefix.length) || "/"
      : path;

    const isPublicPath = PUBLIC_ROUTES.some((r) => cleanPath.startsWith(r)) || cleanPath === "/";

    if (!appUser) {
      if (!isPublicPath) {
        router.push("/login");
      }
      return;
    }

    if (appUser.role === "super_admin") {
      if (!isAdminSubdomain && !cleanPath.startsWith("/superadmin") && !isPublicPath) {
        router.push("/superadmin");
        return;
      }
      if (isPublicPath) {
        router.push("/"); // middleware rewrites / → /superadmin on admin subdomain
      }
      return;
    }

    // Non-super-admin cannot access /superadmin routes
    if (cleanPath.startsWith("/superadmin")) {
      router.push(homePath(appUser.role));
      return;
    }

    // Logged-in user on public/landing page → redirect to their home
    if (isPublicPath) {
      router.push(homePath(appUser.role));
    }
  }, [router, isAdminSubdomain, isInstituteSubdomain, instituteSlug]);

  useEffect(() => {
    let mounted = true;

    // Separate: just track the session/user state and sync loading
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, s) => {
      if (!mounted) return;

      if (s?.user && s?.access_token) {
        const profile = await fetchUserProfile(s.user, s.access_token);
        if (mounted) {
          setSession(s);
          setUser(profile);
          setLoading(false);
          // Only route on initial sign-in events (FE-2: avoid redirect loops on token refresh)
          if (event === "SIGNED_IN" || event === "INITIAL_SESSION") {
            handleRouting(profile, pathname);
          }
        }
      } else {
        if (mounted) {
          setSession(null);
          setUser(null);
          setLoading(false);
          if (event === "SIGNED_OUT") {
            handleRouting(null, pathname);
          }
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
