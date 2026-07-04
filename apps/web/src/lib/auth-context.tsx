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
  batch?: string | null;
}

interface AuthContextValue {
  user: AppUser | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

// Routes that never require auth
const PUBLIC_ROUTES = ["/login", "/signup", "/superadmin/login"];

// ─── Provider ─────────────────────────────────────────────────────────────────

// ─── UI BYPASS MODE ────────────────────────────────────────────────────────────
// Set to true to bypass login and role-based redirects for UI development
const UI_BYPASS_MODE = true; 
const BYPASS_ROLE: AppUser["role"] = "super_admin"; // Change this to test different views
// ───────────────────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  // Fetch the app-level user profile from our backend
  const fetchUserProfile = useCallback(async (supabaseUser: User, token: string): Promise<AppUser | null> => {
    try {
      const res = await fetch(`${API_URL}/api/v1/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "x-user-id": supabaseUser.id,
        },
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data.data?.user ?? null;
    } catch {
      return null;
    }
  }, []);

  const refreshUser = useCallback(async () => {
    const { data: { session: s } } = await supabase.auth.getSession();
    if (s?.user && s?.access_token) {
      const profile = await fetchUserProfile(s.user, s.access_token);
      setUser(profile);
    }
  }, [fetchUserProfile]);

  // Redirect logic based on role
  const handleRouting = useCallback((appUser: AppUser | null, path: string) => {
    if (UI_BYPASS_MODE) return; // Never force-redirect during UI bypass mode

    if (!appUser) {
      // Not logged in — send to login unless on a public route
      if (!PUBLIC_ROUTES.some(r => path.startsWith(r))) {
        router.push("/login");
      }
      return;
    }

    // Super admin trying to access student UI → redirect to superadmin
    if (appUser.role === "super_admin" && !path.startsWith("/superadmin")) {
      router.push("/superadmin");
      return;
    }

    // Student/teacher on superadmin pages → deny
    if (appUser.role !== "super_admin" && path.startsWith("/superadmin")) {
      router.push("/");
      return;
    }

    // Logged in user on login/signup → redirect to appropriate dashboard
    if (PUBLIC_ROUTES.some(r => path.startsWith(r))) {
      if (appUser.role === "super_admin") {
        router.push("/superadmin");
      } else {
        router.push("/");
      }
    }
  }, [router]);

  useEffect(() => {
    let mounted = true;

    if (UI_BYPASS_MODE) {
      const mockUser: AppUser = {
        id: "bypass-user-id",
        email: "ui-dev@examprep.com",
        name: "UI Developer",
        role: BYPASS_ROLE,
        avatar_url: null,
      };
      
      const mockSession = {
        access_token: "mock-token",
        user: { id: "bypass-user-id" }
      } as Session;

      setSession(mockSession);
      setUser(mockUser);
      setLoading(false);
      // Wait for next tick so router is ready
      setTimeout(() => handleRouting(mockUser, window.location.pathname), 0);
      return;
    }
    // ─────────────────────────────────────────────────────────────────────────────

    const initialize = async () => {
      const { data: { session: s } } = await supabase.auth.getSession();

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
          setLoading(false);
          handleRouting(null, pathname);
        }
      }
    };

    initialize();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, s) => {
      if (!mounted) return;

      if (event === "SIGNED_OUT" || !s) {
        setSession(null);
        setUser(null);
        handleRouting(null, window.location.pathname);
        return;
      }

      if ((event === "SIGNED_IN" || event === "TOKEN_REFRESHED") && s?.user) {
        const profile = await fetchUserProfile(s.user, s.access_token);
        setSession(s);
        setUser(profile);
        handleRouting(profile, window.location.pathname);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const signOut = useCallback(async () => {
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
