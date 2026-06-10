"use client";

import Navbar from "@/components/layout/Navbar";
import { RiSearchLine, RiFilter3Line, RiCustomerService2Fill, RiTimeLine } from "@remixicon/react";

const mockTickets = [
  { id: "TCK-4829", institute: "Vibrant Academy", subject: "API Integration Failing for New Batch", priority: "High", status: "Open", time: "2 hours ago" },
  { id: "TCK-4828", institute: "Allen Career Institute", subject: "Missing Chemistry Questions in Bank", priority: "Medium", status: "In Progress", time: "5 hours ago" },
  { id: "TCK-4827", institute: "Future Point Classes", subject: "Billing issue: Double charged for June", priority: "High", status: "Open", time: "1 day ago" },
  { id: "TCK-4826", institute: "Narayana Group", subject: "Leaderboard not syncing correctly", priority: "Low", status: "Resolved", time: "2 days ago" },
];

export default function SupportPage() {
  return (
    <>
      <Navbar title="Support & Escalations" />
      <main style={{ maxWidth: 1200, margin: "0 auto", padding: "var(--space-600)", width: "100%" }}>
        
        {/* KPI Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24, marginBottom: 32 }}>
          <div className="rayum-card" style={{ padding: 24, display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ padding: 12, background: "rgba(239, 68, 68, 0.1)", borderRadius: "50%", color: "var(--error-50)" }}>
              <RiCustomerService2Fill size={28} />
            </div>
            <div>
              <div className="text-body-small" style={{ color: "var(--fg-muted)", fontWeight: 600, textTransform: "uppercase" }}>Open Escalations</div>
              <div className="text-heading-l" style={{ color: "var(--fg-default)", margin: 0 }}>14</div>
            </div>
          </div>
          <div className="rayum-card" style={{ padding: 24, display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ padding: 12, background: "rgba(245, 158, 11, 0.1)", borderRadius: "50%", color: "var(--warning-50)" }}>
              <RiTimeLine size={28} />
            </div>
            <div>
              <div className="text-body-small" style={{ color: "var(--fg-muted)", fontWeight: 600, textTransform: "uppercase" }}>Avg First Response</div>
              <div className="text-heading-l" style={{ color: "var(--fg-default)", margin: 0 }}>45m</div>
            </div>
          </div>
          <div className="rayum-card" style={{ padding: 24, display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ padding: 12, background: "rgba(34, 197, 94, 0.1)", borderRadius: "50%", color: "var(--success-50)" }}>
              <RiCustomerService2Fill size={28} />
            </div>
            <div>
              <div className="text-body-small" style={{ color: "var(--fg-muted)", fontWeight: 600, textTransform: "uppercase" }}>Resolved This Week</div>
              <div className="text-heading-l" style={{ color: "var(--fg-default)", margin: 0 }}>86</div>
            </div>
          </div>
        </div>

        {/* Tickets Table */}
        <div className="rayum-card" style={{ overflow: "hidden" }}>
          <div style={{ padding: "20px 24px", display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center", borderBottom: "1px solid var(--border-default)" }}>
            <div style={{ position: "relative", flex: 1, maxWidth: 500 }}>
              <RiSearchLine size={18} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--fg-muted)" }} />
              <input 
                type="text" 
                placeholder="Search tickets by ID, Institute, or Subject..." 
                className="input-field"
                style={{ width: "100%", paddingLeft: 36 }}
              />
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              <select className="input-field">
                <option value="">All Priorities</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
              <select className="input-field">
                <option value="">All Statuses</option>
                <option value="Open">Open</option>
                <option value="In Progress">In Progress</option>
                <option value="Resolved">Resolved</option>
              </select>
              <button className="btn btn-outline" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <RiFilter3Line size={18} /> More
              </button>
            </div>
          </div>

          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
            <thead>
              <tr style={{ background: "var(--bg-surface)", borderBottom: "1px solid var(--border-default)" }}>
                <th style={{ padding: "16px 24px", color: "var(--fg-muted)", fontWeight: 600, fontSize: 13, textTransform: "uppercase" }}>Ticket ID</th>
                <th style={{ padding: "16px 24px", color: "var(--fg-muted)", fontWeight: 600, fontSize: 13, textTransform: "uppercase" }}>Institute</th>
                <th style={{ padding: "16px 24px", color: "var(--fg-muted)", fontWeight: 600, fontSize: 13, textTransform: "uppercase" }}>Subject</th>
                <th style={{ padding: "16px 24px", color: "var(--fg-muted)", fontWeight: 600, fontSize: 13, textTransform: "uppercase" }}>Priority</th>
                <th style={{ padding: "16px 24px", color: "var(--fg-muted)", fontWeight: 600, fontSize: 13, textTransform: "uppercase" }}>Status</th>
                <th style={{ padding: "16px 24px", color: "var(--fg-muted)", fontWeight: 600, fontSize: 13, textTransform: "uppercase", textAlign: "right" }}>Opened</th>
              </tr>
            </thead>
            <tbody>
              {mockTickets.map(ticket => (
                <tr key={ticket.id} style={{ borderBottom: "1px solid var(--border-subtle)", cursor: "pointer", transition: "background 0.2s" }} className="hover-bg-neutral-10">
                  <td style={{ padding: "16px 24px", color: "var(--primary-50)", fontWeight: 600, fontSize: 14 }}>{ticket.id}</td>
                  <td style={{ padding: "16px 24px", color: "var(--fg-default)", fontWeight: 500, fontSize: 14 }}>{ticket.institute}</td>
                  <td style={{ padding: "16px 24px", color: "var(--fg-default)", fontSize: 14 }}>{ticket.subject}</td>
                  <td style={{ padding: "16px 24px" }}>
                    <span className={`rayum-badge ${ticket.priority === "High" ? "red" : ticket.priority === "Medium" ? "orange" : "gray"}`}>
                      {ticket.priority}
                    </span>
                  </td>
                  <td style={{ padding: "16px 24px" }}>
                    <span className={`rayum-badge ${ticket.status === "Open" ? "blue" : ticket.status === "In Progress" ? "orange" : "green"}`}>
                      {ticket.status}
                    </span>
                  </td>
                  <td style={{ padding: "16px 24px", color: "var(--fg-muted)", fontSize: 14, textAlign: "right" }}>{ticket.time}</td>
                </tr>
              ))}
            </tbody>
          </table>
          
          <div style={{ padding: "16px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--bg-surface)" }}>
            <span className="text-body-small" style={{ color: "var(--fg-muted)" }}>Showing 1 to 4 of 42 tickets</span>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn btn-outline" disabled style={{ padding: "4px 12px", fontSize: 12 }}>Previous</button>
              <button className="btn btn-outline" style={{ padding: "4px 12px", fontSize: 12 }}>Next</button>
            </div>
          </div>
        </div>

      </main>
    </>
  );
}
