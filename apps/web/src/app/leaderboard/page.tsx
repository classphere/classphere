"use client";

import { useState } from "react";
import Navbar from "@/components/layout/Navbar";
import { mockLeaderboard, mockUser } from "@/lib/mock-data";

const tabs = ["Global", "Institute", "Batch"] as const;
type Tab = typeof tabs[number];

export default function LeaderboardPage() {
  const [activeTab, setActiveTab] = useState<Tab>("Global");

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-primary)" }}>
      <Navbar />
      <main style={{ maxWidth: 900, margin: "0 auto", padding: "36px 24px" }}>
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: "1.7rem", fontWeight: 800, color: "#f1f5f9", marginBottom: 6 }}>
            🏆 Leaderboard
          </h1>
          <p style={{ color: "#64748b" }}>Rankings are updated nightly at midnight IST</p>
        </div>

        {/* Your rank card */}
        <div
          style={{
            borderRadius: 18, padding: "24px 28px", marginBottom: 28,
            background: "linear-gradient(135deg, rgba(249,115,22,0.08), rgba(234,179,8,0.04))",
            border: "1.5px solid rgba(249,115,22,0.25)",
            display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap",
          }}
        >
          <div
            style={{
              width: 52, height: 52, borderRadius: "50%",
              background: "linear-gradient(135deg, #f97316, #eab308)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "1.3rem", fontWeight: 900, color: "#000", flexShrink: 0,
            }}
          >
            {mockUser.name.charAt(0)}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, color: "#f1f5f9", marginBottom: 4 }}>You — {mockUser.name}</div>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
              <span style={{ color: "#64748b", fontSize: "0.85rem" }}>Global: <strong style={{ color: "#f97316" }}>#{mockUser.globalRank}</strong></span>
              <span style={{ color: "#64748b", fontSize: "0.85rem" }}>Institute: <strong style={{ color: "#f97316" }}>#{mockUser.instituteRank}</strong></span>
              <span style={{ color: "#64748b", fontSize: "0.85rem" }}>Batch: <strong style={{ color: "#f97316" }}>#{mockUser.batchRank}</strong></span>
            </div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div className="gradient-text" style={{ fontSize: "2rem", fontWeight: 900 }}>{mockUser.percentile}%ile</div>
            <div style={{ color: "#475569", fontSize: "0.72rem" }}>Global Percentile</div>
          </div>
        </div>

        {/* Tabs */}
        <div
          style={{
            display: "flex", gap: 4, marginBottom: 20, padding: "4px",
            background: "rgba(255,255,255,0.04)", borderRadius: 12, width: "fit-content",
          }}
        >
          {tabs.map((tab) => (
            <button
              key={tab}
              id={`tab-${tab.toLowerCase()}`}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: "8px 20px", borderRadius: 9, cursor: "pointer", border: "none",
                background: activeTab === tab ? "rgba(249,115,22,0.15)" : "transparent",
                color: activeTab === tab ? "#fb923c" : "#64748b",
                fontWeight: activeTab === tab ? 700 : 500, fontSize: "0.875rem",
                fontFamily: "Inter, sans-serif",
                transition: "all 0.15s",
                outline: activeTab === tab ? "1px solid rgba(249,115,22,0.3)" : "none",
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="glass" style={{ borderRadius: 18, overflow: "hidden" }}>
          {/* Table Header */}
          <div
            style={{
              display: "grid", gridTemplateColumns: "60px 1fr 80px 80px 80px",
              padding: "12px 20px",
              background: "rgba(255,255,255,0.03)",
              borderBottom: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            {["Rank", "Student", "Avg Score", "Tests", "Streak"].map((h) => (
              <div key={h} style={{ fontSize: "0.72rem", fontWeight: 700, color: "#334155", textTransform: "uppercase", letterSpacing: "0.05em", textAlign: h === "Student" ? "left" : "center" }}>
                {h}
              </div>
            ))}
          </div>

          {mockLeaderboard.map((student) => {
            const medal = student.rank === 1 ? "🥇" : student.rank === 2 ? "🥈" : student.rank === 3 ? "🥉" : null;
            return (
              <div
                key={student.rank}
                style={{
                  display: "grid", gridTemplateColumns: "60px 1fr 80px 80px 80px",
                  padding: "14px 20px",
                  background: student.isCurrentUser ? "rgba(249,115,22,0.05)" : "transparent",
                  borderBottom: "1px solid rgba(255,255,255,0.04)",
                  borderLeft: student.isCurrentUser ? "3px solid #f97316" : "3px solid transparent",
                  transition: "background 0.15s",
                }}
              >
                {/* Rank */}
                <div style={{ display: "flex", alignItems: "center", fontWeight: 800, fontSize: "0.9rem", color: student.rank <= 3 ? "#f97316" : "#475569" }}>
                  {medal || `#${student.rank}`}
                </div>

                {/* Name */}
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div
                    style={{
                      width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
                      background: student.isCurrentUser
                        ? "linear-gradient(135deg, #f97316, #eab308)"
                        : `hsl(${student.rank * 47}, 60%, 50%)`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "0.8rem", fontWeight: 800, color: "#000",
                    }}
                  >
                    {student.name.charAt(0)}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, color: "#f1f5f9", fontSize: "0.875rem" }}>
                      {student.name}
                      {student.isCurrentUser && <span className="badge badge-orange" style={{ marginLeft: 8 }}>You</span>}
                    </div>
                    <div style={{ color: "#334155", fontSize: "0.72rem" }}>JEE 2026</div>
                  </div>
                </div>

                {/* Avg Score */}
                <div style={{ textAlign: "center", fontWeight: 700, color: student.avgScore >= 70 ? "#22c55e" : student.avgScore >= 50 ? "#eab308" : "#ef4444", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {student.avgScore}%
                </div>

                {/* Tests */}
                <div style={{ textAlign: "center", color: "#64748b", fontSize: "0.85rem", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {student.totalTests}
                </div>

                {/* Streak */}
                <div style={{ textAlign: "center", color: "#facc15", fontSize: "0.85rem", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                  🔥 {student.streak}
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
