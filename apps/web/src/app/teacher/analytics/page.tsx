"use client";

import { useState, useEffect } from "react";
import Navbar from "@/components/layout/Navbar";
import { RiAlertLine, RiCheckDoubleLine, RiBarChartBoxLine, RiLoader4Line } from "@remixicon/react";

export default function TeacherAnalyticsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // We hardcode the test/batch for demo purposes
  const testId = "jee-main-2024-jan-shift1";
  const batchId = "demo-batch";

  useEffect(() => {
    const fetchBatchData = async () => {
      try {
        const res = await fetch(`/api/v1/analysis/batch/${testId}/${batchId}`);
        const json = await res.json();
        if (json.success) {
          setData(json.data.analysis);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchBatchData();
  }, []);

  if (loading || !data) {
    return (
      <>
        <Navbar title="Batch Insights" />
        <div style={{ minHeight: "80vh", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16, color: "var(--fg-muted)" }}>
          <RiLoader4Line size={48} style={{ animation: "spin 1s linear infinite" }} />
          <p style={{ fontSize: 16, fontWeight: 600 }}>Aggregating batch insights...</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </>
    );
  }

  // Fallback if no students took the test
  if (data.totalStudents === 0) {
    return (
      <>
        <Navbar title="Batch Insights" />
        <main style={{ maxWidth: 1200, margin: "0 auto", padding: "var(--space-600)", width: "100%", textAlign: "center", marginTop: 100 }}>
          <h2 className="text-h2">No Submissions Yet</h2>
          <p className="text-body-base" style={{ color: "var(--fg-muted)", marginTop: 16 }}>No students in this batch have submitted the test.</p>
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar title="Batch Insights" />
      <main style={{ maxWidth: 1200, margin: "0 auto", padding: "var(--space-600)", width: "100%" }}>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
          <h2 className="text-heading-m" style={{ color: "var(--fg-default)", margin: 0 }}>Analysis: Mock Test #14 (JEE Main Pattern)</h2>
          <select className="input-field">
            <option>Aakash Target 2026</option>
            <option>Aakash Foundation 2027</option>
          </select>
        </div>

        {/* Top Level Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24, marginBottom: 32 }}>
          <div className="rayum-card" style={{ padding: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <div style={{ padding: 10, background: "var(--primary-10)", borderRadius: 8, color: "var(--primary-50)" }}>
                <RiBarChartBoxLine size={24} />
              </div>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: "var(--fg-muted)" }}>Batch Average Score</h3>
            </div>
            <div style={{ fontSize: 28, fontWeight: 800 }}>{data.avgPercentage.toFixed(1)}%</div>
            <p style={{ fontSize: 12, color: "var(--danger-50)", marginTop: 8 }}>-2.1% from previous test</p>
          </div>

          <div className="rayum-card" style={{ padding: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <div style={{ padding: 10, background: "rgba(34, 197, 94, 0.1)", borderRadius: 8, color: "var(--success-50)" }}>
                <RiCheckDoubleLine size={24} />
              </div>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: "var(--fg-muted)" }}>Highest Score</h3>
            </div>
            <div style={{ fontSize: 28, fontWeight: 800 }}>96.0%</div>
            <p style={{ fontSize: 12, color: "var(--fg-muted)", marginTop: 8 }}>By Ananya Singh</p>
          </div>

          <div className="rayum-card" style={{ padding: 24, border: "2px solid var(--danger-50)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <div style={{ padding: 10, background: "rgba(239, 68, 68, 0.1)", borderRadius: 8, color: "var(--danger-50)" }}>
                <RiAlertLine size={24} />
              </div>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: "var(--fg-muted)" }}>Students At Risk</h3>
            </div>
            <div style={{ fontSize: 28, fontWeight: 800, color: "var(--danger-50)" }}>{data.totalStudents}</div>
            <p style={{ fontSize: 12, color: "var(--fg-muted)", marginTop: 8 }}>Total submissions</p>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 24 }}>
          {/* Weak Topics Analysis */}
          <div className="rayum-card" style={{ padding: 24 }}>
            <h2 className="text-heading-s" style={{ color: "var(--fg-default)", marginBottom: 8 }}>Lecture Planning: Critical Weaknesses</h2>
            <p className="text-body-small" style={{ color: "var(--fg-muted)", marginBottom: 24 }}>The majority of your batch struggled with the following topics. Consider revising these in your next class.</p>

            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border-default)" }}>
                  <th style={{ padding: "12px 0", color: "var(--fg-muted)", fontWeight: 600, fontSize: 13 }}>Topic</th>
                  <th style={{ padding: "12px 0", color: "var(--fg-muted)", fontWeight: 600, fontSize: 13 }}>Fail Rate</th>
                  <th style={{ padding: "12px 0", color: "var(--fg-muted)", fontWeight: 600, fontSize: 13 }}>Students Failed</th>
                  <th style={{ padding: "12px 0", color: "var(--fg-muted)", fontWeight: 600, fontSize: 13 }}>Priority</th>
                </tr>
              </thead>
              <tbody>
                {data.topicPerformance.sort((a: any, b: any) => a.avgAccuracy - b.avgAccuracy).slice(0, 5).map((topic: any, idx: number) => {
                  const failRate = 100 - topic.avgAccuracy;
                  const priority = failRate > 60 ? "Critical" : failRate > 40 ? "High" : "Medium";
                  return (
                    <tr key={idx} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                      <td style={{ padding: "16px 0", color: "var(--fg-default)", fontWeight: 600 }}>{topic.topic}</td>
                      <td style={{ padding: "16px 0", color: "var(--danger-50)", fontWeight: 600 }}>{failRate.toFixed(1)}%</td>
                      <td style={{ padding: "16px 0", color: "var(--fg-muted)" }}>Bottom 25% avg: {topic.bottomQuartileAccuracy.toFixed(1)}%</td>
                      <td style={{ padding: "16px 0" }}>
                        <span className={`rayum-badge ${priority === "Critical" ? "red" : priority === "High" ? "orange" : "yellow"}`}>
                          {priority}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <button className="btn btn-outline" style={{ width: "100%", marginTop: 24 }}>
              Generate Remedial Assignment for Bottleneck Chapters
            </button>
          </div>

          {/* Common Traps */}
          <div className="rayum-card" style={{ padding: 24 }}>
            <h2 className="text-heading-s" style={{ color: "var(--fg-default)", marginBottom: 20 }}>Common Trap Questions</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {data.commonMistakes.length === 0 ? (
                <p style={{ color: "var(--fg-muted)", fontSize: 14 }}>No significant traps detected yet.</p>
              ) : data.commonMistakes.map((mistake: any, idx: number) => (
                <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 16, borderBottom: "1px solid var(--border-subtle)" }}>
                  <div>
                    <div className="text-body" style={{ fontWeight: 600, color: "var(--fg-default)" }}>
                      Q{mistake.questionNumber} (Option {mistake.trapOption})
                    </div>
                    <div className="text-body-small" style={{ color: "var(--error-50)" }}>
                      {mistake.percentageFallen.toFixed(1)}% fell for this trap
                    </div>
                  </div>
                  <button className="btn btn-ghost" style={{ padding: "4px 8px", fontSize: 12 }}>
                    {mistake.errorType}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

      </main>
    </>
  );
}
