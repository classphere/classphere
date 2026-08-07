"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { Session, User } from "@supabase/supabase-js";
import { API_URL } from "@/lib/api.client";
import { decodeJwtClaims } from "@/lib/jwt";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AppUser {
  id: string;
  email: string;
  name: string;
  role: "student" | "teacher" | "institute_admin" | "super_admin" | "test_department_head" | "test_department_member";
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
  /**
   * Role + institute_id read directly from the access token's custom claims
   * (see docs/migrations/32_custom_access_token_hook.sql), available the instant
   * `session` resolves — no /auth/me round trip needed. Null until that Supabase
   * Auth Hook is enabled on the project, in which case route guards fall back to
   * `user` as before.
   */
  authRole: { role: string; institute_id: string | null } | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

// Routes that never require auth
// Note: on the admin subdomain, /login is rewritten to /superadmin/login by middleware,
// so both forms must be public.
//
// /maintenance is public because during maintenance the profile fetch itself
// returns 503, so `user` resolves to null — without this the guard below would
// read that as "signed out" and bounce the visitor to /login, straight back off
// the page explaining why nothing works.
const PUBLIC_ROUTES = ["/login", "/signup", "/superadmin/login", "/maintenance"];

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
    case "test_department_head":
    case "test_department_member": return "/test-department";
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

  // Derived synchronously from the token itself — no network wait. Falls back to
  // null (and callers fall back to `user`) until the custom-access-token hook is
  // enabled on the Supabase project. Cheap enough (base64 decode + JSON.parse of
  // a small payload) to skip manual memoization — the React Compiler handles it.
  const accessToken = session?.access_token;
  const authRole = (() => {
    if (!accessToken) return null;
    const claims = decodeJwtClaims(accessToken);
    const role = claims?.app_metadata?.role ?? claims?.user_metadata?.role;
    if (!role) return null;
    return { role, institute_id: claims?.app_metadata?.institute_id ?? null };
  })();

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

    // The maintenance screen routes nowhere, in either direction. Sending a
    // signed-out visitor to /login would hide the explanation, and sending a
    // signed-in one "home" would land them on a page whose every call 503s and
    // redirects straight back here.
    if (cleanPath.startsWith("/maintenance")) return;

    if (!appUser) {
      if (!isPublicPath) {
        router.push("/login");
      }
      return;
    }

    // A URL must never elevate the UI role. This guard runs for every route
    // change and prevents a signed-in student from rendering staff shells just
    // by typing /institute, /teacher, or /test-department in the address bar.
    // The institute admin belongs in the test-department workspace. Paper
    // creation already funnels them there — the dashboard's "Schedule Batch
    // Test" resolves to that route — and in a coaching with no separate
    // department they are the only person who will ever review the result.
    const isTestDepartment =
      appUser.role === "test_department_head" ||
      appUser.role === "test_department_member" ||
      appUser.role === "institute_admin";
    const routeDenied =
      cleanPath.startsWith("/institute/resources") ||
      (cleanPath.startsWith("/institute") && appUser.role !== "institute_admin") ||
      (cleanPath.startsWith("/teacher") && appUser.role !== "teacher") ||
      (cleanPath.startsWith("/superadmin") && appUser.role !== "super_admin") ||
      (cleanPath.startsWith("/test-department") && !isTestDepartment) ||
      (cleanPath.startsWith("/student") && appUser.role !== "student");
    if (routeDenied) {
      router.replace(homePath(appUser.role));
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

  // Auth state alone does not change when someone manually types a protected
  // URL. Re-apply the role gate whenever the pathname changes.
  useEffect(() => {
    if (!loading) handleRouting(user, pathname);
  }, [loading, user, pathname, handleRouting]);

  useEffect(() => {
    let mounted = true;

    // Separate: just track the session/user state and sync loading
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, s) => {
      if (!mounted) return;

      if (s?.user && s?.access_token) {
        // Expose the session (and its access_token) immediately instead of waiting
        // on the /auth/me profile fetch below — most pages gate their own data
        // fetch on `session?.access_token` alone, so this lets those requests fire
        // concurrently with the profile fetch instead of strictly after it.
        setSession(s);
        const profile = await fetchUserProfile(s.user, s.access_token);
        if (mounted) {
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
    <AuthContext.Provider value={{ user, session, loading, signOut, refreshUser, authRole }}>
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
