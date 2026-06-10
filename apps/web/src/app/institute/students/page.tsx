"use client";

import Navbar from "@/components/layout/Navbar";
import { RiSearchLine, RiFilter3Line } from "@remixicon/react";

const mockStudents = [
  { id: "STU-001", name: "Rahul Sharma", batch: "Class 12 - JEE", score: 85, status: "Active" },
  { id: "STU-002", name: "Priya Singh", batch: "Class 12 - NEET", score: 92, status: "Active" },
  { id: "STU-003", name: "Amit Kumar", batch: "Droppers - JEE", score: 78, status: "Active" },
  { id: "STU-004", name: "Sneha Patel", batch: "Class 11 - JEE", score: 88, status: "Active" },
  { id: "STU-005", name: "Vikram Reddy", batch: "Class 12 - JEE", score: 65, status: "Inactive" },
];

export default function StudentsPage() {
  return (
    <>
      <Navbar title="Students Management" />
      <main style={{ maxWidth: 1200, margin: "0 auto", padding: "var(--space-600)", width: "100%" }}>
        
        <div className="rayum-card" style={{ padding: 24, marginBottom: 24, display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center" }}>
          <div style={{ position: "relative", flex: 1, maxWidth: 400 }}>
            <RiSearchLine size={18} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--fg-muted)" }} />
            <input 
              type="text" 
              placeholder="Search students by name or ID..." 
              className="input-field"
              style={{ width: "100%", paddingLeft: 36 }}
            />
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <button className="btn btn-outline" style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <RiFilter3Line size={18} /> Filter
            </button>
            <button className="btn btn-primary">Add Student</button>
          </div>
        </div>

        <div className="rayum-card" style={{ overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
            <thead>
              <tr style={{ background: "var(--bg-surface)", borderBottom: "1px solid var(--border-default)" }}>
                <th style={{ padding: "16px 24px", color: "var(--fg-muted)", fontWeight: 600, fontSize: 13, textTransform: "uppercase" }}>Student ID</th>
                <th style={{ padding: "16px 24px", color: "var(--fg-muted)", fontWeight: 600, fontSize: 13, textTransform: "uppercase" }}>Name</th>
                <th style={{ padding: "16px 24px", color: "var(--fg-muted)", fontWeight: 600, fontSize: 13, textTransform: "uppercase" }}>Batch</th>
                <th style={{ padding: "16px 24px", color: "var(--fg-muted)", fontWeight: 600, fontSize: 13, textTransform: "uppercase" }}>Avg Score</th>
                <th style={{ padding: "16px 24px", color: "var(--fg-muted)", fontWeight: 600, fontSize: 13, textTransform: "uppercase" }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {mockStudents.map(student => (
                <tr key={student.id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                  <td style={{ padding: "16px 24px", color: "var(--fg-muted)", fontSize: 14 }}>{student.id}</td>
                  <td style={{ padding: "16px 24px", color: "var(--fg-default)", fontWeight: 500, fontSize: 14 }}>{student.name}</td>
                  <td style={{ padding: "16px 24px", color: "var(--fg-default)", fontSize: 14 }}>{student.batch}</td>
                  <td style={{ padding: "16px 24px", color: "var(--fg-default)", fontSize: 14 }}>
                    <span style={{ color: student.score >= 80 ? "var(--success-50)" : student.score >= 60 ? "var(--warning-50)" : "var(--error-50)", fontWeight: 600 }}>
                      {student.score}%
                    </span>
                  </td>
                  <td style={{ padding: "16px 24px" }}>
                    <span className={`rayum-badge ${student.status === "Active" ? "green" : "gray"}`}>
                      {student.status}
                    </span>
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
