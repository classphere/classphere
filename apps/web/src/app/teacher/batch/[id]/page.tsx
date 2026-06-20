"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import {
  RiArrowLeftLine,
  RiPieChart2Line,
  RiFocus2Line,
  RiAlertLine,
  RiCheckDoubleLine,
  RiAddLine,
} from "@remixicon/react";
import Navbar from "../../../../components/layout/Navbar";
import { mockBatchAnalysis, mockBatches } from "../../../../lib/mock-data";

export default function BatchAnalysisPage() {
  const params = useParams();
  const batchId = params.id as string;
  const batch = mockBatches.find(b => b.id === batchId) || mockBatches[0];

  return (
    <>
      <Navbar
        title={mockBatchAnalysis.testTitle}
        subtitle={`${mockBatchAnalysis.attemptedCount} of ${mockBatchAnalysis.totalStudents} students attempted · ${batch.exam} · ${batch.name}`}
        breadcrumbs={`Dashboard > ${batch.name}`}
      />
      <main style={{ maxWidth: 1200, margin: "0 auto", padding: "0 32px 48px", width: "100%" }}>

        {/* Action bar */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
          <Link href="/teacher" style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "var(--fg-muted)", fontSize: 14, textDecoration: "none" }}>
            <RiArrowLeftLine size={16} /> Back to Dashboard
          </Link>
          <div style={{ display: "flex", gap: 10 }}>
            <Link href="/teacher/dpps" className="btn btn-outline" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, padding: "8px 16px" }}>
              <RiAddLine size={16} /> Assign DPP for this Batch
            </Link>
            <button className="btn btn-primary" style={{ padding: "8px 16px" }}>Export PDF Report</button>
          </div>
        </div>

        {/* Score + Recs */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 24 }}>

          <section className="rayum-card" style={{ padding: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
              <div style={{ padding: 8, background: "var(--n-10)", borderRadius: "var(--r-md)" }}><RiPieChart2Line size={24} /></div>
              <h2 className="section-title" style={{ marginBottom: 0 }}>Score Distribution</h2>
            </div>
            <div style={{ display: "flex", gap: 16, marginBottom: 20 }}>
              {[
                { label: "Average Score", value: `${mockBatchAnalysis.classSummary.avgScore}%`, color: "var(--fg-default)" },
                { label: "Highest Score", value: `${mockBatchAnalysis.classSummary.topScore}%`,  color: "var(--accent-green)" },
                { label: "Lowest Score",  value: `${mockBatchAnalysis.classSummary.bottomScore}%`, color: "var(--accent-red)" },
              ].map(s => (
                <div key={s.label} style={{ flex: 1, padding: 16, background: "var(--n-10)", borderRadius: "var(--r-md)", textAlign: "center" }}>
                  <div className="t-heading-b" style={{ color: s.color, marginBottom: 4 }}>{s.value}</div>
                  <div className="t-body-sm" style={{ color: "var(--fg-muted)" }}>{s.label}</div>
                </div>
              ))}
            </div>
            <div style={{ background: "var(--n-10)", padding: 16, borderRadius: "var(--r-md)", display: "flex", alignItems: "center", gap: 16 }}>
              <RiAlertLine size={24} color="var(--warning-50, #D97706)" />
              <div>
                <div className="t-body-sm-med">{mockBatchAnalysis.classSummary.belowAverageCount} Students Below Average</div>
                <div className="t-body-sm" style={{ color: "var(--fg-muted)" }}>Consider assigning a Booster DPP to this cohort.</div>
              </div>
            </div>
          </section>

          <section className="rayum-card" style={{ padding: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
              <div style={{ padding: 8, background: "var(--n-10)", borderRadius: "var(--r-md)" }}><RiFocus2Line size={24} /></div>
              <h2 className="section-title" style={{ marginBottom: 0 }}>AI Teaching Recommendations</h2>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {mockBatchAnalysis.teachingRecs.map((rec, i) => (
                <div key={i} style={{ padding: 16, border: "1px solid var(--border-default)", borderRadius: "var(--r-md)", display: "flex", gap: 16 }}>
                  <div style={{ width: 32, height: 32, borderRadius: "var(--r-full)", background: rec.priority === "high" ? "var(--danger-10, #FEF2F2)" : "var(--warning-10, #FFFBEB)", color: rec.priority === "high" ? "var(--danger-50, #DC2626)" : "var(--warning-50, #D97706)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <RiAlertLine size={16} />
                  </div>
                  <div>
                    <div className="t-body-sm-med" style={{ marginBottom: 4 }}>{rec.priority === "high" ? "Critical Priority" : "Medium Priority"}</div>
                    <p className="t-body-sm" style={{ color: "var(--fg-muted)", lineHeight: 1.5 }}>{rec.recommendation}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Chapter Heatmap */}
        <section className="rayum-card" style={{ padding: 24 }}>
          <h2 className="section-title" style={{ marginBottom: 20 }}>Chapter Performance Heatmap</h2>
          <table className="rayum-table">
            <thead>
              <tr>
                <th>Chapter</th>
                <th>Batch Accuracy</th>
                <th>Status</th>
                <th style={{ textAlign: "right" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {mockBatchAnalysis.chapterHeatmap.map((ch, idx) => (
                <tr key={idx}>
                  <td className="t-body-sm-med">{ch.chapter}</td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div className="progress-track" style={{ flex: 1, height: 8, maxWidth: 200 }}>
                        <div className="progress-fill" style={{ height: "100%", width: `${ch.avgAccuracy}%`, background: ch.flag === "good" ? "var(--success-50, #22C55E)" : ch.flag === "warning" ? "var(--warning-50, #F59E0B)" : "var(--danger-50, #EF4444)" }} />
                      </div>
                      <span className="t-body-sm-med">{ch.avgAccuracy}%</span>
                    </div>
                  </td>
                  <td>
                    {ch.flag === "good" ? (
                      <span className="badge badge-green"><RiCheckDoubleLine size={14} /> Mastered</span>
                    ) : ch.flag === "warning" ? (
                      <span className="badge badge-orange"><RiAlertLine size={14} /> Needs Review</span>
                    ) : (
                      <span className="badge badge-red"><RiAlertLine size={14} /> Critical Weakness</span>
                    )}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    {ch.flag !== "good" && (
                      <Link href="/teacher/dpps" className="btn btn-outline" style={{ padding: "6px 12px", fontSize: 13 }}>
                        + Assign DPP
                      </Link>
                    )}
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
