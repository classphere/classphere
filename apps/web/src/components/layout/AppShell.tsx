"use client";

import { usePathname } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import { Suspense } from "react";

// Routes that render without the sidebar shell (full-screen auth pages)
const NO_SHELL_ROUTES = ["/login", "/signup", "/superadmin/login"];

export default function AppShell({ children }: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();
  const isTestRoute = pathname?.startsWith("/test/");
  const isAuthRoute = NO_SHELL_ROUTES.some((r) => pathname === r || pathname?.startsWith(r));

  if (isTestRoute || isAuthRoute) {
    return (
      <div className="min-h-screen w-full overflow-x-clip bg-b-surface1 text-t-primary">
        {children}
      </div>
    );
  }

  return (
    <div className="relative isolate flex min-h-screen w-full overflow-x-clip bg-b-surface1 text-t-primary">
      <Suspense fallback={<div className="hidden md:flex h-screen w-[300px] shrink-0 border-r border-s-stroke2/40 bg-b-surface1" />}>
        <Sidebar />
      </Suspense>
      <div className="relative z-10 flex min-w-0 flex-1 flex-col gap-6 pt-4">
        {children}
      </div>
    </div>
  );
}