"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
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
  RiDatabase2Line,
  RiBuilding4Line,
  RiUserStarLine,
  RiUser3Line,
  RiLineChartLine,
  RiMoneyDollarCircleLine,
  RiToggleLine,
  RiLifebuoyLine,
  RiQuestionAnswerLine,
  RiFileList3Line,
  RiBookmarkLine,
  RiFileListLine,
  RiSunLine,
  RiMoonLine,
  RiMailLine,
  RiNotification3Line,
  RiUploadCloud2Line
} from "@remixicon/react";
import { mockUser } from "@/lib/mock-data";

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryRole = searchParams.get("role");

  const isTeacher = pathname.startsWith("/teacher") || queryRole === "teacher";
  const isInstitute = pathname.startsWith("/institute") || queryRole === "institute_admin" || queryRole === "institute";
  const isSuperAdmin = pathname.startsWith("/superadmin") || queryRole === "super_admin" || queryRole === "superadmin";

  // Theme Toggler Logic
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") as "light" | "dark";
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.setAttribute("data-theme", savedTheme);
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

  // Navigations based on Role
  const studentExam = mockUser.batch.includes("NEET") ? "neet" : mockUser.batch.includes("SSC") ? "ssc" : "jee";
  const studentNav = [
    { label: "Dashboard",    href: "/",                  icon: <RiDashboardLine size={18} />,      active: pathname === "/" },
    { label: "Tests Hub",    href: "/tests",             icon: <RiFileList3Line size={18} />,      active: pathname.startsWith("/tests") },
    { label: "My DPPs",      href: "/assignments",        icon: <RiFileListLine size={18} />,       active: pathname.startsWith("/assignments") },
    { label: "Test History", href: "/history",           icon: <RiBookOpenLine size={18} />,       active: pathname.startsWith("/history") },
    { label: "Mistake Diary",href: "/student/mistakes",  icon: <RiBookmarkLine size={18} />,       active: pathname.startsWith("/student/mistakes") },
    { label: "Analytics",   href: "/analytics",          icon: <RiLineChartLine size={18} />,      active: pathname.startsWith("/analytics") },
    { label: "Leaderboard", href: "/leaderboard",        icon: <RiTrophyLine size={18} />,         active: pathname.startsWith("/leaderboard") },
    { label: "Ask a Doubt", href: "/doubts",             icon: <RiQuestionAnswerLine size={18} />, active: pathname.startsWith("/doubts") },
  ];

  const teacherNav = [
    { label: "Dashboard", href: "/teacher",          icon: <RiDashboardLine size={18} />,  active: pathname === "/teacher" },
    { label: "DPPs",      href: "/teacher/dpps",     icon: <RiFileListLine size={18} />,   active: pathname.startsWith("/teacher/dpps") },
    { label: "Analytics", href: "/teacher/analytics",icon: <RiBarChartBoxLine size={18} />,active: pathname.startsWith("/teacher/analytics") },
    { label: "Doubts",    href: "/teacher/doubts",   icon: <RiQuestionAnswerLine size={18} />, active: pathname.startsWith("/teacher/doubts") },
  ];

  const instituteNav = [
    { label: "Dashboard", href: "/institute", icon: <RiDashboardLine size={18} />, active: pathname === "/institute" },
    { label: "Batches", href: "/institute/batches", icon: <RiTeamLine size={18} />, active: pathname.startsWith("/institute/batches") },
    { label: "Faculty", href: "/institute/faculty", icon: <RiUserStarLine size={18} />, active: pathname.startsWith("/institute/faculty") },
    { label: "Students", href: "/institute/students", icon: <RiUser3Line size={18} />, active: pathname.startsWith("/institute/students") },
    { label: "Reports", href: "/institute/reports", icon: <RiBarChartBoxLine size={18} />, active: pathname.startsWith("/institute/reports") },
    { label: "Billing", href: "/institute/billing", icon: <RiBankCardLine size={18} />, active: pathname.startsWith("/institute/billing") },
    { label: "Support", href: "/institute/support", icon: <RiLifebuoyLine size={18} />, active: pathname.startsWith("/institute/support") },
  ];

  const superAdminNav = [
    { label: "Platform Health", href: "/superadmin", icon: <RiDashboardLine size={18} />, active: pathname === "/superadmin" },
    { label: "Global Analytics", href: "/superadmin/analytics", icon: <RiLineChartLine size={18} />, active: pathname.startsWith("/superadmin/analytics") },
    { label: "Revenue", href: "/superadmin/revenue", icon: <RiMoneyDollarCircleLine size={18} />, active: pathname.startsWith("/superadmin/revenue") },
    { label: "Questions", href: "/superadmin/questions", icon: <RiDatabase2Line size={18} />, active: pathname === "/superadmin/questions" },
    { label: "Upload Questions", href: "/superadmin/questions/upload", icon: <RiUploadCloud2Line size={18} />, active: pathname.startsWith("/superadmin/questions/upload") },
    { label: "Institutes", href: "/superadmin/institutes", icon: <RiBuilding4Line size={18} />, active: pathname.startsWith("/superadmin/institutes") },
    { label: "Configuration", href: "/superadmin/configuration", icon: <RiToggleLine size={18} />, active: pathname.startsWith("/superadmin/configuration") },
    { label: "Support", href: "/superadmin/support", icon: <RiLifebuoyLine size={18} />, active: pathname.startsWith("/superadmin/support") },
  ];

  const currentNav = isTeacher ? teacherNav : isInstitute ? instituteNav : isSuperAdmin ? superAdminNav : studentNav;
  const roleQuery = isTeacher ? "?role=teacher" : isInstitute ? "?role=institute_admin" : isSuperAdmin ? "?role=super_admin" : "?role=student";

  const othersNav = [
    { label: "Settings", path: "/settings", href: `/settings${roleQuery}`, icon: <RiSettings4Line size={18} /> },
    { label: "Help Me", path: "/help", href: `/help${roleQuery}`, icon: <RiInformationLine size={18} /> },
  ];

  return (
    <aside
      className="hidden md:flex sticky top-0 z-40 h-screen w-[300px] shrink-0 flex-col border-r border-s-stroke2/40 bg-b-surface1 px-6 pt-8 pb-12 select-none overflow-y-auto scrollbar-none"
    >
      {/* ── Top Menu Container ── */}
      <div className="flex flex-col gap-6 w-full">
        {/* Logo */}
        <div className="pl-1">
          <Link href="/" className="flex items-center gap-3.5 rounded-xl transition-colors">
            {/* Logo Container 48px x 48px */}
            <div className="flex size-12 items-center justify-center rounded-xl bg-[#101010] text-[#FDFDFD] shadow-[inset_0px_1px_1px_rgba(214,214,214,0.25),inset_0px_-1px_2px_rgba(0,0,0,0.53)] shrink-0">
              <RiFlashlightFill size={22} className="opacity-90" />
            </div>
            <span className="font-sans text-[20px] font-bold text-[#101010] dark:text-t-primary tracking-tight">
              ExamPrep
            </span>
          </Link>
        </div>

        {/* ── Main Menu ── */}
        <div className="flex flex-col gap-2 w-full">
          <nav className="flex flex-col gap-1 w-full">
            {currentNav.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className={`group flex h-12 items-center gap-3 rounded-xl px-3 text-sm font-sans font-semibold transition-all ${
                  item.active
                    ? "bg-[#FDFDFD] dark:bg-b-surface2 text-[#101010] dark:text-t-primary shadow-[0px_6px_4px_-4px_rgba(8,8,8,0.05),0px_5px_1.5px_-4px_rgba(8,8,8,0.09)] border border-s-stroke2/30"
                    : "text-[#727272] hover:text-[#101010] dark:hover:text-t-primary hover:bg-b-surface2/30"
                }`}
              >
                <span className={`flex items-center transition-colors ${
                  item.active ? "text-[#101010] dark:text-t-primary" : "text-[#727272] group-hover:text-[#101010] dark:group-hover:text-t-primary"
                }`}>
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>
        </div>

        {/* ── Others Menu ── */}
        <div className="flex flex-col gap-2 w-full">
          <div className="text-[10px] font-bold tracking-wider text-[#727272] pl-3 uppercase">
            Others
          </div>
          <nav className="flex flex-col gap-1 w-full">
            {othersNav.map((item) => {
              const isActive = pathname.startsWith(item.path);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`group flex h-12 items-center gap-3 rounded-xl px-3 text-sm font-sans font-semibold transition-all ${
                    isActive
                      ? "bg-[#FDFDFD] dark:bg-b-surface2 text-[#101010] dark:text-t-primary shadow-[0px_6px_4px_-4px_rgba(8,8,8,0.05),0px_5px_1.5px_-4px_rgba(8,8,8,0.09)] border border-s-stroke2/30"
                      : "text-[#727272] hover:text-[#101010] dark:hover:text-t-primary hover:bg-b-surface2/30"
                  }`}
                >
                  <span className={`flex items-center transition-colors ${
                    isActive ? "text-[#101010] dark:text-t-primary" : "text-[#727272] group-hover:text-[#101010] dark:group-hover:text-t-primary"
                  }`}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* ── Bottom Section (Switcher + Profile + Action Container) ── */}
      <div className="mt-auto flex flex-col gap-5 w-full pt-6 border-t border-s-stroke2/20 shrink-0">
        {/* Profile Card: Avatar + Info */}
        <Link 
          href="/profile" 
          className="flex items-center gap-3 w-full p-2.5 rounded-2xl bg-transparent hover:bg-b-surface2/40 border border-transparent hover:border-s-stroke2/20 transition-all cursor-pointer select-none"
        >
          <div className="size-11 rounded-full overflow-hidden border border-s-stroke2/20 shrink-0 shadow-xs">
            <img
              src={`https://ui-avatars.com/api/?name=${encodeURIComponent(mockUser.name)}&background=101010&color=fff&size=80`}
              alt="Avatar"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-sans font-semibold text-sm text-[#101010] dark:text-t-primary truncate leading-tight">
              {mockUser.name}
            </div>
            <div className="font-sans text-[11px] text-[#7B7B7B] dark:text-t-tertiary truncate mt-0.5 leading-none">
              {mockUser.email}
            </div>
          </div>
        </Link>

        {/* Demo Role Switcher */}
        <div className="w-full">
          <select
            className="input h-10 w-full rounded-xl border border-s-stroke2 bg-b-surface2 px-3.5 py-1.5 text-caption font-semibold"
            value={isTeacher ? "/teacher" : isInstitute ? "/institute" : isSuperAdmin ? "/superadmin" : "/"}
            onChange={(e) => router.push(e.target.value)}
          >
            <option value="/">Student Dashboard</option>
            <option value="/teacher">Teacher Portal</option>
            <option value="/institute">Institute Admin</option>
            <option value="/superadmin">Super Admin</option>
          </select>
        </div>

        {/* Mode Container: Notification Bell + Mail Button + Theme Capsule */}
        <div className="flex flex-row items-center gap-3 w-full">
          {/* Notification Button */}
          <button className="relative flex size-12 items-center justify-center rounded-full bg-[#FDFDFD] dark:bg-b-surface2 border border-s-stroke2/40 text-[#727272] dark:text-t-secondary hover:text-[#101010] dark:hover:text-t-primary transition-all active:scale-95 shadow-[0px_4px_3px_-3px_rgba(8,8,8,0.05)] cursor-pointer shrink-0">
            <RiNotification3Line size={20} />
            <div className="absolute top-3.5 right-3.5 size-1.5 rounded-full bg-[#FF6A55]" />
          </button>

          {/* Message Mail Button */}
          <Link 
            href="/doubts" 
            className="flex size-12 items-center justify-center rounded-full bg-[#FDFDFD] dark:bg-b-surface2 border border-s-stroke2/40 text-[#727272] dark:text-t-secondary hover:text-[#101010] dark:hover:text-t-primary transition-all active:scale-95 shadow-[0px_4px_3px_-3px_rgba(8,8,8,0.05)] cursor-pointer shrink-0"
          >
            <RiMailLine size={20} />
          </Link>

          {/* Theme Toggle Capsule: Horizontal pill, rounded-full, 48px height, icons only */}
          <div className="flex flex-row items-center bg-[#FDFDFD] dark:bg-b-surface2 border border-s-stroke2/40 rounded-full p-1 h-12 flex-1 relative select-none shadow-[0px_4px_3px_-3px_rgba(8,8,8,0.05)]">
            <button
              onClick={() => toggleTheme("light")}
              className={`flex-1 flex items-center justify-center h-10 rounded-full transition-all cursor-pointer text-[#727272] ${
                theme === "light"
                  ? "bg-[#F1F1F1] dark:bg-b-surface1 text-[#101010] dark:text-t-primary font-bold shadow-widget"
                  : "hover:text-[#101010]"
              }`}
              title="Light Mode"
            >
              <RiSunLine size={18} />
            </button>
            <button
              onClick={() => toggleTheme("dark")}
              className={`flex-1 flex items-center justify-center h-10 rounded-full transition-all cursor-pointer text-[#727272] ${
                theme === "dark"
                  ? "bg-[#F1F1F1] dark:bg-b-surface1 text-[#101010] dark:text-t-primary font-bold shadow-widget"
                  : "hover:text-[#101010] dark:hover:text-t-primary"
              }`}
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
