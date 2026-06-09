"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { mockQuestions } from "@/lib/mock-data";
import {
  RiTimerLine,
  RiStarFill,
  RiStarLine,
  RiArrowLeftLine,
  RiArrowRightLine,
  RiFlag2Fill
} from "@remixicon/react";

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
        minHeight: "100vh", background: "var(--bg-default)",
        display: "flex", flexDirection: "column",
      }}
    >
      {/* Top Bar */}
      <header
        style={{
          height: 64, display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0 32px",
          background: "var(--bg-surface)",
          borderBottom: "1px solid var(--border-default)",
          position: "sticky", top: 0, zIndex: 50,
          boxShadow: "var(--shadow-100)"
        }}
      >
        <div style={{ fontWeight: 800, fontSize: 18, color: "var(--fg-default)" }}>
          Exam<span style={{ color: "var(--secondary-50)" }}>Prep</span>
          <span style={{ color: "var(--fg-muted)", fontWeight: 500, marginLeft: 16, fontSize: 14 }}>
            Laws of Motion · JEE · {questions.length} Questions
          </span>
        </div>

        {/* Timer */}
        <div
          style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "8px 20px", borderRadius: "var(--radius-full)",
            background: timeWarning ? "var(--error-10)" : "var(--neutral-10)",
            border: `1px solid ${timeWarning ? "var(--error-50)" : "var(--border-default)"}`,
          }}
        >
          <span style={{ display: "flex", color: timeWarning ? "var(--error-50)" : "var(--fg-default)" }}>
            <RiTimerLine size={18} />
          </span>
          <span
            style={{
              fontWeight: 800, fontSize: 16, fontVariantNumeric: "tabular-nums",
              color: timeWarning ? "var(--error-50)" : "var(--fg-default)",
            }}
          >
            {formatTime(timeLeft)}
          </span>
        </div>

        <button
          id="submit-test-btn"
          className="btn btn-primary"
          onClick={() => setShowSubmitModal(true)}
        >
          Submit Test
        </button>
      </header>

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* Question Area */}
        <div style={{ flex: 1, padding: "40px 60px", overflowY: "auto" }}>
          <div className="rayum-card" style={{ maxWidth: 860, margin: "0 auto", padding: 40 }}>
            {/* Subject tag + difficulty */}
            <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
              <span className="rayum-badge blue">{q.subject}</span>
              <span className="rayum-badge orange">{q.chapter}</span>
              <span
                className="rayum-badge"
                style={{
                  background: q.difficulty === "easy" ? "var(--success-10)" : q.difficulty === "hard" ? "var(--error-10)" : "var(--warning-10)",
                  color: q.difficulty === "easy" ? "var(--success-50)" : q.difficulty === "hard" ? "var(--error-50)" : "var(--warning-50)",
                  border: "none",
                }}
              >
                {q.difficulty}
              </span>
            </div>

            {/* Question number + text */}
            <div style={{ marginBottom: 40 }}>
              <div className="text-body-small" style={{ color: "var(--fg-muted)", marginBottom: 12, fontWeight: 600 }}>
                QUESTION {current + 1} OF {questions.length}
              </div>
              <p style={{ fontSize: 18, color: "var(--fg-default)", lineHeight: 1.6, fontWeight: 500 }}>
                {q.questionText}
              </p>
            </div>

            {/* Options */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {q.options.map((opt) => {
                const selected = answers[q.id] === opt.id;
                return (
                  <button
                    key={opt.id}
                    id={`option-${opt.id}`}
                    style={{
                      display: "flex", alignItems: "center", gap: 16,
                      padding: "16px 20px", borderRadius: "var(--radius-md)", cursor: "pointer",
                      textAlign: "left", fontSize: 16, fontWeight: 500,
                      background: selected ? "var(--primary-10)" : "var(--bg-default)",
                      border: selected ? "2px solid var(--primary-50)" : "1.5px solid var(--border-default)",
                      color: selected ? "var(--fg-default)" : "var(--fg-muted)",
                      transition: "all 0.15s"
                    }}
                    onClick={() => selectAnswer(q.id, opt.id)}
                  >
                    <div
                      style={{
                        width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        background: selected ? "var(--primary-50)" : "var(--neutral-20)",
                        color: selected ? "white" : "var(--fg-default)",
                        fontSize: 14, fontWeight: 700,
                      }}
                    >
                      {opt.id}
                    </div>
                    <span>{opt.text}</span>
                  </button>
                );
              })}
            </div>

            {/* Nav buttons */}
            <div style={{ display: "flex", gap: 16, marginTop: 40, borderTop: "1px solid var(--border-default)", paddingTop: 32 }}>
              <button
                className="btn btn-outline"
                style={{ display: "inline-flex", gap: 8 }}
                onClick={() => setCurrent((c) => Math.max(0, c - 1))}
                disabled={current === 0}
              >
                <RiArrowLeftLine size={18} /> Previous
              </button>
              <button
                className="btn"
                onClick={() => toggleReview(q.id)}
                style={{
                  display: "inline-flex", gap: 8,
                  background: status[q.id] === "review" ? "var(--warning-10)" : "transparent",
                  color: status[q.id] === "review" ? "var(--warning-50)" : "var(--fg-muted)",
                  border: `1.5px solid ${status[q.id] === "review" ? "var(--warning-50)" : "var(--border-default)"}`,
                }}
              >
                {status[q.id] === "review" ? <><RiStarFill size={18} /> Marked</> : <><RiStarLine size={18} /> Mark for Review</>}
              </button>
              {current < questions.length - 1 ? (
                <button className="btn btn-primary" style={{ display: "inline-flex", gap: 8 }} onClick={() => setCurrent((c) => c + 1)}>
                  Next Question <RiArrowRightLine size={18} />
                </button>
              ) : (
                <button
                  className="btn btn-primary"
                  onClick={() => setShowSubmitModal(true)}
                  style={{ background: "var(--secondary-50)" }}
                >
                  Submit Test
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right Panel: Question Navigator */}
        <div
          style={{
            width: 300, borderLeft: "1px solid var(--border-default)",
            padding: "32px 24px", overflowY: "auto",
            background: "var(--bg-surface)",
          }}
        >
          {/* Stats */}
          <div
            style={{
              display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 32,
              padding: 16, borderRadius: "var(--radius-md)",
              background: "var(--neutral-10)", border: "1px solid var(--border-default)",
            }}
          >
            {[
              { label: "Done", value: answered, color: "var(--success-50)" },
              { label: "Review", value: marked, color: "var(--warning-50)" },
              { label: "Left", value: unanswered, color: "var(--fg-muted)" },
            ].map((s) => (
              <div key={s.label} style={{ textAlign: "center" }}>
                <div style={{ fontWeight: 800, fontSize: 20, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--fg-muted)", marginTop: 4 }}>{s.label}</div>
              </div>
            ))}
          </div>

          <div className="text-body-small" style={{ fontWeight: 700, color: "var(--fg-muted)", textTransform: "uppercase", marginBottom: 16 }}>
            Questions Navigator
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8 }}>
            {questions.map((_, i) => {
              const qId = questions[i].id;
              const s = status[qId] || "unanswered";
              const isCurrent = i === current;
              
              let bg = "var(--bg-surface)";
              let borderColor = "var(--border-default)";
              let color = "var(--fg-muted)";

              if (s === "answered") { bg = "var(--success-10)"; borderColor = "var(--success-50)"; color = "var(--success-50)"; }
              else if (s === "review") { bg = "var(--warning-10)"; borderColor = "var(--warning-50)"; color = "var(--warning-50)"; }
              
              if (isCurrent) {
                borderColor = "var(--primary-50)";
                bg = "var(--primary-50)";
                color = "white";
              }

              return (
                <button
                  key={i}
                  id={`nav-q-${i + 1}`}
                  style={{
                    aspectRatio: "1/1", borderRadius: "var(--radius-sm)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 14, fontWeight: 700, cursor: "pointer",
                    background: bg, border: `2px solid ${borderColor}`, color: color
                  }}
                  onClick={() => setCurrent(i)}
                >
                  {i + 1}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Submit Modal */}
      {showSubmitModal && (
        <div
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 100, backdropFilter: "blur(4px)",
          }}
        >
          <div className="rayum-card" style={{ maxWidth: 460, width: "90%", padding: 40, textAlign: "center" }}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 16, color: "var(--fg-default)" }}>
              <RiFlag2Fill size={48} />
            </div>
            <h2 className="text-h2" style={{ marginBottom: 12 }}>Ready to Submit?</h2>
            <p className="text-body-base" style={{ color: "var(--fg-muted)", marginBottom: 32, lineHeight: 1.6 }}>
              You&apos;ve answered <strong style={{ color: "var(--fg-default)" }}>{answered}</strong> of{" "}
              <strong style={{ color: "var(--fg-default)" }}>{questions.length}</strong> questions.
              {unanswered > 0 && ` ${unanswered} questions are still unanswered.`}
            </p>
            <div style={{ display: "flex", gap: 16 }}>
              <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setShowSubmitModal(false)}>
                Keep Working
              </button>
              <button id="confirm-submit-btn" className="btn btn-primary" style={{ flex: 1 }} onClick={handleSubmit}>
                Submit Test
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
