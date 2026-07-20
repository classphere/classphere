"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import {
  RiDashboardLine,
  RiFlashlightFill,
  RiBookOpenLine,
  RiTrophyLine,
  RiSettings4Line,
  RiInformationLine,
  RiTeamLine,
  RiBarChartBoxLine,
  RiBankCardLine,
  RiBuilding4Line,
  RiUserStarLine,
  RiUser3Line,
  RiLineChartLine,
  RiLifebuoyLine,
  RiFileList3Line,
  RiBookmarkLine,
  RiFileListLine,
  RiSunLine,
  RiMoonLine,
  RiMailLine,
  RiNotification3Line,
  RiLogoutBoxLine,
  RiBrainLine,
  RiMoneyDollarCircleLine,
  RiUploadCloud2Line,
  RiShieldCheckLine,
} from "@remixicon/react";
import { useAuth } from "@/lib/auth-context";
import { useTenant } from "@/lib/tenant-context";
import { NotificationBell } from "@/components/notifications/NotificationBell";

export default function Sidebar() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const tenant = useTenant();

  // ── Domain-aware path helpers ──────────────────────────────────────────────
  // usePathname() in Next.js App Router returns the rewritten path (with domain prefix)
  // e.g. on test.classphere.com/student/dashboard → pathname = /test/student/dashboard
  // We strip the prefix to get the clean path for active-state comparison,
  // but href links use clean paths (no prefix) because the middleware rewrites transparently.

  const domainPrefix = tenant.domain ? `/${tenant.domain}` : "";
  const cleanPath = domainPrefix && pathname.startsWith(domainPrefix)
    ? pathname.slice(domainPrefix.length) || "/"
    : pathname;

  // ── Role detection ────────────────────────────────────────────────────────
  // IMPORTANT: On subdomains (admin.localhost, admin.classphere.com), the middleware
  // rewrites paths server-side but usePathname() still returns the BROWSER URL (e.g. "/")
  // not the internal rewritten path ("/superadmin"). So path-based detection fails for
  // subdomain tenants. Use user.role from AuthContext as the primary source of truth.
  const userRole = user?.role ?? null;

  // For active-link highlighting, also check the path (works when there's no subdomain)
  const roleFromPath = cleanPath.startsWith("/teacher")
    ? "teacher"
    : cleanPath.startsWith("/test-department")
    ? "test_department"
    : cleanPath.startsWith("/institute")
    ? "institute_admin"
    : cleanPath.startsWith("/superadmin")
    ? "super_admin"
    : null;

  // Path fallback exists only during the short unauthenticated hydration
  // window. Once a user role is known, the typed URL must not change the nav.
  const isSuperAdmin = userRole ? userRole === "super_admin" : roleFromPath === "super_admin";
  const isTeacher    = userRole ? userRole === "teacher" : roleFromPath === "teacher";
  const isInstitute  = userRole ? userRole === "institute_admin" : roleFromPath === "institute_admin";
  const isTestDepartment = userRole
    ? userRole === "test_department_head" || userRole === "test_department_member"
    : roleFromPath === "test_department";

  // ── Theme ─────────────────────────────────────────────────────────────────
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") as "light" | "dark";
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.setAttribute("data-theme", savedTheme);
    } else {
      const currentTheme =
        (document.documentElement.getAttribute("data-theme") as
          | "light"
          | "dark") || "light";
      setTheme(currentTheme);
    }
  }, []);

  const toggleTheme = (newTheme: "light" | "dark") => {
    setTheme(newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
    localStorage.setItem("theme", newTheme);
  };

  // ── Nav definitions ───────────────────────────────────────────────────────
  const studentNav = [
    { label: "Dashboard",    href: "/student/dashboard",       icon: <RiDashboardLine size={18} />,  active: cleanPath.startsWith("/student/dashboard") || cleanPath === "/student" },
    { label: "Tests Hub",    href: "/student/tests",           icon: <RiFileList3Line size={18} />,  active: cleanPath.startsWith("/student/tests") },
    { label: "My DPPs",      href: "/student/assignments",     icon: <RiFileListLine size={18} />,   active: cleanPath.startsWith("/student/assignments") },
    { label: "Test History", href: "/student/history",         icon: <RiBookOpenLine size={18} />,   active: cleanPath.startsWith("/student/history") },
    { label: "Mistake Diary",href: "/student/mistakes",        icon: <RiBookmarkLine size={18} />,   active: cleanPath.startsWith("/student/mistakes") },
    { label: "Analytics",   href: "/student/analytics",       icon: <RiLineChartLine size={18} />,  active: cleanPath.startsWith("/student/analytics") },
    { label: "Leaderboard", href: "/student/leaderboard",     icon: <RiTrophyLine size={18} />,     active: cleanPath.startsWith("/student/leaderboard") },
  ];

  const teacherNav = [
    { label: "Dashboard", href: "/teacher",           icon: <RiDashboardLine size={18} />,    active: cleanPath === "/teacher" },
    { label: "My Batches",href: "/teacher/batch",     icon: <RiTeamLine size={18} />,         active: cleanPath.startsWith("/teacher/batch") },
    { label: "DPPs",      href: "/teacher/dpps",      icon: <RiFileListLine size={18} />,     active: cleanPath.startsWith("/teacher/dpps") },
    { label: "Analytics", href: "/teacher/analytics", icon: <RiBarChartBoxLine size={18} />,  active: cleanPath.startsWith("/teacher/analytics") },
    { label: "Doubts",    href: "/teacher/doubts",    icon: <RiInformationLine size={18} />,  active: cleanPath.startsWith("/teacher/doubts") },
  ];

  const instituteNav = [
    { label: "Dashboard", href: "/institute",          icon: <RiDashboardLine size={18} />,    active: cleanPath === "/institute" },
    { label: "Batches",   href: "/institute/batches",  icon: <RiTeamLine size={18} />,         active: cleanPath.startsWith("/institute/batches") },
    { label: "Faculty",   href: "/institute/faculty",  icon: <RiUserStarLine size={18} />,     active: cleanPath.startsWith("/institute/faculty") },
    { label: "Students",  href: "/institute/students", icon: <RiUser3Line size={18} />,        active: cleanPath.startsWith("/institute/students") },
    { label: "Reports",   href: "/institute/reports",  icon: <RiBarChartBoxLine size={18} />,  active: cleanPath.startsWith("/institute/reports") },
    { label: "Tests",     href: "/institute/tests",    icon: <RiFileList3Line size={18} />,    active: cleanPath.startsWith("/institute/tests") },
    { label: "Test Department", href: "/test-department/team", icon: <RiShieldCheckLine size={18} />, active: cleanPath.startsWith("/test-department") },
    { label: "Billing",   href: "/institute/billing",  icon: <RiBankCardLine size={18} />,     active: cleanPath.startsWith("/institute/billing") },
    { label: "Support",   href: "/institute/support",  icon: <RiLifebuoyLine size={18} />,     active: cleanPath.startsWith("/institute/support") },
  ];

  const testDepartmentNav = [
    { label: "Test Workspace", href: "/test-department", icon: <RiDashboardLine size={18} />, active: cleanPath === "/test-department" },
    { label: "Review Queue", href: "/test-department?status=needs_review", icon: <RiShieldCheckLine size={18} />, active: cleanPath === "/test-department" },
    { label: "Study Material", href: "/test-department/resources", icon: <RiBookOpenLine size={18} />, active: cleanPath.startsWith("/test-department/resources") },
  ];

  const superadminNav = [
    { label: "Overview",      href: "/superadmin",                  icon: <RiDashboardLine size={18} />,    active: cleanPath === "/superadmin" },
    { label: "Institutes",    href: "/superadmin/institutes",       icon: <RiBuilding4Line size={18} />,    active: cleanPath.startsWith("/superadmin/institutes") },
    { label: "Questions Bank",href: "/superadmin/questions",        icon: <RiBrainLine size={18} />,        active: cleanPath === "/superadmin/questions" && !cleanPath.includes("upload") },
    { label: "Bulk Upload",   href: "/superadmin/questions/upload", icon: <RiUploadCloud2Line size={18} />, active: cleanPath.startsWith("/superadmin/questions/upload") },
    { label: "Analytics",     href: "/superadmin/analytics",       icon: <RiLineChartLine size={18} />,    active: cleanPath.startsWith("/superadmin/analytics") },
    { label: "Revenue",       href: "/superadmin/revenue",         icon: <RiMoneyDollarCircleLine size={18} />, active: cleanPath.startsWith("/superadmin/revenue") },
    { label: "Support",       href: "/superadmin/support",         icon: <RiLifebuoyLine size={18} />,     active: cleanPath.startsWith("/superadmin/support") },
    { label: "Configuration", href: "/superadmin/configuration",   icon: <RiSettings4Line size={18} />,    active: cleanPath.startsWith("/superadmin/configuration") },
  ];

  // Always use the role flags (which already incorporate both user.role and path fallback)
  const currentNav = isSuperAdmin ? superadminNav
    : isTeacher ? teacherNav
    : isTestDepartment ? testDepartmentNav
    : isInstitute ? instituteNav
    : studentNav;

  const othersNav = [
    { label: "Settings", path: "/settings", href: "/settings", icon: <RiSettings4Line size={18} /> },
    { label: "Help",     path: "/help",     href: "/help",     icon: <RiInformationLine size={18} /> },
  ];

  const displayName = tenant.instituteName ?? "Classphere";
  const displayDomain = tenant.domain
    ? (tenant.domain.includes(".") ? tenant.domain : `${tenant.domain}.classphere.com`)
    : null;

  return (
    <aside className="hidden lg:flex sticky top-0 z-40 h-screen w-[280px] xl:w-[300px] shrink-0 flex-col bg-b-surface1 border-r border-transparent px-4 xl:px-5 pt-8 pb-12 select-none overflow-y-auto scrollbar-none">

      {/* ── Top: Logo ── */}
      <div className="flex flex-col gap-6 w-full">
        <div className="pl-1">
          <Link href={isSuperAdmin ? "/" : isTestDepartment ? "/test-department" : isInstitute ? "/institute" : isTeacher ? "/teacher" : "/student/dashboard"} className="flex items-center gap-3.5 rounded-[10px] transition-colors">
            <img
              src={tenant.logoUrl ?? "/logo.png"}
              alt={displayName}
              className="size-12 rounded-[10px] object-contain bg-b-surface2 border border-s-stroke2/50 shadow-widget"
            />
            <div className="flex flex-col min-w-0">
              <span className="font-sans text-[16px] font-bold text-t-primary dark:text-t-primary tracking-tight leading-tight truncate">
                {displayName}
              </span>
              {displayDomain && (
                <span className="text-[11px] text-t-tertiary font-medium truncate">
                  {displayDomain}
                </span>
              )}
            </div>
          </Link>
        </div>

        {/* ── Main Nav ── */}
        <div className="flex flex-col gap-2 w-full">
          <nav className="flex flex-col gap-1 w-full">
            {currentNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`group relative flex h-11 items-center gap-3 rounded-[10px] px-4 text-[13px] font-sans font-semibold transition-all overflow-hidden ${
                  item.active
                    ? "bg-b-surface2 text-t-primary border border-s-stroke2/60 shadow-widget"
                    : "text-t-secondary hover:text-t-primary hover:bg-[rgba(0,0,0,0.04)] dark:hover:bg-b-surface2"
                }`}
              >
                {item.active && (
                  <i className="absolute -right-3 top-0 h-3 w-28 rotate-[125deg] rounded-full bg-white/10 blur-[3px] pointer-events-none dark:hidden" />
                )}
                <span className={`relative z-10 flex items-center transition-colors ${item.active ? "text-t-primary" : "text-t-secondary group-hover:text-t-primary"}`}>
                  {item.icon}
                </span>
                <span className="relative z-10">{item.label}</span>
              </Link>
            ))}
          </nav>
        </div>

        {/* ── Others ── */}
        <div className="flex flex-col gap-2 w-full">
          <div className="text-[10px] font-bold tracking-wider text-t-secondary pl-3 uppercase">Others</div>
          <nav className="flex flex-col gap-1 w-full">
            {othersNav.map((item) => {
              const isActive = cleanPath.startsWith(item.path);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`group relative flex h-11 items-center gap-3 rounded-[10px] px-4 text-[13px] font-sans font-semibold transition-all overflow-hidden ${
                    isActive
                      ? "bg-b-surface2 text-t-primary border border-s-stroke2/60 shadow-widget"
                      : "text-t-secondary hover:text-t-primary hover:bg-[rgba(0,0,0,0.04)] dark:hover:bg-b-surface2"
                  }`}
                >
                  {isActive && (
                    <i className="absolute -right-3 top-0 h-3 w-28 rotate-[125deg] rounded-full bg-white/10 blur-[3px] pointer-events-none dark:hidden" />
                  )}
                  <span className={`relative z-10 flex items-center transition-colors ${isActive ? "text-t-primary" : "text-t-secondary group-hover:text-t-primary"}`}>
                    {item.icon}
                  </span>
                  <span className="relative z-10">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* ── Bottom: Profile + Actions ── */}
      <div className="mt-auto flex flex-col gap-5 w-full pt-6 border-t border-s-stroke2/20 shrink-0">
        <Link
          href="/profile"
          className="flex items-center gap-3 w-full p-2.5 rounded-[10px] bg-transparent hover:bg-b-surface2 border border-transparent transition-all cursor-pointer select-none"
        >
          <div className="size-11 rounded-full overflow-hidden shrink-0 shadow-widget bg-b-surface2 border border-s-stroke2/50">
            {mounted && (
              <img
                src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name ?? "User")}&background=101010&color=fff&size=80`}
                alt="Avatar"
                className="w-full h-full object-cover"
              />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-sans font-semibold text-[13px] text-t-primary truncate leading-tight">
              {mounted ? (user?.name ?? "—") : ""}
            </div>
            <div className="font-sans text-[11px] text-t-tertiary truncate mt-0.5 leading-none capitalize">
              {mounted ? (user?.role?.replace("_", " ") ?? "") : ""}
            </div>
          </div>
        </Link>

        <button
          onClick={() => signOut()}
          className="flex items-center gap-3 w-full px-4 h-12 rounded-[10px] text-primary-03 hover:bg-[rgba(255,106,85,0.05)] border border-transparent hover:border-s-stroke2/40 transition-all text-[13px] font-sans font-semibold cursor-pointer"
        >
          <RiLogoutBoxLine size={18} />
          Sign Out
        </button>

        {/* Theme + Notification row */}
        <div className="flex flex-row items-center gap-3 w-full">
          <NotificationBell />

          <button className="relative flex size-12 items-center justify-center rounded-full bg-b-surface2 border border-s-stroke2 transition-all active:scale-95 shadow-widget hover:border-s-highlight cursor-pointer shrink-0 text-t-secondary hover:text-t-primary">
            <RiMailLine size={20} />
          </button>

          <div className="flex flex-row items-center bg-b-surface2 border border-s-stroke2 rounded-[10px] p-1 h-12 flex-1 relative select-none shadow-widget">
            <button
              onClick={() => toggleTheme("light")}
              className={`flex-1 flex items-center justify-center h-10 rounded-[10px] transition-all cursor-pointer text-t-secondary ${theme === "light" ? "bg-b-surface1 text-t-primary font-bold shadow-depth" : "hover:text-t-primary"}`}
              title="Light Mode"
            >
              <RiSunLine size={18} />
            </button>
            <button
              onClick={() => toggleTheme("dark")}
              className={`flex-1 flex items-center justify-center h-10 rounded-[10px] transition-all cursor-pointer text-t-secondary ${theme === "dark" ? "bg-b-surface1 text-t-primary font-bold shadow-depth" : "hover:text-t-primary"}`}
              title="Dark Mode"
            >
              <RiMoonLine size={18} />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
