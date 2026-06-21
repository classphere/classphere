"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  RiDashboardLine,
  RiFlashlightFill,
  RiBookOpenLine,
  RiTrophyLine,
  RiMessage3Line,
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
  RiBox3Line,
  RiShoppingCartLine,
  RiFileList3Line,
  RiBookmarkLine,
  RiFileListLine
} from "@remixicon/react";

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const isTeacher = pathname.startsWith("/teacher");
  const isInstitute = pathname.startsWith("/institute");
  const isSuperAdmin = pathname.startsWith("/superadmin");
  const isStudent = !isTeacher && !isInstitute && !isSuperAdmin;

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
    { label: "Doubts",    href: "/teacher/doubts",   icon: <RiMessage3Line size={18} />,   active: pathname.startsWith("/teacher/doubts") },
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
      className="hidden md:flex sticky top-0 z-40 h-screen w-[280px] shrink-0 flex-col overflow-y-auto border-r border-s-stroke2/70 bg-b-surface1 px-5 py-6 xl:w-[304px]"
    >
      {/* ── Logo ── */}
      <div className="mb-8 pl-1">
        <Link href="/" className="flex items-center gap-2.5 rounded-full px-2 py-1.5 transition-colors hover:bg-b-surface2">
          <div className="flex size-8 items-center justify-center rounded-full bg-b-primary text-t-light">
            <RiFlashlightFill size={18} />
          </div>
          <span className="font-bold text-h6 text-t-primary tracking-tight">
            ExamPrep
          </span>
        </Link>
      </div>

      {/* ── Main Menu ── */}
      <div className="mb-6">
        <div className="t-label mb-3 pl-3">
          Main menu
        </div>
        <nav className="flex flex-col gap-1">
          {currentNav.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className={`group relative flex h-12 shrink-0 items-center gap-3 rounded-3xl px-5 text-button transition-colors hover:text-t-primary ${
                item.active ? "text-t-primary font-bold" : "text-t-secondary"
              }`}
            >
              {item.active && (
                <div className="absolute inset-0 z-0 rounded-3xl gradient-menu shadow-depth-menu">
                  <div className="absolute inset-[1.5px] rounded-[1.375rem] bg-b-pop"></div>
                </div>
              )}
              <span className={`relative z-10 flex items-center transition-colors group-hover:text-t-primary ${
                item.active ? "text-t-primary" : "text-t-secondary"
              }`}>
                {item.icon}
              </span>
              <span className="relative z-10">{item.label}</span>
            </Link>
          ))}
        </nav>
      </div>

      {/* ── Others Menu ── */}
      <div className="mb-auto">
        <div className="t-label mb-3 pl-3">
          Others
        </div>
        <nav className="flex flex-col gap-1">
          {othersNav.map((item) => {
            const isActive = pathname.startsWith(item.path);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group relative flex h-12 shrink-0 items-center gap-3 rounded-3xl px-5 text-button transition-colors hover:text-t-primary ${
                  isActive ? "text-t-primary font-bold" : "text-t-secondary"
                }`}
              >
                {isActive && (
                  <div className="absolute inset-0 z-0 rounded-3xl gradient-menu shadow-depth-menu">
                    <div className="absolute inset-[1.5px] rounded-[1.375rem] bg-b-pop"></div>
                  </div>
                )}
                <span className={`relative z-10 flex items-center transition-colors group-hover:text-t-primary ${
                  isActive ? "text-t-primary" : "text-t-secondary"
                }`}>
                  {item.icon}
                </span>
                <span className="relative z-10">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* ── Bottom Section (Profile + Demo Switcher) ── */}
      <div className="mt-8">

        {/* Download App block pattern */}
        <div className="card mb-6 rounded-4xl border border-s-stroke2/70 bg-b-surface2 p-5 shadow-widget">
          <h4 className="text-body-2 font-bold mb-1 text-t-primary">Download our<br />Mobile App</h4>
          <p className="text-caption text-t-secondary mb-4">Get easy in another way</p>
          <button className="btn btn-sm btn-outline w-full bg-transparent">Download</button>
        </div>

        {/* Demo Role Switcher */}
        <div className="px-2">
          <select
            className="input h-10 w-full rounded-3xl border border-s-stroke2 bg-b-surface2 px-3 py-1.5 text-caption"
            value={isTeacher ? "/teacher" : isInstitute ? "/institute" : isSuperAdmin ? "/superadmin" : "/"}
            onChange={(e) => router.push(e.target.value)}
          >
            <option value="/">Student</option>
            <option value="/teacher">Teacher</option>
            <option value="/institute">Institute Admin</option>
            <option value="/superadmin">Super Admin</option>
          </select>
        </div>

      </div>

    </aside>
  );
}
