"use client";

import Link from "next/link";
import { 
  RiTeamLine, 
  RiFileChartLine, 
  RiCalendarEventLine,
  RiArrowRightUpLine,
  RiSettings4Line
} from "@remixicon/react";
import { mockTeacher, mockBatches } from "../../lib/mock-data";

export default function TeacherDashboardPage() {
  return (
    <div style={{ maxWidth: 1200, margin: "0 auto" }}>
      {/* Header */}
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: "var(--fg-default)", marginBottom: 4 }}>
            Welcome back, {mockTeacher.name}
          </h1>
          <p className="text-body">Here's the latest from your assigned batches at {mockTeacher.instituteName}.</p>
        </div>
        <Link href="/teacher/create-test" className="btn btn-primary">
          Create Batch Test
        </Link>
      </header>

      {/* KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24, marginBottom: 40 }}>
        <div className="rayum-card">
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <div style={{ padding: 10, background: "var(--neutral-10)", borderRadius: 8, color: "var(--fg-default)" }}>
              <RiTeamLine size={24} />
            </div>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: "var(--fg-muted)" }}>Total Students</h3>
          </div>
          <div style={{ fontSize: 32, fontWeight: 800 }}>465</div>
          <p style={{ fontSize: 13, color: "var(--fg-muted)", marginTop: 8 }}>Across 3 batches</p>
        </div>

        <div className="rayum-card">
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <div style={{ padding: 10, background: "var(--neutral-10)", borderRadius: 8, color: "var(--fg-default)" }}>
              <RiFileChartLine size={24} />
            </div>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: "var(--fg-muted)" }}>Avg Batch Score</h3>
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
            <div style={{ fontSize: 32, fontWeight: 800 }}>67.4%</div>
            <span className="rayum-badge green" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
              <RiArrowRightUpLine size={12} /> +2.1%
            </span>
          </div>
          <p style={{ fontSize: 13, color: "var(--fg-muted)", marginTop: 8 }}>Compared to last week</p>
        </div>

        <div className="rayum-card">
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <div style={{ padding: 10, background: "var(--neutral-10)", borderRadius: 8, color: "var(--fg-default)" }}>
              <RiCalendarEventLine size={24} />
            </div>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: "var(--fg-muted)" }}>Upcoming Tests</h3>
          </div>
          <div style={{ fontSize: 32, fontWeight: 800 }}>2</div>
          <p style={{ fontSize: 13, color: "var(--fg-muted)", marginTop: 8 }}>Scheduled for this week</p>
        </div>
      </div>

      {/* Main Content Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 24 }}>
        
        {/* Batches Table */}
        <section className="rayum-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700 }}>Your Active Batches</h2>
            <button className="btn btn-outline" style={{ padding: "6px 12px", fontSize: 13 }}>View All</button>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border-default)", textAlign: "left", color: "var(--fg-muted)", fontSize: 13 }}>
                <th style={{ paddingBottom: 12 }}>Batch Name</th>
                <th style={{ paddingBottom: 12 }}>Exam</th>
                <th style={{ paddingBottom: 12 }}>Students</th>
                <th style={{ paddingBottom: 12 }}>Avg Score</th>
                <th style={{ paddingBottom: 12 }}></th>
              </tr>
            </thead>
            <tbody>
              {mockBatches.map(batch => (
                <tr key={batch.id} style={{ borderBottom: "1px solid var(--neutral-10)" }}>
                  <td style={{ padding: "16px 0", fontWeight: 600 }}>{batch.name}</td>
                  <td style={{ padding: "16px 0", color: "var(--fg-muted)" }}>{batch.exam}</td>
                  <td style={{ padding: "16px 0", color: "var(--fg-muted)" }}>{batch.studentsCount}</td>
                  <td style={{ padding: "16px 0" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ 
                        flex: 1, 
                        height: 6, 
                        background: "var(--neutral-10)", 
                        borderRadius: 3,
                        overflow: "hidden"
                      }}>
                        <div style={{ 
                          height: "100%", 
                          width: `${batch.avgScore}%`, 
                          background: batch.avgScore > 70 ? "var(--accent-green)" : "var(--accent-orange)" 
                        }} />
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{batch.avgScore}%</span>
                    </div>
                  </td>
                  <td style={{ padding: "16px 0", textAlign: "right" }}>
                    <Link href={`/teacher/batch/${batch.id}`} className="btn btn-outline" style={{ padding: "6px 12px", fontSize: 13 }}>
                      Analysis
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* Recent Alerts */}
        <section className="rayum-card" style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700 }}>AI Attention Flags</h2>
            <RiSettings4Line size={18} color="var(--fg-muted)" />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 16, flex: 1 }}>
            <div style={{ padding: 16, background: "var(--neutral-10)", borderRadius: 8, borderLeft: "4px solid var(--accent-red)" }}>
              <h4 style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>Rohan Gupta (JEE 2026 Morning)</h4>
              <p style={{ fontSize: 13, color: "var(--fg-muted)", lineHeight: 1.5 }}>Score dropped 30% since last week's Physics test. Recommending a 1-on-1 session.</p>
            </div>
            <div style={{ padding: 16, background: "var(--neutral-10)", borderRadius: 8, borderLeft: "4px solid var(--accent-orange)" }}>
              <h4 style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>Carnot Cycle Failure</h4>
              <p style={{ fontSize: 13, color: "var(--fg-muted)", lineHeight: 1.5 }}>73% of NEET 2026 Droppers failed Carnot Cycle efficiency problems. Needs revision class.</p>
            </div>
            <div style={{ padding: 16, background: "var(--neutral-10)", borderRadius: 8, borderLeft: "4px solid var(--accent-orange)" }}>
              <h4 style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>Sneha Reddy (NEET 2026 Droppers)</h4>
              <p style={{ fontSize: 13, color: "var(--fg-muted)", lineHeight: 1.5 }}>Missed 3 consecutive batch tests.</p>
            </div>
          </div>
          
          <button className="btn btn-outline" style={{ marginTop: "auto", width: "100%" }}>
            View All Flags
          </button>
        </section>

      </div>
    </div>
  );
}
