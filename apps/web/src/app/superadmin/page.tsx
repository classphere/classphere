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
      <main className="mx-auto w-full max-w-screen-2xl px-6 pb-10 md:px-8">

        {/* ── Page Header Add-on ── */}
        <div className="mb-8 flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-full border border-primary-02/20 bg-primary-02/10 px-4 py-2">
            <div className="size-2 rounded-full bg-primary-02" />
            <span className="t-label text-primary-02">All Systems Operational</span>
          </div>
        </div>

        {/* ── KPI Cards ── */}
        <div className="mb-8 grid gap-6 md:grid-cols-2 xl:grid-cols-4">

          <div className="card p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="t-label mb-3">Active Institutes</p>
                <div className="text-h4 font-bold leading-none tracking-tight text-t-primary">{mockPlatformStats.totalInstitutes}</div>
                <div className="mt-3 flex items-center gap-1">
                  <span className="badge badge-green"><RiArrowRightUpLine size={12} /> +2 this month</span>
                </div>
              </div>
              <div className="stat-icon bg-b-surface1 text-t-secondary">
                <RiBuilding4Line size={20} />
              </div>
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="t-label mb-3">Total Students</p>
                <div className="text-h4 font-bold leading-none tracking-tight text-t-primary">{mockPlatformStats.totalStudents.toLocaleString()}</div>
                <div className="mt-3 flex items-center gap-1">
                  <span className="badge badge-green"><RiArrowRightUpLine size={12} /> +840 this week</span>
                </div>
              </div>
              <div className="stat-icon bg-primary-01/10 text-primary-01">
                <RiUserStarLine size={20} />
              </div>
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="t-label mb-3">AI Analyses Today</p>
                <div className="text-h4 font-bold leading-none tracking-tight text-t-primary">{mockPlatformStats.activeAIAnalyses.toLocaleString()}</div>
                <div className="mt-3 flex items-center gap-1">
                  <span className="badge badge-orange">8.4K / 10K quota</span>
                </div>
              </div>
              <div className="stat-icon bg-[#EF9D0E]/10 text-[#EF9D0E]">
                <RiBrainLine size={20} />
              </div>
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="t-label mb-3">System Uptime</p>
                <div className="text-h4 font-bold leading-none tracking-tight text-primary-02">{mockPlatformStats.systemUptime}</div>
                <div className="mt-3 flex items-center gap-1">
                  <span className="t-body-sm">Last 90 days</span>
                </div>
              </div>
              <div className="stat-icon bg-primary-02/10 text-primary-02">
                <RiShieldCheckLine size={20} />
              </div>
            </div>
          </div>

        </div>

        {/* ── System Resources + Audit Logs ── */}
        <div className="mb-6 grid gap-6 xl:grid-cols-2">

          {/* System Resources */}
          <div className="card p-6 md:p-8">
            <div className="mb-8 flex items-center justify-between gap-4">
              <div>
                <h2 className="section-title">System Resources</h2>
                <p className="section-subtitle">Live infrastructure metrics</p>
              </div>
              <div className="flex items-center gap-2 rounded-full bg-primary-02/10 px-3 py-1.5">
                <div className="size-1.5 rounded-full bg-primary-02" />
                <span className="t-label text-primary-02">Live</span>
              </div>
            </div>
            <div className="flex flex-col gap-6">
              {systemResources.map((res, i) => {
                const pct = Math.round((res.value / res.max) * 100);
                const barColor = res.status === "warning" ? "var(--warning-50)" : res.status === "error" ? "var(--danger-50)" : "var(--p-50)";
                return (
                  <div key={i}>
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="text-bold">{res.label}</span>
                        {res.status === "warning" && <span className="badge badge-orange">High</span>}
                      </div>
                      <span className="t-body-sm text-bold">
                        {typeof res.value === "number" && res.unit ? `${res.value}${res.unit} / ${res.max}${res.unit}` : `${res.value} / ${res.max}`}
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-s-stroke2">
                      <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${pct}%`, background: barColor }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Audit Logs */}
          <div className="card p-6 md:p-8">
            <div className="mb-8 flex items-center justify-between gap-4">
              <div>
                <h2 className="section-title">Audit Log</h2>
                <p className="section-subtitle">Recent platform events</p>
              </div>
              <button className="btn btn-ghost px-4 py-2">View All</button>
            </div>
            <div className="flex flex-col">
              {auditLogs.map((log, i) => {
                const t = typeMap[log.type as keyof typeof typeMap];
                return (
                  <div key={log.id} className={`flex items-start gap-4 pb-5 mb-5 ${i < auditLogs.length - 1 ? "border-b border-s-stroke2" : ""}`}>
                    <div className="stat-icon size-9 rounded-xl" style={{ background: t.bg, color: t.color }}>
                      {t.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-bold mb-1">{log.action}</div>
                      <div className="t-body-sm truncate">{log.detail}</div>
                    </div>
                    <div className="t-body-sm font-medium">{log.time}</div>
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
