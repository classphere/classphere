"use client";

import Navbar from "@/components/layout/Navbar";
import { RiBuilding4Line, RiMore2Fill, RiSearchLine, RiFilter3Line } from "@remixicon/react";

const mockInstitutes = [
  { id: "INST-001", name: "Allen Career Institute", location: "Kota, RJ", students: 12450, plan: "Enterprise", status: "Active" },
  { id: "INST-002", name: "Resonance Eduventures", location: "Kota, RJ", students: 8200, plan: "Enterprise", status: "Active" },
  { id: "INST-003", name: "Vibrant Academy", location: "Mumbai, MH", students: 3400, plan: "Pro", status: "Active" },
  { id: "INST-004", name: "Narayana Group", location: "Hyderabad, TS", students: 15600, plan: "Enterprise", status: "Active" },
  { id: "INST-005", name: "Sri Chaitanya", location: "Vijayawada, AP", students: 14200, plan: "Enterprise", status: "Active" },
  { id: "INST-006", name: "Aakash Institute", location: "Delhi, DL", students: 9800, plan: "Enterprise", status: "Active" },
  { id: "INST-007", name: "Fitjee", location: "Delhi, DL", students: 6500, plan: "Pro", status: "Active" },
  { id: "INST-008", name: "Bansal Classes", location: "Kota, RJ", students: 2100, plan: "Basic", status: "Inactive" },
];

export default function InstitutesPage() {
  return (
    <>
      <Navbar title="Institutes CRM" />
      <main style={{ maxWidth: 1200, margin: "0 auto", padding: "var(--space-600)", width: "100%" }}>
        
        {/* KPI Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 24, marginBottom: 24 }}>
          <div className="rayum-card" style={{ padding: 24 }}>
            <div className="text-body-small" style={{ color: "var(--fg-muted)", marginBottom: 8 }}>Total Institutes</div>
            <div className="text-heading-l" style={{ color: "var(--fg-default)" }}>42</div>
          </div>
          <div className="rayum-card" style={{ padding: 24 }}>
            <div className="text-body-small" style={{ color: "var(--fg-muted)", marginBottom: 8 }}>Active Students</div>
            <div className="text-heading-l" style={{ color: "var(--fg-default)" }}>72.3K</div>
          </div>
          <div className="rayum-card" style={{ padding: 24 }}>
            <div className="text-body-small" style={{ color: "var(--fg-muted)", marginBottom: 8 }}>Enterprise Plans</div>
            <div className="text-heading-l" style={{ color: "var(--primary-50)" }}>18</div>
          </div>
          <div className="rayum-card" style={{ padding: 24 }}>
            <div className="text-body-small" style={{ color: "var(--fg-muted)", marginBottom: 8 }}>MRR</div>
            <div className="text-heading-l" style={{ color: "var(--success-50)" }}>$124K</div>
          </div>
        </div>

        <div className="rayum-card" style={{ padding: 24, marginBottom: 24, display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center" }}>
          <div style={{ position: "relative", flex: 1, maxWidth: 400 }}>
            <RiSearchLine size={18} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--fg-muted)" }} />
            <input 
              type="text" 
              placeholder="Search institutes by name or ID..." 
              className="input-field"
              style={{ width: "100%", paddingLeft: 36 }}
            />
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <button className="btn btn-outline" style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <RiFilter3Line size={18} /> Filter
            </button>
            <button className="btn btn-primary">Onboard Institute</button>
          </div>
        </div>

        <div className="rayum-card" style={{ overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
            <thead>
              <tr style={{ background: "var(--bg-surface)", borderBottom: "1px solid var(--border-default)" }}>
                <th style={{ padding: "16px 24px", color: "var(--fg-muted)", fontWeight: 600, fontSize: 13, textTransform: "uppercase" }}>Institute</th>
                <th style={{ padding: "16px 24px", color: "var(--fg-muted)", fontWeight: 600, fontSize: 13, textTransform: "uppercase" }}>Location</th>
                <th style={{ padding: "16px 24px", color: "var(--fg-muted)", fontWeight: 600, fontSize: 13, textTransform: "uppercase" }}>Students</th>
                <th style={{ padding: "16px 24px", color: "var(--fg-muted)", fontWeight: 600, fontSize: 13, textTransform: "uppercase" }}>Plan</th>
                <th style={{ padding: "16px 24px", color: "var(--fg-muted)", fontWeight: 600, fontSize: 13, textTransform: "uppercase" }}>Status</th>
                <th style={{ padding: "16px 24px", color: "var(--fg-muted)", fontWeight: 600, fontSize: 13, textTransform: "uppercase", textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {mockInstitutes.map(institute => (
                <tr key={institute.id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                  <td style={{ padding: "16px 24px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ width: 32, height: 32, borderRadius: "8px", background: "var(--primary-10)", color: "var(--primary-50)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <RiBuilding4Line size={16} />
                      </div>
                      <div>
                        <div className="text-body-large" style={{ fontWeight: 600, color: "var(--fg-default)" }}>{institute.name}</div>
                        <div className="text-body-small" style={{ color: "var(--fg-muted)" }}>{institute.id}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: "16px 24px", color: "var(--fg-default)", fontSize: 14 }}>{institute.location}</td>
                  <td style={{ padding: "16px 24px", color: "var(--fg-default)", fontSize: 14 }}>{institute.students.toLocaleString()}</td>
                  <td style={{ padding: "16px 24px" }}>
                    <span className={`rayum-badge ${institute.plan === "Enterprise" ? "purple" : institute.plan === "Pro" ? "blue" : "gray"}`}>
                      {institute.plan}
                    </span>
                  </td>
                  <td style={{ padding: "16px 24px" }}>
                    <span className={`rayum-badge ${institute.status === "Active" ? "green" : "red"}`}>
                      {institute.status}
                    </span>
                  </td>
                  <td style={{ padding: "16px 24px", textAlign: "right" }}>
                    <button className="btn btn-ghost" style={{ padding: 4 }}>
                      <RiMore2Fill size={20} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </main>
    </>
  );
}
