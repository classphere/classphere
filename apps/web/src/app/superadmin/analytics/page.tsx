"use client";

import Navbar from "@/components/layout/Navbar";
import { RiBrainLine, RiGlobalLine, RiBookOpenLine, RiRobot2Line, RiArrowRightUpLine } from "@remixicon/react";

const examBreakdown = [
  { exam: "JEE Main", tests: 412000, pct: 49, color: "var(--s-50)" },
  { exam: "JEE Advanced", tests: 186000, pct: 22, color: "var(--p-50)" },
  { exam: "NEET", tests: 198000, pct: 23, color: "var(--warning-50)" },
  { exam: "SSC / Other", tests: 49000, pct: 6, color: "var(--n-40)" },
];

const topInstitutes = [
  { name: "Aakash Institute", tests: 58400, tokens: "24.2M" },
  { name: "Allen Career Institute", tests: 47200, tokens: "19.6M" },
  { name: "Resonance Eduventures", tests: 31800, tokens: "13.2M" },
  { name: "Vibrant Academy", tests: 18200, tokens: "7.5M" },
  { name: "FIITJEE Delhi", tests: 11400, tokens: "4.7M" },
];

const aiBreakdown = [
  { label: "Student AI Analysis", value: 85.2, total: 142.8, color: "var(--s-50)" },
  { label: "Booster Test Generation", value: 42.6, total: 142.8, color: "var(--p-50)" },
  { label: "System Optimization", value: 15.0, total: 142.8, color: "var(--n-30)" },
];

export default function GlobalAnalyticsPage() {
  return (
    <>
      <Navbar title="Global Analytics & AI Usage" subtitle="Platform-wide engagement and AI consumption metrics. Revenue is tracked in the Revenue & Billing section." />
      <main style={{ maxWidth: 1200, margin: "0 auto", padding: "0 32px 32px 32px", width: "100%" }}>

        {/* ── KPI Cards ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 24, marginBottom: 40 }}>

          {[
            { label: "Total Tests Conducted", value: "845,210", sub: "+45K this week", subColor: "var(--p-50)", icon: <RiGlobalLine size={18} />, iconBg: "var(--s-10)", iconColor: "var(--s-50)" },
            { label: "Avg Completion Rate", value: "92.4%", sub: "Across all institutes", subColor: "var(--fg-muted)", icon: <RiBookOpenLine size={18} />, iconBg: "var(--n-10)", iconColor: "var(--fg-muted)" },
            { label: "AI Tokens (This Month)", value: "142.8M", sub: "Est. cost: $285.60", subColor: "var(--fg-muted)", icon: <RiBrainLine size={18} />, iconBg: "var(--p-10)", iconColor: "var(--p-50)" },
            { label: "Booster Tests Generated", value: "12,450", sub: "Last 30 days", subColor: "var(--fg-muted)", icon: <RiRobot2Line size={18} />, iconBg: "var(--warning-10)", iconColor: "var(--warning-50)" },
          ].map((kpi, i) => (
            <div key={i} className="rayum-card" style={{ padding: 24 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <p className="t-label" style={{ marginBottom: 12 }}>{kpi.label}</p>
                  <div style={{ fontSize: 36, fontWeight: 800, color: "var(--fg-default)", letterSpacing: "-0.02em", lineHeight: 1 }}>{kpi.value}</div>
                  <div className="t-body-sm" style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 4 }}>
                    {kpi.subColor === "var(--p-50)" && <span className="badge badge-green"><RiArrowRightUpLine size={12} /> {kpi.sub}</span>}
                    {kpi.subColor !== "var(--p-50)" && kpi.sub}
                  </div>
                </div>
                <div className="stat-icon" style={{ background: kpi.iconBg, color: kpi.iconColor }}>{kpi.icon}</div>
              </div>
            </div>
          ))}

        </div>

        {/* ── Exam Breakdown + Top Institutes ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: 24, marginBottom: 24 }}>

          {/* Exam Type Breakdown */}
          <div className="rayum-card" style={{ padding: 32 }}>
            <h3 className="section-title" style={{ fontSize: 18 }}>Tests by Exam Type</h3>
            <p className="section-subtitle" style={{ marginBottom: 32 }}>Distribution across all 845K tests conducted</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              {examBreakdown.map((exam, i) => (
                <div key={i}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 12, height: 12, borderRadius: 2, background: exam.color, flexShrink: 0 }} />
                      <span className="text-bold">{exam.exam}</span>
                    </div>
                    <span className="t-body-sm text-bold">{exam.tests.toLocaleString()} ({exam.pct}%)</span>
                  </div>
                  <div style={{ height: 8, background: "var(--n-20)", borderRadius: "var(--r-full)", overflow: "hidden" }}>
                    <div style={{ width: `${exam.pct}%`, height: "100%", background: exam.color, borderRadius: "var(--r-full)" }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Institutes by Activity */}
          <div className="rayum-card" style={{ padding: 32 }}>
            <h3 className="section-title" style={{ fontSize: 18 }}>Top Institutes by Activity</h3>
            <p className="section-subtitle" style={{ marginBottom: 32 }}>Ranked by tests conducted this month</p>
            <table className="rayum-table">
              <thead>
                <tr>
                  <th>Institute</th>
                  <th style={{ textAlign: "right" }}>Tests</th>
                  <th style={{ textAlign: "right" }}>AI Tokens</th>
                </tr>
              </thead>
              <tbody>
                {topInstitutes.map((inst, i) => (
                  <tr key={i}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{ width: 28, height: 28, borderRadius: "var(--r-md)", background: "var(--n-10)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "var(--fg-muted)", flexShrink: 0 }}>
                          {i + 1}
                        </div>
                        <span className="text-bold">{inst.name}</span>
                      </div>
                    </td>
                    <td style={{ textAlign: "right", fontWeight: 700 }}>{inst.tests.toLocaleString()}</td>
                    <td className="t-body-sm text-bold" style={{ textAlign: "right" }}>{inst.tokens}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── AI Token Consumption ── */}
        <div className="rayum-card" style={{ padding: 32 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 32 }}>
            <div>
              <h3 className="section-title" style={{ fontSize: 18 }}>AI Token Consumption Breakdown</h3>
              <p className="section-subtitle">142.8M tokens used this month — all three Gemini workloads</p>
            </div>
            <span className="badge badge-orange">84% of monthly budget</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
            {aiBreakdown.map((item, i) => {
              const pct = Math.round((item.value / item.total) * 100);
              return (
                <div key={i}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 12, height: 12, borderRadius: 2, background: item.color }} />
                      <span className="text-bold">{item.label}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                      <span className="text-bold" style={{ fontSize: 15 }}>{item.value}M tokens</span>
                      <span className="t-body-sm text-bold" style={{ width: 36, textAlign: "right" }}>{pct}%</span>
                    </div>
                  </div>
                  <div style={{ height: 12, background: "var(--n-20)", borderRadius: "var(--r-full)", overflow: "hidden" }}>
                    <div style={{ width: `${pct}%`, height: "100%", background: item.color, borderRadius: "var(--r-full)" }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </main>
    </>
  );
}
