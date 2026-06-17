"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  RiTimerLine,
  RiStarFill,
  RiStarLine,
  RiArrowLeftLine,
  RiArrowRightLine,
  RiFlag2Fill,
  RiLoader4Line,
} from "@remixicon/react";
import Latex from "react-latex-next";
import "katex/dist/katex.min.css";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Option {
  id: string;
  text: string;
  image_url?: string | null;
}

interface Question {
  id: string;
  question_number: number;
  question_text: string;
  question_images?: string[];
  options: Option[] | null;
  correct_answer: string[];
  explanation?: string;
  question_type: string;
  subject: string;
  chapter: string;
  topic: string;
  difficulty: "easy" | "medium" | "hard";
  marking_scheme?: { correct: number; incorrect: number; unattempted: number };
}

interface PYQMeta {
  id: string;
  exam: string;
  year: number;
  shift: string;
  questions: number;
  duration: number;
}

type AnswerMap = Record<string, string>;
type StatusMap = Record<string, "unanswered" | "answered" | "review">;

// ─── Constants ────────────────────────────────────────────────────────────────

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api/v1";

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TestPage() {
  const router  = useRouter();
  const params  = useParams<{ id: string }>();
  const testId  = params.id; // e.g. "pyq-jee-main-2024-jan-shift1"

  const [questions, setQuestions]         = useState<Question[]>([]);
  const [meta, setMeta]                   = useState<PYQMeta | null>(null);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState<string | null>(null);
  const [current, setCurrent]             = useState(0);
  const [answers, setAnswers]             = useState<AnswerMap>({});
  const [status, setStatus]               = useState<StatusMap>({});
  const [timeLeft, setTimeLeft]           = useState(0);
  const [showSubmitModal, setShowSubmitModal] = useState(false);

  // ── Load questions ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!testId) return;
    setLoading(true);

    // PYQ papers: id is "pyq-{paperId}"
    if (testId.startsWith("pyq-")) {
      const paperId = testId.replace(/^pyq-/, "");
      fetch(`${API_BASE}/pyqs/${paperId}/questions`)
        .then((r) => {
          if (!r.ok) throw new Error("API error");
          const contentType = r.headers.get("content-type");
          if (!contentType || !contentType.includes("application/json")) throw new Error("Invalid response format");
          return r.json();
        })
        .then((res) => {
          if (res.success) {
            setQuestions(res.data.questions);
            setMeta(res.data.paper);
            setTimeLeft(res.data.paper.duration * 60);
          } else {
            setError(res.message ?? "Failed to load questions.");
          }
        })
        .catch(() => setError("Cannot reach the backend. Make sure the API is running on port 3001."))
        .finally(() => setLoading(false));
      return;
    }

    // Future: custom tests would use a different endpoint
    setError(`Unknown test format: "${testId}". Only PYQ papers are supported right now.`);
    setLoading(false);
  }, [testId]);

  // ── Timer ──────────────────────────────────────────────────────────────────
  const handleSubmit = useCallback(async () => {
    setLoading(true);
    try {
      const payload = {
        answers: Object.keys(answers).reduce((acc, qId) => {
          acc[qId] = {
            selected_answer: answers[qId],
            time_taken_sec: 45, // mock time for now
            marked_review: status[qId] === "review",
          };
          return acc;
        }, {} as Record<string, any>),
      };

      const res = await fetch(`/api/v1/attempts/${testId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Submit API failed");
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) throw new Error("Invalid response format");

      const data = await res.json();
      if (data.success) {
        router.push(`/results/${data.data.attempt_id}`);
      } else {
        alert("Failed to submit: " + data.message);
        setLoading(false);
      }
    } catch (err) {
      console.error(err);
      alert("Submission error");
      setLoading(false);
    }
  }, [answers, status, testId, router]);

  useEffect(() => {
    if (timeLeft <= 0 || loading) return;
    const t = setTimeout(() => setTimeLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [timeLeft, loading, handleSubmit]);

  useEffect(() => {
    if (!loading && timeLeft === 0 && questions.length > 0) {
      handleSubmit();
    }
  }, [timeLeft, loading, questions.length, handleSubmit]);

  const formatTime = (s: number) => {
    const h   = Math.floor(s / 3600);
    const m   = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return h > 0
      ? `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`
      : `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  const selectAnswer = (qId: string, optId: string) => {
    setAnswers((a) => ({ ...a, [qId]: optId }));
    setStatus((s)  => ({ ...s, [qId]: "answered" }));
  };

  const toggleReview = (qId: string) => {
    setStatus((s) => ({
      ...s,
      [qId]: s[qId] === "review" ? (answers[qId] ? "answered" : "unanswered") : "review",
    }));
  };

  // ── Loading / Error ─────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-default)", flexDirection: "column", gap: 16, color: "var(--fg-muted)" }}>
        <RiLoader4Line size={48} style={{ animation: "spin 1s linear infinite" }} />
        <p style={{ fontSize: 16, fontWeight: 600 }}>Loading questions from backend…</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-default)", flexDirection: "column", gap: 16 }}>
        <div style={{ fontSize: 48 }}>⚠️</div>
        <p style={{ fontSize: 16, fontWeight: 600, color: "var(--danger-50)" }}>{error}</p>
        <button className="btn btn-outline" onClick={() => router.push("/pyqs")}>← Back to PYQs</button>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p>No questions found.</p>
      </div>
    );
  }

  const q          = questions[current];
  const answered   = Object.values(status).filter((s) => s === "answered").length;
  const marked     = Object.values(status).filter((s) => s === "review").length;
  const unanswered = questions.length - answered - marked;
  const timeWarning = timeLeft < 300;

  // ── Group questions by subject for navigator labels ─────────────────────────
  const subjects = [...new Set(questions.map((q) => q.subject))];

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-default)", display: "flex", flexDirection: "column" }}>

      {/* ── Top Bar ── */}
      <header style={{
        height: 64, display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 32px", background: "var(--bg-surface)",
        borderBottom: "1px solid var(--border-default)",
        position: "sticky", top: 0, zIndex: 50, boxShadow: "var(--shadow-100)",
      }}>
        <div style={{ fontWeight: 800, fontSize: 18, color: "var(--fg-default)" }}>
          Exam<span style={{ color: "var(--secondary-50)" }}>Prep</span>
          {meta && (
            <span style={{ color: "var(--fg-muted)", fontWeight: 500, marginLeft: 16, fontSize: 14 }}>
              {meta.exam} {meta.year} · {meta.shift} · {questions.length} Questions
            </span>
          )}
        </div>

        {/* Timer */}
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "8px 20px", borderRadius: "var(--radius-full)",
          background: timeWarning ? "#FEF2F2" : "var(--n-10)",
          border: `1px solid ${timeWarning ? "#EF4444" : "var(--border-default)"}`,
        }}>
          <span style={{ display: "flex", color: timeWarning ? "#EF4444" : "var(--fg-default)" }}>
            <RiTimerLine size={18} />
          </span>
          <span style={{ fontWeight: 800, fontSize: 16, fontVariantNumeric: "tabular-nums", color: timeWarning ? "#EF4444" : "var(--fg-default)" }}>
            {formatTime(timeLeft)}
          </span>
        </div>

        <button id="submit-test-btn" className="btn btn-primary" onClick={() => setShowSubmitModal(true)}>
          Submit Test
        </button>
      </header>

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

        {/* ── Question Area ── */}
        <div style={{ flex: 1, padding: "40px 60px", overflowY: "auto" }}>
          <div className="rayum-card" style={{ maxWidth: 860, margin: "0 auto", padding: 40 }}>

            {/* Tags */}
            <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
              <span className="rayum-badge blue">{q.subject}</span>
              <span className="rayum-badge orange">{q.chapter}</span>
              {q.topic && <span className="rayum-badge">{q.topic}</span>}
              <span
                className="rayum-badge"
                style={{
                  background: q.difficulty === "easy" ? "#F0FDF4" : q.difficulty === "hard" ? "#FEF2F2" : "#FFFBEB",
                  color:      q.difficulty === "easy" ? "#16A34A" : q.difficulty === "hard" ? "#DC2626" : "#D97706",
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
              <p style={{ fontSize: 17, color: "var(--fg-default)", lineHeight: 1.7, fontWeight: 500, whiteSpace: "pre-wrap" }}>
                <Latex>{q.question_text}</Latex>
              </p>
              {/* Question images */}
              {q.question_images && q.question_images.length > 0 && (
                <div style={{ marginTop: 16, display: "flex", flexWrap: "wrap", gap: 12 }}>
                  {q.question_images.map((url, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={i} src={url} alt={`Figure ${i + 1}`} style={{ maxWidth: "100%", borderRadius: 8, border: "1px solid var(--border-default)" }} />
                  ))}
                </div>
              )}
            </div>

            {/* Options or Text Input */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {!q.options || q.options.length === 0 ? (
                <div style={{ marginTop: 8 }}>
                  <label className="text-body-small" style={{ color: "var(--fg-muted)", marginBottom: 8, display: "block" }}>
                    ENTER NUMERICAL ANSWER
                  </label>
                  <input
                    type="text"
                    className="input"
                    placeholder="Type your answer..."
                    value={answers[q.id] || ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      setAnswers((a) => ({ ...a, [q.id]: val }));
                      setStatus((s) => ({ ...s, [q.id]: val ? "answered" : "unanswered" }));
                    }}
                    style={{ maxWidth: 320, fontSize: 18, fontWeight: 600, padding: "14px 20px" }}
                  />
                </div>
              ) : (
                q.options.map((opt) => {
                  const selected = answers[q.id] === opt.id;
                  return (
                    <button
                      key={opt.id}
                      id={`option-${opt.id}`}
                      style={{
                        display: "flex", alignItems: "center", gap: 16,
                        padding: "16px 20px", borderRadius: "var(--radius-md)", cursor: "pointer",
                        textAlign: "left", fontSize: 16, fontWeight: 500,
                        background: selected ? "var(--p-10)" : "var(--bg-default)",
                        border: selected ? "2px solid var(--p-50)" : "1.5px solid var(--border-default)",
                        color: selected ? "var(--fg-default)" : "var(--fg-muted)",
                        transition: "all 0.15s",
                      }}
                      onClick={() => selectAnswer(q.id, opt.id)}
                    >
                      <div style={{
                        width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        background: selected ? "var(--p-60)" : "var(--n-20)",
                        color: selected ? "white" : "var(--fg-default)",
                        fontSize: 14, fontWeight: 700,
                      }}>
                        {opt.id}
                      </div>
                      <div style={{ flex: 1 }}>
                        {opt.text && <span><Latex>{opt.text}</Latex></span>}
                        {opt.image_url && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={opt.image_url} alt={`Option ${opt.id}`} style={{ maxWidth: "100%", marginTop: opt.text ? 8 : 0, borderRadius: 4 }} />
                        )}
                      </div>
                    </button>
                  );
                })
              )}
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
                  background: status[q.id] === "review" ? "#FFFBEB" : "transparent",
                  color: status[q.id] === "review" ? "#F59E0B" : "var(--fg-muted)",
                  border: `1.5px solid ${status[q.id] === "review" ? "#F59E0B" : "var(--border-default)"}`,
                }}
              >
                {status[q.id] === "review" ? <><RiStarFill size={18} /> Marked</> : <><RiStarLine size={18} /> Mark for Review</>}
              </button>
              {current < questions.length - 1 ? (
                <button className="btn btn-primary" style={{ display: "inline-flex", gap: 8 }} onClick={() => setCurrent((c) => c + 1)}>
                  Next Question <RiArrowRightLine size={18} />
                </button>
              ) : (
                <button className="btn btn-primary" onClick={() => setShowSubmitModal(true)} style={{ background: "var(--s-60)" }}>
                  Submit Test
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── Right Panel: Question Navigator ── */}
        <div style={{ width: 300, borderLeft: "1px solid var(--border-default)", padding: "32px 24px", overflowY: "auto", background: "var(--bg-surface)" }}>

          {/* Stats */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 24, padding: 16, borderRadius: "var(--radius-md)", background: "var(--n-10)", border: "1px solid var(--border-default)" }}>
            {[
              { label: "Done",   value: answered,   color: "#22C55E" },
              { label: "Review", value: marked,     color: "#F59E0B" },
              { label: "Left",   value: unanswered, color: "var(--fg-muted)" },
            ].map((s) => (
              <div key={s.label} style={{ textAlign: "center" }}>
                <div style={{ fontWeight: 800, fontSize: 20, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--fg-muted)", marginTop: 4 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Subject-grouped navigator */}
          {subjects.map((subj) => {
            const subjQs = questions.filter((q) => q.subject === subj);
            return (
              <div key={subj} style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--fg-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>
                  {subj}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 6 }}>
                  {subjQs.map((sq) => {
                    const globalIdx = questions.findIndex((gq) => gq.id === sq.id);
                    const s = status[sq.id] || "unanswered";
                    const isCurrent = globalIdx === current;

                    let bg = "var(--bg-surface)", borderColor = "var(--border-default)", color = "var(--fg-muted)";
                    if (s === "answered")  { bg = "#F0FDF4"; borderColor = "#22C55E"; color = "#22C55E"; }
                    else if (s === "review") { bg = "#FFFBEB"; borderColor = "#F59E0B"; color = "#F59E0B"; }
                    if (isCurrent) { bg = "var(--p-60)"; borderColor = "var(--p-60)"; color = "white"; }

                    return (
                      <button
                        key={sq.id}
                        id={`nav-q-${sq.question_number}`}
                        style={{
                          aspectRatio: "1/1", borderRadius: "var(--radius-sm)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 12, fontWeight: 700, cursor: "pointer",
                          background: bg, border: `2px solid ${borderColor}`, color,
                        }}
                        onClick={() => setCurrent(globalIdx)}
                      >
                        {sq.question_number}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Submit Modal ── */}
      {showSubmitModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, backdropFilter: "blur(4px)" }}>
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
              <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setShowSubmitModal(false)}>Keep Working</button>
              <button id="confirm-submit-btn" className="btn btn-primary" style={{ flex: 1 }} onClick={handleSubmit}>Submit Test</button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
