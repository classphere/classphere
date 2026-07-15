"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TenantConfig {
  domain: string | null;           // 'allen' (subdomain) or 'learn.allen.ac.in' (custom), null = super admin
  instituteId: string | null;
  instituteName: string | null;
  logoUrl: string | null;
  primaryColor: string;
  isLoading: boolean;
}

const defaultConfig: TenantConfig = {
  domain: null,
  instituteId: null,
  instituteName: null,
  logoUrl: null,
  primaryColor: "#6366f1",
  isLoading: true,
};

const TenantContext = createContext<TenantConfig>(defaultConfig);

// ─── Slug Detection ───────────────────────────────────────────────────────────

/**
 * Detects the institute domain or subdomain from the URL.
 */
function detectDomain(): string | null {
  if (typeof window === "undefined") return null;

  const hostname = window.location.hostname;

  // Local dev fallback: ?tenant= query param
  const params = new URLSearchParams(window.location.search);
  const localTenant = params.get("tenant");
  if (localTenant) return localTenant;

  // Production: Check if it's a subdomain of classphere.com
  if (hostname.endsWith(".classphere.com")) {
    const sub = hostname.replace(".classphere.com", "");
    if (sub === "admin" || sub === "www" || sub === "") return null; // super admin domains
    return sub;
  }

  // Not localhost and not classphere.com -> Must be a Custom Domain
  if (hostname !== "localhost" && hostname !== "127.0.0.1") {
    return hostname;
  }

  return null;
}

// ─── Provider ─────────────────────────────────────────────────────────────────

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export function TenantProvider({ children, initialConfig }: { children: React.ReactNode, initialConfig?: TenantConfig }) {
  const [config, setConfig] = useState<TenantConfig>(initialConfig || defaultConfig);

  useEffect(() => {
    // If initialConfig was provided by the server layout, we don't need to fetch on the client.
    if (initialConfig && initialConfig.domain) {
      if (typeof document !== "undefined") {
        document.documentElement.style.setProperty("--primary-institute", initialConfig.primaryColor ?? "#6366f1");
      }
      return;
    }
    const domain = detectDomain();

    if (!domain) {
      // Super admin domain — no institute branding, stop loading immediately
      setConfig({
        domain: null,
        instituteId: null,
        instituteName: null,
        logoUrl: null,
        primaryColor: "#6366f1",
        isLoading: false,
      });
      return;
    }

    // Fetch institute branding from the public endpoint
    fetch(`${API_URL}/api/v1/institutes/public/${encodeURIComponent(domain)}`)
      .then((r) => r.json())
      .then(({ data }) => {
        if (data) {
          // Inject CSS variable so all components using var(--primary) pick up institute color
          document.documentElement.style.setProperty("--primary-institute", data.theme_primary_color ?? "#6366f1");
          setConfig({
            domain,
            instituteId: data.institutes?.id || data.institute_id,
            instituteName: data.institutes?.name || "Institute",
            logoUrl: data.theme_logo_url,
            primaryColor: data.theme_primary_color ?? "#6366f1",
            isLoading: false,
          });
        } else {
          // Domain not found — fall through with no branding but don't crash
          setConfig({ domain, instituteId: null, instituteName: null, logoUrl: null, primaryColor: "#6366f1", isLoading: false });
        }
      })
      .catch(() => {
        // API unreachable — still render app, just without branding
        setConfig({ domain, instituteId: null, instituteName: null, logoUrl: null, primaryColor: "#6366f1", isLoading: false });
      });
  }, []);

  return <TenantContext.Provider value={config}>{children}</TenantContext.Provider>;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useTenant(): TenantConfig {
  return useContext(TenantContext);
}
