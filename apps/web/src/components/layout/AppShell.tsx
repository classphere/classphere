"use client";

import { usePathname } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";

export default function AppShell({ children }: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();
  const isTestRoute = pathname?.startsWith("/test/");

  if (isTestRoute) {
    return (
      <div className="min-h-screen w-full overflow-x-clip bg-b-surface1 text-t-primary">
        {children}
      </div>
    );
  }

  return (
    <div className="relative isolate flex min-h-screen w-full overflow-x-clip">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(42,133,255,0.09),transparent_32%),radial-gradient(circle_at_top_right,rgba(0,166,86,0.07),transparent_28%),linear-gradient(to_bottom,rgba(253,253,253,0.65),transparent_38%)] dark:bg-[radial-gradient(circle_at_top_left,rgba(42,133,255,0.14),transparent_30%),radial-gradient(circle_at_top_right,rgba(0,166,86,0.10),transparent_26%),linear-gradient(to_bottom,rgba(16,16,16,0.65),transparent_40%)]" />
      <Sidebar />
      <div className="relative z-10 flex min-w-0 flex-1 flex-col gap-6 pt-4">
        {children}
      </div>
    </div>
  );
}