"use client";

import Navbar from "@/components/layout/Navbar";
import { RiBuilding4Line, RiMore2Fill, RiSearchLine, RiFilter3Line, RiArrowDownSLine } from "@remixicon/react";

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
      <Navbar title="Institutes CRM" subtitle="Manage your partner database and enterprise clients." />
      <main style={{ maxWidth: 1200, margin: "0 auto", padding: "0 32px 32px 32px", width: "100%" }}>
        
        {/* KPI Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 24, marginBottom: 40 }}>
          <div className="rayum-card" style={{ padding: 24 }}>
            <div className="t-label" style={{ marginBottom: 12 }}>Total Institutes</div>
            <div style={{ fontSize: 36, fontWeight: 800, color: "var(--fg-default)", letterSpacing: "-0.02em" }}>42</div>
          </div>
          <div className="rayum-card" style={{ padding: 24 }}>
            <div className="t-label" style={{ marginBottom: 12 }}>Active Students</div>
            <div style={{ fontSize: 36, fontWeight: 800, color: "var(--fg-default)", letterSpacing: "-0.02em" }}>72.3K</div>
          </div>
          <div className="rayum-card" style={{ padding: 24 }}>
            <div className="t-label" style={{ marginBottom: 12 }}>Enterprise Plans</div>
            <div style={{ fontSize: 36, fontWeight: 800, color: "var(--p-50)", letterSpacing: "-0.02em" }}>18</div>
          </div>
          <div className="rayum-card" style={{ padding: 24 }}>
            <div className="t-label" style={{ marginBottom: 12 }}>MRR</div>
            <div style={{ fontSize: 36, fontWeight: 800, color: "var(--s-50)", letterSpacing: "-0.02em" }}>$124K</div>
          </div>
        </div>

        {/* Data Table */}
        <div className="rayum-card" style={{ padding: "24px 0", overflow: "hidden" }}>
          
          {/* Table Header Controls */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 24px", marginBottom: 24 }}>
            <div className="search-bar" style={{ width: 320 }}>
              <RiSearchLine size={18} />
              <input type="text" placeholder="Search" />
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              <button className="btn btn-outline" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                Filter by <RiFilter3Line size={16} />
              </button>
              <button className="btn btn-outline" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                Sort by <RiFilter3Line size={16} />
              </button>
              <button className="btn btn-outline" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <RiBuilding4Line size={16} /> New
              </button>
            </div>
          </div>

          {/* Table */}
          <div style={{ overflowX: "auto" }}>
            <table className="rayum-table">
              <thead>
                <tr style={{ background: "var(--n-10)", borderTop: "1px solid var(--border-default)" }}>
                  <th style={{ paddingLeft: 24 }}>Institute</th>
                  <th>Location</th>
                  <th>Students</th>
                  <th>Plan</th>
                  <th>Status</th>
                  <th style={{ textAlign: "right", paddingRight: 24 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {mockInstitutes.map(institute => (
                  <tr key={institute.id}>
                    <td style={{ paddingLeft: 24 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                        <div className="avatar avatar-md" style={{ background: "var(--n-20)", color: "var(--n-60)" }}>
                          {institute.name.charAt(0)}
                        </div>
                        <div>
                          <div className="text-bold" style={{ color: "var(--fg-default)" }}>{institute.name}</div>
                          <div className="t-body-sm">{institute.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="t-body-sm">{institute.location}</td>
                    <td className="t-body-sm text-bold">{institute.students.toLocaleString()}</td>
                    <td>
                      <span className={`badge ${institute.plan === "Enterprise" ? "badge-blue" : institute.plan === "Pro" ? "badge-gray" : "badge-orange"}`}>
                        {institute.plan}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${institute.status === "Active" ? "badge-green" : "badge-red"}`}>
                        {institute.status}
                      </span>
                    </td>
                    <td style={{ textAlign: "right", paddingRight: 24 }}>
                      <button className="btn btn-ghost" style={{ padding: 4 }}>
                        <RiMore2Fill size={20} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "24px 24px 0 24px", borderTop: "1px solid var(--border-default)" }}>
            <div className="t-body-sm">
              <span className="text-bold">8</span> institutes selected
            </div>
            <div className="pagination">
              <button className="page-btn page-btn-arrow">&lt;</button>
              <button className="page-btn">1</button>
              <button className="page-btn active">2</button>
              <button className="page-btn">3</button>
              <span style={{ margin: "0 8px", color: "var(--fg-muted)" }}>...</span>
              <button className="page-btn">10</button>
              <button className="page-btn page-btn-arrow">&gt;</button>
              <div className="t-body-sm" style={{ marginLeft: 16, marginRight: 16 }}>10-20 of 200 items</div>
              <div className="search-bar" style={{ padding: "6px 12px" }}>
                <span>Items per page: 10</span> <RiArrowDownSLine size={16} />
              </div>
            </div>
          </div>

        </div>

      </main>
    </>
  );
}
