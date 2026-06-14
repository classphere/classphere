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
  RiFileList3Line
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
    { label: "Dashboard", href: "/", icon: <RiDashboardLine size={18} />, active: pathname === "/" },
    { label: "PYQs", href: "/pyqs", icon: <RiFileList3Line size={18} />, active: pathname.startsWith("/pyqs") },
    { label: "Test History", href: "/history", icon: <RiBookOpenLine size={18} />, active: pathname.startsWith("/history") },
    { label: "Analytics", href: "/analytics", icon: <RiLineChartLine size={18} />, active: pathname.startsWith("/analytics") },
    { label: "Leaderboard", href: "/leaderboard", icon: <RiTrophyLine size={18} />, active: pathname.startsWith("/leaderboard") },
    { label: "Ask a Doubt", href: "/doubts", icon: <RiQuestionAnswerLine size={18} />, active: pathname.startsWith("/doubts") },
  ];

  const teacherNav = [
    { label: "Dashboard", href: "/teacher", icon: <RiDashboardLine size={18} />, active: pathname === "/teacher" },
    { label: "Assignments", href: "/teacher/create-assignment", icon: <RiBox3Line size={18} />, active: pathname.startsWith("/teacher/create-assignment") },
    { label: "Analytics", href: "/teacher/analytics", icon: <RiBarChartBoxLine size={18} />, active: pathname.startsWith("/teacher/analytics") },
    { label: "Doubts", href: "/teacher/doubts", icon: <RiMessage3Line size={18} />, active: pathname.startsWith("/teacher/doubts") },
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
      style={{
        width: 250,
        height: "calc(100vh - 32px)",
        margin: 16,
        borderRadius: "var(--r-xl)",
        background: "var(--bg-surface)",
        border: "1px solid var(--border-default)",
        boxShadow: "var(--sh-200)",
        display: "flex",
        flexDirection: "column",
        padding: "24px 16px",
        position: "sticky",
        top: 16,
        flexShrink: 0,
        zIndex: 40,
        overflowY: "auto"
      }}
    >
      {/* ── Logo ── */}
      <div style={{ marginBottom: 32, paddingLeft: 8 }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              background: "var(--s-50)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
            }}
          >
            <RiFlashlightFill size={18} />
          </div>
          <span style={{ fontWeight: 800, fontSize: 22, color: "var(--fg-default)", letterSpacing: "-0.02em" }}>
            ExamPrep
          </span>
        </Link>
      </div>

      {/* ── Main Menu ── */}
      <div style={{ marginBottom: 24 }}>
        <div className="t-label" style={{ marginBottom: 12, paddingLeft: 12 }}>
          Main menu
        </div>
        <nav style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {currentNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`sidebar-link ${item.active ? "active" : ""}`}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ display: "flex", alignItems: "center" }}>{item.icon}</span>
                <span>{item.label}</span>
              </div>
            </Link>
          ))}

        </nav>
      </div>

      {/* ── Others Menu ── */}
      <div style={{ marginBottom: "auto" }}>
        <div className="t-label" style={{ marginBottom: 12, paddingLeft: 12 }}>
          Others
        </div>
        <nav style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {othersNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`sidebar-link ${pathname.startsWith(item.path) ? "active" : ""}`}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ display: "flex", alignItems: "center" }}>{item.icon}</span>
                <span>{item.label}</span>
              </div>
            </Link>
          ))}
        </nav>
      </div>

      {/* ── Bottom Section (Profile + Demo Switcher) ── */}
      <div style={{ marginTop: 32 }}>
        
        {/* Download App block pattern from Rayum */}
        <div style={{ background: "var(--n-10)", borderRadius: "var(--r-lg)", padding: 20, marginBottom: 24 }}>
          <h4 className="text-body-large text-bold" style={{ marginBottom: 4 }}>Download our<br/>Mobile App</h4>
          <p className="t-body-sm" style={{ marginBottom: 16 }}>Get easy in another way</p>
          <button className="btn btn-outline" style={{ width: "100%", background: "transparent" }}>Download</button>
        </div>

        {/* Demo Role Switcher */}
        <div style={{ padding: "0 8px" }}>
          <select 
            className="input" 
            style={{ width: "100%", padding: "8px 12px", fontSize: 13, borderColor: "var(--n-20)", background: "transparent" }}
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
