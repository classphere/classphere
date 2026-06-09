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

      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 24 }}>
        {/* Institutes CRM */}
        <section className="rayum-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700 }}>Institute Clients CRM</h2>
            <Link href="/superadmin/institutes" className="btn btn-outline" style={{ padding: "6px 12px", fontSize: 13 }}>View All Institutes</Link>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border-default)", textAlign: "left", color: "var(--fg-muted)", fontSize: 13 }}>
                <th style={{ paddingBottom: 12 }}>Institute Name</th>
                <th style={{ paddingBottom: 12 }}>Plan</th>
                <th style={{ paddingBottom: 12 }}>Students</th>
                <th style={{ paddingBottom: 12 }}>Batches</th>
                <th style={{ paddingBottom: 12 }}>Status</th>
                <th style={{ paddingBottom: 12 }}></th>
              </tr>
            </thead>
            <tbody>
              {mockInstitutesList.map(inst => (
                <tr key={inst.id} style={{ borderBottom: "1px solid var(--neutral-10)" }}>
                  <td style={{ padding: "16px 0", fontWeight: 600 }}>{inst.name}</td>
                  <td style={{ padding: "16px 0", color: "var(--fg-muted)" }}>{inst.plan}</td>
                  <td style={{ padding: "16px 0", color: "var(--fg-muted)" }}>{inst.students.toLocaleString()}</td>
                  <td style={{ padding: "16px 0", color: "var(--fg-muted)" }}>{inst.batches}</td>
                  <td style={{ padding: "16px 0" }}>
                    <span className={`rayum-badge ${inst.status === 'active' ? 'green' : 'yellow'}`}>
                      {inst.status === 'active' ? 'Active' : 'Expiring Soon'}
                    </span>
                  </td>
                  <td style={{ padding: "16px 0", textAlign: "right" }}>
                    <button style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--fg-muted)" }}>
                      <RiMoreFill size={20} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </div>
  );
}
