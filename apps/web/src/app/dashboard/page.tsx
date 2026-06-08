"use client";

import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import { mockUser, mockStats, mockRecentTests } from "@/lib/mock-data";

function ScoreBar({ percentage }: { percentage: number }) {
  const color = percentage >= 70 ? "#22c55e" : percentage >= 50 ? "#eab308" : "#ef4444";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div className="progress-bar-track" style={{ flex: 1 }}>
        <div
          className="progress-bar-fill"
          style={{
            width: `${percentage}%`,
            background: color,
          }}
        />
      </div>
      <span style={{ fontSize: "0.8rem", fontWeight: 700, color, minWidth: 36, textAlign: "right" }}>
        {percentage}%
      </span>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-primary)" }}>
      <Navbar />

      <main style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 24px" }}>
        {/* Greeting */}
        <div style={{ marginBottom: 36 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
            <div>
              <h1 style={{ fontSize: "1.7rem", fontWeight: 800, color: "#f1f5f9" }}>
                Hey, {mockUser.name.split(" ")[0]} 👋
              </h1>
              <p style={{ color: "#64748b", marginTop: 4, fontSize: "0.9rem" }}>
                You&apos;re on a <span style={{ color: "#facc15", fontWeight: 700 }}>🔥 {mockUser.streakDays}-day streak</span>. Keep it going!
              </p>
            </div>
            <Link href="/create-test" className="btn-primary" style={{ fontSize: "0.95rem", padding: "12px 24px" }}>
              + New Test
            </Link>
          </div>
        </div>

        {/* Stats Row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16, marginBottom: 40 }}>
          {[
            { label: "Tests Taken", value: mockStats.totalTests, icon: "📝", color: "#f97316" },
            { label: "Avg Score", value: `${mockStats.avgScore}%`, icon: "📊", color: "#3b82f6" },
            { label: "Accuracy", value: `${mockStats.accuracy}%`, icon: "🎯", color: "#22c55e" },
            { label: "Global Rank", value: `#${mockUser.globalRank}`, icon: "🏆", color: "#eab308" },
            { label: "Batch Rank", value: `#${mockUser.batchRank}`, icon: "👥", color: "#a855f7" },
            { label: "Streak", value: `${mockUser.streakDays}d`, icon: "🔥", color: "#ef4444" },
          ].map((s) => (
            <div key={s.label} className="stat-card" style={{ textAlign: "center" }}>
              <div style={{ fontSize: "1.5rem", marginBottom: 8 }}>{s.icon}</div>
              <div style={{ fontSize: "1.5rem", fontWeight: 900, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: "0.75rem", color: "#475569", marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 24, alignItems: "start" }}>
          {/* Recent Tests */}
          <div>
            <h2 style={{ fontSize: "1.1rem", fontWeight: 700, color: "#f1f5f9", marginBottom: 16 }}>
              Recent Tests
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {mockRecentTests.map((test) => (
                <div
                  key={test.id}
                  className="glass glass-hover"
                  style={{ borderRadius: 14, padding: "18px 20px" }}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12, gap: 12 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, color: "#f1f5f9", fontSize: "0.9rem", marginBottom: 4 }}>
                        {test.title}
                      </div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <span className="badge badge-blue">{test.exam}</span>
                        <span className="badge" style={{ background: "rgba(255,255,255,0.05)", color: "#64748b", border: "1px solid rgba(255,255,255,0.08)" }}>
                          {test.questions} Qs · {test.timeTakenMin}m
                        </span>
                        <span style={{ color: "#334155", fontSize: "0.75rem", alignSelf: "center" }}>{test.date}</span>
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div
                        style={{
                          fontSize: "1.4rem", fontWeight: 900,
                          color: test.percentage >= 70 ? "#22c55e" : test.percentage >= 50 ? "#eab308" : "#ef4444",
                        }}
                      >
                        {test.percentage}%
                      </div>
                      <div style={{ fontSize: "0.72rem", color: "#334155" }}>
                        {test.score}/{test.maxScore}
                      </div>
                    </div>
                  </div>

                  <ScoreBar percentage={test.percentage} />

                  <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                    <Link
                      href={`/results/${test.id}`}
                      className="btn-ghost"
                      style={{ fontSize: "0.78rem", padding: "5px 12px" }}
                    >
                      View Analysis
                    </Link>
                    {test.hasBooster && (
                      <span
                        className="badge badge-orange"
                        style={{ cursor: "pointer" }}
                      >
                        ⚡ Booster Ready
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Panel */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Quick actions */}
            <div className="glass" style={{ borderRadius: 16, padding: "22px" }}>
              <h3 style={{ fontWeight: 700, fontSize: "0.9rem", color: "#94a3b8", marginBottom: 16, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Quick Start
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {[
                  { label: "📖 Chapter Test", desc: "Pick a chapter", href: "/create-test?type=chapter" },
                  { label: "📚 Subject Test", desc: "Full subject", href: "/create-test?type=subject" },
                  { label: "📋 Full Mock", desc: "75 questions, 3 hours", href: "/create-test?type=full" },
                  { label: "📅 Past Year", desc: "JEE 2019–2024", href: "/create-test?type=past_year" },
                ].map((q) => (
                  <Link
                    key={q.label}
                    href={q.href}
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "10px 12px", borderRadius: 10,
                      background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
                      textDecoration: "none", transition: "background 0.15s, border-color 0.15s",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.background = "rgba(249,115,22,0.06)";
                      (e.currentTarget as HTMLElement).style.borderColor = "rgba(249,115,22,0.2)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.03)";
                      (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.06)";
                    }}
                  >
                    <div>
                      <div style={{ fontSize: "0.875rem", fontWeight: 600, color: "#f1f5f9" }}>{q.label}</div>
                      <div style={{ fontSize: "0.72rem", color: "#475569" }}>{q.desc}</div>
                    </div>
                    <span style={{ color: "#334155" }}>›</span>
                  </Link>
                ))}
              </div>
            </div>

            {/* Rank summary */}
            <div
              className="glass"
              style={{ borderRadius: 16, padding: "22px", background: "rgba(249,115,22,0.04)", border: "1px solid rgba(249,115,22,0.15)" }}
            >
              <h3 style={{ fontWeight: 700, fontSize: "0.9rem", color: "#fb923c", marginBottom: 16 }}>
                🏆 Your Rankings
              </h3>
              {[
                { scope: "Global", rank: mockUser.globalRank },
                { scope: "Institute", rank: mockUser.instituteRank },
                { scope: "Batch", rank: mockUser.batchRank },
              ].map((r) => (
                <div
                  key={r.scope}
                  style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}
                >
                  <span style={{ fontSize: "0.85rem", color: "#64748b" }}>{r.scope}</span>
                  <span style={{ fontWeight: 800, fontSize: "1rem", color: "#f97316" }}>#{r.rank}</span>
                </div>
              ))}
              <div className="divider" style={{ margin: "12px 0" }} />
              <div style={{ textAlign: "center" }}>
                <div className="gradient-text" style={{ fontSize: "1.8rem", fontWeight: 900 }}>
                  {mockUser.percentile}%ile
                </div>
                <div style={{ color: "#475569", fontSize: "0.75rem" }}>Global Percentile (JEE)</div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
