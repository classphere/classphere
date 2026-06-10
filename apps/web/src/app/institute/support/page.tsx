"use client";

import Navbar from "@/components/layout/Navbar";
import { useState } from "react";
import { RiAddLine, RiTicketLine, RiTimeLine, RiCheckDoubleLine } from "@remixicon/react";

const mockTickets = [
  { id: "TCK-4829", subject: "API Integration Failing for New Batch", priority: "High", status: "Open", time: "2 hours ago" },
  { id: "TCK-4712", subject: "Requesting additional 500 student capacity", priority: "Medium", status: "Resolved", time: "1 week ago" }
];

export default function InstituteSupportPage() {
  const [showNewTicket, setShowNewTicket] = useState(false);

  return (
    <>
      <Navbar title="Platform Support & Helpdesk" />
      <main style={{ maxWidth: 1000, margin: "0 auto", padding: "var(--space-600)", width: "100%" }}>
        
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
          <p className="text-body" style={{ color: "var(--fg-muted)", maxWidth: 600 }}>
            Facing technical issues or need to discuss your billing plan? Open a ticket to communicate directly with the ExamPrep Super Admin team.
          </p>
          <button className="btn btn-primary" style={{ display: "flex", alignItems: "center", gap: 8 }} onClick={() => setShowNewTicket(!showNewTicket)}>
            <RiAddLine size={18} /> {showNewTicket ? "Cancel Ticket" : "Create New Ticket"}
          </button>
        </div>

        {showNewTicket && (
          <div className="rayum-card" style={{ padding: 32, marginBottom: 32, borderTop: "4px solid var(--primary-50)" }}>
            <h2 className="text-heading-s" style={{ color: "var(--fg-default)", marginBottom: 24 }}>Submit a Request</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label className="text-body-small" style={{ fontWeight: 600, display: "block", marginBottom: 8 }}>Issue Type</label>
                <select className="input-field" style={{ width: "100%", maxWidth: 300 }}>
                  <option>Technical Support</option>
                  <option>Billing & Upgrades</option>
                  <option>Feature Request</option>
                  <option>Other</option>
                </select>
              </div>
              <div>
                <label className="text-body-small" style={{ fontWeight: 600, display: "block", marginBottom: 8 }}>Subject</label>
                <input type="text" className="input-field" placeholder="Brief summary of the issue..." style={{ width: "100%" }} />
              </div>
              <div>
                <label className="text-body-small" style={{ fontWeight: 600, display: "block", marginBottom: 8 }}>Description</label>
                <textarea className="input-field" placeholder="Please provide as much detail as possible..." style={{ width: "100%", minHeight: 120, resize: "vertical" }} />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
                <button className="btn btn-primary" onClick={() => setShowNewTicket(false)}>Submit Ticket</button>
              </div>
            </div>
          </div>
        )}

        <h2 className="text-heading-m" style={{ color: "var(--fg-default)", marginBottom: 16 }}>Your Tickets</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {mockTickets.map(ticket => (
            <div key={ticket.id} className="rayum-card hover-bg-neutral-10" style={{ padding: 24, display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", transition: "background 0.2s" }} onClick={() => {}}>
              <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
                <div style={{ padding: 10, background: ticket.status === "Open" ? "rgba(59, 130, 246, 0.1)" : "rgba(34, 197, 94, 0.1)", borderRadius: 8, color: ticket.status === "Open" ? "var(--primary-50)" : "var(--success-50)" }}>
                  <RiTicketLine size={24} />
                </div>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
                    <span className="text-body-large" style={{ fontWeight: 600, color: "var(--fg-default)" }}>{ticket.subject}</span>
                    <span className={`rayum-badge ${ticket.status === 'Open' ? 'blue' : 'green'}`} style={{ fontSize: 10 }}>{ticket.status}</span>
                  </div>
                  <div className="text-body-small" style={{ color: "var(--fg-muted)", display: "flex", alignItems: "center", gap: 8 }}>
                    <span>{ticket.id}</span> • 
                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}><RiTimeLine size={14} /> Updated {ticket.time}</span>
                  </div>
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <span className={`rayum-badge ${ticket.priority === 'High' ? 'red' : 'gray'}`}>{ticket.priority} Priority</span>
              </div>
            </div>
          ))}
        </div>

      </main>
    </>
  );
}
