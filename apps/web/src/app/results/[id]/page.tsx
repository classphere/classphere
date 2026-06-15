"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import {
  RiTargetLine,
  RiFlashlightFill,
  RiTimerLine,
  RiSearchLine,
  RiAlertFill,
  RiCalendarEventLine,
  RiArrowUpSLine,
  RiArrowDownSLine,
  RiLightbulbFlashLine,
  RiArrowLeftLine,
  RiArrowRightLine,
  RiLoader4Line
} from "@remixicon/react";

function AccuracyBar({ accuracy }: { accuracy: number }) {
  const color = accuracy >= 70 ? "var(--success-50)" : accuracy >= 40 ? "var(--warning-50)" : "var(--error-50)";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div className="rayum-progress-track" style={{ flex: 1 }}>
        <div style={{ height: "100%", width: `${accuracy}%`, background: color, borderRadius: 999, transition: "width 0.8s" }} />
      </div>
      <span className="text-body-small" style={{ fontWeight: 700, color, minWidth: 32, textAlign: "right" }}>
        {accuracy.toFixed(0)}%
      </span>
    </div>
  );
}

export default function ResultsPage() {
  const router = useRouter();
  const params = useParams();
  const attemptId = params?.id as string;

  const [showBooster, setShowBooster] = useState(false);
  const [selectedMode, setSelectedMode] = useState<"micro" | "full" | null>(null);
  const [microCount, setMicroCount] = useState(15);
  const [fullHours, setFullHours] = useState<1 | 2 | 3>(1);
  const [expandedDay, setExpandedDay] = useState<number | null>(null);

  const [a, setAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!attemptId) return;
    const fetchAnalysis = async () => {
      try {
        const res = await fetch(`/api/v1/analysis/${attemptId}`);
        const data = await res.json();
        if (data.success && data.data.status === "ready") {
          setAnalysis(data.data.analysis);
          setLoading(false);
        } else {
          // Poll if pending
          setTimeout(fetchAnalysis, 2000);
        }
      } catch (err) {
        console.error(err);
        setLoading(false);
      }
    };
    fetchAnalysis();
  }, [attemptId]);

  if (loading || !a) {
    return (
      <>
        <Navbar title="Results & Analysis" />
        <div style={{ minHeight: "80vh", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16, color: "var(--fg-muted)" }}>
          <RiLoader4Line size={48} style={{ animation: "spin 1s linear infinite" }} />
          <p style={{ fontSize: 16, fontWeight: 600 }}>Analyzing your performance...</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </>
    );
  }

  const pct = Math.round(a.scoring.percentage);
  const pctColor = pct >= 70 ? "var(--success-50)" : pct >= 50 ? "var(--warning-50)" : "var(--error-50)";
  const pctBg = pct >= 70 ? "var(--success-10)" : pct >= 50 ? "var(--warning-10)" : "var(--error-10)";

  return (
    <>
      <Navbar title="Results & Analysis" />
      <main style={{ maxWidth: 900, margin: "0 auto", padding: "var(--space-600)", width: "100%" }}>
        {/* Header */}
        <div style={{ marginBottom: "var(--space-800)" }}>
          <Link href="/" style={{ color: "var(--secondary-50)", fontSize: 14, fontWeight: 600, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 16 }}>
            <RiArrowLeftLine size={16} /> Back to Dashboard
          </Link>
          <h1 className="text-h2" style={{ color: "var(--fg-default)" }}>
            Test Results & AI Analysis
          </h1>
          <p className="text-body-base" style={{ color: "var(--fg-muted)", marginTop: 8 }}>Laws of Motion · JEE · {a.correctCount + a.incorrectCount + a.skippedCount} Questions</p>
        </div>

        {/* Score Banner */}
        <div className="rayum-card" style={{ padding: 40, border: `2px solid ${pctColor}`, background: pctBg, marginBottom: "var(--space-800)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 48, alignItems: "center" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 64, fontWeight: 900, color: pctColor, lineHeight: 1 }}>{pct}%</div>
              <div className="text-body-base" style={{ color: "var(--fg-muted)", marginTop: 12, fontWeight: 600 }}>Your Score</div>
            </div>

            <div>
              <div className="rayum-progress-track" style={{ height: 12, marginBottom: 24, background: "rgba(0,0,0,0.05)" }}>
                <div style={{ height: "100%", width: `${pct}%`, background: pctColor, borderRadius: 999, transition: "width 1s" }} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
                {[
                  { label: "Correct", value: a.scoring.correctCount, color: "var(--success-50)" },
                  { label: "Incorrect", value: a.scoring.incorrectCount, color: "var(--error-50)" },
                  { label: "Skipped", value: a.scoring.skippedCount, color: "var(--fg-muted)" },
                ].map((s) => (
                  <div key={s.label} style={{ textAlign: "center", background: "white", padding: "12px", borderRadius: "var(--radius-md)", boxShadow: "var(--shadow-100)" }}>
                    <div style={{ fontSize: 24, fontWeight: 900, color: s.color }}>{s.value}</div>
                    <div className="text-body-small" style={{ color: "var(--fg-muted)", marginTop: 4, fontWeight: 600 }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ textAlign: "right", background: "white", padding: 24, borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-100)" }}>
              <div className="text-body-small" style={{ color: "var(--fg-muted)", marginBottom: 8, fontWeight: 600 }}>Batch Avg</div>
              <div style={{ fontWeight: 800, fontSize: 32, color: "var(--fg-default)" }}>{a.batchAvg}%</div>
              <div style={{ fontSize: 13, marginTop: 12, color: pct >= a.batchAvg ? "var(--success-50)" : "var(--error-50)", fontWeight: 700 }}>
                {pct >= a.batchAvg ? `↑ +${pct - a.batchAvg}% above avg` : `↓ ${a.batchAvg - pct}% below avg`}
              </div>
            </div>
          </div>
        </div>

        {/* 🎯 Booster Card */}
        {!showBooster ? (
          <div className="rayum-card" style={{ padding: 32, border: "2px solid var(--warning-50)", background: "var(--warning-10)", marginBottom: "var(--space-800)", cursor: "pointer" }} onClick={() => setShowBooster(true)}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
              <div>
                <div className="text-h3" style={{ color: "var(--warning-50)", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
                  <RiTargetLine size={24} /> Improvement Options Ready
                </div>
                <div className="text-body-base" style={{ color: "var(--fg-default)", marginBottom: 20 }}>
                  Based on your analysis, <strong style={{ color: "var(--warning-50)" }}>3 topics need work</strong>:
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
                  {a.topicStats.filter((t: any) => t.isWeak).map((t: any) => (
                    <span key={t.topic} className="rayum-badge orange" style={{ padding: "8px 16px", fontSize: 13 }}>{t.topic}</span>
                  ))}
                </div>
              </div>
              <button className="btn btn-primary" style={{ background: "var(--warning-50)", whiteSpace: "nowrap", flexShrink: 0, display: "inline-flex", gap: 8 }}>
                Choose Mode <RiArrowRightLine size={18} />
              </button>
            </div>
          </div>
        ) : (
          <div className="rayum-card" style={{ padding: 32, border: "2px solid var(--warning-50)", background: "var(--bg-surface)", marginBottom: "var(--space-800)" }}>
            <div className="text-h3" style={{ color: "var(--fg-default)", marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}>
              <RiTargetLine size={24} /> Choose Your Practice Mode
            </div>
            <p className="text-body-base" style={{ color: "var(--fg-muted)", marginBottom: 32 }}>
              All questions are from your {a.topicStats.filter((t: any) => t.isWeak).length} weak topics only.
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 32 }}>
              {/* Micro Booster */}
              <div
                onClick={() => setSelectedMode("micro")}
                style={{
                  padding: 24, borderRadius: "var(--radius-md)", cursor: "pointer",
                  background: selectedMode === "micro" ? "var(--warning-10)" : "var(--neutral-10)",
                  border: selectedMode === "micro" ? "2px solid var(--warning-50)" : "2px solid transparent",
                  transition: "all 0.15s",
                }}
              >
                <div style={{ marginBottom: 16, color: "var(--warning-50)" }}>
                  <RiFlashlightFill size={32} />
                </div>
                <div className="text-body-large" style={{ fontWeight: 700, color: "var(--fg-default)", marginBottom: 8 }}>Micro Booster</div>
                <div className="text-body-small" style={{ color: "var(--fg-muted)", marginBottom: 24 }}>Quick 30-60 min targeted revision</div>
                {selectedMode === "micro" && (
                  <div onClick={(e) => e.stopPropagation()}>
                    <div className="text-body-small" style={{ color: "var(--fg-muted)", marginBottom: 12, fontWeight: 600 }}>Questions:</div>
                    <div style={{ display: "flex", gap: 8 }}>
                      {[15, 20, 25, 30].map((n) => (
                        <button
                          key={n}
                          onClick={() => setMicroCount(n)}
                          style={{
                            padding: "8px 16px", borderRadius: "var(--radius-sm)", border: "none",
                            background: microCount === n ? "var(--warning-50)" : "var(--bg-surface)",
                            color: microCount === n ? "white" : "var(--fg-muted)",
                            cursor: "pointer", fontSize: 13, fontWeight: 600, boxShadow: "var(--shadow-100)"
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
                  padding: 24, borderRadius: "var(--radius-md)", cursor: "pointer",
                  background: selectedMode === "full" ? "var(--secondary-10)" : "var(--neutral-10)",
                  border: selectedMode === "full" ? "2px solid var(--secondary-50)" : "2px solid transparent",
                  transition: "all 0.15s",
                }}
              >
                <div style={{ marginBottom: 16, color: "var(--secondary-50)" }}>
                  <RiTimerLine size={32} />
                </div>
                <div className="text-body-large" style={{ fontWeight: 700, color: "var(--fg-default)", marginBottom: 8 }}>Full Improvement Test</div>
                <div className="text-body-small" style={{ color: "var(--fg-muted)", marginBottom: 24 }}>Exam simulation on weak areas</div>
                {selectedMode === "full" && (
                  <div onClick={(e) => e.stopPropagation()}>
                    <div className="text-body-small" style={{ color: "var(--fg-muted)", marginBottom: 12, fontWeight: 600 }}>Duration:</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {([1, 2, 3] as const).map((h) => (
                        <button
                          key={h}
                          onClick={() => setFullHours(h)}
                          style={{
                            padding: "10px 16px", borderRadius: "var(--radius-sm)", border: "none", textAlign: "left",
                            background: fullHours === h ? "var(--secondary-50)" : "var(--bg-surface)",
                            color: fullHours === h ? "white" : "var(--fg-default)",
                            cursor: "pointer", fontSize: 13, fontWeight: 600, boxShadow: "var(--shadow-100)"
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

            <div style={{ display: "flex", gap: 16 }}>
              <button
                className="btn btn-primary"
                disabled={!selectedMode}
                style={{ flex: 1, justifyContent: "center", opacity: selectedMode ? 1 : 0.4, display: "inline-flex", gap: 8 }}
                onClick={() => router.push("/test/booster-001")}
              >
                Start Improvement Test <RiArrowRightLine size={18} />
              </button>
              <button className="btn btn-outline" onClick={() => setShowBooster(false)}>
                Skip for now
              </button>
            </div>
          </div>
        )}

        {/* Weak Topics */}
        <div style={{ marginBottom: "var(--space-800)" }}>
          <h2 className="text-h3" style={{ marginBottom: 24, display: "flex", alignItems: "center", gap: 8 }}>
            <RiSearchLine size={22} /> Weak Topic Breakdown
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {a.topicStats.filter((t: any) => t.isWeak).map((topic: any) => (
              <div key={topic.topic} className="rayum-card" style={{ padding: 24 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, gap: 16 }}>
                  <div>
                    <div className="text-body-large" style={{ fontWeight: 700, color: "var(--fg-default)", marginBottom: 8 }}>{topic.topic}</div>
                    <span className="rayum-badge orange">{topic.chapter}</span>
                  </div>
                  <div style={{ fontSize: 28, fontWeight: 900, color: topic.accuracy >= 70 ? "var(--success-50)" : topic.accuracy >= 40 ? "var(--warning-50)" : "var(--error-50)" }}>
                    {topic.accuracy.toFixed(0)}%
                  </div>
                </div>
                <AccuracyBar accuracy={topic.accuracy} />
                <p className="text-body-small" style={{ color: "var(--fg-muted)", marginTop: 16, lineHeight: 1.6, display: "flex", gap: 8 }}>
                  <RiLightbulbFlashLine size={16} color="var(--primary-50)" style={{ flexShrink: 0, marginTop: 2 }} />
                  <span>
                    <strong style={{ color: "var(--fg-default)" }}>Analysis:</strong> Needs attention based on {topic.attempted} attempts.
                  </span>
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Error Patterns */}
        <div style={{ marginBottom: "var(--space-800)" }}>
          <h2 className="text-h3" style={{ marginBottom: 24, display: "flex", alignItems: "center", gap: 8 }}>
            <RiAlertFill size={22} color="var(--error-50)" /> Error Patterns
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {a.errorPatterns.map((ep: any) => (
              <div key={ep.id} className="rayum-card" style={{ padding: 24 }}>
                <div className="text-body-large" style={{ fontWeight: 700, color: "var(--error-50)", marginBottom: 12 }}>{ep.name}</div>
                <p className="text-body-small" style={{ color: "var(--fg-muted)", lineHeight: 1.6, marginBottom: 16 }}>{ep.description}</p>
                <div>
                  <span className="rayum-badge" style={{ background: "var(--error-10)", color: "var(--error-50)" }}>
                    {ep.questionsAffected.length} questions affected
                  </span>
                </div>
                <p className="text-body-small" style={{ marginTop: 16, color: "var(--primary-50)", fontWeight: 600 }}>Tip: {ep.tip}</p>
              </div>
            ))}
          </div>
        </div>

        {/* 7-Day Study Plan */}
        <div>
          <h2 className="text-h3" style={{ marginBottom: 24, display: "flex", alignItems: "center", gap: 8 }}>
            <RiCalendarEventLine size={22} /> Your 7-Day Study Plan
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {a.studyPlan.map((day) => (
              <div
                key={day.day}
                className="rayum-card"
                style={{ padding: 0, overflow: "hidden", cursor: "pointer", transition: "all 0.2s", border: expandedDay === day.day ? "1px solid var(--primary-50)" : "1px solid var(--border-default)" }}
                onClick={() => setExpandedDay(expandedDay === day.day ? null : day.day)}
              >
                <div style={{ padding: 20, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, background: expandedDay === day.day ? "var(--primary-10)" : "var(--bg-surface)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                    <div style={{ fontWeight: 900, fontSize: 18, color: "var(--primary-50)", minWidth: 32 }}>
                      D{day.day}
                    </div>
                    <div>
                      <div className="text-body-base" style={{ fontWeight: 600, color: "var(--fg-default)" }}>{day.topic}</div>
                      <div className="text-body-small" style={{ color: "var(--fg-muted)", marginTop: 4 }}>{day.durationMinutes} min</div>
                    </div>
                  </div>
                  <span style={{ color: "var(--fg-muted)", display: "flex" }}>
                    {expandedDay === day.day ? <RiArrowUpSLine size={20} /> : <RiArrowDownSLine size={20} />}
                  </span>
                </div>
                {expandedDay === day.day && (
                  <div style={{ padding: "0 20px 20px", color: "var(--fg-muted)", fontSize: 14, lineHeight: 1.6, borderTop: "1px solid var(--border-default)", marginTop: 16, paddingTop: 16 }}>
                    <strong>Activity:</strong> {day.activity} <br />
                    <strong style={{ marginTop: 8, display: "block" }}>Focus:</strong> Targeting {day.focusErrorType} errors.
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </main>
    </>
  );
}
