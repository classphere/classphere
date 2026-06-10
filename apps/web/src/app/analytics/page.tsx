"use client";

import Navbar from "@/components/layout/Navbar";
import { RiLineChartLine, RiTimeLine, RiCrosshair2Line, RiTrophyLine } from "@remixicon/react";

const topicPerformance = [
  { topic: "Kinematics", accuracy: 92, status: "Strong" },
  { topic: "Thermodynamics", accuracy: 85, status: "Good" },
  { topic: "Electromagnetism", accuracy: 45, status: "Weak" },
  { topic: "Rotational Mechanics", accuracy: 30, status: "Critical" },
  { topic: "Optics", accuracy: 78, status: "Good" },
];

export default function StudentAnalyticsPage() {
  return (
    <>
      <Navbar title="My Performance Analytics" />
      <main style={{ maxWidth: 1200, margin: "0 auto", padding: "var(--space-600)", width: "100%" }}>
        
        {/* KPI Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 24, marginBottom: 32 }}>
          <div className="rayum-card" style={{ padding: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <div style={{ padding: 10, background: "var(--primary-10)", borderRadius: 8, color: "var(--primary-50)" }}>
                <RiCrosshair2Line size={24} />
              </div>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: "var(--fg-muted)" }}>Overall Accuracy</h3>
            </div>
            <div style={{ fontSize: 28, fontWeight: 800 }}>76.4%</div>
            <p style={{ fontSize: 12, color: "var(--success-50)", marginTop: 8, fontWeight: 600 }}>+4.2% from last month</p>
          </div>

          <div className="rayum-card" style={{ padding: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <div style={{ padding: 10, background: "rgba(245, 158, 11, 0.1)", borderRadius: 8, color: "var(--warning-50)" }}>
                <RiTimeLine size={24} />
              </div>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: "var(--fg-muted)" }}>Avg Time / Question</h3>
            </div>
            <div style={{ fontSize: 28, fontWeight: 800 }}>1m 45s</div>
            <p style={{ fontSize: 12, color: "var(--error-50)", marginTop: 8 }}>+15s slower than target</p>
          </div>

          <div className="rayum-card" style={{ padding: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <div style={{ padding: 10, background: "rgba(168, 85, 247, 0.1)", borderRadius: 8, color: "var(--accent-purple)" }}>
                <RiTrophyLine size={24} />
              </div>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: "var(--fg-muted)" }}>Batch Percentile</h3>
            </div>
            <div style={{ fontSize: 28, fontWeight: 800 }}>88th</div>
            <p style={{ fontSize: 12, color: "var(--fg-muted)", marginTop: 8 }}>Top 12% of Aakash Target Batch</p>
          </div>
          
          <div className="rayum-card" style={{ padding: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <div style={{ padding: 10, background: "var(--neutral-10)", borderRadius: 8, color: "var(--fg-default)" }}>
                <RiLineChartLine size={24} />
              </div>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: "var(--fg-muted)" }}>Tests Attempted</h3>
            </div>
            <div style={{ fontSize: 28, fontWeight: 800 }}>42</div>
            <p style={{ fontSize: 12, color: "var(--fg-muted)", marginTop: 8 }}>This academic year</p>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 32 }}>
          {/* Topic Wise Analysis */}
          <div className="rayum-card" style={{ padding: 24 }}>
            <h2 className="text-heading-m" style={{ color: "var(--fg-default)", marginBottom: 20 }}>Topic-wise Strengths & Weaknesses</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {topicPerformance.map((item, idx) => (
                <div key={idx}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                    <span className="text-body" style={{ color: "var(--fg-default)", fontWeight: 600 }}>{item.topic}</span>
                    <span className="text-body-small" style={{ color: "var(--fg-muted)" }}>{item.accuracy}% Accuracy</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ flex: 1, height: 8, background: "var(--bg-body)", borderRadius: 4, overflow: "hidden" }}>
                      <div 
                        style={{ 
                          width: `${item.accuracy}%`, 
                          height: "100%", 
                          background: item.accuracy > 80 ? "var(--success-50)" : item.accuracy > 50 ? "var(--warning-50)" : "var(--error-50)" 
                        }} 
                      />
                    </div>
                    <span className={`rayum-badge ${item.accuracy > 80 ? "green" : item.accuracy > 50 ? "orange" : "red"}`} style={{ minWidth: 70, textAlign: "center" }}>
                      {item.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Time Management Analysis */}
          <div className="rayum-card" style={{ padding: 24 }}>
            <h2 className="text-heading-m" style={{ color: "var(--fg-default)", marginBottom: 20 }}>Time Management (Physics)</h2>
            <p className="text-body" style={{ color: "var(--fg-muted)", marginBottom: 24 }}>
              You are spending too much time on mechanics questions. Try to use our time-bound booster tests to improve speed.
            </p>
            
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <span className="text-body-small" style={{ color: "var(--fg-default)", fontWeight: 600 }}>Mechanics (Avg: 3m 12s)</span>
                  <span className="text-body-small" style={{ color: "var(--error-50)" }}>Target: 2m 00s</span>
                </div>
                <div style={{ height: 12, background: "var(--bg-body)", borderRadius: 6, overflow: "hidden", position: "relative" }}>
                  <div style={{ width: "80%", height: "100%", background: "var(--error-50)" }} />
                  {/* Target Marker */}
                  <div style={{ position: "absolute", left: "50%", top: 0, bottom: 0, width: 2, background: "var(--fg-default)", zIndex: 10 }} />
                </div>
              </div>
              
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <span className="text-body-small" style={{ color: "var(--fg-default)", fontWeight: 600 }}>Electrodynamics (Avg: 1m 45s)</span>
                  <span className="text-body-small" style={{ color: "var(--success-50)" }}>Target: 2m 00s</span>
                </div>
                <div style={{ height: 12, background: "var(--bg-body)", borderRadius: 6, overflow: "hidden", position: "relative" }}>
                  <div style={{ width: "40%", height: "100%", background: "var(--success-50)" }} />
                  <div style={{ position: "absolute", left: "50%", top: 0, bottom: 0, width: 2, background: "var(--fg-default)", zIndex: 10 }} />
                </div>
              </div>

              <div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <span className="text-body-small" style={{ color: "var(--fg-default)", fontWeight: 600 }}>Modern Physics (Avg: 2m 10s)</span>
                  <span className="text-body-small" style={{ color: "var(--warning-50)" }}>Target: 2m 00s</span>
                </div>
                <div style={{ height: 12, background: "var(--bg-body)", borderRadius: 6, overflow: "hidden", position: "relative" }}>
                  <div style={{ width: "55%", height: "100%", background: "var(--warning-50)" }} />
                  <div style={{ position: "absolute", left: "50%", top: 0, bottom: 0, width: 2, background: "var(--fg-default)", zIndex: 10 }} />
                </div>
              </div>
            </div>
            
            <div style={{ display: "flex", justifyContent: "center", marginTop: 32 }}>
              <button className="btn btn-primary" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <RiTimeLine size={18} /> Generate Speed Booster Test
              </button>
            </div>
          </div>
        </div>

      </main>
    </>
  );
}
