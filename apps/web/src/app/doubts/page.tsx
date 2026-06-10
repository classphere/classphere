"use client";

import Navbar from "@/components/layout/Navbar";
import { useState } from "react";
import { RiImageAddLine, RiSendPlaneFill, RiCheckDoubleLine, RiTimeLine, RiSparklingFill } from "@remixicon/react";

const mockDoubts = [
  { id: 1, text: "Sir, I didn't understand how you applied the Work-Energy Theorem in step 3 here. Shouldn't friction be negative?", subject: "Physics", status: "Resolved", teacher: "Aman Sir", response: "Great question! Friction is indeed negative work. In step 3, we moved it to the other side of the equation which is why it appeared positive. Keep up the good work!", date: "Yesterday" },
  { id: 2, text: "Can someone explain the exceptions to the Octet rule for expanding valence shells?", subject: "Chemistry", status: "Pending", teacher: "Unassigned", response: null, date: "2 hours ago" }
];

export default function StudentDoubtsPage() {
  const [doubtText, setDoubtText] = useState("");
  const [subject, setSubject] = useState("");

  return (
    <>
      <Navbar title="Ask a Doubt" subtitle="Get expert help within 24 hours" breadcrumbs="Dashboard > Ask a Doubt" />
      <main style={{ maxWidth: 840, margin: "0 auto", padding: "0 32px 64px 32px", width: "100%" }}>
        
        {/* Ask a Doubt Input Form */}
        <div className="rayum-card" style={{ padding: 40, marginBottom: 48, background: "var(--bg-surface)", position: "relative", overflow: "hidden" }}>
          
          {/* Subtle decorative glow */}
          <div style={{ position: "absolute", top: -100, right: -100, width: 300, height: 300, background: "radial-gradient(circle, rgba(74, 222, 128, 0.1) 0%, transparent 70%)", borderRadius: "50%", pointerEvents: "none" }} />

          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
            <div style={{ width: 32, height: 32, borderRadius: "var(--r-full)", background: "var(--n-10)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--n-60)" }}>
              <RiSparklingFill size={16} />
            </div>
            <h2 className="section-title" style={{ margin: 0, fontSize: 20 }}>Submit a New Doubt</h2>
          </div>
          <p className="t-body-sm" style={{ marginBottom: 32, maxWidth: "90%" }}>Stuck on a concept? Upload a photo of the question or type it out. Our faculty will resolve it with detailed explanations.</p>
          
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ display: "flex", gap: 16 }}>
              <select className="input" style={{ width: 240, appearance: "none", cursor: "pointer", backgroundImage: `url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%2371717a%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 16px center", backgroundSize: "10px auto" }} value={subject} onChange={e => setSubject(e.target.value)}>
                <option value="" disabled>Select Subject...</option>
                <option>Physics</option>
                <option>Chemistry</option>
                <option>Mathematics</option>
              </select>
            </div>
            
            <textarea 
              className="input" 
              placeholder="Type your question or explain where you got stuck..." 
              style={{ minHeight: 140, resize: "vertical", padding: 20 }}
              value={doubtText}
              onChange={(e) => setDoubtText(e.target.value)}
            />
            
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
              <button className="btn btn-outline" style={{ display: "flex", alignItems: "center", gap: 8, borderRadius: "var(--r-full)" }}>
                <RiImageAddLine size={18} /> Upload Image
              </button>
              <button className="btn btn-dark" style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 24px" }} disabled={!doubtText || !subject}>
                Submit Doubt <RiSendPlaneFill size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* Previous Doubts Feed */}
        <h2 className="section-title" style={{ fontSize: 18, marginBottom: 24, paddingLeft: 8 }}>My Previous Doubts</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {mockDoubts.map(doubt => (
            <div key={doubt.id} className="rayum-card" style={{ 
              padding: 32, 
              position: "relative",
              overflow: "hidden"
            }}>
              {/* Subtle status indicator strip */}
              <div style={{ 
                position: "absolute", left: 0, top: 0, bottom: 0, width: 4, 
                background: doubt.status === "Resolved" ? "var(--p-50)" : "var(--warning-50)" 
              }} />

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <span className={`badge ${doubt.subject === 'Physics' ? 'badge-blue' : 'badge-orange'}`} style={{ padding: "4px 12px" }}>
                    {doubt.subject}
                  </span>
                  <span className="t-body-sm">{doubt.date}</span>
                </div>
                <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: doubt.status === "Resolved" ? "var(--p-60)" : "var(--warning-60)", fontWeight: 600 }}>
                  {doubt.status === "Resolved" ? <RiCheckDoubleLine size={16} /> : <RiTimeLine size={16} />}
                  {doubt.status}
                </span>
              </div>
              
              <p className="text-bold" style={{ fontSize: 16, lineHeight: 1.6, marginBottom: 24, color: "var(--fg-default)" }}>
                "{doubt.text}"
              </p>
              
              {doubt.status === "Resolved" ? (
                <div style={{ 
                  background: "var(--n-10)", 
                  padding: 24, 
                  borderRadius: "var(--r-md)", 
                  border: "1px solid var(--border-default)",
                  position: "relative"
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                    <div className="avatar avatar-sm" style={{ background: "var(--n-90)" }}>
                      A
                    </div>
                    <span className="text-bold" style={{ fontSize: 14 }}>Response from {doubt.teacher}</span>
                  </div>
                  <p className="t-body-sm" style={{ color: "var(--fg-default)", lineHeight: 1.6, fontSize: 14 }}>
                    {doubt.response}
                  </p>
                </div>
              ) : (
                <div style={{ 
                  padding: "16px 20px", 
                  background: "rgba(245, 158, 11, 0.05)", 
                  borderRadius: "var(--r-md)", 
                  border: "1px dashed rgba(245, 158, 11, 0.3)",
                  color: "var(--warning-60)", 
                  fontSize: 14, 
                  fontWeight: 500 
                }}>
                  A teacher will review this and provide a detailed solution shortly.
                </div>
              )}
            </div>
          ))}
        </div>

      </main>
    </>
  );
}
