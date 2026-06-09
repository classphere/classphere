"use client";

import Link from "next/link";
import { 
  RiAddLine,
  RiSearchLine,
  RiFilter3Line,
  RiEditBoxLine,
  RiDeleteBinLine
} from "@remixicon/react";
import { mockQuestions } from "../../../lib/mock-data";

export default function QuestionBankPage() {
  return (
    <div style={{ maxWidth: 1200, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: "var(--fg-default)", marginBottom: 4 }}>
              Global Question Bank
            </h1>
            <p className="text-body">Manage all questions across JEE and NEET databases.</p>
          </div>
          <button className="btn btn-primary" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <RiAddLine size={18} /> Add Question
          </button>
        </div>
      </div>

      <div className="rayum-card">
        {/* Toolbar */}
        <div style={{ display: "flex", gap: 16, marginBottom: 24 }}>
          <div className="input-field" style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
            <RiSearchLine size={18} color="var(--fg-muted)" />
            <input 
              type="text" 
              placeholder="Search by ID, keyword, or chapter..." 
              style={{ border: "none", background: "transparent", outline: "none", width: "100%", fontSize: 14 }}
            />
          </div>
          <button className="btn btn-outline" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <RiFilter3Line size={18} /> Filter
          </button>
        </div>

        {/* Questions Table */}
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border-default)", textAlign: "left", color: "var(--fg-muted)", fontSize: 13 }}>
              <th style={{ paddingBottom: 12, width: 80 }}>ID</th>
              <th style={{ paddingBottom: 12, width: 120 }}>Subject</th>
              <th style={{ paddingBottom: 12, width: 200 }}>Chapter</th>
              <th style={{ paddingBottom: 12 }}>Preview</th>
              <th style={{ paddingBottom: 12, width: 100 }}>Difficulty</th>
              <th style={{ paddingBottom: 12, width: 100 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {mockQuestions.map(q => (
              <tr key={q.id} style={{ borderBottom: "1px solid var(--neutral-10)" }}>
                <td style={{ padding: "16px 0", color: "var(--fg-muted)", fontSize: 13 }}>{q.id}</td>
                <td style={{ padding: "16px 0", fontWeight: 600 }}>{q.subject}</td>
                <td style={{ padding: "16px 0", color: "var(--fg-muted)", fontSize: 13 }}>{q.chapter}</td>
                <td style={{ padding: "16px 0" }}>
                  <div style={{ 
                    maxWidth: 300, 
                    whiteSpace: "nowrap", 
                    overflow: "hidden", 
                    textOverflow: "ellipsis",
                    fontSize: 13,
                    color: "var(--fg-default)"
                  }}>
                    {q.questionText}
                  </div>
                </td>
                <td style={{ padding: "16px 0" }}>
                  <span className={`rayum-badge ${q.difficulty === 'hard' ? 'red' : q.difficulty === 'medium' ? 'yellow' : 'green'}`}>
                    {q.difficulty}
                  </span>
                </td>
                <td style={{ padding: "16px 0" }}>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--fg-muted)" }}>
                      <RiEditBoxLine size={18} />
                    </button>
                    <button style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--accent-red)" }}>
                      <RiDeleteBinLine size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination placeholder */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 24, fontSize: 13, color: "var(--fg-muted)" }}>
          <span>Showing 1 to 5 of 18,492 questions</span>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-outline" style={{ padding: "4px 12px", fontSize: 13 }} disabled>Previous</button>
            <button className="btn btn-outline" style={{ padding: "4px 12px", fontSize: 13 }}>Next</button>
          </div>
        </div>
      </div>
    </div>
  );
}
