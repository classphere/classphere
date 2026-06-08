"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import { mockAnalysis } from "@/lib/mock-data";

function AccuracyBar({ accuracy }: { accuracy: number }) {
  const color = accuracy >= 70 ? "#22c55e" : accuracy >= 40 ? "#eab308" : "#ef4444";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div className="progress-bar-track" style={{ flex: 1 }}>
        <div style={{ height: "100%", width: `${accuracy}%`, background: color, borderRadius: 999, transition: "width 0.8s" }} />
      </div>
      <span style={{ fontSize: "0.8rem", fontWeight: 700, color, minWidth: 32, textAlign: "right" }}>
        {accuracy}%
      </span>
    </div>
  );
}

export default function ResultsPage() {
  const router = useRouter();
  const [showBooster, setShowBooster] = useState(false);
  const [selectedMode, setSelectedMode] = useState<"micro" | "full" | null>(null);
  const [microCount, setMicroCount] = useState(15);
  const [fullHours, setFullHours] = useState<1 | 2 | 3>(1);
  const [expandedDay, setExpandedDay] = useState<number | null>(null);

  const a = mockAnalysis;
  const pct = a.percentage;
  const pctColor = pct >= 70 ? "#22c55e" : pct >= 50 ? "#eab308" : "#ef4444";

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-primary)" }}>
      <Navbar />
      <main style={{ maxWidth: 900, margin: "0 auto", padding: "36px 24px" }}>
        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <Link href="/dashboard" style={{ color: "#475569", fontSize: "0.8rem", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 16 }}>
            ← Back to Dashboard
          </Link>
          <h1 style={{ fontSize: "1.6rem", fontWeight: 800, color: "#f1f5f9" }}>
            Test Results & AI Analysis
          </h1>
          <p style={{ color: "#64748b", marginTop: 6 }}>Laws of Motion · JEE · {a.correctCount + a.incorrectCount + a.skippedCount} Questions</p>
        </div>

        {/* Score Banner */}
        <div
          className="glass"
          style={{
            borderRadius: 20, padding: "32px",
            border: `1px solid ${pctColor}25`,
            background: `${pctColor}05`,
            marginBottom: 24,
          }}
        >
          <div style={{ display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 32, alignItems: "center" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "4rem", fontWeight: 900, color: pctColor, lineHeight: 1 }}>{pct}%</div>
              <div style={{ color: "#475569", fontSize: "0.8rem", marginTop: 6 }}>Your Score</div>
            </div>

            <div>
              <div className="progress-bar-track" style={{ height: 8, marginBottom: 20 }}>
                <div style={{ height: "100%", width: `${pct}%`, background: pctColor, borderRadius: 999, transition: "width 1s" }} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
                {[
                  { label: "Correct", value: a.correctCount, color: "#22c55e" },
                  { label: "Incorrect", value: a.incorrectCount, color: "#ef4444" },
                  { label: "Skipped", value: a.skippedCount, color: "#64748b" },
                ].map((s) => (
                  <div key={s.label} style={{ textAlign: "center" }}>
                    <div style={{ fontSize: "1.6rem", fontWeight: 900, color: s.color }}>{s.value}</div>
                    <div style={{ fontSize: "0.75rem", color: "#475569" }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ textAlign: "right" }}>
              <div style={{ color: "#64748b", fontSize: "0.75rem", marginBottom: 4 }}>Batch Avg</div>
              <div style={{ fontWeight: 800, fontSize: "1.4rem", color: "#64748b" }}>{a.batchAvg}%</div>
              <div style={{ fontSize: "0.72rem", marginTop: 8, color: pct >= a.batchAvg ? "#22c55e" : "#ef4444", fontWeight: 600 }}>
                {pct >= a.batchAvg ? `+${pct - a.batchAvg}% above avg` : `${a.batchAvg - pct}% below avg`}
              </div>
            </div>
          </div>
        </div>

        {/* 🎯 Booster Card */}
        {!showBooster ? (
          <div
            style={{
              borderRadius: 18, padding: "28px",
              background: "linear-gradient(135deg, rgba(249,115,22,0.08), rgba(234,179,8,0.05))",
              border: "1.5px solid rgba(249,115,22,0.35)",
              marginBottom: 28, cursor: "pointer",
            }}
            onClick={() => setShowBooster(true)}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
              <div>
                <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "#f1f5f9", marginBottom: 10 }}>
                  🎯 Improvement Options Ready
                </div>
                <div style={{ color: "#94a3b8", fontSize: "0.875rem", lineHeight: 1.6, marginBottom: 16 }}>
                  Based on your analysis, <strong style={{ color: "#f97316" }}>3 topics need work</strong>:
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {a.weakTopics.map((t) => (
                    <span key={t.topic} className="badge badge-red">{t.topic}</span>
                  ))}
                </div>
              </div>
              <button className="btn-primary" style={{ whiteSpace: "nowrap", flexShrink: 0 }}>
                Choose Mode →
              </button>
            </div>
          </div>
        ) : (
          <div
            className="glass"
            style={{
              borderRadius: 18, padding: "28px",
              border: "1.5px solid rgba(249,115,22,0.3)",
              marginBottom: 28,
              background: "rgba(249,115,22,0.03)",
            }}
          >
            <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "#f1f5f9", marginBottom: 6 }}>
              🎯 Choose Your Practice Mode
            </div>
            <p style={{ color: "#64748b", fontSize: "0.85rem", marginBottom: 24 }}>
              All questions are from your {a.weakTopics.length} weak topics only.
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 24 }}>
              {/* Micro Booster */}
              <div
                onClick={() => setSelectedMode("micro")}
                style={{
                  padding: "18px", borderRadius: 14, cursor: "pointer",
                  background: selectedMode === "micro" ? "rgba(249,115,22,0.1)" : "rgba(255,255,255,0.04)",
                  border: selectedMode === "micro" ? "2px solid #f97316" : "1.5px solid rgba(255,255,255,0.08)",
                  transition: "all 0.15s",
                }}
              >
                <div style={{ fontSize: "1.3rem", marginBottom: 8 }}>⚡</div>
                <div style={{ fontWeight: 700, color: "#f1f5f9", marginBottom: 4 }}>Micro Booster</div>
                <div style={{ color: "#64748b", fontSize: "0.8rem", marginBottom: 14 }}>Quick 30-60 min targeted revision</div>
                {selectedMode === "micro" && (
                  <div onClick={(e) => e.stopPropagation()}>
                    <div style={{ fontSize: "0.75rem", color: "#94a3b8", marginBottom: 8 }}>Questions:</div>
                    <div style={{ display: "flex", gap: 6 }}>
                      {[15, 20, 25, 30].map((n) => (
                        <button
                          key={n}
                          onClick={() => setMicroCount(n)}
                          style={{
                            padding: "4px 10px", borderRadius: 8, border: "1px solid",
                            borderColor: microCount === n ? "#f97316" : "rgba(255,255,255,0.12)",
                            background: microCount === n ? "rgba(249,115,22,0.15)" : "transparent",
                            color: microCount === n ? "#fb923c" : "#64748b",
                            cursor: "pointer", fontSize: "0.78rem", fontFamily: "Inter, sans-serif",
                          }}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Full Improvement */}
              <div
                onClick={() => setSelectedMode("full")}
                style={{
                  padding: "18px", borderRadius: 14, cursor: "pointer",
                  background: selectedMode === "full" ? "rgba(168,85,247,0.1)" : "rgba(255,255,255,0.04)",
                  border: selectedMode === "full" ? "2px solid #a855f7" : "1.5px solid rgba(255,255,255,0.08)",
                  transition: "all 0.15s",
                }}
              >
                <div style={{ fontSize: "1.3rem", marginBottom: 8 }}>⏱️</div>
                <div style={{ fontWeight: 700, color: "#f1f5f9", marginBottom: 4 }}>Full Improvement Test</div>
                <div style={{ color: "#64748b", fontSize: "0.8rem", marginBottom: 14 }}>Exam simulation on weak areas</div>
                {selectedMode === "full" && (
                  <div onClick={(e) => e.stopPropagation()}>
                    <div style={{ fontSize: "0.75rem", color: "#94a3b8", marginBottom: 8 }}>Duration:</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {([1, 2, 3] as const).map((h) => (
                        <button
                          key={h}
                          onClick={() => setFullHours(h)}
                          style={{
                            padding: "6px 12px", borderRadius: 8, border: "1px solid", textAlign: "left",
                            borderColor: fullHours === h ? "#a855f7" : "rgba(255,255,255,0.12)",
                            background: fullHours === h ? "rgba(168,85,247,0.12)" : "transparent",
                            color: fullHours === h ? "#c084fc" : "#64748b",
                            cursor: "pointer", fontSize: "0.78rem", fontFamily: "Inter, sans-serif",
                          }}
                        >
                          {h} Hour · {h * 25} Questions (JEE)
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: "flex", gap: 12 }}>
              <button
                className="btn-primary"
                disabled={!selectedMode}
                style={{ flex: 1, justifyContent: "center", opacity: selectedMode ? 1 : 0.4 }}
                onClick={() => router.push("/test/booster-001")}
              >
                Start Improvement Test →
              </button>
              <button className="btn-ghost" onClick={() => setShowBooster(false)}>
                Skip for now
              </button>
            </div>
          </div>
        )}

        {/* Weak Topics */}
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontWeight: 800, color: "#f1f5f9", marginBottom: 16, fontSize: "1.1rem" }}>
            🔍 Weak Topic Breakdown
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {a.weakTopics.map((topic) => (
              <div key={topic.topic} className="glass" style={{ borderRadius: 14, padding: "18px 20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14, gap: 16 }}>
                  <div>
                    <div style={{ fontWeight: 700, color: "#f1f5f9", marginBottom: 4 }}>{topic.topic}</div>
                    <span className="badge badge-orange" style={{ fontSize: "0.68rem" }}>{topic.chapter}</span>
                  </div>
                  <div
                    style={{
                      fontSize: "1.4rem", fontWeight: 900,
                      color: topic.accuracy >= 70 ? "#22c55e" : topic.accuracy >= 40 ? "#eab308" : "#ef4444",
                    }}
                  >
                    {topic.accuracy}%
                  </div>
                </div>
                <AccuracyBar accuracy={topic.accuracy} />
                <p style={{ color: "#64748b", fontSize: "0.8rem", marginTop: 12, lineHeight: 1.6 }}>
                  💡 {topic.recommendation}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Error Patterns */}
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontWeight: 800, color: "#f1f5f9", marginBottom: 16, fontSize: "1.1rem" }}>
            ⚠️ Error Patterns
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {a.errorPatterns.map((ep) => (
              <div
                key={ep.pattern}
                className="glass"
                style={{ borderRadius: 14, padding: "16px 20px", borderLeft: "3px solid #ef4444" }}
              >
                <div style={{ fontWeight: 700, color: "#f87171", marginBottom: 6 }}>{ep.pattern}</div>
                <p style={{ color: "#64748b", fontSize: "0.85rem", lineHeight: 1.6 }}>{ep.description}</p>
                <div style={{ marginTop: 8 }}>
                  <span className="badge badge-red">{ep.questionsAffected} questions affected</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 7-Day Study Plan */}
        <div>
          <h2 style={{ fontWeight: 800, color: "#f1f5f9", marginBottom: 16, fontSize: "1.1rem" }}>
            📅 Your 7-Day Study Plan
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {a.studyPlan.map((day) => (
              <div
                key={day.day}
                className="glass glass-hover"
                style={{ borderRadius: 14, overflow: "hidden", cursor: "pointer" }}
                onClick={() => setExpandedDay(expandedDay === day.day ? null : day.day)}
              >
                <div
                  style={{
                    padding: "14px 20px", display: "flex",
                    alignItems: "center", justifyContent: "space-between", gap: 16,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <div
                      className="gradient-text"
                      style={{ fontWeight: 900, fontSize: "1.1rem", minWidth: 24 }}
                    >
                      D{day.day}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, color: "#f1f5f9", fontSize: "0.9rem" }}>{day.topic}</div>
                      <div style={{ color: "#475569", fontSize: "0.75rem" }}>{day.durationMinutes} min</div>
                    </div>
                  </div>
                  <span style={{ color: "#334155", fontSize: "0.9rem" }}>{expandedDay === day.day ? "▲" : "▼"}</span>
                </div>
                {expandedDay === day.day && (
                  <div style={{ padding: "0 20px 16px", color: "#64748b", fontSize: "0.875rem", lineHeight: 1.6 }}>
                    {day.activity}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
