"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  RiDashboardLine,
  RiFlashlightLine,
  RiFlashlightFill,
  RiBookOpenLine,
  RiTrophyLine,
  RiMessage3Line,
  RiSettings4Line,
  RiInformationLine,
  RiSunLine,
  RiMoonLine,
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
  RiLifebuoyLine
} from "@remixicon/react";

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const isTeacher = pathname.startsWith("/teacher");
  const isInstitute = pathname.startsWith("/institute");
  const isSuperAdmin = pathname.startsWith("/superadmin");
  const isStudent = !isTeacher && !isInstitute && !isSuperAdmin;

  // Different Navigations based on Role
  const studentNav = [
    { label: "Dashboard", href: "/", icon: <RiDashboardLine size={18} />, active: pathname === "/" },
    { label: "Create Test", href: "/create-test", icon: <RiFlashlightLine size={18} />, active: pathname.startsWith("/create-test") },
    { label: "Test History", href: "/history", icon: <RiBookOpenLine size={18} />, active: pathname.startsWith("/history") },
    { label: "Leaderboard", href: "/leaderboard", icon: <RiTrophyLine size={18} />, active: pathname.startsWith("/leaderboard") },
  ];

  const teacherNav = [
    { label: "Teacher Dashboard", href: "/teacher", icon: <RiDashboardLine size={18} />, active: pathname === "/teacher" },
    { label: "Create Subject Assignment", href: "/teacher/create-assignment", icon: <RiFlashlightLine size={18} />, active: pathname.startsWith("/teacher/create-assignment") },
  ];

  const instituteNav = [
    { label: "Institute Dashboard", href: "/institute", icon: <RiDashboardLine size={18} />, active: pathname === "/institute" },
    { label: "Manage Batches", href: "/institute/batches", icon: <RiTeamLine size={18} />, active: pathname.startsWith("/institute/batches") },
    { label: "Students", href: "/institute/students", icon: <RiUser3Line size={18} />, active: pathname.startsWith("/institute/students") },
    { label: "Reports", href: "/institute/reports", icon: <RiBarChartBoxLine size={18} />, active: pathname.startsWith("/institute/reports") },
    { label: "Billing", href: "/institute/billing", icon: <RiBankCardLine size={18} />, active: pathname.startsWith("/institute/billing") },
  ];

  const superAdminNav = [
    { label: "Platform Health", href: "/superadmin", icon: <RiDashboardLine size={18} />, active: pathname === "/superadmin" },
    { label: "Global Analytics", href: "/superadmin/analytics", icon: <RiLineChartLine size={18} />, active: pathname.startsWith("/superadmin/analytics") },
    { label: "Revenue & Billing", href: "/superadmin/revenue", icon: <RiMoneyDollarCircleLine size={18} />, active: pathname.startsWith("/superadmin/revenue") },
    { label: "Question Bank", href: "/superadmin/questions", icon: <RiDatabase2Line size={18} />, active: pathname.startsWith("/superadmin/questions") },
    { label: "Institutes CRM", href: "/superadmin/institutes", icon: <RiBuilding4Line size={18} />, active: pathname.startsWith("/superadmin/institutes") },
    { label: "Configuration", href: "/superadmin/configuration", icon: <RiToggleLine size={18} />, active: pathname.startsWith("/superadmin/configuration") },
    { label: "Support Escalations", href: "/superadmin/support", icon: <RiLifebuoyLine size={18} />, active: pathname.startsWith("/superadmin/support") },
  ];

  const currentNav = isTeacher ? teacherNav : isInstitute ? instituteNav : isSuperAdmin ? superAdminNav : studentNav;

  const othersNav = [
    { label: "Messages", href: "/messages", icon: <RiMessage3Line size={18} />, badge: 3 },
    { label: "Profile", href: "/profile", icon: <RiUserStarLine size={18} /> },
    { label: "Settings", href: "/settings", icon: <RiSettings4Line size={18} /> },
    { label: "Help", href: "/help", icon: <RiInformationLine size={18} /> },
  ];

  return (
    <aside
      style={{
        width: 250,
        height: "100vh",
        background: "var(--bg-surface)",
        borderRight: "1px solid var(--border-default)",
        display: "flex",
        flexDirection: "column",
        padding: "24px 16px",
        position: "fixed",
        top: 0,
        left: 0,
        zIndex: 40,
        overflowY: "auto"
      }}
    >
      {/* Logo Area */}
      <div style={{ marginBottom: 32, paddingLeft: 8 }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              background: "var(--secondary-50)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
            }}
          >
            <RiFlashlightFill size={18} />
          </div>
          <span style={{ fontWeight: 800, fontSize: 22, color: "var(--fg-default)" }}>
            ExamPrep
          </span>
        </Link>
      </div>

      {/* Main Menu */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ 
          fontSize: 12, 
          fontWeight: 600, 
          color: "var(--fg-muted)", 
          marginBottom: 12,
          paddingLeft: 8
        }}>
          {isTeacher ? "Teacher Portal" : isInstitute ? "Institute Admin" : isSuperAdmin ? "Super Admin" : "Student Portal"}
        </div>
        <nav style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {currentNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`sidebar-link ${item.active ? "active" : ""}`}
              style={{ padding: "10px 16px" }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ display: "flex", alignItems: "center" }}>{item.icon}</span>
                <span>{item.label}</span>
              </div>
            </Link>
          ))}
        </nav>
      </div>

      {/* Others Menu */}
      <div style={{ marginBottom: "auto" }}>
        <div style={{ 
          fontSize: 12, 
          fontWeight: 600, 
          color: "var(--fg-muted)", 
          marginBottom: 12,
          paddingLeft: 8
        }}>
          Account
        </div>
        <nav style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {othersNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`sidebar-link ${pathname.startsWith(item.href) ? "active" : ""}`}
              style={{ padding: "10px 16px" }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ display: "flex", alignItems: "center" }}>{item.icon}</span>
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span style={{ 
                  background: "var(--secondary-50)", 
                  color: "white", 
                  fontSize: 11, 
                  fontWeight: "bold", 
                  padding: "2px 6px", 
                  borderRadius: 12,
                  marginLeft: "auto"
                }}>
                  {item.badge}
                </span>
              )}
            </Link>
          ))}
        </nav>
      </div>

      {/* Role Switcher Demo Dropdown */}
      <div style={{ 
        background: "var(--neutral-10)", 
        borderRadius: "var(--radius-lg)", 
        padding: "16px",
        marginTop: 32,
        marginBottom: 16
      }}>
        <h4 style={{ fontWeight: 700, fontSize: 12, color: "var(--fg-muted)", marginBottom: 8, textTransform: "uppercase" }}>
          Demo Role Switcher
        </h4>
        <select 
          className="input-field" 
          style={{ width: "100%", padding: "8px", fontSize: 13 }}
          value={isTeacher ? "/teacher" : isInstitute ? "/institute" : isSuperAdmin ? "/superadmin" : "/"}
          onChange={(e) => router.push(e.target.value)}
        >
          <option value="/">Student</option>
          <option value="/teacher">Teacher</option>
          <option value="/institute">Institute Admin</option>
          <option value="/superadmin">Super Admin</option>
        </select>
      </div>

    </aside>
  );
}
