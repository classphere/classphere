"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { 
  RiArrowLeftLine,
  RiPieChart2Line,
  RiFocus2Line,
  RiAlertLine,
  RiCheckDoubleLine
} from "@remixicon/react";
import { mockBatchAnalysis, mockBatches } from "../../../../lib/mock-data";

export default function BatchAnalysisPage() {
  const params = useParams();
  const batchId = params.id as string;
  const batch = mockBatches.find(b => b.id === batchId) || mockBatches[0];

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <Link href="/teacher" style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "var(--fg-muted)", fontSize: 14, marginBottom: 16, textDecoration: "none" }}>
          <RiArrowLeftLine size={16} /> Back to Dashboard
        </Link>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
              <span className="rayum-badge neutral">{batch.exam}</span>
              <span style={{ fontSize: 14, color: "var(--fg-muted)", fontWeight: 600 }}>{batch.name}</span>
            </div>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: "var(--fg-default)", marginBottom: 4 }}>
              {mockBatchAnalysis.testTitle}
            </h1>
            <p className="text-body">
              {mockBatchAnalysis.attemptedCount} out of {mockBatchAnalysis.totalStudents} students attempted this test.
            </p>
          </div>
          <button className="btn btn-primary">Export PDF Report</button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 24 }}>
        {/* Class Summary */}
        <section className="rayum-card">
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
            <div style={{ padding: 8, background: "var(--neutral-10)", borderRadius: 8, color: "var(--fg-default)" }}>
              <RiPieChart2Line size={20} />
            </div>
            <h2 style={{ fontSize: 18, fontWeight: 700 }}>Score Distribution</h2>
          </div>
          
          <div style={{ display: "flex", gap: 24, marginBottom: 24 }}>
            <div style={{ flex: 1, padding: 16, background: "var(--neutral-10)", borderRadius: 8, textAlign: "center" }}>
              <div style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>{mockBatchAnalysis.classSummary.avgScore}%</div>
              <div style={{ fontSize: 13, color: "var(--fg-muted)" }}>Average Score</div>
            </div>
            <div style={{ flex: 1, padding: 16, background: "var(--neutral-10)", borderRadius: 8, textAlign: "center" }}>
              <div style={{ fontSize: 24, fontWeight: 800, marginBottom: 4, color: "var(--accent-green)" }}>{mockBatchAnalysis.classSummary.topScore}%</div>
              <div style={{ fontSize: 13, color: "var(--fg-muted)" }}>Highest Score</div>
            </div>
            <div style={{ flex: 1, padding: 16, background: "var(--neutral-10)", borderRadius: 8, textAlign: "center" }}>
              <div style={{ fontSize: 24, fontWeight: 800, marginBottom: 4, color: "var(--accent-red)" }}>{mockBatchAnalysis.classSummary.bottomScore}%</div>
              <div style={{ fontSize: 13, color: "var(--fg-muted)" }}>Lowest Score</div>
            </div>
          </div>
          
          <div style={{ background: "var(--neutral-10)", padding: 16, borderRadius: 8, display: "flex", alignItems: "center", gap: 16 }}>
            <RiAlertLine size={24} color="var(--accent-orange)" />
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{mockBatchAnalysis.classSummary.belowAverageCount} Students Below Average</div>
              <div style={{ fontSize: 13, color: "var(--fg-muted)" }}>Consider assigning a Booster test to this cohort.</div>
            </div>
          </div>
        </section>

        {/* AI Teaching Recommendations */}
        <section className="rayum-card">
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
            <div style={{ padding: 8, background: "var(--neutral-10)", borderRadius: 8, color: "var(--fg-default)" }}>
              <RiFocus2Line size={20} />
            </div>
            <h2 style={{ fontSize: 18, fontWeight: 700 }}>AI Teaching Recommendations</h2>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {mockBatchAnalysis.teachingRecs.map((rec, index) => (
              <div key={index} style={{ 
                padding: 16, 
                border: "1px solid var(--border-default)", 
                borderRadius: 8,
                display: "flex",
                gap: 16
              }}>
                <div style={{ 
                  width: 32, 
                  height: 32, 
                  borderRadius: "50%", 
                  background: rec.priority === "high" ? "rgba(220, 38, 38, 0.1)" : "rgba(234, 88, 12, 0.1)",
                  color: rec.priority === "high" ? "var(--accent-red)" : "var(--accent-orange)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0
                }}>
                  <RiAlertLine size={16} />
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>
                    {rec.priority === "high" ? "Critical Priority" : "Medium Priority"}
                  </div>
                  <p style={{ fontSize: 14, color: "var(--fg-muted)", lineHeight: 1.5 }}>{rec.recommendation}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Chapter Heatmap */}
      <section className="rayum-card">
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>Chapter Performance Heatmap</h2>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border-default)", textAlign: "left", color: "var(--fg-muted)", fontSize: 13 }}>
              <th style={{ paddingBottom: 12 }}>Chapter</th>
              <th style={{ paddingBottom: 12 }}>Batch Accuracy</th>
              <th style={{ paddingBottom: 12 }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {mockBatchAnalysis.chapterHeatmap.map((ch, idx) => (
              <tr key={idx} style={{ borderBottom: "1px solid var(--neutral-10)" }}>
                <td style={{ padding: "16px 0", fontWeight: 600 }}>{ch.chapter}</td>
                <td style={{ padding: "16px 0" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ flex: 1, height: 8, background: "var(--neutral-10)", borderRadius: 4, maxWidth: 200, overflow: "hidden" }}>
                      <div style={{ 
                        height: "100%", 
                        width: `${ch.avgAccuracy}%`, 
                        background: ch.flag === "good" ? "var(--accent-green)" : ch.flag === "warning" ? "var(--accent-orange)" : "var(--accent-red)" 
                      }} />
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{ch.avgAccuracy}%</span>
                  </div>
                </td>
                <td style={{ padding: "16px 0" }}>
                  {ch.flag === "good" ? (
                    <span className="rayum-badge green" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                      <RiCheckDoubleLine size={12} /> Mastered
                    </span>
                  ) : ch.flag === "warning" ? (
                    <span className="rayum-badge yellow" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                      <RiAlertLine size={12} /> Needs Review
                    </span>
                  ) : (
                    <span className="rayum-badge red" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                      <RiAlertLine size={12} /> Critical Weakness
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

    </div>
  );
}
