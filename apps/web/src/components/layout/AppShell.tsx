"use client";

import { usePathname } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import { Suspense } from "react";

// Routes that render without the sidebar shell (full-screen auth pages and landing page)
const NO_SHELL_ROUTES = ["/", "/login", "/signup", "/superadmin/login"];

export default function AppShell({ children }: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();
  const isTestRoute = pathname?.startsWith("/test/");
  const isAuthRoute = NO_SHELL_ROUTES.some((r) => {
    if (r === "/") return pathname === "/";
    return pathname === r || pathname?.startsWith(r + "/");
  });

  if (isTestRoute || isAuthRoute) {
    return (
      <div className="min-h-screen w-full overflow-x-clip bg-[#edecec] dark:bg-[#090909] text-t-primary">
        {children}
      </div>
    );
  }

  return (
    <div className="relative isolate flex min-h-screen w-full overflow-x-clip bg-[#edecec] dark:bg-[#090909] text-t-primary">
      <Suspense fallback={<div className="hidden md:flex h-screen w-[280px] xl:w-[300px] shrink-0 bg-[#edecec] dark:bg-[#0f0f0f] border-r border-transparent dark:border-[#1e1e1e]" />}>
        <Sidebar />
      </Suspense>
      <div className="relative z-10 flex min-w-0 flex-1 flex-col bg-[#edecec] dark:bg-[#090909]">
        {children}
      </div>
    </div>
  );
}