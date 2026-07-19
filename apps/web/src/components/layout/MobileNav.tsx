"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import {
  RiMenu3Line,
  RiCloseLine,
  RiFlashlightFill,
  RiDashboardLine,
  RiBookOpenLine,
  RiTrophyLine,
  RiSettings4Line,
  RiInformationLine,
  RiTeamLine,
  RiBarChartBoxLine,
  RiBankCardLine,
  RiDatabase2Line,
  RiBuilding4Line,
  RiUserStarLine,
  RiUser3Line,
  RiLineChartLine,
  RiMoneyDollarCircleLine,
  RiToggleLine,
  RiLifebuoyLine,
  RiFileList3Line,
  RiBookmarkLine,
  RiFileListLine,
  RiSunLine,
  RiMoonLine,
  RiMailLine,
  RiNotification3Line,
  RiUploadCloud2Line,
  RiLogoutBoxLine
} from "@remixicon/react";
import { useAuth } from "@/lib/auth-context";
import { useTenant } from "@/lib/tenant-context";

export default function MobileNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user, signOut } = useAuth();
  const tenant = useTenant();
  const [isOpen, setIsOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);

  // Close the drawer when the route changes
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      const focusTimer = window.setTimeout(() => {
        drawerRef.current?.querySelector<HTMLElement>("[data-drawer-close]")?.focus();
      }, 0);
      return () => {
        window.clearTimeout(focusTimer);
        document.body.style.overflow = "unset";
      };
    } else {
      document.body.style.overflow = "unset";
    }
    return () => { document.body.style.overflow = "unset"; };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setIsOpen(false);
        menuButtonRef.current?.focus();
        return;
      }
      if (event.key !== "Tab" || !drawerRef.current) return;
      const focusable = Array.from(drawerRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      ));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isOpen]);

  const closeDrawer = () => {
    setIsOpen(false);
    window.setTimeout(() => menuButtonRef.current?.focus(), 0);
  };

  // ── Domain-aware path helpers ──────────────────────────────────────────────
  const domainPrefix = tenant.domain ? `/${tenant.domain}` : "";
  const cleanPath = domainPrefix && pathname.startsWith(domainPrefix)
    ? pathname.slice(domainPrefix.length) || "/"
    : pathname;

  const roleFromQuery = process.env.NODE_ENV !== "production" ? searchParams.get("role") : null;
  const roleFromPath = cleanPath.startsWith("/teacher")
    ? "teacher"
    : cleanPath.startsWith("/institute")
      ? "institute_admin"
      : cleanPath.startsWith("/superadmin")
        ? "super_admin"
        : null;
        
  const inferredRole = roleFromQuery === "teacher"
    ? "teacher"
    : roleFromQuery === "institute_admin"
      ? "institute_admin"
      : roleFromQuery === "super_admin"
        ? "super_admin"
    : roleFromPath ?? user?.role ?? "student";

  const isTeacher = cleanPath.startsWith("/teacher") || inferredRole === "teacher";
  const isInstitute = cleanPath.startsWith("/institute") || inferredRole === "institute_admin";
  const isSuperAdmin = cleanPath.startsWith("/superadmin") || inferredRole === "super_admin";

  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const savedTheme = localStorage.getItem("theme") as "light" | "dark";
    if (savedTheme) {
      setTheme(savedTheme);
    } else {
      const currentTheme = document.documentElement.getAttribute("data-theme") as "light" | "dark" || "light";
      setTheme(currentTheme);
    }
  }, []);

  const toggleTheme = (newTheme: "light" | "dark") => {
    setTheme(newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
    localStorage.setItem("theme", newTheme);
  };

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
    { label: "Dashboard", href: "/teacher",          icon: <RiDashboardLine size={18} />,  active: cleanPath === "/teacher" },
    { label: "My Batches", href: "/teacher/batch",   icon: <RiTeamLine size={18} />,       active: cleanPath.startsWith("/teacher/batch") },
    { label: "DPPs",      href: "/teacher/dpps",     icon: <RiFileListLine size={18} />,   active: cleanPath.startsWith("/teacher/dpps") },
    { label: "Analytics", href: "/teacher/analytics",icon: <RiBarChartBoxLine size={18} />,active: cleanPath.startsWith("/teacher/analytics") },
    { label: "Doubts",    href: "/teacher/doubts",   icon: <RiInformationLine size={18} />,active: cleanPath.startsWith("/teacher/doubts") },
  ];

  const instituteNav = [
    { label: "Dashboard", href: "/institute", icon: <RiDashboardLine size={18} />, active: cleanPath === "/institute" },
    { label: "Batches", href: "/institute/batches", icon: <RiTeamLine size={18} />, active: cleanPath.startsWith("/institute/batches") },
    { label: "Faculty", href: "/institute/faculty", icon: <RiUserStarLine size={18} />, active: cleanPath.startsWith("/institute/faculty") },
    { label: "Students", href: "/institute/students", icon: <RiUser3Line size={18} />, active: cleanPath.startsWith("/institute/students") },
    { label: "Reports", href: "/institute/reports", icon: <RiBarChartBoxLine size={18} />, active: cleanPath.startsWith("/institute/reports") },
    { label: "Tests", href: "/institute/tests", icon: <RiFileList3Line size={18} />, active: cleanPath.startsWith("/institute/tests") },
    { label: "Billing", href: "/institute/billing", icon: <RiBankCardLine size={18} />, active: cleanPath.startsWith("/institute/billing") },
    { label: "Support", href: "/institute/support", icon: <RiLifebuoyLine size={18} />, active: cleanPath.startsWith("/institute/support") },
  ];

  const superAdminNav = [
    { label: "Platform Health", href: "/superadmin", icon: <RiDashboardLine size={18} />, active: cleanPath === "/superadmin" },
    { label: "Global Analytics", href: "/superadmin/analytics", icon: <RiLineChartLine size={18} />, active: cleanPath.startsWith("/superadmin/analytics") },
    { label: "Revenue", href: "/superadmin/revenue", icon: <RiMoneyDollarCircleLine size={18} />, active: cleanPath.startsWith("/superadmin/revenue") },
    { label: "Questions", href: "/superadmin/questions", icon: <RiDatabase2Line size={18} />, active: cleanPath === "/superadmin/questions" },
    { label: "Upload", href: "/superadmin/questions/upload", icon: <RiUploadCloud2Line size={18} />, active: cleanPath.startsWith("/superadmin/questions/upload") },
    { label: "Institutes", href: "/superadmin/institutes", icon: <RiBuilding4Line size={18} />, active: cleanPath.startsWith("/superadmin/institutes") },
    { label: "Configuration", href: "/superadmin/configuration", icon: <RiToggleLine size={18} />, active: cleanPath.startsWith("/superadmin/configuration") },
    { label: "Support", href: "/superadmin/support", icon: <RiLifebuoyLine size={18} />, active: cleanPath.startsWith("/superadmin/support") },
  ];

  const currentNav = mounted 
    ? (isTeacher ? teacherNav : isInstitute ? instituteNav : isSuperAdmin ? superAdminNav : studentNav)
    : (cleanPath.startsWith("/teacher") ? teacherNav : cleanPath.startsWith("/institute") ? instituteNav : cleanPath.startsWith("/superadmin") ? superAdminNav : studentNav);

  const activeTeacher = mounted ? isTeacher : cleanPath.startsWith("/teacher");
  const activeInstitute = mounted ? isInstitute : cleanPath.startsWith("/institute");
  const activeSuperAdmin = mounted ? isSuperAdmin : cleanPath.startsWith("/superadmin");

  const roleQuery = activeTeacher ? "?role=teacher" : activeInstitute ? "?role=institute_admin" : activeSuperAdmin ? "?role=super_admin" : "?role=student";

  const othersNav = [
    { label: "Settings", path: "/settings", href: "/settings", icon: <RiSettings4Line size={18} /> },
    { label: "Help Me", path: "/help", href: "/help", icon: <RiInformationLine size={18} /> },
  ];

  const displayName = tenant.instituteName ?? "Classphere";

  return (
    <>
      {/* ── Mobile Top Bar ── */}
      <div className="lg:hidden sticky top-0 z-40 flex items-center justify-between w-full h-16 px-4 bg-[#edecec] dark:bg-[#090909] bg-opacity-90 dark:bg-opacity-90 shrink-0">
        <Link href={isSuperAdmin ? "/superadmin" : (isTeacher ? "/teacher" : (isInstitute ? "/institute" : "/student/dashboard"))} className="flex items-center gap-3">
          {tenant.logoUrl ? (
            <img
              src={tenant.logoUrl}
              alt={displayName}
              className="size-9 rounded-[8px] object-contain bg-shade-02 shadow-sm"
            />
          ) : (
            <div className="flex size-9 items-center justify-center rounded-[8px] bg-shade-02 text-t-light shadow-[inset_0px_1px_1px_rgba(214,214,214,0.25),inset_0px_-1px_2px_rgba(0,0,0,0.53)] shrink-0">
              <RiFlashlightFill size={18} className="opacity-90" />
            </div>
          )}
          <span className="font-sans text-[18px] font-bold text-t-primary tracking-tight">
            {displayName}
          </span>
        </Link>
        <button
          ref={menuButtonRef}
          type="button"
          aria-label="Open navigation menu"
          aria-expanded={isOpen}
          aria-controls="mobile-navigation-drawer"
          onClick={() => setIsOpen(true)}
          className="flex items-center justify-center size-10 rounded-[10px] bg-b-surface1 border border-s-stroke2/40 text-t-primary shadow-[0_2px_4px_-1px_rgba(0,0,0,0.05)] active:scale-95 transition-all"
        >
          <RiMenu3Line size={20} />
        </button>
      </div>

      {/* ── Mobile Drawer (Slide in from right) ── */}
      {isOpen && (
        <button
          type="button"
          aria-label="Close navigation menu"
          className="lg:hidden fixed inset-0 z-50 cursor-default bg-black/40 backdrop-blur-[2px] transition-opacity"
          onClick={closeDrawer}
        />
      )}

      {isOpen && <div
        id="mobile-navigation-drawer"
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        className="lg:hidden fixed top-0 right-0 z-50 h-[100dvh] w-[85vw] max-w-[320px] bg-[#edecec] dark:bg-[#0f0f0f] border-l border-s-stroke2/20 flex flex-col shadow-2xl animate-in slide-in-from-right duration-200"
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between px-5 h-16 border-b border-s-stroke2/20 shrink-0">
          <span className="font-sans text-[15px] font-bold text-t-primary tracking-tight">
            Menu
          </span>
          <button
            type="button"
            data-drawer-close
            aria-label="Close navigation menu"
            onClick={closeDrawer}
            className="flex items-center justify-center size-8 rounded-full bg-b-surface1 border border-s-stroke2/40 text-t-secondary hover:text-t-primary transition-colors active:scale-95"
          >
            <RiCloseLine size={22} />
          </button>
        </div>

        {/* Drawer Content */}
        <div className="flex-1 overflow-y-auto px-4 py-6 scrollbar-none flex flex-col gap-6">
          <div className="flex flex-col gap-2 w-full">
            <nav className="flex flex-col gap-1 w-full">
              {currentNav.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className={`group relative flex h-12 items-center gap-3.5 rounded-[12px] px-4 text-[14px] font-sans font-semibold transition-all overflow-hidden ${
                    item.active
                      ? "bg-[linear-gradient(342.29deg,#070707_12.1%,#2F2E31_87.9%)] text-white shadow-md border border-[#161616]"
                      : "text-t-secondary active:bg-[rgba(0,0,0,0.04)] dark:active:bg-white/5"
                  }`}
                >
                  <span className={`flex items-center transition-colors ${item.active ? "text-white" : "text-t-secondary"}`}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </Link>
              ))}
            </nav>
          </div>

          <div className="flex flex-col gap-2 w-full">
            <div className="text-[11px] font-bold tracking-wider text-t-secondary pl-3 uppercase">
              Others
            </div>
            <nav className="flex flex-col gap-1 w-full">
              {othersNav.map((item) => {
                const isActive = cleanPath.startsWith(item.path);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`group relative flex h-12 items-center gap-3.5 rounded-[12px] px-4 text-[14px] font-sans font-semibold transition-all overflow-hidden ${
                      isActive
                        ? "bg-[linear-gradient(342.29deg,#070707_12.1%,#2F2E31_87.9%)] text-white shadow-md border border-[#161616]"
                        : "text-t-secondary active:bg-[rgba(0,0,0,0.04)] dark:active:bg-white/5"
                    }`}
                  >
                    <span className={`flex items-center transition-colors ${isActive ? "text-white" : "text-t-secondary"}`}>
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Drawer Footer */}
        <div className="mt-auto flex flex-col gap-4 w-full px-4 pt-4 pb-6 border-t border-s-stroke2/20 bg-b-surface1 dark:bg-[#0f0f0f] shrink-0">
          <div className="flex flex-row items-center gap-3 w-full">
            <div className="flex flex-row items-center bg-b-surface2 border border-s-stroke2 rounded-[12px] p-1 h-12 flex-1 relative shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)]">
              <button
                onClick={() => toggleTheme("light")}
                className={`flex-1 flex items-center justify-center h-10 rounded-[10px] transition-all text-t-secondary ${
                  theme === "light" ? "bg-b-surface1 text-t-primary font-bold shadow-[0_1px_3px_rgba(0,0,0,0.1)] border border-s-stroke2/40" : ""
                }`}
              >
                <RiSunLine size={18} />
              </button>
              <button
                onClick={() => toggleTheme("dark")}
                className={`flex-1 flex items-center justify-center h-10 rounded-[10px] transition-all text-t-secondary ${
                  theme === "dark" ? "bg-b-surface1 text-t-primary font-bold shadow-[0_1px_3px_rgba(0,0,0,0.1)] border border-s-stroke2/40" : ""
                }`}
              >
                <RiMoonLine size={18} />
              </button>
            </div>
            
            <button className="relative flex size-12 items-center justify-center rounded-[12px] bg-b-surface2 border border-s-stroke2 transition-all shadow-[0_1px_3px_rgba(0,0,0,0.05)] shrink-0 text-t-secondary">
              <RiNotification3Line size={20} />
              <div className="absolute top-3 right-3 size-2 rounded-full bg-primary-03 border-2 border-b-surface2" />
            </button>
          </div>

          <div className="flex items-center justify-between w-full mt-2">
            <Link 
              href="/profile" 
              className="flex items-center gap-3 p-2 rounded-[12px] bg-transparent active:bg-b-surface2 transition-all flex-1 min-w-0 mr-2"
            >
              <div className="size-10 rounded-full overflow-hidden shrink-0 bg-b-surface2 border border-s-stroke2 shadow-sm">
                {mounted && (
                  <img
                    src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name ?? "User")}&background=101010&color=fff&size=80`}
                    alt="Avatar"
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-sans font-semibold text-[14px] text-t-primary truncate">
                  {mounted ? (user?.name ?? "—") : ""}
                </div>
                <div className="font-sans text-[12px] text-t-tertiary truncate leading-none capitalize">
                  {mounted ? (user?.role?.replace("_", " ") ?? "") : ""}
                </div>
              </div>
            </Link>

            <button
              onClick={() => signOut()}
              className="flex size-10 items-center justify-center rounded-[12px] text-primary-03 active:bg-[rgba(255,106,85,0.1)] border border-transparent active:border-primary-03/20 transition-all shrink-0"
            >
              <RiLogoutBoxLine size={20} />
            </button>
          </div>
        </div>
      </div>}
    </>
  );
}
