"use client";

import Navbar from "@/components/layout/Navbar";
import { useState } from "react";
import { RiCheckLine, RiReplyFill } from "@remixicon/react";

const mockPendingDoubts = [
  { id: 1, student: "Rahul Verma", batch: "Aakash Target 2026", text: "Can someone explain the exceptions to the Octet rule for expanding valence shells?", subject: "Chemistry", time: "2 hours ago" },
  { id: 2, student: "Priya Sharma", batch: "Aakash Target 2026", text: "In Q14 of the mock test, why didn't we consider the pseudo force? The frame was accelerating.", subject: "Physics", time: "5 hours ago" }
];

export default function TeacherDoubtsPage() {
  const [replyingTo, setReplyingTo] = useState<number | null>(null);

  return (
    <>
      <Navbar title="Resolve Doubts" />
      <main style={{ maxWidth: 1000, margin: "0 auto", padding: "var(--space-600)", width: "100%" }}>
        
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h2 className="text-heading-m" style={{ color: "var(--fg-default)", margin: 0 }}>Pending Doubts (Your Batches)</h2>
          <div style={{ display: "flex", gap: 12 }}>
            <select className="input-field">
              <option>All Batches</option>
              <option>Aakash Target 2026</option>
            </select>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {mockPendingDoubts.map(doubt => (
            <div key={doubt.id} className="rayum-card" style={{ padding: 24, borderLeft: "4px solid var(--warning-50)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div>
                  <div style={{ fontWeight: 600, color: "var(--fg-default)" }}>{doubt.student}</div>
                  <div style={{ fontSize: 12, color: "var(--fg-muted)" }}>{doubt.batch} • {doubt.time}</div>
                </div>
                <span className={`rayum-badge ${doubt.subject === 'Physics' ? 'blue' : 'orange'}`}>{doubt.subject}</span>
              </div>
              
              <p className="text-body" style={{ color: "var(--fg-default)", marginBottom: 24, padding: 16, background: "var(--bg-body)", borderRadius: 8 }}>
                "{doubt.text}"
              </p>

              {replyingTo === doubt.id ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <textarea 
                    className="input-field" 
                    placeholder="Type your explanation here..." 
                    style={{ minHeight: 100, resize: "vertical" }}
                  />
                  <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
                    <button className="btn btn-ghost" onClick={() => setReplyingTo(null)}>Cancel</button>
                    <button className="btn btn-primary" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <RiCheckLine size={18} /> Resolve Doubt
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <button className="btn btn-outline" style={{ display: "flex", alignItems: "center", gap: 8 }} onClick={() => setReplyingTo(doubt.id)}>
                    <RiReplyFill size={18} /> Reply
                  </button>
                </div>
              )}
            </div>
          ))}
          
          {mockPendingDoubts.length === 0 && (
            <div style={{ textAlign: "center", padding: 48, color: "var(--fg-muted)" }}>
              All caught up! No pending doubts.
            </div>
          )}
        </div>

      </main>
    </>
  );
}
