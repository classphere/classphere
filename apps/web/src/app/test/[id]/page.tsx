"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { mockQuestions } from "@/lib/mock-data";

type AnswerMap = Record<string, string>;
type StatusMap = Record<string, "unanswered" | "answered" | "review">;

export default function TestPage() {
  const router = useRouter();
  const questions = mockQuestions;
  const totalSeconds = questions.length * 144; // ~2.4 min/q for JEE

  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [status, setStatus] = useState<StatusMap>({});
  const [timeLeft, setTimeLeft] = useState(totalSeconds);
  const [showSubmitModal, setShowSubmitModal] = useState(false);

  const handleSubmit = useCallback(() => {
    router.push("/results/mock-attempt-001");
  }, [router]);

  // Timer
  useEffect(() => {
    if (timeLeft <= 0) { handleSubmit(); return; }
    const t = setTimeout(() => setTimeLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [timeLeft, handleSubmit]);

  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return h > 0
      ? `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`
      : `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  const selectAnswer = (qId: string, optId: string) => {
    setAnswers((a) => ({ ...a, [qId]: optId }));
    setStatus((s) => ({ ...s, [qId]: "answered" }));
  };

  const toggleReview = (qId: string) => {
    setStatus((s) => ({
      ...s,
      [qId]: s[qId] === "review" ? (answers[qId] ? "answered" : "unanswered") : "review",
    }));
  };

  const q = questions[current];
  const answered = Object.values(status).filter((s) => s === "answered").length;
  const marked = Object.values(status).filter((s) => s === "review").length;
  const unanswered = questions.length - answered - marked;
  const timeWarning = timeLeft < 300;

  return (
    <div
      style={{
        minHeight: "100vh", background: "var(--bg-primary)",
        display: "flex", flexDirection: "column",
      }}
    >
      {/* Top Bar */}
      <header
        style={{
          height: 56, display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0 20px",
          background: "rgba(8,12,20,0.95)",
          borderBottom: "1px solid rgba(255,255,255,0.07)",
          position: "sticky", top: 0, zIndex: 50,
        }}
      >
        <div style={{ fontWeight: 800, fontSize: "0.95rem", color: "#f1f5f9" }}>
          Exam<span style={{ color: "#f97316" }}>Prep</span>
          <span style={{ color: "#334155", fontWeight: 400, marginLeft: 12, fontSize: "0.8rem" }}>
            Laws of Motion · JEE · {questions.length} Questions
          </span>
        </div>

        {/* Timer */}
        <div
          style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "6px 18px", borderRadius: 24,
            background: timeWarning ? "rgba(239,68,68,0.12)" : "rgba(255,255,255,0.06)",
            border: `1px solid ${timeWarning ? "rgba(239,68,68,0.3)" : "rgba(255,255,255,0.1)"}`,
          }}
        >
          <span style={{ fontSize: "0.8rem" }}>⏱</span>
          <span
            style={{
              fontWeight: 800, fontSize: "1.1rem", fontVariantNumeric: "tabular-nums",
              color: timeWarning ? "#f87171" : "#f1f5f9",
            }}
          >
            {formatTime(timeLeft)}
          </span>
        </div>

        <button
          id="submit-test-btn"
          className="btn-primary"
          style={{ padding: "8px 20px", fontSize: "0.85rem" }}
          onClick={() => setShowSubmitModal(true)}
        >
          Submit Test
        </button>
      </header>

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* Question Area */}
        <div style={{ flex: 1, padding: "32px", overflowY: "auto" }}>
          {/* Subject tag + difficulty */}
          <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
            <span className="badge badge-blue">{q.subject}</span>
            <span className="badge badge-orange">{q.chapter}</span>
            <span
              className="badge"
              style={{
                background: q.difficulty === "easy" ? "rgba(34,197,94,0.12)" : q.difficulty === "hard" ? "rgba(239,68,68,0.12)" : "rgba(234,179,8,0.12)",
                color: q.difficulty === "easy" ? "#4ade80" : q.difficulty === "hard" ? "#f87171" : "#facc15",
                border: "none",
              }}
            >
              {q.difficulty}
            </span>
          </div>

          {/* Question number + text */}
          <div style={{ marginBottom: 32 }}>
            <div style={{ fontSize: "0.8rem", color: "#475569", marginBottom: 10 }}>
              Question {current + 1} of {questions.length}
            </div>
            <p style={{ fontSize: "1.05rem", color: "#f1f5f9", lineHeight: 1.75, fontWeight: 400 }}>
              {q.questionText}
            </p>
          </div>

          {/* Options */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 640 }}>
            {q.options.map((opt) => {
              const selected = answers[q.id] === opt.id;
              return (
                <button
                  key={opt.id}
                  id={`option-${opt.id}`}
                  className="option-btn"
                  style={selected ? { borderColor: "#f97316", background: "rgba(249,115,22,0.1)" } : {}}
                  onClick={() => selectAnswer(q.id, opt.id)}
                >
                  <div
                    style={{
                      width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      background: selected ? "#f97316" : "rgba(255,255,255,0.06)",
                      color: selected ? "#000" : "#94a3b8",
                      fontSize: "0.8rem", fontWeight: 700,
                    }}
                  >
                    {opt.id}
                  </div>
                  <span style={{ color: selected ? "#f1f5f9" : "#94a3b8" }}>{opt.text}</span>
                </button>
              );
            })}
          </div>

          {/* Nav buttons */}
          <div style={{ display: "flex", gap: 10, marginTop: 32, paddingBottom: 20 }}>
            <button
              className="btn-secondary"
              onClick={() => setCurrent((c) => Math.max(0, c - 1))}
              disabled={current === 0}
            >
              ← Previous
            </button>
            <button
              className="btn-ghost"
              onClick={() => toggleReview(q.id)}
              style={{
                color: status[q.id] === "review" ? "#facc15" : "#64748b",
                border: "1px solid",
                borderColor: status[q.id] === "review" ? "rgba(234,179,8,0.3)" : "rgba(255,255,255,0.08)",
                borderRadius: 10,
              }}
            >
              {status[q.id] === "review" ? "⭐ Marked" : "☆ Mark for Review"}
            </button>
            {current < questions.length - 1 ? (
              <button className="btn-primary" onClick={() => setCurrent((c) => c + 1)}>
                Next →
              </button>
            ) : (
              <button
                className="btn-primary animate-glow"
                onClick={() => setShowSubmitModal(true)}
              >
                Submit Test
              </button>
            )}
          </div>
        </div>

        {/* Right Panel: Question Navigator */}
        <div
          style={{
            width: 260, borderLeft: "1px solid rgba(255,255,255,0.07)",
            padding: "24px 16px", overflowY: "auto",
            background: "rgba(8,12,20,0.6)",
          }}
        >
          {/* Stats */}
          <div
            style={{
              display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginBottom: 20,
              padding: "12px", borderRadius: 12,
              background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            {[
              { label: "Done", value: answered, color: "#4ade80" },
              { label: "Review", value: marked, color: "#facc15" },
              { label: "Left", value: unanswered, color: "#64748b" },
            ].map((s) => (
              <div key={s.label} style={{ textAlign: "center" }}>
                <div style={{ fontWeight: 800, fontSize: "1.1rem", color: s.color }}>{s.value}</div>
                <div style={{ fontSize: "0.65rem", color: "#334155" }}>{s.label}</div>
              </div>
            ))}
          </div>

          <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "#334155", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>
            Questions
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {questions.map((_, i) => {
              const qId = questions[i].id;
              const s = status[qId] || "unanswered";
              const isCurrent = i === current;
              return (
                <button
                  key={i}
                  id={`nav-q-${i + 1}`}
                  className={`q-pill ${isCurrent ? "current" : s}`}
                  onClick={() => setCurrent(i)}
                >
                  {i + 1}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 6 }}>
            {[
              { color: "#4ade80", bg: "rgba(34,197,94,0.15)", label: "Answered" },
              { color: "#facc15", bg: "rgba(234,179,8,0.15)", label: "Marked for Review" },
              { color: "#64748b", bg: "rgba(255,255,255,0.06)", label: "Not Answered" },
            ].map((l) => (
              <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 14, height: 14, borderRadius: 4, background: l.bg, border: `1.5px solid ${l.color}30` }} />
                <span style={{ fontSize: "0.72rem", color: "#334155" }}>{l.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Submit Modal */}
      {showSubmitModal && (
        <div
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 100, backdropFilter: "blur(4px)",
          }}
        >
          <div
            className="glass"
            style={{ borderRadius: 20, padding: "36px 32px", maxWidth: 420, width: "90%" }}
          >
            <h2 style={{ fontWeight: 800, color: "#f1f5f9", marginBottom: 8 }}>Submit Test?</h2>
            <p style={{ color: "#64748b", fontSize: "0.875rem", marginBottom: 24, lineHeight: 1.6 }}>
              You&apos;ve answered <strong style={{ color: "#f1f5f9" }}>{answered}</strong> of{" "}
              <strong style={{ color: "#f1f5f9" }}>{questions.length}</strong> questions.
              {unanswered > 0 && ` ${unanswered} questions are unanswered.`}
            </p>
            <div style={{ display: "flex", gap: 12 }}>
              <button
                className="btn-secondary"
                style={{ flex: 1, justifyContent: "center" }}
                onClick={() => setShowSubmitModal(false)}
              >
                Keep Going
              </button>
              <button
                id="confirm-submit-btn"
                className="btn-primary"
                style={{ flex: 1, justifyContent: "center" }}
                onClick={handleSubmit}
              >
                Submit & See Results
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
