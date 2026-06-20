"use client";

import { useState } from "react";
import Navbar from "@/components/layout/Navbar";
import Link from "next/link";
import {
  RiBarChartBoxLine,
  RiCheckDoubleLine,
  RiAlertLine,
  RiArrowRightUpLine,
  RiArrowRightDownLine,
  RiTeamLine,
  RiFileListLine,
  RiAddLine,
} from "@remixicon/react";
import { mockBatches } from "@/lib/mock-data";

// ── Mock Analytics Data ──────────────────────────────────────────
const batchStats = [
  { batchName: "JEE 2026 Morning",   exam: "JEE", avg: 67.4, top: 94, bottom: 21, students: 142, trend: +2.1 },
  { batchName: "NEET 2026 Droppers", exam: "NEET", avg: 59.8, top: 88, bottom: 18, students: 185, trend: -1.4 },
  { batchName: "JEE Foundation",     exam: "JEE", avg: 72.1, top: 97, bottom: 34, students: 138, trend: +5.6 },
];

const weakTopics = [
  { topic: "Carnot Cycle Efficiency",    subject: "Physics",   failRate: 73, students: 134, priority: "Critical" },
  { topic: "Pulley + Sign Conventions",  subject: "Physics",   failRate: 68, students: 124, priority: "Critical" },
  { topic: "Organic Name Reactions",     subject: "Chemistry", failRate: 61, students: 112, priority: "High"     },
  { topic: "Integration by Parts",       subject: "Maths",     failRate: 54, students: 99,  priority: "High"     },
  { topic: "Genetic Inheritance Ratios", subject: "Biology",   failRate: 48, students: 88,  priority: "Medium"   },
];

const trapQuestions = [
  { q: "Q14", option: "B", trap: "sign_error",      pct: 54.2, desc: "Confused direction of friction with surface normal" },
  { q: "Q27", option: "C", trap: "partial_solve",   pct: 48.7, desc: "Stopped after finding velocity, ignored angular momentum" },
  { q: "Q33", option: "D", trap: "unit_error",      pct: 41.3, desc: "Mixed up kJ/mol with J/mol in Hess's Law" },
  { q: "Q41", option: "A", trap: "common_mistake",  pct: 39.1, desc: "Confused dominant with codominant inheritance" },
];

const subjectBreakdown = [
  { subject: "Physics",   avg: 63, correct: 12.6, wrong: 7.2, unattempted: 10.2 },
  { subject: "Chemistry", avg: 71, correct: 14.2, wrong: 5.4, unattempted: 10.4 },
  { subject: "Maths",     avg: 58, correct: 11.6, wrong: 8.8, unattempted: 9.6  },
];

const priorityColor: Record<string, string> = {
  Critical: "badge-red",
  High: "badge-orange",
  Medium: "badge-yellow",
};

