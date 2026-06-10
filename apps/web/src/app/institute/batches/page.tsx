"use client";

import Navbar from "@/components/layout/Navbar";
import { RiMore2Fill, RiTeamFill, RiAddLine } from "@remixicon/react";

const mockBatches = [
  { id: 1, name: "Class 11 - JEE Advanced", students: 45, teachers: 3, status: "Active" },
  { id: 2, name: "Class 12 - NEET", students: 60, teachers: 4, status: "Active" },
  { id: 3, name: "Droppers - JEE Mains", students: 120, teachers: 5, status: "Active" },
  { id: 4, name: "Class 10 - Foundation", students: 30, teachers: 2, status: "Upcoming" },
];

export default function BatchesPage() {
  return (
    <>
      <Navbar title="Manage Batches" />
      <main style={{ maxWidth: 1000, margin: "0 auto", padding: "var(--space-600)", width: "100%" }}>
        
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h2 className="text-heading-m" style={{ color: "var(--fg-default)" }}>All Batches</h2>
          <button className="btn btn-primary" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <RiAddLine size={18} /> Create Batch
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 24 }}>
          {mockBatches.map(batch => (
            <div key={batch.id} className="rayum-card" style={{ padding: 24 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: "8px", background: "var(--primary-10)", color: "var(--primary-50)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <RiTeamFill size={20} />
                  </div>
                  <div>
                    <div className="text-body-large" style={{ fontWeight: 600, color: "var(--fg-default)" }}>{batch.name}</div>
                    <div className="rayum-badge green" style={{ marginTop: 4 }}>{batch.status}</div>
                  </div>
                </div>
                <button className="btn btn-ghost" style={{ padding: 4 }}>
                  <RiMore2Fill size={20} />
                </button>
              </div>
              
              <div style={{ display: "flex", gap: 24, borderTop: "1px solid var(--border-subtle)", paddingTop: 16, marginTop: 16 }}>
                <div>
                  <div className="text-body-small" style={{ color: "var(--fg-muted)" }}>Students</div>
                  <div className="text-heading-s" style={{ color: "var(--fg-default)" }}>{batch.students}</div>
                </div>
                <div>
                  <div className="text-body-small" style={{ color: "var(--fg-muted)" }}>Teachers</div>
                  <div className="text-heading-s" style={{ color: "var(--fg-default)" }}>{batch.teachers}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

      </main>
    </>
  );
}
