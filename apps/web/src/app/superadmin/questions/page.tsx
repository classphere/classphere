"use client";

import Navbar from "@/components/layout/Navbar";
import { RiSearchLine, RiFilter3Line, RiAddLine, RiDeleteBinLine, RiEditLine } from "@remixicon/react";

const mockQuestions = [
  { id: "Q-1001", subject: "Physics", topic: "Kinematics", difficulty: "Hard", status: "Active" },
  { id: "Q-1002", subject: "Chemistry", topic: "Organic Chemistry", difficulty: "Medium", status: "Active" },
  { id: "Q-1003", subject: "Mathematics", topic: "Calculus", difficulty: "Hard", status: "Draft" },
  { id: "Q-1004", subject: "Physics", topic: "Thermodynamics", difficulty: "Easy", status: "Active" },
  { id: "Q-1005", subject: "Biology", topic: "Genetics", difficulty: "Medium", status: "Active" },
];

export default function QuestionBankPage() {
  return (
    <>
      <Navbar title="Question Bank" />
      <main style={{ maxWidth: 1200, margin: "0 auto", padding: "var(--space-600)", width: "100%" }}>
        
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h2 className="text-heading-m" style={{ color: "var(--fg-default)" }}>Manage Questions</h2>
          <button className="btn btn-primary" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <RiAddLine size={18} /> Add New Question
          </button>
        </div>

        <div className="rayum-card" style={{ padding: 24, marginBottom: 24, display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center" }}>
          <div style={{ position: "relative", flex: 1, maxWidth: 500 }}>
            <RiSearchLine size={18} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--fg-muted)" }} />
            <input 
              type="text" 
              placeholder="Search questions by ID, subject, or topic..." 
              className="input-field"
              style={{ width: "100%", paddingLeft: 36 }}
            />
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <select className="input-field">
              <option value="">All Subjects</option>
              <option value="Physics">Physics</option>
              <option value="Chemistry">Chemistry</option>
              <option value="Mathematics">Mathematics</option>
              <option value="Biology">Biology</option>
            </select>
            <select className="input-field">
              <option value="">All Difficulties</option>
              <option value="Easy">Easy</option>
              <option value="Medium">Medium</option>
              <option value="Hard">Hard</option>
            </select>
            <button className="btn btn-outline" style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <RiFilter3Line size={18} /> More Filters
            </button>
          </div>
        </div>

        <div className="rayum-card" style={{ overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
            <thead>
              <tr style={{ background: "var(--bg-surface)", borderBottom: "1px solid var(--border-default)" }}>
                <th style={{ padding: "16px 24px", color: "var(--fg-muted)", fontWeight: 600, fontSize: 13, textTransform: "uppercase" }}>Question ID</th>
                <th style={{ padding: "16px 24px", color: "var(--fg-muted)", fontWeight: 600, fontSize: 13, textTransform: "uppercase" }}>Subject</th>
                <th style={{ padding: "16px 24px", color: "var(--fg-muted)", fontWeight: 600, fontSize: 13, textTransform: "uppercase" }}>Topic</th>
                <th style={{ padding: "16px 24px", color: "var(--fg-muted)", fontWeight: 600, fontSize: 13, textTransform: "uppercase" }}>Difficulty</th>
                <th style={{ padding: "16px 24px", color: "var(--fg-muted)", fontWeight: 600, fontSize: 13, textTransform: "uppercase" }}>Status</th>
                <th style={{ padding: "16px 24px", color: "var(--fg-muted)", fontWeight: 600, fontSize: 13, textTransform: "uppercase", textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {mockQuestions.map(question => (
                <tr key={question.id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                  <td style={{ padding: "16px 24px", color: "var(--fg-muted)", fontSize: 14 }}>{question.id}</td>
                  <td style={{ padding: "16px 24px", color: "var(--fg-default)", fontWeight: 500, fontSize: 14 }}>{question.subject}</td>
                  <td style={{ padding: "16px 24px", color: "var(--fg-default)", fontSize: 14 }}>{question.topic}</td>
                  <td style={{ padding: "16px 24px" }}>
                    <span className={`rayum-badge ${question.difficulty === "Hard" ? "red" : question.difficulty === "Medium" ? "orange" : "green"}`}>
                      {question.difficulty}
                    </span>
                  </td>
                  <td style={{ padding: "16px 24px" }}>
                    <span className={`rayum-badge ${question.status === "Active" ? "green" : "gray"}`}>
                      {question.status}
                    </span>
                  </td>
                  <td style={{ padding: "16px 24px", textAlign: "right" }}>
                    <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                      <button className="btn btn-ghost" style={{ padding: 4, color: "var(--fg-muted)" }}>
                        <RiEditLine size={18} />
                      </button>
                      <button className="btn btn-ghost" style={{ padding: 4, color: "var(--error-50)" }}>
                        <RiDeleteBinLine size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          <div style={{ padding: "16px 24px", borderTop: "1px solid var(--border-default)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span className="text-body-small" style={{ color: "var(--fg-muted)" }}>Showing 1 to 5 of 1,245 entries</span>
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
