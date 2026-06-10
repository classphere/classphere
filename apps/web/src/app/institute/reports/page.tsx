"use client";

import Navbar from "@/components/layout/Navbar";
import { RiBarChartBoxFill, RiLineChartFill, RiPieChart2Fill } from "@remixicon/react";

export default function ReportsPage() {
  return (
    <>
      <Navbar title="Institute Reports" />
      <main style={{ maxWidth: 1200, margin: "0 auto", padding: "var(--space-600)", width: "100%" }}>
        
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h2 className="text-heading-m" style={{ color: "var(--fg-default)" }}>Performance Analytics</h2>
          <select className="input-field" style={{ width: 200 }}>
            <option>Last 30 Days</option>
            <option>Last 3 Months</option>
            <option>This Year</option>
          </select>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24, marginBottom: 24 }}>
          <div className="rayum-card" style={{ padding: 24, display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ width: 48, height: 48, borderRadius: "50%", background: "var(--primary-10)", color: "var(--primary-50)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <RiBarChartBoxFill size={24} />
            </div>
            <div>
              <div className="text-body-small" style={{ color: "var(--fg-muted)" }}>Average Test Score</div>
              <div className="text-heading-m" style={{ color: "var(--fg-default)" }}>76.4%</div>
            </div>
          </div>
          <div className="rayum-card" style={{ padding: 24, display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ width: 48, height: 48, borderRadius: "50%", background: "var(--success-10)", color: "var(--success-50)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <RiLineChartFill size={24} />
            </div>
            <div>
              <div className="text-body-small" style={{ color: "var(--fg-muted)" }}>Tests Conducted</div>
              <div className="text-heading-m" style={{ color: "var(--fg-default)" }}>142</div>
            </div>
          </div>
          <div className="rayum-card" style={{ padding: 24, display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ width: 48, height: 48, borderRadius: "50%", background: "var(--warning-10)", color: "var(--warning-50)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <RiPieChart2Fill size={24} />
            </div>
            <div>
              <div className="text-body-small" style={{ color: "var(--fg-muted)" }}>Active Students</div>
              <div className="text-heading-m" style={{ color: "var(--fg-default)" }}>1,204</div>
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 24 }}>
          <div className="rayum-card" style={{ padding: 24, height: 400, display: "flex", flexDirection: "column" }}>
            <h3 className="text-heading-s" style={{ color: "var(--fg-default)", marginBottom: 16 }}>Batch Performance Trend</h3>
            <div style={{ flex: 1, background: "var(--bg-body)", borderRadius: 8, border: "1px dashed var(--border-default)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--fg-muted)" }}>
              Chart visualization placeholder
            </div>
          </div>
          
          <div className="rayum-card" style={{ padding: 24, height: 400, display: "flex", flexDirection: "column" }}>
            <h3 className="text-heading-s" style={{ color: "var(--fg-default)", marginBottom: 16 }}>Subject Mastery</h3>
            <div style={{ flex: 1, background: "var(--bg-body)", borderRadius: 8, border: "1px dashed var(--border-default)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--fg-muted)" }}>
              Radar chart placeholder
            </div>
          </div>
        </div>

      </main>
    </>
  );
}
