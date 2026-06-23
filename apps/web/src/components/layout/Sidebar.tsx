"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
  RiMailLine
} from "@remixicon/react";

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const isTeacher = pathname.startsWith("/teacher");
  const isInstitute = pathname.startsWith("/institute");
  const isSuperAdmin = pathname.startsWith("/superadmin");

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
  const studentNav = [
    { label: "Dashboard",    href: "/",                  icon: <RiDashboardLine size={18} />,      active: pathname === "/" },
    { label: "My DPPs",     href: "/assignments",        icon: <RiFileListLine size={18} />,       active: pathname.startsWith("/assignments") },
    { label: "PYQs",        href: "/pyqs",               icon: <RiFileList3Line size={18} />,      active: pathname.startsWith("/pyqs") },
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
    { label: "Questions", href: "/superadmin/questions", icon: <RiDatabase2Line size={18} />, active: pathname.startsWith("/superadmin/questions") },
    { label: "Institutes", href: "/superadmin/institutes", icon: <RiBuilding4Line size={18} />, active: pathname.startsWith("/superadmin/institutes") },
    { label: "Configuration", href: "/superadmin/configuration", icon: <RiToggleLine size={18} />, active: pathname.startsWith("/superadmin/configuration") },
    { label: "Support", href: "/superadmin/support", icon: <RiLifebuoyLine size={18} />, active: pathname.startsWith("/superadmin/support") },
  ];

  const currentNav = isTeacher ? teacherNav : isInstitute ? instituteNav : isSuperAdmin ? superAdminNav : studentNav;
  const roleQuery = isTeacher ? "?role=teacher" : isInstitute ? "?role=institute" : isSuperAdmin ? "?role=superadmin" : "?role=student";

  const othersNav = [
    { label: "Settings", path: "/settings", href: `/settings${roleQuery}`, icon: <RiSettings4Line size={18} /> },
    { label: "Help Me", path: "/help", href: `/help${roleQuery}`, icon: <RiInformationLine size={18} /> },
  ];

  return (
    <aside
      className="hidden md:flex sticky top-0 z-40 h-screen w-[300px] shrink-0 flex-col overflow-y-auto border-r border-s-stroke2/40 bg-b-surface1 px-5 pt-5 pb-8 select-none"
    >
      {/* Menu Container (Logo + Navigation Items) */}
      <div className="flex flex-col gap-4 w-full">
        {/* Logo */}
        <div className="pl-1">
          <Link href="/" className="flex items-center gap-2.5 rounded-full px-2 py-1 transition-colors hover:bg-b-surface2/60">
            <div className="flex size-9 items-center justify-center rounded-xl bg-[#101010] text-[#FDFDFD] box-shadow: inset 0px 1px 1px rgba(214,214,214,0.25)">
              <RiFlashlightFill size={18} />
            </div>
            <span className="font-sans text-[18px] font-semibold text-[#101010] dark:text-t-primary tracking-[0.0015em] leading-[140%]">
              ExamPrep
            </span>
          </Link>
        </div>

        {/* Navigation Menu */}
        <nav className="flex flex-col gap-0.5 w-full">
          {currentNav.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className={`group flex h-10 items-center gap-2.5 rounded-lg px-2.5 text-sm font-sans font-semibold transition-all ${
                item.active 
                  ? "bg-[#FDFDFD] dark:bg-b-surface2 text-[#101010] dark:text-t-primary shadow-[0px_4px_3px_-3px_rgba(8,8,8,0.05),0px_3px_1px_-3px_rgba(8,8,8,0.09)] border border-s-stroke2/30" 
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

      {/* Others Menu */}
      <div className="mt-4 flex flex-col gap-2">
        <div className="text-[10px] font-bold tracking-wider text-[#727272] pl-2.5 uppercase">
          Others
        </div>
        <nav className="flex flex-col gap-0.5 w-full">
          {othersNav.map((item) => {
            const isActive = pathname.startsWith(item.path);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group flex h-10 items-center gap-2.5 rounded-lg px-2.5 text-sm font-sans font-semibold transition-all ${
                  isActive 
                    ? "bg-[#FDFDFD] dark:bg-b-surface2 text-[#101010] dark:text-t-primary shadow-[0px_4px_3px_-3px_rgba(8,8,8,0.05),0px_3px_1px_-3px_rgba(8,8,8,0.09)] border border-s-stroke2/30" 
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

      {/* Bottom Section (Role Switcher & Custom Mode Container) */}
      <div className="mt-auto pt-4 flex flex-col gap-4 w-full">
        
        {/* Demo Role Switcher */}
        <div className="w-full">
          <select
            className="input h-9.5 w-full rounded-lg border border-s-stroke2 bg-b-surface2 px-3.5 py-1.5 text-caption font-semibold"
            value={isTeacher ? "/teacher" : isInstitute ? "/institute" : isSuperAdmin ? "/superadmin" : "/"}
            onChange={(e) => router.push(e.target.value)}
          >
            <option value="/">Student Dashboard</option>
            <option value="/teacher">Teacher Portal</option>
            <option value="/institute">Institute Admin</option>
            <option value="/superadmin">Super Admin</option>
          </select>
        </div>

        {/* Figma Mode Container */}
        <div className="flex flex-row items-center gap-3.5 w-full border-t border-s-stroke2/30 pt-3">
          
          {/* Message Indicator Button */}
          <button className="flex size-10.5 items-center justify-center rounded-full bg-[#FDFDFD] dark:bg-b-surface2 border border-s-stroke2/40 text-[#727272] dark:text-t-secondary hover:text-[#101010] dark:hover:text-t-primary transition-all hover:border-[#727272] active:scale-95 shadow-[0px_4px_3px_-3px_rgba(8,8,8,0.05)] cursor-pointer">
            <RiMailLine size={18} />
          </button>

          {/* Vertical Theme Toggle Pill */}
          <div className="flex flex-row items-center bg-[#FDFDFD] dark:bg-b-surface2 border border-s-stroke2/40 rounded-full p-0.5 h-10.5 w-24 relative select-none shadow-[0px_4px_3px_-3px_rgba(8,8,8,0.05)]">
            <button 
              onClick={() => toggleTheme("light")}
              className={`flex-1 flex items-center justify-center h-8.5 rounded-full transition-all cursor-pointer ${
                theme === "light" 
                  ? "bg-[#F1F1F1] dark:bg-b-surface1 text-[#101010] dark:text-t-primary font-bold shadow-widget" 
                  : "text-[#727272] hover:text-[#101010]"
              }`}
            >
              <RiSunLine size={15} />
            </button>
            <button 
              onClick={() => toggleTheme("dark")}
              className={`flex-1 flex items-center justify-center h-8.5 rounded-full transition-all cursor-pointer ${
                theme === "dark" 
                  ? "bg-[#F1F1F1] dark:bg-b-surface1 text-[#101010] dark:text-t-primary font-bold shadow-widget" 
                  : "text-[#727272] hover:text-[#101010] dark:hover:text-t-primary"
              }`}
            >
              <RiMoonLine size={15} />
            </button>
          </div>

        </div>

      </div>

      {/* Bottom spacer to prevent scroll cutoff and Next.js toolbar interference */}
      <div className="h-6 shrink-0 w-full" />

    </aside>
  );
}
