"use client";

import Navbar from "@/components/layout/Navbar";
import { RiUserStarFill, RiEdit2Line, RiMailLine, RiPhoneLine, RiMapPinLine } from "@remixicon/react";

export default function ProfilePage() {
  return (
    <>
      <Navbar title="My Profile" />
      <main style={{ maxWidth: 800, margin: "0 auto", padding: "var(--space-600)", width: "100%" }}>
        
        {/* Profile Header */}
        <div className="rayum-card" style={{ padding: 32, marginBottom: 24, textAlign: "center", position: "relative" }}>
          <button className="btn btn-ghost" style={{ position: "absolute", top: 16, right: 16, padding: 8 }}>
            <RiEdit2Line size={20} />
          </button>
          
          <div style={{ 
            width: 96, 
            height: 96, 
            borderRadius: "50%", 
            background: "var(--primary-10)", 
            color: "var(--primary-50)", 
            display: "flex", 
            alignItems: "center", 
            justifyContent: "center",
            margin: "0 auto 16px"
          }}>
            <RiUserStarFill size={48} />
          </div>
          <h2 className="text-heading-m" style={{ color: "var(--fg-default)", marginBottom: 4 }}>Arjun Patel</h2>
          <div className="text-body-large" style={{ color: "var(--fg-muted)", marginBottom: 12 }}>Class 12 - JEE Advanced Batch</div>
          <div className="rayum-badge blue" style={{ display: "inline-flex" }}>Student</div>
        </div>

        {/* Profile Details */}
        <div className="rayum-card" style={{ padding: 32 }}>
          <h3 className="text-heading-s" style={{ color: "var(--fg-default)", marginBottom: 24 }}>Contact Information</h3>
          
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ width: 40, height: 40, borderRadius: "50%", background: "var(--bg-body)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--fg-muted)" }}>
                <RiMailLine size={20} />
              </div>
              <div>
                <div className="text-body-small" style={{ color: "var(--fg-muted)" }}>Email Address</div>
                <div className="text-body-large" style={{ color: "var(--fg-default)", fontWeight: 500 }}>arjun.patel@example.com</div>
              </div>
            </div>
            
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ width: 40, height: 40, borderRadius: "50%", background: "var(--bg-body)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--fg-muted)" }}>
                <RiPhoneLine size={20} />
              </div>
              <div>
                <div className="text-body-small" style={{ color: "var(--fg-muted)" }}>Phone Number</div>
                <div className="text-body-large" style={{ color: "var(--fg-default)", fontWeight: 500 }}>+91 98765 43210</div>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ width: 40, height: 40, borderRadius: "50%", background: "var(--bg-body)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--fg-muted)" }}>
                <RiMapPinLine size={20} />
              </div>
              <div>
                <div className="text-body-small" style={{ color: "var(--fg-muted)" }}>Address</div>
                <div className="text-body-large" style={{ color: "var(--fg-default)", fontWeight: 500 }}>123, Scholars Lane, Mumbai</div>
              </div>
            </div>
          </div>
        </div>

      </main>
    </>
  );
}
