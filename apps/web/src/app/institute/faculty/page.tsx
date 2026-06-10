"use client";

import Navbar from "@/components/layout/Navbar";
import { RiAddLine, RiMoreFill, RiUserStarLine, RiSearchLine } from "@remixicon/react";

const mockFaculty = [
  { id: "FAC-001", name: "Aman Sir", subject: "Physics", role: "Senior Faculty", batches: 4, rating: 4.8 },
  { id: "FAC-002", name: "Priya Madam", subject: "Chemistry", role: "Faculty", batches: 3, rating: 4.5 },
  { id: "FAC-003", name: "Rajesh Sir", subject: "Mathematics", role: "HOD", batches: 2, rating: 4.9 },
  { id: "FAC-004", name: "Sneha Miss", subject: "Biology", role: "Junior Faculty", batches: 5, rating: 4.2 }
];

export default function InstituteFacultyPage() {
  return (
    <>
      <Navbar title="Faculty Management" />
      <main style={{ maxWidth: 1200, margin: "0 auto", padding: "var(--space-600)", width: "100%" }}>
        
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
          <div style={{ position: "relative", width: 400 }}>
            <RiSearchLine size={18} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--fg-muted)" }} />
            <input 
              type="text" 
              placeholder="Search faculty by name or subject..." 
              className="input-field"
              style={{ width: "100%", paddingLeft: 36 }}
            />
          </div>
          <button className="btn btn-primary" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <RiAddLine size={18} /> Add New Faculty
          </button>
        </div>

        <div className="rayum-card" style={{ overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
            <thead>
              <tr style={{ background: "var(--bg-surface)", borderBottom: "1px solid var(--border-default)" }}>
                <th style={{ padding: "16px 24px", color: "var(--fg-muted)", fontWeight: 600, fontSize: 13, textTransform: "uppercase" }}>Name</th>
                <th style={{ padding: "16px 24px", color: "var(--fg-muted)", fontWeight: 600, fontSize: 13, textTransform: "uppercase" }}>Subject</th>
                <th style={{ padding: "16px 24px", color: "var(--fg-muted)", fontWeight: 600, fontSize: 13, textTransform: "uppercase" }}>Role</th>
                <th style={{ padding: "16px 24px", color: "var(--fg-muted)", fontWeight: 600, fontSize: 13, textTransform: "uppercase" }}>Active Batches</th>
                <th style={{ padding: "16px 24px", color: "var(--fg-muted)", fontWeight: 600, fontSize: 13, textTransform: "uppercase" }}>Student Rating</th>
                <th style={{ padding: "16px 24px" }}></th>
              </tr>
            </thead>
            <tbody>
              {mockFaculty.map(faculty => (
                <tr key={faculty.id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                  <td style={{ padding: "16px 24px", color: "var(--fg-default)", fontWeight: 600, display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--neutral-10)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--fg-muted)" }}>
                      <RiUserStarLine size={16} />
                    </div>
                    {faculty.name}
                  </td>
                  <td style={{ padding: "16px 24px" }}>
                    <span className={`rayum-badge ${faculty.subject === 'Physics' ? 'blue' : faculty.subject === 'Chemistry' ? 'orange' : faculty.subject === 'Mathematics' ? 'purple' : 'green'}`}>
                      {faculty.subject}
                    </span>
                  </td>
                  <td style={{ padding: "16px 24px", color: "var(--fg-muted)", fontSize: 14 }}>{faculty.role}</td>
                  <td style={{ padding: "16px 24px", color: "var(--fg-default)", fontWeight: 500 }}>{faculty.batches}</td>
                  <td style={{ padding: "16px 24px", color: "var(--success-50)", fontWeight: 600 }}>★ {faculty.rating}</td>
                  <td style={{ padding: "16px 24px", textAlign: "right" }}>
                    <button className="btn btn-ghost" style={{ padding: "4px 8px" }}>
                      <RiMoreFill size={18} />
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
