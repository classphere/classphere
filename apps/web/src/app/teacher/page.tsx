"use client";

import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import { 
  RiTeamLine, 
  RiFileChartLine, 
  RiCalendarEventLine,
  RiArrowRightUpLine,
  RiSettings4Line,
  RiMore2Fill
} from "@remixicon/react";
import { mockTeacher, mockBatches, mockPendingTasks } from "../../lib/mock-data";

export default function TeacherDashboardPage() {
  return (
    <>
      <Navbar title={`Welcome back, ${mockTeacher.name}`} subtitle={`Here's the latest from your assigned batches at ${mockTeacher.instituteName}.`} breadcrumbs="Dashboard" />
      <main style={{ maxWidth: 1200, margin: "0 auto", padding: "0 32px 32px 32px", width: "100%" }}>
        
        {/* KPI Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24, marginBottom: 40 }}>
          <div className="rayum-card" style={{ padding: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <div style={{ padding: 8, background: "var(--n-10)", borderRadius: "var(--r-md)", color: "var(--fg-default)" }}>
                <RiTeamLine size={20} />
              </div>
              <h3 className="text-bold" style={{ color: "var(--fg-muted)" }}>Total Students</h3>
            </div>
            <div style={{ fontSize: 36, fontWeight: 800, color: "var(--fg-default)", letterSpacing: "-0.02em" }}>465</div>
            <p className="t-body-sm" style={{ marginTop: 8 }}>Across 3 batches</p>
          </div>

          <div className="rayum-card" style={{ padding: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <div style={{ padding: 8, background: "var(--n-10)", borderRadius: "var(--r-md)", color: "var(--fg-default)" }}>
                <RiFileChartLine size={20} />
              </div>
              <h3 className="text-bold" style={{ color: "var(--fg-muted)" }}>Avg Batch Score</h3>
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
              <div style={{ fontSize: 36, fontWeight: 800, color: "var(--fg-default)", letterSpacing: "-0.02em" }}>67.4%</div>
              <span className="badge badge-green"><RiArrowRightUpLine size={12} /> +2.1%</span>
            </div>
            <p className="t-body-sm" style={{ marginTop: 8 }}>Compared to last week</p>
          </div>

          <div className="rayum-card" style={{ padding: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <div style={{ padding: 8, background: "var(--n-10)", borderRadius: "var(--r-md)", color: "var(--fg-default)" }}>
                <RiCalendarEventLine size={20} />
              </div>
              <h3 className="text-bold" style={{ color: "var(--fg-muted)" }}>Upcoming Tests</h3>
            </div>
            <div style={{ fontSize: 36, fontWeight: 800, color: "var(--fg-default)", letterSpacing: "-0.02em" }}>2</div>
            <p className="t-body-sm" style={{ marginTop: 8 }}>Scheduled for this week</p>
          </div>
        </div>

        {/* Pending Tasks Alert */}
        {mockPendingTasks.length > 0 && (
          <section className="rayum-card" style={{ marginBottom: 24, padding: 32 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <h2 className="section-title" style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 18 }}>
                Action Required: Pending Test Sections
              </h2>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {mockPendingTasks.map(task => (
                <div key={task.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingBottom: 16, borderBottom: "1px solid var(--border-default)" }}>
                  <div>
                    <div className="text-bold" style={{ fontSize: 16, marginBottom: 4 }}>{task.testName}</div>
                    <div className="t-body-sm" style={{ display: "flex", alignItems: "center", gap: 16 }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 6 }}><RiTeamLine size={16} /> {task.batchName}</span>
                      <span style={{ display: "flex", alignItems: "center", gap: 6 }}><RiCalendarEventLine size={16} /> Due: {new Date(task.dueDate).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
                    <div style={{ textAlign: "right" }}>
                      <div className="text-bold" style={{ fontSize: 16 }}>{task.questionsAdded} / {task.questionsRequired}</div>
                      <div className="t-body-sm">Questions</div>
                    </div>
                    {task.status === "pending" ? (
                      <Link href={`/teacher/tasks/${task.id}`} className="btn btn-primary">
                        Add Questions
                      </Link>
                    ) : (
                      <span className="badge badge-green">Completed</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Main Content Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 400px", gap: 24 }}>
          
          {/* Batches Table */}
          <section className="rayum-card" style={{ padding: "24px 0" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 24px", marginBottom: 24 }}>
              <h2 className="section-title" style={{ fontSize: 18 }}>Your Active Batches</h2>
              <button className="btn btn-outline">View All</button>
            </div>
            <table className="rayum-table">
              <thead>
                <tr style={{ background: "var(--n-10)", borderTop: "1px solid var(--border-default)" }}>
                  <th style={{ paddingLeft: 24 }}>Batch Name</th>
                  <th>Exam</th>
                  <th>Students</th>
                  <th>Avg Score</th>
                  <th style={{ textAlign: "right", paddingRight: 24 }}></th>
                </tr>
              </thead>
              <tbody>
                {mockBatches.map(batch => (
                  <tr key={batch.id}>
                    <td style={{ paddingLeft: 24 }} className="text-bold">{batch.name}</td>
                    <td className="t-body-sm">{batch.exam}</td>
                    <td className="t-body-sm text-bold">{batch.studentsCount}</td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <span className="text-bold">{batch.avgScore}%</span>
                        <div style={{ flex: 1, height: 6, background: "var(--n-20)", borderRadius: "var(--r-full)", overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${batch.avgScore}%`, background: batch.avgScore > 70 ? "var(--s-50)" : "var(--p-50)", borderRadius: "var(--r-full)" }} />
                        </div>
                      </div>
                    </td>
                    <td style={{ textAlign: "right", paddingRight: 24 }}>
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
          <section className="rayum-card" style={{ padding: 32, display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <h2 className="section-title" style={{ fontSize: 18 }}>AI Attention Flags</h2>
              <RiSettings4Line size={20} color="var(--fg-muted)" />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 16, flex: 1 }}>
              <div style={{ padding: 16, background: "var(--n-10)", borderRadius: "var(--r-md)" }}>
                <h4 className="text-bold" style={{ marginBottom: 6 }}>Rohan Gupta (JEE 2026 Morning)</h4>
                <p className="t-body-sm">Score dropped 30% since last week's Physics test. Recommending a 1-on-1 session.</p>
              </div>
              <div style={{ padding: 16, background: "var(--n-10)", borderRadius: "var(--r-md)" }}>
                <h4 className="text-bold" style={{ marginBottom: 6 }}>Carnot Cycle Failure</h4>
                <p className="t-body-sm">73% of NEET 2026 Droppers failed Carnot Cycle efficiency problems. Needs revision class.</p>
              </div>
              <div style={{ padding: 16, background: "var(--n-10)", borderRadius: "var(--r-md)" }}>
                <h4 className="text-bold" style={{ marginBottom: 6 }}>Sneha Reddy (NEET 2026 Droppers)</h4>
                <p className="t-body-sm">Missed 3 consecutive batch tests.</p>
              </div>
            </div>
            
            <button className="btn btn-outline" style={{ marginTop: 32, width: "100%" }}>
              View All Flags
            </button>
          </section>

        </div>
      </main>
    </>
  );
}
