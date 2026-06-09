"use client";

import { useState } from "react";
import Navbar from "@/components/layout/Navbar";
import { mockLeaderboard, mockUser } from "@/lib/mock-data";
import {
  RiMedalFill,
  RiFireFill
} from "@remixicon/react";

const tabs = ["Global", "Institute", "Batch"] as const;
type Tab = typeof tabs[number];

export default function LeaderboardPage() {
  const [activeTab, setActiveTab] = useState<Tab>("Global");

  return (
    <>
      <Navbar title="Leaderboard" />
      <main style={{ maxWidth: 900, margin: "0 auto", padding: "var(--space-600)", width: "100%" }}>
        
        {/* Your rank card */}
        <div className="rayum-card" style={{
            padding: "24px 28px", marginBottom: "var(--space-600)",
            background: "var(--bg-surface)",
            border: "1px solid var(--primary-50)",
            display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap",
            boxShadow: "0 4px 20px rgba(92, 223, 120, 0.15)"
          }}
        >
          <div
            style={{
              width: 52, height: 52, borderRadius: "50%",
              background: "var(--primary-50)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 20, fontWeight: 900, color: "var(--neutral-100)", flexShrink: 0,
            }}
          >
            {mockUser.name.charAt(0)}
          </div>
          <div style={{ flex: 1 }}>
            <div className="text-body-large" style={{ fontWeight: 700, color: "var(--fg-default)", marginBottom: 4 }}>You — {mockUser.name}</div>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
              <span className="text-body-small" style={{ color: "var(--fg-muted)" }}>Global: <strong style={{ color: "var(--primary-90)" }}>#{mockUser.globalRank}</strong></span>
              <span className="text-body-small" style={{ color: "var(--fg-muted)" }}>Institute: <strong style={{ color: "var(--primary-90)" }}>#{mockUser.instituteRank}</strong></span>
              <span className="text-body-small" style={{ color: "var(--fg-muted)" }}>Batch: <strong style={{ color: "var(--primary-90)" }}>#{mockUser.batchRank}</strong></span>
            </div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div className="text-heading-l" style={{ color: "var(--primary-50)" }}>{mockUser.percentile}%ile</div>
            <div className="text-body-small" style={{ color: "var(--fg-muted)" }}>Global Percentile</div>
          </div>
        </div>

        {/* Tabs */}
        <div
          style={{
            display: "flex", gap: 4, marginBottom: 20, padding: 4,
            background: "var(--neutral-10)", borderRadius: "var(--radius-md)", width: "fit-content",
          }}
        >
          {tabs.map((tab) => (
            <button
              key={tab}
              id={`tab-${tab.toLowerCase()}`}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: "8px 20px", borderRadius: "var(--radius-sm)", cursor: "pointer", border: "none",
                background: activeTab === tab ? "var(--bg-surface)" : "transparent",
                color: activeTab === tab ? "var(--fg-default)" : "var(--fg-muted)",
                fontWeight: activeTab === tab ? 700 : 500, fontSize: 14,
                boxShadow: activeTab === tab ? "var(--shadow-100)" : "none",
                transition: "all 0.15s",
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="rayum-card" style={{ padding: 0, overflow: "hidden" }}>
          {/* Table Header */}
          <div
            style={{
              display: "grid", gridTemplateColumns: "60px 1fr 80px 80px 80px",
              padding: "12px 20px",
              background: "var(--neutral-10)",
              borderBottom: "1px solid var(--border-default)",
            }}
          >
            {["Rank", "Student", "Avg Score", "Tests", "Streak"].map((h) => (
              <div key={h} className="text-body-small" style={{ fontWeight: 700, color: "var(--fg-muted)", textTransform: "uppercase", textAlign: h === "Student" ? "left" : "center" }}>
                {h}
              </div>
            ))}
          </div>

          {mockLeaderboard.map((student) => {
            const getMedal = () => {
              if (student.rank === 1) return <RiMedalFill color="#EAB308" size={24} />;
              if (student.rank === 2) return <RiMedalFill color="#94A3B8" size={24} />;
              if (student.rank === 3) return <RiMedalFill color="#B45309" size={24} />;
              return null;
            };
            const medal = getMedal();
            return (
              <div
                key={student.rank}
                style={{
                  display: "grid", gridTemplateColumns: "60px 1fr 80px 80px 80px",
                  padding: "14px 20px",
                  background: student.isCurrentUser ? "var(--primary-10)" : "transparent",
                  borderBottom: "1px solid var(--border-default)",
                  borderLeft: student.isCurrentUser ? "4px solid var(--primary-50)" : "4px solid transparent",
                }}
              >
                {/* Rank */}
                <div style={{ display: "flex", alignItems: "center", fontWeight: 800, fontSize: 14, color: student.rank <= 3 ? "var(--primary-50)" : "var(--fg-muted)" }}>
                  {medal || `#${student.rank}`}
                </div>

                {/* Name */}
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div
                    style={{
                      width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
                      background: student.isCurrentUser ? "var(--primary-50)" : "var(--neutral-20)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 12, fontWeight: 800, color: student.isCurrentUser ? "white" : "var(--fg-default)",
                    }}
                  >
                    {student.name.charAt(0)}
                  </div>
                  <div>
                    <div className="text-body-base" style={{ fontWeight: 600, color: "var(--fg-default)" }}>
                      {student.name}
                      {student.isCurrentUser && <span className="rayum-badge green" style={{ marginLeft: 8 }}>You</span>}
                    </div>
                    <div className="text-body-small" style={{ color: "var(--fg-muted)" }}>JEE 2026</div>
                  </div>
                </div>

                {/* Avg Score */}
                <div style={{ textAlign: "center", fontWeight: 700, color: student.avgScore >= 70 ? "var(--success-50)" : student.avgScore >= 50 ? "var(--warning-50)" : "var(--error-50)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {student.avgScore}%
                </div>

                {/* Tests */}
                <div style={{ textAlign: "center", color: "var(--fg-muted)", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {student.totalTests}
                </div>

                {/* Streak */}
                <div style={{ textAlign: "center", color: "var(--warning-50)", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                  <RiFireFill size={16} color="var(--warning-50)" /> {student.streak}
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </>
  );
}
