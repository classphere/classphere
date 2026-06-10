"use client";

import { RiBuilding4Line, RiUserStarLine, RiBrainLine, RiShieldCheckLine, RiArrowRightUpLine, RiAlertLine, RiCheckFill, RiTimeLine } from "@remixicon/react";
import Navbar from "@/components/layout/Navbar";

const mockPlatformStats = {
  totalInstitutes: 142,
  totalStudents: 94210,
  activeAIAnalyses: 12450,
  systemUptime: "99.98%",
};

const auditLogs = [
  { id: 1, action: "New Institute Onboarded", detail: "Resonance Eduventures, Kota", time: "10m ago", type: "success" },
  { id: 2, action: "Question Bank Sync Complete", detail: "JEE 2024 questions — 340 added", time: "1h ago", type: "info" },
  { id: 3, action: "Failed Login Attempt", detail: "IP: 58.12.9.34 — blocked after 5 tries", time: "2h ago", type: "error" },
  { id: 4, action: "Subscription Upgraded", detail: "Vibrant Academy → Enterprise Pro", time: "3h ago", type: "success" },
  { id: 5, action: "AI Analysis Rate Limit Hit", detail: "Allen Institute exceeded 10K/day quota", time: "5h ago", type: "warning" },
];

const systemResources = [
  { label: "API Server Load", value: 34, max: 100, unit: "%", status: "good" },
  { label: "Database Connections", value: 142, max: 500, unit: "", status: "good" },
  { label: "Storage Capacity", value: 4.2, max: 10, unit: "TB", status: "warning" },
  { label: "AI Token Budget (Today)", value: 8400, max: 10000, unit: "", status: "warning" },
];

const typeMap = {
  success: { color: "var(--p-50)", bg: "var(--p-10)", badge: "green", icon: <RiCheckFill size={14} /> },
  error: { color: "var(--danger-50)", bg: "var(--danger-10)", badge: "red", icon: <RiAlertLine size={14} /> },
  info: { color: "var(--s-50)", bg: "var(--s-10)", badge: "blue", icon: <RiTimeLine size={14} /> },
  warning: { color: "var(--warning-50)", bg: "var(--warning-10)", badge: "orange", icon: <RiAlertLine size={14} /> },
};

