"use client";

import { usePathname, useRouter } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import MobileNav from "@/components/layout/MobileNav";
import { Suspense, useEffect } from "react";
import { useTenant } from "@/lib/tenant-context";
import { useAuth } from "@/lib/auth-context";
import { NotificationRealtimeBridge } from "@/components/notifications/NotificationRealtimeBridge";
import { NativePushRegistration } from "@/components/notifications/NativePushRegistration";

// Paths that render full-screen with no sidebar shell (auth pages, test-taking)
const NO_SHELL_PATHS = ["/login", "/signup"];

export default function AppShell({ children }: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();
  const router = useRouter();
  const tenant = useTenant();
  const { user, loading, authRole } = useAuth();

  // Prefer the role read straight off the JWT (instant, no network wait) and
  // fall back to the full profile fetch until the Supabase custom-claims hook
  // is enabled — see auth-context.tsx. `roleReady`/`hasIdentity` mirror exactly
  // what `loading`/`user` meant before this fallback existed, so behavior is
  // unchanged until the hook goes live.
  const effectiveRole = authRole?.role ?? user?.role;
  const roleReady = Boolean(authRole) || !loading;
  const hasIdentity = Boolean(authRole) || Boolean(user);

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

  const isTestDepartment = effectiveRole === "test_department_head" || effectiveRole === "test_department_member";
  const deniedRoleRoute = hasIdentity && (
    cleanPath.startsWith("/institute/resources") ||
    (cleanPath.startsWith("/institute") && effectiveRole !== "institute_admin") ||
    (cleanPath.startsWith("/teacher") && effectiveRole !== "teacher") ||
    (cleanPath.startsWith("/student") && effectiveRole !== "student") ||
    (cleanPath.startsWith("/test-department") && !isTestDepartment)
  );

  const homeForRole = () => {
    if (effectiveRole === "institute_admin") return "/institute";
    if (effectiveRole === "teacher") return "/teacher";
    if (isTestDepartment) return "/test-department";
    return "/student/dashboard";
  };

  // Do not let protected route content flash before AuthProvider completes its
  // redirect. This is intentionally duplicated with AuthProvider's navigation
  // rule: this component controls whether a page may render at all.
  const protectedRoleRoute = cleanPath.startsWith("/institute") || cleanPath.startsWith("/teacher") || cleanPath.startsWith("/student") || cleanPath.startsWith("/test-department");
  useEffect(() => {
    if (!protectedRoleRoute || !roleReady) return;
    if (!hasIdentity) router.replace("/login");
    else if (deniedRoleRoute) router.replace(homeForRole());
  }, [protectedRoleRoute, roleReady, hasIdentity, deniedRoleRoute, router]);

  if (protectedRoleRoute && (!roleReady || !hasIdentity || deniedRoleRoute)) {
    return <div className="min-h-screen w-full bg-b-surface1" aria-busy="true" />;
  }

  if (isTestRoute || isAuthRoute || isSuperAdminRoute || isAdminSubdomain) {
    return (
      <div className="min-h-screen w-full overflow-x-clip bg-b-surface1 text-t-primary">
        {children}
      </div>
    );
  }

  return (
    <div className="relative isolate flex min-h-screen w-full overflow-x-clip bg-b-surface1 text-t-primary flex-col lg:flex-row">
      <NotificationRealtimeBridge />
      <NativePushRegistration />
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
