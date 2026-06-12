"use client";

import Navbar from "@/components/layout/Navbar";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { RiCheckFill } from "@remixicon/react";

function ProfileContent() {
  const searchParams = useSearchParams();
  const role = searchParams.get("role") || "student";

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

  // Data
  const data = {
    name: "Harsh Singh",
    email: "harshsingh15dec@gmail.com",
    exam: "JEE Main",
    phone: "+91 9876543210",
    bio: "JEE 2026 Aspirant focusing on Physics and Maths.",
  };

  return (
    <>
      <Navbar title="My Profile" subtitle="Manage your profile, account security, and notification preferences" breadcrumbs="Dashboard > My Profile" />
      <main style={{ maxWidth: 1200, margin: "0 auto", padding: "0 32px 32px 32px", width: "100%", display: "flex", gap: 32, alignItems: "flex-start" }}>
        
        {/* Left Nav Menu */}
        <div style={{ width: 220, flexShrink: 0, position: "sticky", top: 100 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {[
              { id: "profile", label: "Profile information", active: true },
              { id: "account", label: "Account", active: false },
              { id: "notifications", label: "Notifications", active: false },
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
          
          <h2 className="section-title" style={{ marginBottom: 32 }}>Profile information</h2>
          
          <div style={{ marginBottom: 32 }}>
            <div className="avatar avatar-xl" style={{ width: 100, height: 100, marginBottom: 12 }}>
               <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(data.name)}&background=3765F6&color=fff&size=100`} alt="Avatar" style={{ width: "100%", height: "100%", borderRadius: "50%" }} />
            </div>
            <button className="btn btn-ghost" style={{ color: "var(--s-50)", padding: 0 }}>
              <RiCheckFill size={16} /> Replace
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 24, marginBottom: 48 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
              <div>
                <label className="text-bold" style={{ display: "block", marginBottom: 8 }}>First name</label>
                <input type="text" className="input" defaultValue={data.name.split(" ")[0]} />
              </div>
              <div>
                <label className="text-bold" style={{ display: "block", marginBottom: 8 }}>Last name</label>
                <input type="text" className="input" defaultValue={data.name.split(" ")[1]} />
              </div>
            </div>

            <div>
              <label className="text-bold" style={{ display: "block", marginBottom: 8 }}>Work email</label>
              <input type="text" className="input" defaultValue={data.email} />
            </div>

            <div>
              <label className="text-bold" style={{ display: "block", marginBottom: 8 }}>Target Exam</label>
              <input type="text" className="input" defaultValue={data.exam} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
              <div>
                <label className="text-bold" style={{ display: "block", marginBottom: 8 }}>Role</label>
                <div className="search-bar" style={{ padding: "10px 14px", borderRadius: "var(--r-full)" }}>
                   <input type="text" defaultValue={role.toUpperCase()} readOnly />
                </div>
              </div>
              <div>
                <label className="text-bold" style={{ display: "block", marginBottom: 8 }}>Phone number</label>
                <input type="text" className="input" defaultValue={data.phone} />
              </div>
            </div>

            <div>
              <label className="text-bold" style={{ display: "block", marginBottom: 8 }}>Bio</label>
              <textarea className="input textarea" defaultValue={data.bio} />
              <div className="t-body-sm" style={{ marginTop: 6, display: "flex", justifyContent: "space-between" }}>
                <span>Keep it short—your goals and focus.</span>
                <span>48/100</span>
              </div>
            </div>
          </div>

          <hr className="divider" style={{ margin: "48px 0" }} />

          <h2 className="section-title" style={{ marginBottom: 32 }}>Account</h2>

          <div style={{ display: "flex", flexDirection: "column", gap: 24, marginBottom: 48 }}>
            <div>
              <label className="text-bold" style={{ display: "block", marginBottom: 8 }}>Current password</label>
              <input type="password" className="input" defaultValue="password123456" />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
              <div>
                <label className="text-bold" style={{ display: "block", marginBottom: 8 }}>New password</label>
                <input type="password" className="input" placeholder="Please enter your password" />
              </div>
              <div>
                <label className="text-bold" style={{ display: "block", marginBottom: 8 }}>Confirm new password</label>
                <input type="password" className="input" placeholder="Please enter your password" />
              </div>
            </div>
          </div>

          <hr className="divider" style={{ margin: "48px 0" }} />

          <h2 className="section-title" style={{ marginBottom: 32 }}>Notifications</h2>

          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 24, borderBottom: "1px solid var(--border-default)" }}>
              <div>
                <div className="text-bold">Test Reminders</div>
                <div className="t-body-sm">Get notified 24 hours before a scheduled test</div>
              </div>
              <label className="switch">
                <input type="checkbox" defaultChecked />
                <span className="switch-track"></span>
              </label>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 24, borderBottom: "1px solid var(--border-default)" }}>
              <div>
                <div className="text-bold">Performance Reports</div>
                <div className="t-body-sm">Receive a weekly email summary of your test scores</div>
              </div>
              <label className="switch">
                <input type="checkbox" defaultChecked />
                <span className="switch-track"></span>
              </label>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 24, borderBottom: "1px solid var(--border-default)" }}>
              <div>
                <div className="text-bold">Doubt Resolution</div>
                <div className="t-body-sm">Get alerts when a teacher answers your doubt</div>
              </div>
              <label className="switch">
                <input type="checkbox" defaultChecked />
                <span className="switch-track"></span>
              </label>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 24, borderBottom: "1px solid var(--border-default)" }}>
              <div>
                <div className="text-bold">System Messages</div>
                <div className="t-body-sm">Important updates about system status or maintenance</div>
              </div>
              <label className="switch">
                <input type="checkbox" />
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

export default function ProfilePage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ProfileContent />
    </Suspense>
  );
}