export default function SuperAdminDashboardPage() {
  return (
    <>
      <Navbar title="Platform Health" subtitle="Real-time operational overview of the ExamPrep infrastructure." />
      <main style={{ maxWidth: 1200, margin: "0 auto", padding: "0 32px 32px 32px", width: "100%" }}>

        {/* ── Page Header Add-on ── */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 32 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", background: "var(--p-10)", borderRadius: "var(--r-full)", border: "1px solid var(--p-20)" }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--p-50)", animation: "pulse 2s infinite" }} />
            <span className="t-label" style={{ color: "var(--p-80)" }}>All Systems Operational</span>
          </div>
        </div>

        {/* ── KPI Cards ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 24, marginBottom: 40 }}>

          <div className="rayum-card" style={{ padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <p className="t-label" style={{ marginBottom: 12 }}>Active Institutes</p>
                <div style={{ fontSize: 36, fontWeight: 800, color: "var(--fg-default)", letterSpacing: "-0.02em", lineHeight: 1 }}>{mockPlatformStats.totalInstitutes}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 12 }}>
                  <span className="badge badge-green"><RiArrowRightUpLine size={12} /> +2 this month</span>
                </div>
              </div>
              <div className="stat-icon" style={{ background: "var(--n-10)", color: "var(--fg-muted)" }}>
                <RiBuilding4Line size={20} />
              </div>
            </div>
          </div>

          <div className="rayum-card" style={{ padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <p className="t-label" style={{ marginBottom: 12 }}>Total Students</p>
                <div style={{ fontSize: 36, fontWeight: 800, color: "var(--fg-default)", letterSpacing: "-0.02em", lineHeight: 1 }}>{mockPlatformStats.totalStudents.toLocaleString()}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 12 }}>
                  <span className="badge badge-green"><RiArrowRightUpLine size={12} /> +840 this week</span>
                </div>
              </div>
              <div className="stat-icon" style={{ background: "var(--s-10)", color: "var(--s-50)" }}>
                <RiUserStarLine size={20} />
              </div>
            </div>
          </div>

          <div className="rayum-card" style={{ padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <p className="t-label" style={{ marginBottom: 12 }}>AI Analyses Today</p>
                <div style={{ fontSize: 36, fontWeight: 800, color: "var(--fg-default)", letterSpacing: "-0.02em", lineHeight: 1 }}>{mockPlatformStats.activeAIAnalyses.toLocaleString()}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 12 }}>
                  <span className="badge badge-orange">8.4K / 10K quota</span>
                </div>
              </div>
              <div className="stat-icon" style={{ background: "var(--warning-10)", color: "var(--warning-50)" }}>
                <RiBrainLine size={20} />
              </div>
            </div>
          </div>

          <div className="rayum-card" style={{ padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <p className="t-label" style={{ marginBottom: 12 }}>System Uptime</p>
                <div style={{ fontSize: 36, fontWeight: 800, color: "var(--p-50)", letterSpacing: "-0.02em", lineHeight: 1 }}>{mockPlatformStats.systemUptime}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 12 }}>
                  <span className="t-body-sm">Last 90 days</span>
                </div>
              </div>
              <div className="stat-icon" style={{ background: "var(--p-10)", color: "var(--p-50)" }}>
                <RiShieldCheckLine size={20} />
              </div>
            </div>
          </div>

        </div>

        {/* ── System Resources + Audit Logs ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 24 }}>

          {/* System Resources */}
          <div className="rayum-card" style={{ padding: 32 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
              <div>
                <h2 className="section-title" style={{ fontSize: 18 }}>System Resources</h2>
                <p className="section-subtitle">Live infrastructure metrics</p>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 10px", background: "var(--p-10)", borderRadius: "var(--r-full)" }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--p-50)" }} />
                <span className="t-label" style={{ color: "var(--p-80)" }}>Live</span>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              {systemResources.map((res, i) => {
                const pct = Math.round((res.value / res.max) * 100);
                const barColor = res.status === "warning" ? "var(--warning-50)" : res.status === "error" ? "var(--danger-50)" : "var(--p-50)";
                return (
                  <div key={i}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span className="text-bold">{res.label}</span>
                        {res.status === "warning" && <span className="badge badge-orange">High</span>}
                      </div>
                      <span className="t-body-sm text-bold">
                        {typeof res.value === "number" && res.unit ? `${res.value}${res.unit} / ${res.max}${res.unit}` : `${res.value} / ${res.max}`}
                      </span>
                    </div>
                    <div style={{ height: 6, background: "var(--n-20)", borderRadius: "var(--r-full)", overflow: "hidden" }}>
                      <div style={{ width: `${pct}%`, height: "100%", background: barColor, borderRadius: "var(--r-full)", transition: "width 0.5s ease" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Audit Logs */}
          <div className="rayum-card" style={{ padding: 32 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
              <div>
                <h2 className="section-title" style={{ fontSize: 18 }}>Audit Log</h2>
                <p className="section-subtitle">Recent platform events</p>
              </div>
              <button className="btn btn-ghost" style={{ padding: "8px 16px" }}>View All</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              {auditLogs.map((log, i) => {
                const t = typeMap[log.type as keyof typeof typeMap];
                return (
                  <div key={log.id} style={{ display: "flex", gap: 16, alignItems: "flex-start", paddingBottom: 20, marginBottom: 20, borderBottom: i < auditLogs.length - 1 ? "1px solid var(--border-default)" : "none" }}>
                    <div className="stat-icon" style={{ width: 36, height: 36, borderRadius: "var(--r-md)", background: t.bg, color: t.color }}>
                      {t.icon}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="text-bold" style={{ marginBottom: 4 }}>{log.action}</div>
                      <div className="t-body-sm" style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{log.detail}</div>
                    </div>
                    <div className="t-body-sm" style={{ fontWeight: 500 }}>{log.time}</div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

      </main>
    </>
  );
}
