"use client";

import Navbar from "@/components/layout/Navbar";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { RiCheckFill } from "@remixicon/react";

function ProfileContent() {
  const searchParams = useSearchParams();
  const role = searchParams.get("role") || "student";

  // Data
  const data = {
    name: "William Donat",
    email: "william.donat@rayum.app",
    job: "Ecommerce Operations Lead",
    country: "United Kingdom",
    phone: "+44 7700 900123",
    bio: "Ops & CX lead. Focus on retention, AOV and on-time delivery.",
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
              <label className="text-bold" style={{ display: "block", marginBottom: 8 }}>Job title</label>
              <input type="text" className="input" defaultValue={data.job} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
              <div>
                <label className="text-bold" style={{ display: "block", marginBottom: 8 }}>Country</label>
                <div className="search-bar" style={{ padding: "10px 14px", borderRadius: "var(--r-full)" }}>
                   <input type="text" defaultValue={data.country} readOnly />
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
                <span>Keep it short—scope and key metrics.</span>
                <span>60/100</span>
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
                <div className="text-bold">Order Updates</div>
                <div className="t-body-sm">Get notified when an order is placed, updated or cancelled</div>
              </div>
              <label className="switch">
                <input type="checkbox" />
                <span className="switch-track"></span>
              </label>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 24, borderBottom: "1px solid var(--border-default)" }}>
              <div>
                <div className="text-bold">Payment Alerts</div>
                <div className="t-body-sm">Be informed when a payment is received or fails</div>
              </div>
              <label className="switch">
                <input type="checkbox" defaultChecked />
                <span className="switch-track"></span>
              </label>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 24, borderBottom: "1px solid var(--border-default)" }}>
              <div>
                <div className="text-bold">Inventory Warnings</div>
                <div className="t-body-sm">Receive alerts when stock levels are low</div>
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
            <button className="btn btn-dark">Save Changes</button>
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
