"use client";

import Navbar from "@/components/layout/Navbar";
import { Suspense, useState } from "react";
import { RiSmartphoneLine, RiComputerLine, RiGoogleFill, RiWhatsappFill, RiCheckFill, RiDownloadCloud2Line, RiErrorWarningLine } from "@remixicon/react";

function SettingsContent() {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }, 800);
  };

  return (
    <>
      <Navbar title="Platform Settings" subtitle="Manage your account, preferences, and test settings." breadcrumbs="Dashboard > Settings" />
      <main style={{ maxWidth: 1200, margin: "0 auto", padding: "0 32px 32px 32px", width: "100%", display: "flex", gap: 32, alignItems: "flex-start" }}>
        
        {/* Left Nav Menu */}
        <div style={{ width: 220, flexShrink: 0, position: "sticky", top: 100 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {[
              { id: "general", label: "General Info", active: true },
              { id: "security", label: "Security", active: false },
              { id: "notifications", label: "Notifications", active: false },
              { id: "integrations", label: "Integrations", active: false },
            ].map(tab => (
              <button
                key={tab.id}
                style={{
                  textAlign: "left",
                  padding: "10px 16px",
                  borderRadius: "var(--r-md)",
                  background: tab.active ? "var(--n-20)" : "transparent",
                  color: tab.active ? "var(--fg-default)" : "var(--fg-muted)",
                  fontWeight: tab.active ? 600 : 500,
                  fontSize: 14,
                  border: "none",
                  cursor: "pointer",
                  transition: "all 0.2s"
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Right Content Form Card */}
        <div className="rayum-card" style={{ flex: 1, padding: 40 }}>
          
          <h2 className="section-title" style={{ marginBottom: 32 }}>General Info</h2>
          
          <div style={{ marginBottom: 32 }}>
            <div style={{ width: 100, height: 100, borderRadius: "50%", background: "var(--s-50)", marginBottom: 12, display: "flex", alignItems: "center", justifyContent: "center", color: "white" }}>
               {/* Abstract geometric icon placeholder */}
               <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor"><path d="M11 2L2 13H10V22L19 11H11V2Z"/></svg>
            </div>
            <button className="btn btn-ghost" style={{ color: "var(--s-50)", padding: 0 }}>
              <RiCheckFill size={16} /> Replace
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 24, marginBottom: 48 }}>
            <div>
              <label className="text-bold" style={{ display: "block", marginBottom: 8 }}>Display Name</label>
              <input type="text" className="input" defaultValue="Harsh Singh" />
              <div className="t-body-sm" style={{ marginTop: 6 }}>Shown on leaderboards and doubts.</div>
            </div>
            
            <div>
              <label className="text-bold" style={{ display: "block", marginBottom: 8 }}>Bio</label>
              <textarea className="input textarea" defaultValue="JEE 2026 Aspirant focusing on Physics and Maths." />
              <div className="t-body-sm" style={{ marginTop: 6, textAlign: "right" }}>48/100</div>
            </div>

            <div>
              <label className="text-bold" style={{ display: "block", marginBottom: 8 }}>Email Address</label>
              <input type="text" className="input" defaultValue="harshsingh15dec@gmail.com" />
              <div className="t-body-sm" style={{ marginTop: 6 }}>Used for login and important communications.</div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
              <div>
                <label className="text-bold" style={{ display: "block", marginBottom: 8 }}>Target Exam</label>
                <div className="search-bar" style={{ padding: "10px 14px", borderRadius: "var(--r-full)" }}>
                   <input type="text" defaultValue="JEE Main" readOnly />
                </div>
              </div>
              <div>
                <label className="text-bold" style={{ display: "block", marginBottom: 8 }}>Phone</label>
                <input type="text" className="input" defaultValue="+1 (415) 555-0199" />
              </div>
            </div>
          </div>

          <hr className="divider" style={{ margin: "48px 0" }} />

          <h2 className="section-title" style={{ marginBottom: 32 }}>Security</h2>

          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 24, borderBottom: "1px solid var(--border-default)" }}>
              <div>
                <div className="text-bold">Two-Factor Authentication (2FA)</div>
                <div className="t-body-sm">Requires a security key or authenticator app.</div>
              </div>
              <label className="switch">
                <input type="checkbox" defaultChecked />
                <span className="switch-track"></span>
              </label>
            </div>
            
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 24, borderBottom: "1px solid var(--border-default)" }}>
              <div>
                <div className="text-bold">Active Sessions</div>
                <div className="t-body-sm" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <RiComputerLine size={16} /> MacBook Pro (Current) • IP: 192.168.1.1
                </div>
              </div>
              <button className="btn btn-outline">Revoke All</button>
            </div>
          </div>

          <hr className="divider" style={{ margin: "48px 0" }} />

          <h2 className="section-title" style={{ marginBottom: 32 }}>Notifications</h2>

          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 24, borderBottom: "1px solid var(--border-default)" }}>
              <div>
                <div className="text-bold">Test Reminders</div>
                <div className="t-body-sm">Get notified 24 hours before a scheduled test.</div>
              </div>
              <label className="switch">
                <input type="checkbox" />
                <span className="switch-track"></span>
              </label>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 24, borderBottom: "1px solid var(--border-default)" }}>
              <div>
                <div className="text-bold">Performance Reports</div>
                <div className="t-body-sm">Receive a weekly email summary of your test scores.</div>
              </div>
              <label className="switch">
                <input type="checkbox" defaultChecked />
                <span className="switch-track"></span>
              </label>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 24, borderBottom: "1px solid var(--border-default)" }}>
              <div>
                <div className="text-bold">Doubt Resolution</div>
                <div className="t-body-sm">Get alerts when a teacher answers your doubt.</div>
              </div>
              <label className="switch">
                <input type="checkbox" defaultChecked />
                <span className="switch-track"></span>
              </label>
            </div>
          </div>

          {/* Action Footer */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 16, marginTop: 48 }}>
            <button className="btn btn-outline" style={{ border: "1px solid var(--border-default)" }}>Discard Changes</button>
            <button className="btn btn-dark" onClick={handleSave} disabled={saving} style={{ width: 140 }}>
              {saving ? "Saving..." : saved ? "Saved!" : "Save Changes"}
            </button>
          </div>

        </div>

      </main>
    </>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SettingsContent />
    </Suspense>
  );
}
