"use client";

import { useState } from "react";
import Navbar from "@/components/layout/Navbar";
import { RiBookmarkFill, RiFilter3Line, RiCheckLine, RiSearchLine, RiAlertFill, RiLightbulbFlashLine, RiArrowRightLine } from "@remixicon/react";

const MOCK_MISTAKES = [
  {
    id: "m1",
    date: "2026-06-12",
    exam: "JEE Main Mock 4",
    subject: "Physics",
    chapter: "Thermodynamics",
    question: "A Carnot engine operates between 300K and 600K. If the work done is 800J, what is the heat extracted from the source?",
    studentAnswer: "-1600 J",
    correctAnswer: "1600 J",
    errorType: "sign_error",
    detail: "Sign error: You calculated the correct magnitude but applied the wrong sign convention for heat extracted.",
    tip: "Always draw the source/sink diagram and use Q1 = W + Q2 to track energy flow direction.",
    resolved: false
  },
  {
    id: "m2",
    date: "2026-06-10",
    exam: "JEE Main Mock 3",
    subject: "Chemistry",
    chapter: "Electrochemistry",
    question: "Calculate the standard cell potential for the reaction: Zn(s) + Cu2+(aq) -> Zn2+(aq) + Cu(s) given E0(Zn2+/Zn) = -0.76V and E0(Cu2+/Cu) = +0.34V.",
    studentAnswer: "-0.42V",
    correctAnswer: "1.10V",
    errorType: "calculation",
    detail: "Calculation error: You subtracted 0.76 from 0.34 instead of adding them (E_cell = E_cathode - E_anode = 0.34 - (-0.76)).",
    tip: "Write out the equation clearly: 0.34 - (-0.76). Don't skip the double negative in your head.",
    resolved: false
  },
  {
    id: "m3",
    date: "2026-06-05",
    exam: "JEE Main Mock 2",
    subject: "Mathematics",
    chapter: "Integral Calculus",
    question: "Evaluate the integral of x * e^x dx from 0 to 1.",
    studentAnswer: "e - 1",
    correctAnswer: "1",
    errorType: "partial_solve",
    detail: "Partial solve: You applied integration by parts correctly but forgot to evaluate the limits on the [x * e^x] term.",
    tip: "Always write [f(x)]_a^b explicitly before plugging in the upper and lower limits.",
    resolved: true
  }
];