export default function TeacherAnalyticsPage() {
  const [selectedBatch, setSelectedBatch] = useState(0);
  const stat = batchStats[selectedBatch];

  return (
    <>
      <Navbar
        title="Batch Analytics"
        subtitle="Cross-batch performance insights, weak topic detection, and trap question analysis."
        breadcrumbs="Dashboard > Analytics"
      />
      <main style={{ maxWidth: 1200, margin: "0 auto", padding: "0 32px 48px", width: "100%" }}>

        {/* Batch Selector */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 32 }}>
          <span className="t-body-base-med">Viewing batch:</span>
          <div style={{ display: "flex", gap: 8 }}>
            {batchStats.map((b, i) => (
              <button
                key={b.batchName}
                onClick={() => setSelectedBatch(i)}
                style={{ padding: "6px 16px", borderRadius: "var(--r-full)", border: `1.5px solid ${selectedBatch === i ? "var(--p-50)" : "var(--border-default)"}`, background: selectedBatch === i ? "var(--p-10)" : "transparent", color: selectedBatch === i ? "var(--p-80)" : "var(--fg-muted)", fontWeight: selectedBatch === i ? 600 : 500, fontSize: "14px", cursor: "pointer", transition: "all 0.15s" }}
              >
                {b.batchName}
              </button>
            ))}
          </div>
        </div>

        {/* KPI Row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 28 }}>
          {[
            { label: "Batch Average",    value: `${stat.avg}%`,      icon: <RiBarChartBoxLine size={20} />, trend: stat.trend,    trendLabel: "vs last test" },
            { label: "Top Score",        value: `${stat.top}%`,       icon: <RiCheckDoubleLine size={20} />, trend: null,           trendLabel: "highest in batch" },
            { label: "Lowest Score",     value: `${stat.bottom}%`,    icon: <RiAlertLine size={20} />,       trend: null,           trendLabel: "needs intervention" },
            { label: "Total Students",   value: stat.students,        icon: <RiTeamLine size={20} />,        trend: null,           trendLabel: stat.exam },
          ].map(k => (
            <div key={k.label} className="rayum-card" style={{ padding: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                <div style={{ padding: 8, background: "var(--n-10)", borderRadius: "var(--r-md)", color: "var(--fg-default)" }}>{k.icon}</div>
                {k.trend != null && (
                  <span style={{ fontSize: 12, fontWeight: 700, color: k.trend > 0 ? "#16A34A" : "#DC2626", display: "flex", alignItems: "center", gap: 2 }}>
                    {k.trend > 0 ? <RiArrowRightUpLine size={14} /> : <RiArrowRightDownLine size={14} />}
                    {k.trend > 0 ? "+" : ""}{k.trend}%
                  </span>
                )}
              </div>
              <div className="t-kpi" style={{ color: "var(--fg-default)", marginBottom: 4 }}>{k.value}</div>
              <div className="t-body-sm" style={{ color: "var(--fg-muted)" }}>{k.label} · {k.trendLabel}</div>
            </div>
          ))}
        </div>

        {/* Subject Breakdown */}
        <section className="rayum-card" style={{ padding: 24, marginBottom: 24 }}>
          <h2 className="section-title" style={{ marginBottom: 20 }}>Subject-wise Performance</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
            {subjectBreakdown.map(s => (
              <div key={s.subject} style={{ padding: 16, background: "var(--n-10)", borderRadius: "var(--r-md)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <span className="t-body-base-bold">{s.subject}</span>
                  <span className="t-sub-b" style={{ color: s.avg >= 70 ? "var(--success-50, #16A34A)" : s.avg >= 55 ? "var(--warning-50, #D97706)" : "var(--danger-50, #DC2626)" }}>{s.avg}%</span>
                </div>
                <div className="progress-track" style={{ height: 6, marginBottom: 12 }}>
                  <div className="progress-fill" style={{ height: "100%", width: `${s.avg}%`, background: s.avg >= 70 ? "var(--success-50, #22C55E)" : s.avg >= 55 ? "var(--warning-50, #F59E0B)" : "var(--danger-50, #EF4444)" }} />
                </div>
                <div style={{ display: "flex", gap: 12, fontSize: 13, color: "var(--fg-muted)" }}>
                  <span>✅ {s.correct} correct</span>
                  <span>❌ {s.wrong} wrong</span>
                  <span>⬜ {s.unattempted} skip</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Weak Topics + Trap Questions */}
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 24 }}>

          {/* Weak Topics */}
          <section className="rayum-card" style={{ padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <h2 className="section-title">Critical Weaknesses — Lecture Planning</h2>
              <Link href="/teacher/dpps" className="btn btn-primary" style={{ padding: "8px 16px" }}>
                <RiAddLine size={18} /> Assign Booster DPP
              </Link>
            </div>
            <p className="t-body-sm" style={{ color: "var(--fg-muted)", marginBottom: 20 }}>Topics where the majority of your batch failed. Prioritise these in your next class.</p>
            <table className="rayum-table">
              <thead>
                <tr>
                  {["Topic", "Subject", "Fail Rate", "Priority"].map(h => (
                    <th key={h} style={{ paddingBottom: 10, fontSize: 12, fontWeight: 700, color: "var(--fg-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {weakTopics.map((t, i) => {
                  const badgeClass = priorityColor[t.priority];
                  return (
                    <tr key={i}>
                      <td className="t-body-sm-med">{t.topic}</td>
                      <td className="t-body-sm" style={{ color: "var(--fg-muted)" }}>{t.subject}</td>
                      <td className="t-body-sm-bold" style={{ color: "var(--danger-50, #DC2626)" }}>{t.failRate}%</td>
                      <td>
                        <span className={`badge ${badgeClass}`}>{t.priority}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>

          {/* Trap Questions */}
          <section className="rayum-card" style={{ padding: 24 }}>
            <h2 className="section-title" style={{ marginBottom: 6 }}>Common Trap Questions</h2>
            <p className="t-body-sm" style={{ color: "var(--fg-muted)", marginBottom: 20 }}>Questions where students selected the same wrong answer.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {trapQuestions.map((t, i) => (
                <div key={i} className="rayum-card" style={{ padding: 16, border: "1px solid var(--danger-30, #FCA5A5)", background: "var(--danger-10, #FEF2F2)", boxShadow: "none" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span className="t-body-sm-med">{t.q} — Option {t.option}</span>
                    <span className="t-body-sm-bold" style={{ color: "var(--danger-60, #DC2626)" }}>{t.pct}%</span>
                  </div>
                  <p className="t-body-sm" style={{ color: "var(--danger-70, #7F1D1D)", marginBottom: 12 }}>{t.desc}</p>
                  <span className="badge badge-red">{t.trap.replace(/_/g, " ")}</span>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* All Batches Summary Table */}
        <section className="rayum-card" style={{ padding: "24px 0", marginTop: 24 }}>
          <div style={{ padding: "0 24px 20px" }}>
            <h2 className="section-title">All Batches — Quick Comparison</h2>
          </div>
          <table className="rayum-table">
            <thead>
              <tr>
                <th style={{ paddingLeft: 24 }}>Batch</th>
                <th>Exam</th>
                <th>Students</th>
                <th>Avg Score</th>
                <th>Top Score</th>
                <th style={{ paddingRight: 24, textAlign: "right" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {batchStats.map((b, i) => (
                <tr key={i}>
                  <td className="t-body-sm-med" style={{ paddingLeft: 24 }}>{b.batchName}</td>
                  <td className="t-body-sm">{b.exam}</td>
                  <td className="t-body-sm">{b.students}</td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span className="t-body-sm-med">{b.avg}%</span>
                      <div className="progress-track" style={{ width: 80, height: 6 }}>
                        <div className="progress-fill" style={{ height: "100%", width: `${b.avg}%`, background: b.avg >= 70 ? "var(--success-50, #22C55E)" : "var(--p-50)" }} />
                      </div>
                      <span className="t-body-sm-med" style={{ color: b.trend > 0 ? "var(--success-50, #16A34A)" : "var(--danger-50, #DC2626)" }}>{b.trend > 0 ? "+" : ""}{b.trend}%</span>
                    </div>
                  </td>
                  <td className="t-body-sm-med">{b.top}%</td>
                  <td style={{ paddingRight: 24, textAlign: "right" }}>
                    <Link href={`/teacher/batch/${mockBatches[i]?.id || "batch-001"}`} className="btn btn-outline" style={{ padding: "8px 16px" }}>
                      <RiFileListLine size={18} style={{ verticalAlign: "middle" }} /> View Batch
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

      </main>
    </>
  );
}
