"use client";

import Navbar from "@/components/layout/Navbar";
import { RiAlertLine, RiCheckDoubleLine, RiBarChartBoxLine } from "@remixicon/react";

const weakTopics = [
  { topic: "Rotational Mechanics", failRate: "68%", studentsFailed: 42, priority: "Critical" },
  { topic: "Electromagnetism (Flux)", failRate: "55%", studentsFailed: 34, priority: "High" },
  { topic: "Thermodynamics", failRate: "42%", studentsFailed: 26, priority: "Medium" }
];

const mockStudents = [
  { name: "Rahul Verma", score: "42%", status: "At Risk", trend: "down" },
  { name: "Sneha Patil", score: "45%", status: "At Risk", trend: "down" },
  { name: "Amit Kumar", score: "51%", status: "Needs Attention", trend: "flat" },
];

export default function TeacherAnalyticsPage() {
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
            <div style={{ fontSize: 28, fontWeight: 800 }}>64.2%</div>
            <p style={{ fontSize: 12, color: "var(--error-50)", marginTop: 8 }}>-2.1% from previous test</p>
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

          <div className="rayum-card" style={{ padding: 24, border: "2px solid var(--error-50)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <div style={{ padding: 10, background: "rgba(239, 68, 68, 0.1)", borderRadius: 8, color: "var(--error-50)" }}>
                <RiAlertLine size={24} />
              </div>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: "var(--fg-muted)" }}>Students At Risk</h3>
            </div>
            <div style={{ fontSize: 28, fontWeight: 800, color: "var(--error-50)" }}>14</div>
            <p style={{ fontSize: 12, color: "var(--fg-muted)", marginTop: 8 }}>Scored below 50%</p>
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
                {weakTopics.map((topic, idx) => (
                  <tr key={idx} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                    <td style={{ padding: "16px 0", color: "var(--fg-default)", fontWeight: 600 }}>{topic.topic}</td>
                    <td style={{ padding: "16px 0", color: "var(--error-50)", fontWeight: 600 }}>{topic.failRate}</td>
                    <td style={{ padding: "16px 0", color: "var(--fg-muted)" }}>{topic.studentsFailed}</td>
                    <td style={{ padding: "16px 0" }}>
                      <span className={`rayum-badge ${topic.priority === "Critical" ? "red" : topic.priority === "High" ? "orange" : "yellow"}`}>
                        {topic.priority}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            <button className="btn btn-outline" style={{ width: "100%", marginTop: 24 }}>
              Generate Remedial Assignment for these Topics
            </button>
          </div>

          {/* At-Risk Students */}
          <div className="rayum-card" style={{ padding: 24 }}>
            <h2 className="text-heading-s" style={{ color: "var(--fg-default)", marginBottom: 20 }}>At-Risk Students</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {mockStudents.map((student, idx) => (
                <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 16, borderBottom: "1px solid var(--border-subtle)" }}>
                  <div>
                    <div className="text-body" style={{ fontWeight: 600, color: "var(--fg-default)" }}>{student.name}</div>
                    <div className="text-body-small" style={{ color: "var(--error-50)" }}>{student.score} (Overall)</div>
                  </div>
                  <button className="btn btn-ghost" style={{ padding: "4px 8px", fontSize: 12 }}>Message</button>
                </div>
              ))}
            </div>
            <button className="btn btn-ghost" style={{ width: "100%", marginTop: 16, fontSize: 13 }}>View All 14 Students</button>
          </div>
        </div>

      </main>
    </>
  );
}