export default function MistakeDiary() {
  const [activeTab, setActiveTab] = useState<"unresolved" | "resolved">("unresolved");
  const [filterSubject, setFilterSubject] = useState<string>("All");

  const [mistakes, setMistakes] = useState(MOCK_MISTAKES);

  const toggleResolved = (id: string) => {
    setMistakes(mistakes.map(m => m.id === id ? { ...m, resolved: !m.resolved } : m));
  };

  const filteredMistakes = mistakes.filter(m => {
    if (activeTab === "unresolved" && m.resolved) return false;
    if (activeTab === "resolved" && !m.resolved) return false;
    if (filterSubject !== "All" && m.subject !== filterSubject) return false;
    return true;
  });

  return (
    <>
      <Navbar title="Mistake Diary" />
      <main style={{ maxWidth: 900, margin: "0 auto", padding: "var(--space-600)", width: "100%" }}>
        
        {/* Header */}
        <div style={{ marginBottom: "var(--space-800)", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div>
            <h1 className="text-h2" style={{ color: "var(--fg-default)", display: "flex", alignItems: "center", gap: 12 }}>
              <RiBookmarkFill color="var(--primary-50)" /> My Mistake Diary
            </h1>
            <p className="text-body-base" style={{ color: "var(--fg-muted)", marginTop: 8 }}>
              Review your past errors so you never make them again.
            </p>
          </div>
          <div style={{ display: "flex", gap: 12 }}>
             <select 
              className="input" 
              value={filterSubject}
              onChange={(e) => setFilterSubject(e.target.value)}
              style={{ width: 140 }}
            >
              <option value="All">All Subjects</option>
              <option value="Physics">Physics</option>
              <option value="Chemistry">Chemistry</option>
              <option value="Mathematics">Mathematics</option>
            </select>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 32, borderBottom: "1px solid var(--border-default)", marginBottom: 32 }}>
          <button 
            onClick={() => setActiveTab("unresolved")}
            style={{ 
              background: "none", border: "none", padding: "0 0 12px 0", fontSize: 16, fontWeight: 600, cursor: "pointer",
              color: activeTab === "unresolved" ? "var(--primary-50)" : "var(--fg-muted)",
              borderBottom: activeTab === "unresolved" ? "2px solid var(--primary-50)" : "2px solid transparent",
            }}
          >
            Needs Review ({mistakes.filter(m => !m.resolved).length})
          </button>
          <button 
            onClick={() => setActiveTab("resolved")}
            style={{ 
              background: "none", border: "none", padding: "0 0 12px 0", fontSize: 16, fontWeight: 600, cursor: "pointer",
              color: activeTab === "resolved" ? "var(--primary-50)" : "var(--fg-muted)",
              borderBottom: activeTab === "resolved" ? "2px solid var(--primary-50)" : "2px solid transparent",
            }}
          >
            Resolved ({mistakes.filter(m => m.resolved).length})
          </button>
        </div>

        {/* List */}
        {filteredMistakes.length === 0 ? (
          <div style={{ textAlign: "center", padding: 64, color: "var(--fg-muted)" }}>
            <RiCheckLine size={48} style={{ opacity: 0.5, marginBottom: 16, display: "inline-block" }} />
            <h3 className="text-h4">No mistakes found here!</h3>
            <p className="text-body-base" style={{ marginTop: 8 }}>You have reviewed all your errors.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {filteredMistakes.map(m => (
              <div key={m.id} className="rayum-card" style={{ padding: 32, borderLeft: m.resolved ? "4px solid var(--success-50)" : "4px solid var(--warning-50)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
                  <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    <span className="rayum-badge blue">{m.subject}</span>
                    <span className="rayum-badge neutral">{m.chapter}</span>
                  </div>
                  <span className="text-body-small" style={{ color: "var(--fg-muted)" }}>{m.exam} • {m.date}</span>
                </div>

                <div style={{ marginBottom: 24 }}>
                  <div className="text-body-small" style={{ fontWeight: 700, color: "var(--fg-muted)", marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>Question</div>
                  <div className="text-body-base" style={{ color: "var(--fg-default)", fontWeight: 600, lineHeight: 1.6 }}>{m.question}</div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
                  <div style={{ padding: 16, background: "var(--error-10)", borderRadius: "var(--radius-sm)", border: "1px solid var(--error-20)" }}>
                    <div className="text-body-small" style={{ color: "var(--error-50)", fontWeight: 700, marginBottom: 4 }}>Your Answer</div>
                    <div className="text-body-large" style={{ color: "var(--error-60)", fontWeight: 700 }}>{m.studentAnswer}</div>
                  </div>
                  <div style={{ padding: 16, background: "var(--success-10)", borderRadius: "var(--radius-sm)", border: "1px solid var(--success-20)" }}>
                    <div className="text-body-small" style={{ color: "var(--success-50)", fontWeight: 700, marginBottom: 4 }}>Correct Answer</div>
                    <div className="text-body-large" style={{ color: "var(--success-60)", fontWeight: 700 }}>{m.correctAnswer}</div>
                  </div>
                </div>

                <div style={{ background: "var(--bg-surface-hover)", padding: 24, borderRadius: "var(--radius-md)", marginBottom: 24 }}>
                  <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
                    <RiAlertFill size={20} color="var(--warning-50)" style={{ flexShrink: 0 }} />
                    <div>
                      <div className="text-body-small" style={{ fontWeight: 700, color: "var(--warning-50)", marginBottom: 4 }}>Diagnosis: {m.errorType.replace("_", " ")}</div>
                      <div className="text-body-base" style={{ color: "var(--fg-default)" }}>{m.detail}</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 12 }}>
                    <RiLightbulbFlashLine size={20} color="var(--primary-50)" style={{ flexShrink: 0 }} />
                    <div>
                      <div className="text-body-small" style={{ fontWeight: 700, color: "var(--primary-50)", marginBottom: 4 }}>Actionable Tip</div>
                      <div className="text-body-base" style={{ color: "var(--fg-default)" }}>{m.tip}</div>
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <button 
                    className={m.resolved ? "btn btn-outline" : "btn btn-primary"} 
                    onClick={() => toggleResolved(m.id)}
                    style={{ display: "inline-flex", gap: 8 }}
                  >
                    {m.resolved ? "Mark as Needs Review" : <><RiCheckLine size={18} /> Mark as Resolved</>}
                  </button>
                </div>

              </div>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
