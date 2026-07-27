"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import Sidebar from "@/components/layout/Sidebar";
import MobileNav from "@/components/layout/MobileNav";

export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading } = useAuth();

  // The login page lives at /superadmin/login (same layout tree) but must be public.
  const isLoginPage = pathname === "/superadmin/login" || pathname === "/login";

  // Auth guard — always call this hook unconditionally (React rules)
  // Middleware rewrites admin.classphere.com/login → /superadmin/login internally
  useEffect(() => {
    if (isLoginPage) return; // don't guard the login page itself
    if (loading) return;
    if (!user || user.role !== "super_admin") {
      router.replace("/login");
    }
  }, [user, loading, router, isLoginPage]);

  // If this is the login page, render it directly — no auth guard, no sidebar.
  if (isLoginPage) {
    return <>{children}</>;
  }

  // Show nothing while loading / redirecting
  if (loading || !user || user.role !== "super_admin") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-b-surface1">
        <span className="size-8 border-2 border-primary-01/30 border-t-primary-01 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-b-surface1 font-manrope lg:flex-row">
      <Sidebar />
      <MobileNav />
      <div className="flex h-[calc(100dvh-64px)] min-w-0 flex-1 flex-col overflow-x-hidden overflow-y-auto lg:h-screen">
        {children}
      </div>
    </div>
  );
}

