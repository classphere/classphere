"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TenantConfig {
  slug: string | null;           // 'saksham', 'vidyamandir', null = super admin
  instituteId: string | null;
  instituteName: string | null;
  logoUrl: string | null;
  primaryColor: string;
  isLoading: boolean;
}

const defaultConfig: TenantConfig = {
  slug: null,
  instituteId: null,
  instituteName: null,
  logoUrl: null,
  primaryColor: "#6366f1",
  isLoading: true,
};

const TenantContext = createContext<TenantConfig>(defaultConfig);

// ─── Slug Detection ───────────────────────────────────────────────────────────

/**
 * Detects the institute slug from the URL.
 *
 * Production:  saksham.classphere.com     → 'saksham'
 *              admin.classphere.com       → null (super admin)
 * Local dev:   localhost:3000?tenant=saksham → 'saksham'
 *              localhost:3000             → null (super admin)
 */
function detectSlug(): string | null {
  if (typeof window === "undefined") return null;

  const hostname = window.location.hostname;

  // Production: extract from subdomain
  if (hostname.endsWith(".classphere.com")) {
    const sub = hostname.replace(".classphere.com", "");
    if (sub === "admin" || sub === "www") return null; // super admin domains
    return sub;
  }

  // Local dev fallback: ?tenant= query param
  const params = new URLSearchParams(window.location.search);
  return params.get("tenant") ?? null;
}

// ─── Provider ─────────────────────────────────────────────────────────────────

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<TenantConfig>(defaultConfig);

  useEffect(() => {
    const slug = detectSlug();

    if (!slug) {
      // Super admin domain — no institute branding, stop loading immediately
      setConfig({
        slug: null,
        instituteId: null,
        instituteName: null,
        logoUrl: null,
        primaryColor: "#6366f1",
        isLoading: false,
      });
      return;
    }

    // Fetch institute branding from the public endpoint
    fetch(`${API_URL}/api/v1/institutes/by-slug/${encodeURIComponent(slug)}`)
      .then((r) => r.json())
      .then(({ data }) => {
        if (data) {
          // Inject CSS variable so all components using var(--primary) pick up institute color
          document.documentElement.style.setProperty("--primary-institute", data.primary_color ?? "#6366f1");
          setConfig({
            slug,
            instituteId: data.id,
            instituteName: data.name,
            logoUrl: data.logo_url,
            primaryColor: data.primary_color ?? "#6366f1",
            isLoading: false,
          });
        } else {
          // Slug not found — fall through with no branding but don't crash
          setConfig({ slug, instituteId: null, instituteName: null, logoUrl: null, primaryColor: "#6366f1", isLoading: false });
        }
      })
      .catch(() => {
        // API unreachable — still render app, just without branding
        setConfig({ slug, instituteId: null, instituteName: null, logoUrl: null, primaryColor: "#6366f1", isLoading: false });
      });
  }, []);

  return <TenantContext.Provider value={config}>{children}</TenantContext.Provider>;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useTenant(): TenantConfig {
  return useContext(TenantContext);
}
