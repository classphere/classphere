"use client";

import Navbar from "@/components/layout/Navbar";
import { useState } from "react";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("account");

  return (
    <>
      <Navbar title="Settings" />
      <main style={{ maxWidth: 1000, margin: "0 auto", padding: "var(--space-600)", width: "100%", display: "flex", gap: 32 }}>
        
        {/* Settings Sidebar */}
        <div style={{ width: 240, flexShrink: 0 }}>
          <div className="text-body-small" style={{ fontWeight: 600, color: "var(--fg-muted)", marginBottom: 12, textTransform: "uppercase" }}>Settings Menu</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {[
              { id: "account", label: "Account Settings" },
              { id: "notifications", label: "Notifications" },
              { id: "privacy", label: "Privacy & Security" },
              { id: "appearance", label: "Appearance" },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  textAlign: "left",
                  padding: "10px 16px",
                  borderRadius: "var(--radius-md)",
                  background: activeTab === tab.id ? "var(--primary-10)" : "transparent",
                  color: activeTab === tab.id ? "var(--primary-50)" : "var(--fg-default)",
                  fontWeight: activeTab === tab.id ? 600 : 500,
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

        {/* Settings Content */}
        <div style={{ flex: 1 }}>
          {activeTab === "account" && (
            <div className="rayum-card" style={{ padding: 32 }}>
              <h2 className="text-heading-m" style={{ color: "var(--fg-default)", marginBottom: 24 }}>Account Settings</h2>
              
              <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <label className="text-body-small" style={{ fontWeight: 600, color: "var(--fg-default)" }}>Full Name</label>
                  <input type="text" className="input-field" defaultValue="Arjun Patel" />
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <label className="text-body-small" style={{ fontWeight: 600, color: "var(--fg-default)" }}>Email Address</label>
                  <input type="email" className="input-field" defaultValue="arjun.patel@example.com" />
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <label className="text-body-small" style={{ fontWeight: 600, color: "var(--fg-default)" }}>Language Preference</label>
                  <select className="input-field">
                    <option value="en">English</option>
                    <option value="hi">Hindi</option>
                  </select>
                </div>

                <hr style={{ border: "none", borderTop: "1px solid var(--border-default)" }} />

                <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
                  <button className="btn btn-outline">Cancel</button>
                  <button className="btn btn-primary">Save Changes</button>
                </div>
              </div>
            </div>
          )}

          {activeTab === "notifications" && (
            <div className="rayum-card" style={{ padding: 32 }}>
              <h2 className="text-heading-m" style={{ color: "var(--fg-default)", marginBottom: 24 }}>Notifications</h2>
              <div className="text-body-large" style={{ color: "var(--fg-muted)" }}>Notification settings will be available soon.</div>
            </div>
          )}
          
          {activeTab === "privacy" && (
            <div className="rayum-card" style={{ padding: 32 }}>
              <h2 className="text-heading-m" style={{ color: "var(--fg-default)", marginBottom: 24 }}>Privacy & Security</h2>
              <div className="text-body-large" style={{ color: "var(--fg-muted)" }}>Change password and security questions here.</div>
            </div>
          )}
          
          {activeTab === "appearance" && (
            <div className="rayum-card" style={{ padding: 32 }}>
              <h2 className="text-heading-m" style={{ color: "var(--fg-default)", marginBottom: 24 }}>Appearance</h2>
              <div className="text-body-large" style={{ color: "var(--fg-muted)" }}>Theme settings (Dark/Light mode) coming soon.</div>
            </div>
          )}
        </div>

      </main>
    </>
  );
}
