"use client";

import { 
  RiUser3Line, 
  RiMailLine,
  RiBankCardLine,
  RiTeamLine,
  RiBuilding4Line,
  RiHistoryLine
} from "@remixicon/react";
import { mockUser } from "../../lib/mock-data";

export default function ProfilePage() {
  return (
    <div style={{ maxWidth: 800, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: "var(--fg-default)", marginBottom: 4 }}>
          My Profile
        </h1>
        <p className="text-body">Manage your account settings and subscriptions.</p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        
        {/* Account Details */}
        <section className="rayum-card">
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>Account Details</h2>
          
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--fg-muted)", marginBottom: 8 }}>
                Full Name
              </label>
              <div className="input-field" style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <RiUser3Line size={18} color="var(--fg-muted)" />
                <input 
                  type="text" 
                  defaultValue={mockUser.name} 
                  style={{ border: "none", background: "transparent", outline: "none", width: "100%", fontSize: 14 }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--fg-muted)", marginBottom: 8 }}>
                Email Address
              </label>
              <div className="input-field" style={{ display: "flex", alignItems: "center", gap: 12, background: "var(--neutral-10)" }}>
                <RiMailLine size={18} color="var(--fg-muted)" />
                <input 
                  type="email" 
                  defaultValue={mockUser.email} 
                  disabled
                  style={{ border: "none", background: "transparent", outline: "none", width: "100%", fontSize: 14, color: "var(--fg-muted)" }}
                />
              </div>
              <p style={{ fontSize: 12, color: "var(--fg-muted)", marginTop: 8 }}>Email cannot be changed.</p>
            </div>

            <div style={{ marginTop: 8 }}>
              <button className="btn btn-primary">Save Changes</button>
            </div>
          </div>
        </section>

        {/* Subscription & Plans */}
        <section className="rayum-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700 }}>Subscription Plan</h2>
            <span className="rayum-badge green">Active</span>
          </div>

          <div style={{ border: "1px solid var(--accent-green)", borderRadius: 12, padding: 20, background: "rgba(34, 197, 94, 0.05)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <RiBankCardLine size={20} color="var(--accent-green)" />
                  <span style={{ fontWeight: 700, fontSize: 18, color: "var(--accent-green)" }}>Institute Pro Plan</span>
                </div>
                <div style={{ fontSize: 13, color: "var(--fg-muted)" }}>Provided by Aakash Institute</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontWeight: 800, fontSize: 24, color: "var(--fg-default)" }}>₹0 <span style={{ fontSize: 14, fontWeight: 400, color: "var(--fg-muted)" }}>/mo</span></div>
              </div>
            </div>

            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 8, fontSize: 13, color: "var(--fg-muted)" }}>
              <li style={{ display: "flex", alignItems: "center", gap: 8 }}>• Unlimited Mock Tests</li>
              <li style={{ display: "flex", alignItems: "center", gap: 8 }}>• Full AI Performance Analysis</li>
              <li style={{ display: "flex", alignItems: "center", gap: 8 }}>• Access to Institute Batch Tests</li>
            </ul>
          </div>
        </section>

        {/* Enrolled Batches */}
        <section className="rayum-card">
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>Enrolled Batches</h2>
          
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ padding: 16, border: "1px solid var(--border-default)", borderRadius: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <div style={{ width: 40, height: 40, background: "var(--neutral-10)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--fg-default)" }}>
                  <RiTeamLine size={20} />
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>{mockUser.batch}</div>
                  <div style={{ fontSize: 13, color: "var(--fg-muted)", display: "flex", alignItems: "center", gap: 6 }}>
                    <RiBuilding4Line size={14} /> Aakash Institute
                  </div>
                </div>
              </div>
              <button className="btn btn-outline" style={{ padding: "6px 12px", fontSize: 13 }}>Leave Batch</button>
            </div>
            
            <button className="btn btn-outline" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: 16, borderStyle: "dashed" }}>
              Have an invite code? Join another batch
            </button>
          </div>
        </section>

        {/* Danger Zone */}
        <section className="rayum-card" style={{ border: "1px solid rgba(220, 38, 38, 0.2)" }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, color: "var(--accent-red)" }}>Danger Zone</h2>
          <p style={{ fontSize: 13, color: "var(--fg-muted)", marginBottom: 20 }}>
            Once you delete your account, there is no going back. All your test history and AI analyses will be permanently deleted.
          </p>
          <button className="btn" style={{ background: "transparent", border: "1px solid var(--accent-red)", color: "var(--accent-red)" }}>
            Delete Account
          </button>
        </section>

      </div>
    </div>
  );
}
