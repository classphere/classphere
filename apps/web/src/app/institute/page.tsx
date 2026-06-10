"use client";

import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import { 
  RiTeamLine, 
  RiGroupLine,
  RiBankCardLine,
  RiArrowRightUpLine,
  RiMoreFill,
  RiAddLine
} from "@remixicon/react";
import { mockInstituteAdmin, mockBatches, mockInstituteStudents, mockInstituteTests } from "../../lib/mock-data";

export default function InstituteDashboardPage() {
  return (
    <>
      <Navbar title={`${mockInstituteAdmin.instituteName} Dashboard`} subtitle={`Welcome back, ${mockInstituteAdmin.name}. Here is your institute overview.`} breadcrumbs="Dashboard" />
      <main style={{ maxWidth: 1200, margin: "0 auto", padding: "0 32px 32px 32px", width: "100%" }}>
        
        {/* Header Actions */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginBottom: 32 }}>
          <button className="btn btn-outline" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <RiAddLine size={18} /> Create New Batch
          </button>
          <Link href="/institute/tests/create" className="btn btn-primary" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
            <RiAddLine size={18} /> Schedule Batch Test
          </Link>
        </div>

        {/* KPI Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24, marginBottom: 40 }}>
          <div className="rayum-card" style={{ padding: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <div style={{ padding: 8, background: "var(--n-10)", borderRadius: "var(--r-md)", color: "var(--fg-default)" }}>
                <RiGroupLine size={20} />
              </div>
              <h3 className="text-bold" style={{ color: "var(--fg-muted)" }}>Total Students</h3>
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
              <div style={{ fontSize: 36, fontWeight: 800, color: "var(--fg-default)", letterSpacing: "-0.02em" }}>{mockInstituteAdmin.studentsCount}</div>
              <span className="badge badge-green"><RiArrowRightUpLine size={12} /> +12 this month</span>
            </div>
          </div>

          <div className="rayum-card" style={{ padding: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <div style={{ padding: 8, background: "var(--n-10)", borderRadius: "var(--r-md)", color: "var(--fg-default)" }}>
                <RiTeamLine size={20} />
              </div>
              <h3 className="text-bold" style={{ color: "var(--fg-muted)" }}>Active Batches</h3>
            </div>
            <div style={{ fontSize: 36, fontWeight: 800, color: "var(--fg-default)", letterSpacing: "-0.02em" }}>{mockInstituteAdmin.batchesCount}</div>
            <p className="t-body-sm" style={{ marginTop: 8 }}>2 batches completing soon</p>
          </div>

          <div className="rayum-card" style={{ padding: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <div style={{ padding: 8, background: "var(--n-10)", borderRadius: "var(--r-md)", color: "var(--fg-default)" }}>
                <RiBankCardLine size={20} />
              </div>
              <h3 className="text-bold" style={{ color: "var(--fg-muted)" }}>Subscription</h3>
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, color: "var(--p-50)" }}>{mockInstituteAdmin.plan}</div>
            <p className="t-body-sm" style={{ marginTop: 8 }}>Renews on Aug 15, 2026</p>
          </div>
        </div>

        {/* Collaborative Test Pipeline */}
        <section className="rayum-card" style={{ marginBottom: 24, padding: "24px 0" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 24px", marginBottom: 24 }}>
            <h2 className="section-title" style={{ fontSize: 18 }}>Test Pipeline</h2>
            <Link href="/institute/tests" className="btn btn-outline" style={{ padding: "6px 16px", fontSize: 13 }}>View All Tests</Link>
          </div>
          <table className="rayum-table">
            <thead>
              <tr style={{ background: "var(--n-10)", borderTop: "1px solid var(--border-default)" }}>
                <th style={{ paddingLeft: 24 }}>Test Name</th>
                <th>Batch</th>
                <th>Date</th>
                <th>Section Status</th>
                <th style={{ paddingRight: 24 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {mockInstituteTests.map(test => (
                <tr key={test.id}>
                  <td style={{ paddingLeft: 24 }} className="text-bold">{test.name}</td>
                  <td className="t-body-sm">{test.batch}</td>
                  <td className="t-body-sm text-bold">{new Date(test.scheduledDate).toLocaleDateString()}</td>
                  <td>
                    <div style={{ display: "flex", gap: 6 }}>
                      {Object.entries(test.progress).map(([subject, status]) => (
                        <span key={subject} title={subject} style={{
                          width: 12, height: 12, borderRadius: "50%",
                          background: status === "completed" ? "var(--s-50)" : "var(--p-50)"
                        }} />
                      ))}
                    </div>
                  </td>
                  <td style={{ paddingRight: 24 }}>
                    <span className={`badge ${test.status === 'ready' ? 'badge-green' : 'badge-orange'}`}>
                      {test.status === 'ready' ? 'Ready to Publish' : 'Waiting on Teachers'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
          
          {/* Batches Overview */}
          <section className="rayum-card" style={{ padding: "24px 0" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 24px", marginBottom: 24 }}>
              <h2 className="section-title" style={{ fontSize: 18 }}>Recent Batches</h2>
              <Link href="/institute/batches" className="btn btn-outline" style={{ padding: "6px 16px", fontSize: 13 }}>View All</Link>
            </div>
            <table className="rayum-table">
              <thead>
                <tr style={{ background: "var(--n-10)", borderTop: "1px solid var(--border-default)" }}>
                  <th style={{ paddingLeft: 24 }}>Batch Name</th>
                  <th>Students</th>
                  <th>Avg Score</th>
                  <th style={{ paddingRight: 24 }}></th>
                </tr>
              </thead>
              <tbody>
                {mockBatches.map(batch => (
                  <tr key={batch.id}>
                    <td style={{ paddingLeft: 24 }}>
                      <div className="text-bold">{batch.name}</div>
                      <div className="t-body-sm">{batch.exam}</div>
                    </td>
                    <td className="t-body-sm text-bold">{batch.studentsCount}</td>
                    <td className="text-bold">{batch.avgScore}%</td>
                    <td style={{ textAlign: "right", paddingRight: 24 }}>
                      <button className="btn btn-ghost" style={{ padding: 4 }}>
                        <RiMoreFill size={20} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          {/* Top Students */}
          <section className="rayum-card" style={{ padding: 32 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
              <h2 className="section-title" style={{ fontSize: 18 }}>Top Performing Students</h2>
              <Link href="/institute/students" className="btn btn-outline" style={{ padding: "6px 16px", fontSize: 13 }}>View Directory</Link>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {mockInstituteStudents.slice(0, 5).map((student, index) => (
                <div key={student.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: 16, background: "var(--n-10)", borderRadius: "var(--r-md)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    <div style={{ width: 36, height: 36, borderRadius: "var(--r-full)", background: "var(--p-50)", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 14 }}>
                      {index + 1}
                    </div>
                    <div>
                      <div className="text-bold" style={{ fontSize: 15 }}>{student.name}</div>
                      <div className="t-body-sm">{student.batch}</div>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div className="text-bold" style={{ fontSize: 18, color: "var(--p-50)" }}>{student.avgScore}%</div>
                    <div className="t-body-sm">Avg Score</div>
                  </div>
                </div>
              ))}
            </div>
          </section>

        </div>
      </main>
    </>
  );
}
