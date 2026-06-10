"use client";

import Navbar from "@/components/layout/Navbar";
import { useState } from "react";
import { RiToggleLine, RiToggleFill, RiErrorWarningLine } from "@remixicon/react";

export default function ConfigurationPage() {
  const [maintenance, setMaintenance] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState(true);
  const [newLeaderboard, setNewLeaderboard] = useState(false);
  const [betaFeatures, setBetaFeatures] = useState(true);

  return (
    <>
      <Navbar title="Platform Configuration" />
      <main style={{ maxWidth: 1000, margin: "0 auto", padding: "var(--space-600)", width: "100%" }}>
        
        {/* Global System State */}
        <div className="rayum-card" style={{ padding: 32, marginBottom: 32, borderTop: maintenance ? "4px solid var(--error-50)" : "4px solid var(--success-50)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h2 className="text-heading-m" style={{ margin: 0, color: "var(--fg-default)" }}>System Maintenance Mode</h2>
            <button 
              onClick={() => setMaintenance(!maintenance)}
              style={{ background: "transparent", border: "none", cursor: "pointer", color: maintenance ? "var(--error-50)" : "var(--fg-muted)", padding: 0 }}
            >
              {maintenance ? <RiToggleFill size={48} /> : <RiToggleLine size={48} />}
            </button>
          </div>
          <p className="text-body-large" style={{ color: "var(--fg-muted)", marginBottom: 16 }}>
            Enabling maintenance mode will force log out all active users and display a maintenance screen. Only Super Admins will be able to log in.
          </p>
          {maintenance && (
            <div style={{ padding: 16, background: "rgba(239, 68, 68, 0.1)", borderRadius: 8, display: "flex", alignItems: "center", gap: 12, color: "var(--error-50)", fontWeight: 600 }}>
              <RiErrorWarningLine size={24} />
              The platform is currently in maintenance mode.
            </div>
          )}
        </div>

        {/* Feature Flags */}
        <h2 className="text-heading-m" style={{ color: "var(--fg-default)", marginBottom: 16 }}>Global Feature Flags</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 32 }}>
          
          <div className="rayum-card" style={{ padding: "20px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div className="text-heading-s" style={{ color: "var(--fg-default)", marginBottom: 4 }}>Generative AI Analysis</div>
              <div className="text-body-small" style={{ color: "var(--fg-muted)" }}>Enables the "View Analysis" AI button on student test results. High token cost.</div>
            </div>
            <button 
              onClick={() => setAiAnalysis(!aiAnalysis)}
              style={{ background: "transparent", border: "none", cursor: "pointer", color: aiAnalysis ? "var(--primary-50)" : "var(--fg-muted)", padding: 0 }}
            >
              {aiAnalysis ? <RiToggleFill size={40} /> : <RiToggleLine size={40} />}
            </button>
          </div>

          <div className="rayum-card" style={{ padding: "20px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div className="text-heading-s" style={{ color: "var(--fg-default)", marginBottom: 4 }}>Beta Leaderboard UI V2</div>
              <div className="text-body-small" style={{ color: "var(--fg-muted)" }}>Rolls out the new interactive 3D leaderboard UI to all student portals.</div>
            </div>
            <button 
              onClick={() => setNewLeaderboard(!newLeaderboard)}
              style={{ background: "transparent", border: "none", cursor: "pointer", color: newLeaderboard ? "var(--primary-50)" : "var(--fg-muted)", padding: 0 }}
            >
              {newLeaderboard ? <RiToggleFill size={40} /> : <RiToggleLine size={40} />}
            </button>
          </div>

          <div className="rayum-card" style={{ padding: "20px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <span className="text-heading-s" style={{ color: "var(--fg-default)" }}>Experimental Features</span>
                <span className="rayum-badge orange" style={{ fontSize: 10 }}>Beta</span>
              </div>
              <div className="text-body-small" style={{ color: "var(--fg-muted)" }}>Allows institutes on the "Enterprise" tier to opt-in to early access features.</div>
            </div>
            <button 
              onClick={() => setBetaFeatures(!betaFeatures)}
              style={{ background: "transparent", border: "none", cursor: "pointer", color: betaFeatures ? "var(--primary-50)" : "var(--fg-muted)", padding: 0 }}
            >
              {betaFeatures ? <RiToggleFill size={40} /> : <RiToggleLine size={40} />}
            </button>
          </div>
        </div>

        {/* Global Limits */}
        <h2 className="text-heading-m" style={{ color: "var(--fg-default)", marginBottom: 16 }}>Global API & Rate Limits</h2>
        <div className="rayum-card" style={{ padding: 24 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <label className="text-body-small" style={{ fontWeight: 600, color: "var(--fg-default)" }}>API Rate Limit (Req/Min/IP)</label>
              <input type="number" className="input-field" defaultValue={100} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <label className="text-body-small" style={{ fontWeight: 600, color: "var(--fg-default)" }}>Global Session Timeout (Minutes)</label>
              <input type="number" className="input-field" defaultValue={120} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <label className="text-body-small" style={{ fontWeight: 600, color: "var(--fg-default)" }}>Max Upload Size (MB)</label>
              <input type="number" className="input-field" defaultValue={25} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <label className="text-body-small" style={{ fontWeight: 600, color: "var(--fg-default)" }}>Default Language</label>
              <select className="input-field">
                <option>English (US)</option>
                <option>Hindi (IN)</option>
              </select>
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 24 }}>
            <button className="btn btn-primary">Save Settings</button>
          </div>
        </div>

      </main>
    </>
  );
}
