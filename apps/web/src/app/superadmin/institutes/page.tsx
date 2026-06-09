"use client";

import Link from "next/link";
import { 
  RiBuilding4Line,
  RiAddLine,
  RiSearchLine,
  RiMoreFill,
  RiMailSendLine,
  RiSettings4Line
} from "@remixicon/react";
import { mockInstitutesList } from "../../../lib/mock-data";

export default function InstitutesCRMPage() {
  return (
    <div style={{ maxWidth: 1200, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: "var(--fg-default)", marginBottom: 4 }}>
              Institute Clients CRM
            </h1>
            <p className="text-body">Onboard new institutes, manage subscriptions, and monitor usage.</p>
          </div>
          <button className="btn btn-primary" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <RiAddLine size={18} /> Onboard Institute
          </button>
        </div>
      </div>

      <div className="rayum-card">
        {/* Toolbar */}
        <div style={{ display: "flex", gap: 16, marginBottom: 24 }}>
          <div className="input-field" style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
            <RiSearchLine size={18} color="var(--fg-muted)" />
            <input 
              type="text" 
              placeholder="Search by institute name, ID, or admin email..." 
              style={{ border: "none", background: "transparent", outline: "none", width: "100%", fontSize: 14 }}
            />
          </div>
        </div>

        {/* Institutes Table */}
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border-default)", textAlign: "left", color: "var(--fg-muted)", fontSize: 13 }}>
              <th style={{ paddingBottom: 12, paddingLeft: 16 }}>Institute Name</th>
              <th style={{ paddingBottom: 12 }}>Joined</th>
              <th style={{ paddingBottom: 12 }}>Plan</th>
              <th style={{ paddingBottom: 12 }}>Usage (Students/Batches)</th>
              <th style={{ paddingBottom: 12 }}>Status</th>
              <th style={{ paddingBottom: 12, paddingRight: 16, textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {mockInstitutesList.map(inst => (
              <tr key={inst.id} style={{ borderBottom: "1px solid var(--neutral-10)", transition: "background 0.2s" }} className="hover-bg-neutral">
                <td style={{ padding: "16px", fontWeight: 600 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 36, height: 36, background: "var(--neutral-10)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--fg-muted)" }}>
                      <RiBuilding4Line size={18} />
                    </div>
                    <div>
                      <div>{inst.name}</div>
                      <div style={{ fontSize: 12, color: "var(--fg-muted)", fontWeight: 400, marginTop: 4 }}>ID: {inst.id}</div>
                    </div>
                  </div>
                </td>
                <td style={{ padding: "16px 0", color: "var(--fg-muted)", fontSize: 13 }}>{new Date(inst.joined).toLocaleDateString()}</td>
                <td style={{ padding: "16px 0", fontWeight: 600 }}>{inst.plan}</td>
                <td style={{ padding: "16px 0", color: "var(--fg-muted)", fontSize: 13 }}>
                  {inst.students.toLocaleString()} / {inst.batches}
                </td>
                <td style={{ padding: "16px 0" }}>
                  <span className={`rayum-badge ${inst.status === 'active' ? 'green' : inst.status === 'expiring' ? 'yellow' : 'red'}`}>
                    {inst.status === 'active' ? 'Active' : inst.status === 'expiring' ? 'Expiring Soon' : 'Suspended'}
                  </span>
                </td>
                <td style={{ padding: "16px 16px 16px 0", textAlign: "right" }}>
                  <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                    <button style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--fg-muted)" }} title="Send Notice">
                      <RiMailSendLine size={18} />
                    </button>
                    <button style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--fg-muted)" }} title="Manage Settings">
                      <RiSettings4Line size={18} />
                    </button>
                    <button style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--fg-muted)" }}>
                      <RiMoreFill size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

      </div>
    </div>
  );
}
