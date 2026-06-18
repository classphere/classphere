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
            <Link href="/teacher/dpps" className="btn btn-outline" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13 }}>
              <RiAddLine size={14} /> Assign DPP for this Batch
            </Link>
            <button className="btn btn-primary">Export PDF Report</button>
          </div>
        </div>

        {/* Score + Recs */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 24 }}>

          <section className="rayum-card" style={{ padding: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
              <div style={{ padding: 8, background: "var(--n-10)", borderRadius: 8 }}><RiPieChart2Line size={20} /></div>
              <h2 style={{ fontSize: 18, fontWeight: 700 }}>Score Distribution</h2>
            </div>
            <div style={{ display: "flex", gap: 16, marginBottom: 20 }}>
              {[
                { label: "Average Score", value: `${mockBatchAnalysis.classSummary.avgScore}%`, color: "var(--fg-default)" },
                { label: "Highest Score", value: `${mockBatchAnalysis.classSummary.topScore}%`,  color: "var(--accent-green)" },
                { label: "Lowest Score",  value: `${mockBatchAnalysis.classSummary.bottomScore}%`, color: "var(--accent-red)" },
              ].map(s => (
                <div key={s.label} style={{ flex: 1, padding: 16, background: "var(--n-10)", borderRadius: 8, textAlign: "center" }}>
                  <div style={{ fontSize: 24, fontWeight: 800, color: s.color, marginBottom: 4 }}>{s.value}</div>
                  <div style={{ fontSize: 12, color: "var(--fg-muted)" }}>{s.label}</div>
                </div>
              ))}
            </div>
            <div style={{ background: "var(--n-10)", padding: 16, borderRadius: 8, display: "flex", alignItems: "center", gap: 16 }}>
              <RiAlertLine size={24} color="var(--accent-orange)" />
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{mockBatchAnalysis.classSummary.belowAverageCount} Students Below Average</div>
                <div style={{ fontSize: 13, color: "var(--fg-muted)" }}>Consider assigning a Booster DPP to this cohort.</div>
              </div>
            </div>
          </section>

          <section className="rayum-card" style={{ padding: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
              <div style={{ padding: 8, background: "var(--n-10)", borderRadius: 8 }}><RiFocus2Line size={20} /></div>
              <h2 style={{ fontSize: 18, fontWeight: 700 }}>AI Teaching Recommendations</h2>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {mockBatchAnalysis.teachingRecs.map((rec, i) => (
                <div key={i} style={{ padding: 16, border: "1px solid var(--border-default)", borderRadius: 8, display: "flex", gap: 16 }}>
                  <div style={{ width: 32, height: 32, borderRadius: "50%", background: rec.priority === "high" ? "rgba(220,38,38,0.1)" : "rgba(234,88,12,0.1)", color: rec.priority === "high" ? "var(--accent-red)" : "var(--accent-orange)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <RiAlertLine size={16} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{rec.priority === "high" ? "Critical Priority" : "Medium Priority"}</div>
                    <p style={{ fontSize: 14, color: "var(--fg-muted)", lineHeight: 1.5 }}>{rec.recommendation}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Chapter Heatmap */}
        <section className="rayum-card" style={{ padding: 24 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>Chapter Performance Heatmap</h2>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border-default)", textAlign: "left", color: "var(--fg-muted)", fontSize: 13 }}>
                <th style={{ paddingBottom: 12 }}>Chapter</th>
                <th style={{ paddingBottom: 12 }}>Batch Accuracy</th>
                <th style={{ paddingBottom: 12 }}>Status</th>
                <th style={{ paddingBottom: 12, textAlign: "right" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {mockBatchAnalysis.chapterHeatmap.map((ch, idx) => (
                <tr key={idx} style={{ borderBottom: "1px solid var(--n-10)" }}>
                  <td style={{ padding: "14px 0", fontWeight: 600 }}>{ch.chapter}</td>
                  <td style={{ padding: "14px 0" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ flex: 1, height: 8, background: "var(--n-10)", borderRadius: 4, maxWidth: 200, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${ch.avgAccuracy}%`, background: ch.flag === "good" ? "var(--accent-green)" : ch.flag === "warning" ? "var(--accent-orange)" : "var(--accent-red)" }} />
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{ch.avgAccuracy}%</span>
                    </div>
                  </td>
                  <td style={{ padding: "14px 0" }}>
                    {ch.flag === "good" ? (
                      <span className="rayum-badge green" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><RiCheckDoubleLine size={12} /> Mastered</span>
                    ) : ch.flag === "warning" ? (
                      <span className="rayum-badge yellow" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><RiAlertLine size={12} /> Needs Review</span>
                    ) : (
                      <span className="rayum-badge red" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><RiAlertLine size={12} /> Critical Weakness</span>
                    )}
                  </td>
                  <td style={{ padding: "14px 0", textAlign: "right" }}>
                    {ch.flag !== "good" && (
                      <Link href="/teacher/dpps" className="btn btn-outline" style={{ fontSize: 12, padding: "4px 12px" }}>
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
