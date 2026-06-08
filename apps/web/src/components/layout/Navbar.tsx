"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { mockUser } from "@/lib/mock-data";

const navLinks = [
  { href: "/dashboard", label: "Dashboard", icon: "⊞" },
  { href: "/create-test", label: "Create Test", icon: "✦" },
  { href: "/history", label: "Test History", icon: "◷" },
  { href: "/leaderboard", label: "Leaderboard", icon: "⬛" },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <header
      style={{
        background: "rgba(8,12,20,0.85)",
        borderBottom: "1px solid rgba(255,255,255,0.07)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        position: "sticky",
        top: 0,
        zIndex: 50,
      }}
    >
      <div
        style={{
          maxWidth: 1280,
          margin: "0 auto",
          padding: "0 24px",
          height: 60,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 24,
        }}
      >
        {/* Logo */}
        <Link href="/dashboard" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: 8,
              background: "linear-gradient(135deg, #f97316, #eab308)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 14,
              fontWeight: 900,
              color: "#000",
            }}
          >
            E
          </div>
          <span style={{ fontWeight: 800, fontSize: "1rem", color: "#f1f5f9" }}>
            Exam<span style={{ color: "#f97316" }}>Prep</span>
          </span>
        </Link>

        {/* Nav links */}
        <nav style={{ display: "flex", alignItems: "center", gap: 4 }}>
          {navLinks.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                style={{
                  padding: "6px 14px",
                  borderRadius: 8,
                  fontSize: "0.8rem",
                  fontWeight: 500,
                  textDecoration: "none",
                  color: active ? "#fb923c" : "#94a3b8",
                  background: active ? "rgba(249,115,22,0.1)" : "transparent",
                  border: active ? "1px solid rgba(249,115,22,0.2)" : "1px solid transparent",
                  transition: "all 0.15s",
                }}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Right side */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {/* Streak badge */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              padding: "4px 10px",
              borderRadius: 20,
              background: "rgba(234,179,8,0.12)",
              border: "1px solid rgba(234,179,8,0.25)",
              color: "#facc15",
              fontSize: "0.75rem",
              fontWeight: 700,
            }}
          >
            🔥 {mockUser.streakDays}
          </div>

          {/* Avatar */}
          <Link href="/profile" style={{ textDecoration: "none" }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                background: "linear-gradient(135deg, #f97316, #eab308)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "0.8rem",
                fontWeight: 800,
                color: "#000",
                cursor: "pointer",
              }}
            >
              {mockUser.name.charAt(0)}
            </div>
          </Link>
        </div>
      </div>
    </header>
  );
}
