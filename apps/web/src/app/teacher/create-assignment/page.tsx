"use client";

import Navbar from "@/components/layout/Navbar";
import { useState } from "react";
import { RiAddCircleLine, RiCalendarLine, RiTeamLine, RiBookmarkLine, RiCheckFill } from "@remixicon/react";

export default function CreateAssignmentPage() {
  const [step, setStep] = useState(1);

  return (
    <>
      <Navbar title="Create Assignment" />
      <main style={{ maxWidth: 800, margin: "0 auto", padding: "var(--space-600)", width: "100%" }}>
        
        {/* Wizard Progress */}
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 32, position: "relative" }}>
          <div style={{ position: "absolute", top: 16, left: 0, right: 0, height: 2, background: "var(--border-default)", zIndex: 0 }} />
          {[
            { id: 1, label: "Basic Details" },
            { id: 2, label: "Select Questions" },
            { id: 3, label: "Schedule" },
          ].map((s) => (
            <div key={s.id} style={{ display: "flex", flexDirection: "column", alignItems: "center", zIndex: 1 }}>
              <div style={{ 
                width: 32, height: 32, borderRadius: "50%", 
                background: step >= s.id ? "var(--primary-50)" : "var(--bg-surface)", 
                border: step >= s.id ? "none" : "2px solid var(--border-default)",
                color: step >= s.id ? "white" : "var(--fg-muted)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontWeight: "bold", marginBottom: 8
              }}>
                {s.id}
              </div>
              <span className="text-body-small" style={{ color: step >= s.id ? "var(--fg-default)" : "var(--fg-muted)", fontWeight: step >= s.id ? 600 : 400 }}>
                {s.label}
              </span>
            </div>
          ))}
        </div>

        <div className="rayum-card" style={{ padding: 32 }}>
          {step === 1 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              <h2 className="text-heading-s" style={{ color: "var(--fg-default)" }}>Basic Details</h2>
              
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <label className="text-body-small" style={{ fontWeight: 600, color: "var(--fg-default)" }}>Assignment Title</label>
                <input type="text" className="input-field" placeholder="e.g. Weekly Physics Quiz - Kinematics" />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <label className="text-body-small" style={{ fontWeight: 600, color: "var(--fg-default)", display: "flex", alignItems: "center", gap: 6 }}>
                    <RiBookmarkLine size={16} /> Subject
                  </label>
                  <select className="input-field">
                    <option>Physics</option>
                    <option>Chemistry</option>
                    <option>Mathematics</option>
                  </select>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <label className="text-body-small" style={{ fontWeight: 600, color: "var(--fg-default)", display: "flex", alignItems: "center", gap: 6 }}>
                    <RiTeamLine size={16} /> Target Batch
                  </label>
                  <select className="input-field">
                    <option>Class 11 - Morning Batch</option>
                    <option>Class 12 - Evening Batch</option>
                    <option>Droppers Batch</option>
                  </select>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <label className="text-body-small" style={{ fontWeight: 600, color: "var(--fg-default)" }}>Instructions / Syllabus</label>
                <textarea className="input-field" rows={4} placeholder="Enter instructions for students..."></textarea>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
                <button className="btn btn-primary" onClick={() => setStep(2)}>Next Step</button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              <h2 className="text-heading-s" style={{ color: "var(--fg-default)" }}>Select Questions</h2>
              <div className="text-body-large" style={{ color: "var(--fg-muted)", textAlign: "center", padding: "48px 0" }}>
                <RiAddCircleLine size={48} style={{ color: "var(--border-default)", marginBottom: 16 }} />
                <p>Select questions from the Question Bank to add to this assignment.</p>
                <button className="btn btn-outline" style={{ marginTop: 16 }}>Browse Question Bank</button>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 16 }}>
                <button className="btn btn-ghost" onClick={() => setStep(1)}>Back</button>
                <button className="btn btn-primary" onClick={() => setStep(3)}>Next Step</button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              <h2 className="text-heading-s" style={{ color: "var(--fg-default)" }}>Schedule Assignment</h2>
              
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <label className="text-body-small" style={{ fontWeight: 600, color: "var(--fg-default)", display: "flex", alignItems: "center", gap: 6 }}>
                    <RiCalendarLine size={16} /> Start Date & Time
                  </label>
                  <input type="datetime-local" className="input-field" />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <label className="text-body-small" style={{ fontWeight: 600, color: "var(--fg-default)", display: "flex", alignItems: "center", gap: 6 }}>
                    <RiCalendarLine size={16} /> End Date & Time
                  </label>
                  <input type="datetime-local" className="input-field" />
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 16 }}>
                <button className="btn btn-ghost" onClick={() => setStep(2)}>Back</button>
                <button className="btn btn-primary" onClick={() => setStep(4)}>Publish Assignment</button>
              </div>
            </div>
          )}
          {step === 4 && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, padding: "48px 0" }}>
              <div style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(34, 197, 94, 0.1)", color: "var(--success-50)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <RiCheckFill size={32} />
              </div>
              <h2 className="text-heading-s" style={{ color: "var(--fg-default)" }}>Assignment Published!</h2>
              <p className="text-body-base" style={{ color: "var(--fg-muted)", textAlign: "center", maxWidth: 400 }}>
                The assignment has been successfully created and scheduled for the selected batches.
              </p>
              <button className="btn btn-primary" style={{ marginTop: 24 }} onClick={() => window.location.href = "/teacher"}>Return to Dashboard</button>
            </div>
          )}
        </div>

      </main>
    </>
  );
}
