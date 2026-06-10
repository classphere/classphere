"use client";

import Link from "next/link";
import { 
  RiBuilding4Line, 
  RiFileTextLine,
  RiBankCardLine,
  RiUserStarLine,
  RiMoreFill,
  RiArrowRightUpLine,
  RiBrainLine
} from "@remixicon/react";
import { mockSuperAdmin, mockPlatformStats, mockInstitutesList } from "../../lib/mock-data";

export default function SuperAdminDashboardPage() {
  return (
    <div style={{ maxWidth: 1200, margin: "0 auto" }}>
      {/* Header */}
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: "var(--fg-default)", marginBottom: 4 }}>
            Platform Health & Operations
          </h1>
          <p className="text-body">Welcome back, {mockSuperAdmin.name}. Here is the global platform overview.</p>
        </div>
      </header>

      {/* KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 24, marginBottom: 40 }}>
        <div className="rayum-card">
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <div style={{ padding: 10, background: "var(--neutral-10)", borderRadius: 8, color: "var(--fg-default)" }}>
              <RiBuilding4Line size={24} />
            </div>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: "var(--fg-muted)" }}>Active Institutes</h3>
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
            <div style={{ fontSize: 28, fontWeight: 800 }}>{mockPlatformStats.totalInstitutes}</div>
            <span className="rayum-badge green" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
              <RiArrowRightUpLine size={12} /> +2
            </span>
          </div>
        </div>

        <div className="rayum-card">
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <div style={{ padding: 10, background: "var(--neutral-10)", borderRadius: 8, color: "var(--fg-default)" }}>
              <RiUserStarLine size={24} />
            </div>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: "var(--fg-muted)" }}>Total Students</h3>
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
            <div style={{ fontSize: 28, fontWeight: 800 }}>{mockPlatformStats.totalStudents.toLocaleString()}</div>
            <span className="rayum-badge green" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
              <RiArrowRightUpLine size={12} /> +840
            </span>
          </div>
        </div>

        <div className="rayum-card">
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <div style={{ padding: 10, background: "var(--neutral-10)", borderRadius: 8, color: "var(--fg-default)" }}>
              <RiBrainLine size={24} />
            </div>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: "var(--fg-muted)" }}>AI Analyses Delivered</h3>
          </div>
          <div style={{ fontSize: 28, fontWeight: 800 }}>{mockPlatformStats.activeAIAnalyses.toLocaleString()}</div>
          <p style={{ fontSize: 12, color: "var(--fg-muted)", marginTop: 8 }}>This month</p>
        </div>

        <div className="rayum-card">
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <div style={{ padding: 10, background: "rgba(34, 197, 94, 0.1)", borderRadius: 8, color: "var(--accent-green)" }}>
              <RiBankCardLine size={24} />
            </div>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: "var(--fg-muted)" }}>Monthly Recurring Rev</h3>
          </div>
          <div style={{ fontSize: 28, fontWeight: 800 }}>{mockPlatformStats.mrr}</div>
          <p style={{ fontSize: 12, color: "var(--fg-muted)", marginTop: 8 }}>Estimated payout</p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        {/* System Health */}
        <section className="rayum-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700 }}>System Resources</h2>
            <span className="rayum-badge green" style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--success-50)" }} /> All Systems Operational
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span className="text-body-small" style={{ color: "var(--fg-default)", fontWeight: 600 }}>API Server Load</span>
                <span className="text-body-small" style={{ color: "var(--fg-muted)" }}>34%</span>
              </div>
              <div style={{ height: 8, background: "var(--bg-body)", borderRadius: 4, overflow: "hidden" }}>
                <div style={{ width: "34%", height: "100%", background: "var(--primary-50)" }} />
              </div>
            </div>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span className="text-body-small" style={{ color: "var(--fg-default)", fontWeight: 600 }}>Database Connections</span>
                <span className="text-body-small" style={{ color: "var(--fg-muted)" }}>142 / 500</span>
              </div>
              <div style={{ height: 8, background: "var(--bg-body)", borderRadius: 4, overflow: "hidden" }}>
                <div style={{ width: "28%", height: "100%", background: "var(--success-50)" }} />
              </div>
            </div>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span className="text-body-small" style={{ color: "var(--fg-default)", fontWeight: 600 }}>Storage Capacity</span>
                <span className="text-body-small" style={{ color: "var(--fg-muted)" }}>4.2 TB / 10 TB</span>
              </div>
              <div style={{ height: 8, background: "var(--bg-body)", borderRadius: 4, overflow: "hidden" }}>
                <div style={{ width: "42%", height: "100%", background: "var(--warning-50)" }} />
              </div>
            </div>
          </div>
        </section>

        {/* Audit Logs */}
        <section className="rayum-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700 }}>Recent Audit Logs</h2>
            <button className="btn btn-ghost" style={{ padding: "6px 12px", fontSize: 13 }}>View All</button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[
              { id: 1, action: "New Institute Onboarded", user: "System", time: "10 mins ago", type: "success" },
              { id: 2, action: "Question Bank Sync Complete", user: "Admin", time: "1 hour ago", type: "primary" },
              { id: 3, action: "Failed Login Attempt", user: "Unknown IP", time: "2 hours ago", type: "error" },
              { id: 4, action: "Subscription Upgraded (Vibrant Academy)", user: "Admin", time: "3 hours ago", type: "primary" },
            ].map(log => (
              <div key={log.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 12, borderBottom: "1px solid var(--border-subtle)" }}>
                <div>
                  <div className="text-body-small" style={{ fontWeight: 600, color: "var(--fg-default)" }}>{log.action}</div>
                  <div className="text-body-small" style={{ color: "var(--fg-muted)", fontSize: 11 }}>By {log.user}</div>
                </div>
                <div className="text-body-small" style={{ color: "var(--fg-muted)", fontSize: 11 }}>{log.time}</div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
