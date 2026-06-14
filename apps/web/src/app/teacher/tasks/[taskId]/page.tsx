"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { 
  RiArrowLeftLine,
  RiCheckDoubleLine,
  RiSearchLine,
  RiFilter3Line,
  RiAddLine,
  RiSubtractLine
} from "@remixicon/react";
import { mockPendingTasks, mockQuestions } from "../../../../lib/mock-data";

export default function FulfillTaskPage() {
  const params = useParams();
  const taskId = params.taskId as string;
  const task = mockPendingTasks.find(t => t.id === taskId) || mockPendingTasks[0];

  // In a real app, this would be state
  const selectedQuestions = mockQuestions.slice(0, 3);
  const physicsQuestions = mockQuestions.filter(q => q.subject === "Physics");

  return (
    <main style={{ padding: "32px 32px 64px 32px", maxWidth: 1200, margin: "0 auto", width: "100%" }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <Link href="/teacher" style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "var(--fg-muted)", fontSize: 14, marginBottom: 16, textDecoration: "none" }}>
          <RiArrowLeftLine size={16} /> Back to Dashboard
        </Link>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
              <span className="rayum-badge orange">Pending Task</span>
              <span style={{ fontSize: 14, color: "var(--fg-muted)", fontWeight: 600 }}>{task.batchName}</span>
            </div>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: "var(--fg-default)", marginBottom: 4 }}>
              Add {task.subject} Questions
            </h1>
            <p className="text-body">
              Select {task.questionsRequired} questions for {task.testName}.
            </p>
          </div>
          <button className="btn btn-primary" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <RiCheckDoubleLine size={18} /> Submit Section
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 24 }}>
        
        {/* Left Panel: Question Bank */}
        <section className="rayum-card" style={{ height: "calc(100vh - 200px)", display: "flex", flexDirection: "column", padding: 24 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Question Bank — {task.subject}</h2>
          
          <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
            <div className="input-field" style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, padding: "8px 12px" }}>
              <RiSearchLine size={16} color="var(--fg-muted)" />
              <input 
                type="text" 
                placeholder="Search by keyword, concept..." 
                style={{ border: "none", background: "transparent", outline: "none", width: "100%", fontSize: 13 }}
              />
            </div>
            <button className="btn btn-outline" style={{ padding: "8px 12px", fontSize: 13 }}>
              <RiFilter3Line size={16} /> Filter
            </button>
          </div>

          <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 12, paddingRight: 8 }}>
            {physicsQuestions.map(q => (
              <div key={q.id} style={{ padding: 16, border: "1px solid var(--border-default)", borderRadius: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                  <div style={{ display: "flex", gap: 8 }}>
                    <span className="rayum-badge neutral" style={{ fontSize: 10 }}>{q.chapter}</span>
                    <span className={`rayum-badge ${q.difficulty === 'hard' ? 'red' : q.difficulty === 'medium' ? 'yellow' : 'green'}`} style={{ fontSize: 10 }}>
                      {q.difficulty}
                    </span>
                  </div>
                  <button className="btn btn-outline" style={{ padding: "4px 8px", fontSize: 12, display: "flex", alignItems: "center", gap: 4 }}>
                    <RiAddLine size={14} /> Add
                  </button>
                </div>
                <p style={{ fontSize: 14, color: "var(--fg-default)", lineHeight: 1.5 }}>{q.questionText}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Right Panel: Selected Questions */}
        <section className="rayum-card" style={{ height: "calc(100vh - 200px)", display: "flex", flexDirection: "column", background: "var(--n-10)", padding: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700 }}>Selected</h2>
            <span style={{ fontSize: 14, fontWeight: 700, color: selectedQuestions.length === task.questionsRequired ? "var(--success-50)" : "var(--fg-default)" }}>
              {selectedQuestions.length} / {task.questionsRequired}
            </span>
          </div>

          <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
            {selectedQuestions.map((q, idx) => (
              <div key={q.id} style={{ padding: 12, background: "var(--bg-surface)", border: "1px solid var(--border-default)", borderRadius: 8, display: "flex", gap: 12 }}>
                <div style={{ fontWeight: 700, color: "var(--fg-muted)", fontSize: 13 }}>{idx + 1}.</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, color: "var(--fg-default)", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", marginBottom: 8 }}>
                    {q.questionText}
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 11, color: "var(--fg-muted)" }}>{q.chapter}</span>
                    <button style={{ background: "transparent", border: "none", color: "var(--accent-red)", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: 12 }}>
                      <RiSubtractLine size={14} /> Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

      </div>
    </main>
  );
}
