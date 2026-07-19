"use client";

import { usePathname } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import MobileNav from "@/components/layout/MobileNav";
import { Suspense } from "react";
import { useTenant } from "@/lib/tenant-context";

// Paths that render full-screen with no sidebar shell (auth pages, test-taking)
const NO_SHELL_PATHS = ["/login", "/signup"];

export default function AppShell({ children }: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();
  const tenant = useTenant();

  const domainPrefix = tenant.domain ? `/${tenant.domain}` : "";

  // Strip domain prefix to get the clean path for route checks
  const cleanPath = domainPrefix
    ? pathname.replace(new RegExp(`^${domainPrefix}`), "") || "/"
    : pathname;

  // Full-screen routes: login/signup/invite, the live test page, and the root
  // On `test.localhost/test/{id}`, the tenant slug and the route segment are both
  // named "test". Checking only cleanPath can therefore strip the route segment
  // and leave just the UUID. Test every available pathname representation.
  const testRoutePattern = /\/(?:test\/|institute\/tests\/view\/|student\/dpps\/take\/)/;
  const isTestRoute = testRoutePattern.test(pathname) || testRoutePattern.test(cleanPath);
  const isAuthRoute =
    cleanPath === "/" ||
    NO_SHELL_PATHS.some((r) => cleanPath === r || cleanPath.startsWith(r + "/"));

  // Superadmin routes have their own layout (with Sidebar) — don't double-wrap them.
  // This covers two cases:
  // 1. Direct path access: /superadmin/* (when accessed without subdomain)
  // 2. Admin subdomain: admin.localhost or admin.classphere.com — middleware rewrites internally
  //    but usePathname() still returns the browser URL, so we detect via hostname instead.
  const isSuperAdminRoute = cleanPath.startsWith("/superadmin");
  const isAdminSubdomain =
    typeof window !== "undefined" &&
    (/^admin\./.test(window.location.hostname) || window.location.hostname === "admin.localhost");

  if (isTestRoute || isAuthRoute || isSuperAdminRoute || isAdminSubdomain) {
    return (
      <div className="min-h-screen w-full overflow-x-clip bg-b-surface1 text-t-primary">
        {children}
      </div>
    );
  }

  return (
    <div className="relative isolate flex min-h-screen w-full overflow-x-clip bg-b-surface1 text-t-primary flex-col lg:flex-row">
      <Suspense
        fallback={
          <div className="hidden lg:flex h-screen w-[280px] xl:w-[300px] shrink-0 bg-b-surface1 border-r border-transparent" />
        }
      >
        <Sidebar />
        <MobileNav />
      </Suspense>
      <div className="relative z-10 flex min-w-0 flex-1 flex-col bg-b-surface1 h-[calc(100dvh-64px)] lg:h-screen overflow-y-auto overflow-x-hidden">
        {children}
      </div>
    </div>
  );
}
