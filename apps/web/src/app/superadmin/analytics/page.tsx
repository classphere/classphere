"use client";

import Navbar from "@/components/layout/Navbar";
import { RiBrainLine, RiGlobalLine, RiBookOpenLine, RiRobot2Line } from "@remixicon/react";

export default function GlobalAnalyticsPage() {
  return (
    <>
      <Navbar title="Global Analytics & AI Usage" />
      <main style={{ maxWidth: 1200, margin: "0 auto", padding: "var(--space-600)", width: "100%" }}>
        
        {/* KPI Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 24, marginBottom: 32 }}>
          <div className="rayum-card" style={{ padding: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <div style={{ padding: 10, background: "var(--primary-10)", borderRadius: 8, color: "var(--primary-50)" }}>
                <RiGlobalLine size={24} />
              </div>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: "var(--fg-muted)" }}>Total Tests Conducted</h3>
            </div>
            <div style={{ fontSize: 28, fontWeight: 800 }}>845,210</div>
            <p style={{ fontSize: 12, color: "var(--success-50)", marginTop: 8, fontWeight: 600 }}>+45K this week</p>
          </div>

          <div className="rayum-card" style={{ padding: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <div style={{ padding: 10, background: "var(--neutral-10)", borderRadius: 8, color: "var(--fg-default)" }}>
                <RiBookOpenLine size={24} />
              </div>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: "var(--fg-muted)" }}>Average Completion Rate</h3>
            </div>
            <div style={{ fontSize: 28, fontWeight: 800 }}>92.4%</div>
            <p style={{ fontSize: 12, color: "var(--fg-muted)", marginTop: 8 }}>Across all institutes</p>
          </div>

          <div className="rayum-card" style={{ padding: 24, background: "var(--bg-surface)", border: "2px solid var(--primary-10)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <div style={{ padding: 10, background: "var(--primary-50)", borderRadius: 8, color: "white" }}>
                <RiBrainLine size={24} />
              </div>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: "var(--fg-muted)" }}>Total AI Tokens Used</h3>
            </div>
            <div style={{ fontSize: 28, fontWeight: 800, color: "var(--primary-50)" }}>142.8M</div>
            <p style={{ fontSize: 12, color: "var(--fg-muted)", marginTop: 8 }}>Estimated cost: $285.60</p>
          </div>
          
          <div className="rayum-card" style={{ padding: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <div style={{ padding: 10, background: "rgba(239, 68, 68, 0.1)", borderRadius: 8, color: "var(--error-50)" }}>
                <RiRobot2Line size={24} />
              </div>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: "var(--fg-muted)" }}>Booster Tests Generated</h3>
            </div>
            <div style={{ fontSize: 28, fontWeight: 800 }}>12,450</div>
            <p style={{ fontSize: 12, color: "var(--fg-muted)", marginTop: 8 }}>Last 30 days</p>
          </div>
        </div>

        {/* Charts Section */}
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 24, marginBottom: 32 }}>
          <div className="rayum-card" style={{ padding: 24, height: 400, display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 className="text-heading-s" style={{ color: "var(--fg-default)" }}>Platform Engagement Over Time</h3>
              <select className="input-field" style={{ padding: "4px 12px", fontSize: 12 }}>
                <option>Last 30 Days</option>
                <option>Last 3 Months</option>
                <option>This Year</option>
              </select>
            </div>
            <div style={{ flex: 1, background: "var(--bg-body)", borderRadius: 8, border: "1px dashed var(--border-default)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--fg-muted)" }}>
              Line Chart Placeholder (Tests taken vs Date)
            </div>
          </div>
          
          <div className="rayum-card" style={{ padding: 24, height: 400, display: "flex", flexDirection: "column" }}>
            <h3 className="text-heading-s" style={{ color: "var(--fg-default)", marginBottom: 16 }}>AI Usage by Institute</h3>
            <div style={{ flex: 1, background: "var(--bg-body)", borderRadius: 8, border: "1px dashed var(--border-default)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--fg-muted)" }}>
              Pie Chart Placeholder
            </div>
          </div>
        </div>

        {/* Detailed AI Metrics */}
        <div className="rayum-card" style={{ padding: 24 }}>
          <h2 className="text-heading-m" style={{ color: "var(--fg-default)", marginBottom: 24 }}>AI Token Consumption Breakdown</h2>
          
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span className="text-body-large" style={{ color: "var(--fg-default)", fontWeight: 600 }}>Generative AI Analysis (Student Results)</span>
                <span className="text-body-large" style={{ color: "var(--fg-default)", fontWeight: 600 }}>85.2M Tokens (60%)</span>
              </div>
              <div style={{ height: 12, background: "var(--bg-body)", borderRadius: 6, overflow: "hidden" }}>
                <div style={{ width: "60%", height: "100%", background: "var(--primary-50)" }} />
              </div>
            </div>
            
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span className="text-body-large" style={{ color: "var(--fg-default)", fontWeight: 600 }}>Booster Test Generation</span>
                <span className="text-body-large" style={{ color: "var(--fg-default)", fontWeight: 600 }}>42.6M Tokens (30%)</span>
              </div>
              <div style={{ height: 12, background: "var(--bg-body)", borderRadius: 6, overflow: "hidden" }}>
                <div style={{ width: "30%", height: "100%", background: "var(--accent-blue)" }} />
              </div>
            </div>

            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span className="text-body-large" style={{ color: "var(--fg-default)", fontWeight: 600 }}>System Optimization & Sync</span>
                <span className="text-body-large" style={{ color: "var(--fg-default)", fontWeight: 600 }}>15.0M Tokens (10%)</span>
              </div>
              <div style={{ height: 12, background: "var(--bg-body)", borderRadius: 6, overflow: "hidden" }}>
                <div style={{ width: "10%", height: "100%", background: "var(--warning-50)" }} />
              </div>
            </div>
          </div>
        </div>

      </main>
    </>
  );
}
