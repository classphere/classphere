"use client";

import Link from "next/link";
import { 
  RiTeamLine, 
  RiGroupLine,
  RiBankCardLine,
  RiArrowRightUpLine,
  RiMoreFill,
  RiAddLine
} from "@remixicon/react";
import { mockInstituteAdmin, mockBatches, mockInstituteStudents } from "../../lib/mock-data";

export default function InstituteDashboardPage() {
  return (
    <div style={{ maxWidth: 1200, margin: "0 auto" }}>
      {/* Header */}
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: "var(--fg-default)", marginBottom: 4 }}>
            {mockInstituteAdmin.instituteName} Dashboard
          </h1>
          <p className="text-body">Welcome back, {mockInstituteAdmin.name}. Here is your institute overview.</p>
        </div>
        <button className="btn btn-primary" style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <RiAddLine size={18} /> Create New Batch
        </button>
      </header>

      {/* KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24, marginBottom: 40 }}>
        <div className="rayum-card">
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <div style={{ padding: 10, background: "var(--neutral-10)", borderRadius: 8, color: "var(--fg-default)" }}>
              <RiGroupLine size={24} />
            </div>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: "var(--fg-muted)" }}>Total Students</h3>
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
            <div style={{ fontSize: 32, fontWeight: 800 }}>{mockInstituteAdmin.studentsCount}</div>
            <span className="rayum-badge green" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
              <RiArrowRightUpLine size={12} /> +12 this month
            </span>
          </div>
        </div>

        <div className="rayum-card">
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <div style={{ padding: 10, background: "var(--neutral-10)", borderRadius: 8, color: "var(--fg-default)" }}>
              <RiTeamLine size={24} />
            </div>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: "var(--fg-muted)" }}>Active Batches</h3>
          </div>
          <div style={{ fontSize: 32, fontWeight: 800 }}>{mockInstituteAdmin.batchesCount}</div>
          <p style={{ fontSize: 13, color: "var(--fg-muted)", marginTop: 8 }}>2 batches completing soon</p>
        </div>

        <div className="rayum-card">
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <div style={{ padding: 10, background: "var(--neutral-10)", borderRadius: 8, color: "var(--fg-default)" }}>
              <RiBankCardLine size={24} />
            </div>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: "var(--fg-muted)" }}>Subscription</h3>
          </div>
          <div style={{ fontSize: 24, fontWeight: 800 }}>{mockInstituteAdmin.plan}</div>
          <p style={{ fontSize: 13, color: "var(--fg-muted)", marginTop: 8 }}>Renews on Aug 15, 2026</p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        
        {/* Batches Overview */}
        <section className="rayum-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700 }}>Recent Batches</h2>
            <Link href="/institute/batches" className="btn btn-outline" style={{ padding: "6px 12px", fontSize: 13 }}>View All</Link>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border-default)", textAlign: "left", color: "var(--fg-muted)", fontSize: 13 }}>
                <th style={{ paddingBottom: 12 }}>Batch Name</th>
                <th style={{ paddingBottom: 12 }}>Students</th>
                <th style={{ paddingBottom: 12 }}>Avg Score</th>
                <th style={{ paddingBottom: 12 }}></th>
              </tr>
            </thead>
            <tbody>
              {mockBatches.map(batch => (
                <tr key={batch.id} style={{ borderBottom: "1px solid var(--neutral-10)" }}>
                  <td style={{ padding: "16px 0", fontWeight: 600 }}>
                    {batch.name}
                    <div style={{ fontSize: 12, color: "var(--fg-muted)", marginTop: 4, fontWeight: 400 }}>{batch.exam}</div>
                  </td>
                  <td style={{ padding: "16px 0", color: "var(--fg-muted)" }}>{batch.studentsCount}</td>
                  <td style={{ padding: "16px 0", fontWeight: 600 }}>{batch.avgScore}%</td>
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

        {/* Top Students */}
        <section className="rayum-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700 }}>Top Performing Students</h2>
            <Link href="/institute/students" className="btn btn-outline" style={{ padding: "6px 12px", fontSize: 13 }}>View Directory</Link>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {mockInstituteStudents.slice(0, 5).map((student, index) => (
              <div key={student.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: "var(--neutral-10)", borderRadius: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--secondary-50)", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 14 }}>
                    {index + 1}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{student.name}</div>
                    <div style={{ fontSize: 12, color: "var(--fg-muted)" }}>{student.batch}</div>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>{student.avgScore}%</div>
                  <div style={{ fontSize: 12, color: "var(--fg-muted)" }}>Avg Score</div>
                </div>
              </div>
            ))}
          </div>
        </section>

      </div>
    </div>
  );
}
