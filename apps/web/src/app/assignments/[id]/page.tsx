"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import {
  RiTimerLine,
  RiArrowLeftLine,
  RiArrowRightLine,
  RiFlag2Fill,
  RiStarFill,
  RiStarLine,
  RiBookOpenLine,
  RiCheckLine,
  RiAlertLine,
} from "@remixicon/react";
import { mockStudentDPPs, mockDPPQuestions } from "@/lib/mock-data";

type AnswerMap = Record<string, string>;
type StatusMap = Record<string, "unanswered" | "answered" | "review">;

export default function DPPSolvePage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const dppId = params.id;

  const dpp = mockStudentDPPs.find((d) => d.id === dppId);
  const questions = mockDPPQuestions[dppId] ?? [];

  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [status, setStatus] = useState<StatusMap>({});
  const [timeLeft, setTimeLeft] = useState((dpp?.totalQuestions ?? 10) * 90); // 90s per question
  const [submitted, setSubmitted] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [score, setScore] = useState<{ correct: number; total: number; marks: number } | null>(null);

  const handleSubmit = useCallback(() => {
    // Score calculation
    let correct = 0;
    questions.forEach((q) => {
      if (answers[q.id] === q.correctAnswer) correct++;
    });
    const marks = correct * 4 - (Object.keys(answers).length - correct) * 1;
    setScore({ correct, total: questions.length, marks });
    setSubmitted(true);
    setShowSubmitModal(false);
  }, [answers, questions]);

  // Timer
  useEffect(() => {
    if (submitted || timeLeft <= 0) return;
    const t = setTimeout(() => setTimeLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [timeLeft, submitted]);

  useEffect(() => {
    if (!submitted && timeLeft === 0 && questions.length > 0) handleSubmit();
  }, [timeLeft, submitted, questions.length, handleSubmit]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
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

  // ── Not found ──────────────────────────────────────────────────────────────
  if (!dpp) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16 }}>
        <div style={{ fontSize: 48 }}>📭</div>
        <p style={{ fontWeight: 600, color: "var(--fg-muted)" }}>DPP not found.</p>
        <Link href="/" className="btn btn-outline">← Back to Dashboard</Link>
      </div>
    );
  }

  if (dpp.status === "completed") {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16 }}>
        <div style={{ fontSize: 48 }}>✅</div>
        <p style={{ fontWeight: 700, fontSize: 20 }}>You have already completed this DPP.</p>
        <p style={{ color: "var(--fg-muted)" }}>Score: {dpp.score} / {dpp.maxScore}</p>
        <Link href="/" className="btn btn-outline">← Back to Dashboard</Link>
      </div>
    );
  }

  // ── Results Screen ──────────────────────────────────────────────────────────
  if (submitted && score) {
    const pct = Math.round((score.correct / score.total) * 100);
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg-default)", display: "flex", alignItems: "center", justifyContent: "center", padding: 32 }}>
        <div className="rayum-card" style={{ maxWidth: 560, width: "100%", padding: 48, textAlign: "center" }}>
          <div style={{ width: 80, height: 80, borderRadius: "50%", background: pct >= 70 ? "#F0FDF4" : pct >= 40 ? "#FFFBEB" : "#FEF2F2", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px", fontSize: 40 }}>
            {pct >= 70 ? "🎉" : pct >= 40 ? "📈" : "💪"}
          </div>
          <span className="badge badge-dark" style={{ marginBottom: 16 }}>DPP Completed</span>
          <h1 className="t-title-page-b" style={{ marginBottom: 8, fontWeight: 800 }}>{dpp.title}</h1>
          <p className="t-body-sm" style={{ marginBottom: 32, color: "var(--fg-muted)" }}>{dpp.chapter} · {dpp.subject}</p>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 40 }}>
            <div style={{ padding: 20, background: "var(--n-10)", borderRadius: "var(--r-md)" }}>
              <div className="t-heading-b" style={{ color: "var(--s-50)", marginBottom: 4 }}>{score.correct}</div>
              <div className="t-body-sm">Correct</div>
            </div>
            <div style={{ padding: 20, background: "var(--n-10)", borderRadius: "var(--r-md)" }}>
              <div className="t-heading-b" style={{ color: "var(--danger-50)", marginBottom: 4 }}>{score.total - score.correct}</div>
              <div className="t-body-sm">Wrong</div>
            </div>
            <div style={{ padding: 20, background: "var(--n-10)", borderRadius: "var(--r-md)" }}>
              <div className="t-heading-b" style={{ marginBottom: 4 }}>{Math.max(0, score.marks)}</div>
              <div className="t-body-sm">Marks</div>
            </div>
          </div>

          {/* Correct answer review */}
          <div style={{ textAlign: "left", marginBottom: 32 }}>
            <h3 className="section-title">Answer Review</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {questions.map((q, i) => {
                const yourAns = answers[q.id];
                const correct = q.correctAnswer;
                const isRight = yourAns === correct;
                return (
                  <div key={q.id} style={{ padding: "12px 16px", borderRadius: "var(--r-md)", background: isRight ? "#F0FDF4" : "#FEF2F2", border: `1px solid ${isRight ? "#22C55E" : "#EF4444"}`, display: "flex", gap: 12, alignItems: "flex-start" }}>
                    <div style={{ color: isRight ? "#22C55E" : "#EF4444", flexShrink: 0, marginTop: 2 }}>
                      {isRight ? <RiCheckLine size={18} /> : <RiAlertLine size={18} />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p className="t-body-sm-med" style={{ marginBottom: 4 }}>Q{i + 1}. {q.questionText.substring(0, 80)}{q.questionText.length > 80 ? "…" : ""}</p>
                      <p className="t-body-sm" style={{ color: "var(--fg-muted)" }}>
                        Your answer: <strong>{yourAns ?? "Not attempted"}</strong> &nbsp;·&nbsp; Correct: <strong style={{ color: "#22C55E" }}>{correct}</strong>
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ display: "flex", gap: 12 }}>
            <Link href="/" className="btn btn-outline" style={{ flex: 1 }}>← Dashboard</Link>
            <Link href="/doubts" className="btn btn-primary" style={{ flex: 1 }}>Ask a Doubt</Link>
          </div>
        </div>
      </div>
    );
  }

  // ── No questions yet (upcoming/no data) ─────────────────────────────────────
  if (questions.length === 0) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16 }}>
        <RiBookOpenLine size={48} color="var(--fg-muted)" />
        <p style={{ fontWeight: 600, color: "var(--fg-muted)" }}>Questions are not available yet.</p>
        <Link href="/" className="btn btn-outline">← Back to Dashboard</Link>
      </div>
    );
  }

  const q = questions[current];
  const answered = Object.values(status).filter((s) => s === "answered").length;
  const marked = Object.values(status).filter((s) => s === "review").length;
  const unanswered = questions.length - answered - marked;
  const timeWarning = timeLeft < 120;

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-default)", display: "flex", flexDirection: "column" }}>

      {/* ── Top Bar ── */}
      <header style={{ height: 64, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 32px", background: "var(--bg-surface)", borderBottom: "1px solid var(--border-default)", position: "sticky", top: 0, zIndex: 50, boxShadow: "var(--sh-100)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <Link href="/" style={{ display: "flex", color: "var(--fg-muted)", textDecoration: "none" }}>
            <RiArrowLeftLine size={20} />
          </Link>
          <div>
            <div className="t-body-base-bold" style={{ color: "var(--fg-default)" }}>
              📝 DPP &nbsp;<span style={{ color: "var(--p-50)" }}>·</span>&nbsp; {dpp.title}
            </div>
            <div className="t-body-sm-med" style={{ color: "var(--fg-muted)" }}>
              {dpp.subject} · {dpp.chapter}
            </div>
          </div>
        </div>

        {/* Timer */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 20px", borderRadius: "var(--r-full)", background: timeWarning ? "#FEF2F2" : "var(--n-10)", border: `1px solid ${timeWarning ? "#EF4444" : "var(--border-default)"}` }}>
          <RiTimerLine size={18} color={timeWarning ? "#EF4444" : "var(--fg-default)"} />
          <span style={{ fontWeight: 800, fontSize: 16, fontVariantNumeric: "tabular-nums", color: timeWarning ? "#EF4444" : "var(--fg-default)" }}>
            {formatTime(timeLeft)}
          </span>
        </div>

        <button className="btn btn-primary" onClick={() => setShowSubmitModal(true)}>Submit DPP</button>
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
              <span className="rayum-badge" style={{ background: q.difficulty === "easy" ? "#F0FDF4" : q.difficulty === "hard" ? "#FEF2F2" : "#FFFBEB", color: q.difficulty === "easy" ? "#16A34A" : q.difficulty === "hard" ? "#DC2626" : "#D97706", border: "none" }}>
                {q.difficulty}
              </span>
            </div>

            {/* Question */}
            <div style={{ marginBottom: 40 }}>
              <div className="text-label" style={{ marginBottom: 12 }}>
                QUESTION {current + 1} OF {questions.length}
              </div>
              <p className="t-body-lg-med" style={{ color: "var(--fg-default)" }}>
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
                    style={{ display: "flex", alignItems: "center", gap: 16, padding: "16px 20px", borderRadius: "var(--r-md)", cursor: "pointer", textAlign: "left", fontSize: 16, fontWeight: 500, background: selected ? "var(--p-10)" : "var(--bg-default)", border: selected ? "2px solid var(--p-50)" : "1.5px solid var(--border-default)", color: selected ? "var(--fg-default)" : "var(--fg-muted)", transition: "all 0.15s" }}
                    onClick={() => selectAnswer(q.id, opt.id)}
                  >
                    <div style={{ width: 32, height: 32, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: selected ? "var(--p-60)" : "var(--n-20)", color: selected ? "white" : "var(--fg-default)", fontSize: 14, fontWeight: 700 }}>
                      {opt.id}
                    </div>
                    <span>{opt.text}</span>
                  </button>
                );
              })}
            </div>

            {/* Nav */}
            <div style={{ display: "flex", gap: 16, marginTop: 40, borderTop: "1px solid var(--border-default)", paddingTop: 32 }}>
              <button className="btn btn-outline" style={{ display: "inline-flex", gap: 8 }} onClick={() => setCurrent((c) => Math.max(0, c - 1))} disabled={current === 0}>
                <RiArrowLeftLine size={18} /> Previous
              </button>
              <button className="btn" onClick={() => toggleReview(q.id)} style={{ display: "inline-flex", gap: 8, background: status[q.id] === "review" ? "#FFFBEB" : "transparent", color: status[q.id] === "review" ? "#F59E0B" : "var(--fg-muted)", border: `1.5px solid ${status[q.id] === "review" ? "#F59E0B" : "var(--border-default)"}` }}>
                {status[q.id] === "review" ? <><RiStarFill size={18} /> Marked</> : <><RiStarLine size={18} /> Mark for Review</>}
              </button>
              {current < questions.length - 1 ? (
                <button className="btn btn-primary" style={{ display: "inline-flex", gap: 8, marginLeft: "auto" }} onClick={() => setCurrent((c) => c + 1)}>
                  Next <RiArrowRightLine size={18} />
                </button>
              ) : (
                <button className="btn btn-primary" style={{ marginLeft: "auto" }} onClick={() => setShowSubmitModal(true)}>Submit DPP</button>
              )}
            </div>
          </div>
        </div>

        {/* ── Right Navigator ── */}
        <div style={{ width: 280, borderLeft: "1px solid var(--border-default)", padding: "32px 24px", overflowY: "auto", background: "var(--bg-surface)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 24, padding: 16, borderRadius: "var(--r-md)", background: "var(--n-10)", border: "1px solid var(--border-default)" }}>
            {[{ label: "Done", value: answered, color: "#22C55E" }, { label: "Review", value: marked, color: "#F59E0B" }, { label: "Left", value: unanswered, color: "var(--fg-muted)" }].map((s) => (
              <div key={s.label} style={{ textAlign: "center" }}>
                <div className="t-sub-b" style={{ color: s.color }}>{s.value}</div>
                <div className="t-body-sm-med" style={{ color: "var(--fg-muted)", marginTop: 4 }}>{s.label}</div>
              </div>
            ))}
          </div>
          <div className="text-label" style={{ marginBottom: 12 }}>Questions</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 6 }}>
            {questions.map((sq, idx) => {
              const s = status[sq.id] || "unanswered";
              const isCurrent = idx === current;
              let bg = "var(--bg-surface)", borderColor = "var(--border-default)", color = "var(--fg-muted)";
              if (s === "answered") { bg = "#F0FDF4"; borderColor = "#22C55E"; color = "#22C55E"; }
              else if (s === "review") { bg = "#FFFBEB"; borderColor = "#F59E0B"; color = "#F59E0B"; }
              if (isCurrent) { bg = "var(--p-60)"; borderColor = "var(--p-60)"; color = "white"; }
              return (
                <button key={sq.id} style={{ aspectRatio: "1/1", borderRadius: "var(--r-sm)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, cursor: "pointer", background: bg, border: `2px solid ${borderColor}`, color }} onClick={() => setCurrent(idx)}>
                  {idx + 1}
                </button>
              );
            })}
          </div>

          <div style={{ marginTop: 32, padding: 16, background: "var(--n-10)", borderRadius: "var(--r-md)" }}>
            <div className="t-body-sm-bold" style={{ marginBottom: 8 }}>📌 Due Date</div>
            <div className="t-body-sm" style={{ color: "var(--fg-muted)" }}>{dpp.dueDate}</div>
            <div className="t-body-sm-bold" style={{ marginTop: 12, marginBottom: 4 }}>Marking Scheme</div>
            <div className="t-body-sm" style={{ color: "var(--fg-muted)" }}>✅ +4 correct &nbsp;·&nbsp; ❌ -1 wrong</div>
          </div>
        </div>
      </div>

      {/* ── Submit Modal ── */}
      {showSubmitModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, backdropFilter: "blur(4px)" }}>
          <div className="rayum-card" style={{ maxWidth: 440, width: "90%", padding: 40, textAlign: "center" }}>
            <RiFlag2Fill size={48} style={{ margin: "0 auto 16px", color: "var(--fg-default)" }} />
            <h2 className="section-title" style={{ marginBottom: 12 }}>Submit DPP?</h2>
            <p className="t-body-sm" style={{ color: "var(--fg-muted)", marginBottom: 32, lineHeight: 1.6 }}>
              You&apos;ve answered <strong style={{ color: "var(--fg-default)" }}>{answered}</strong> of{" "}
              <strong style={{ color: "var(--fg-default)" }}>{questions.length}</strong> questions.
              {unanswered > 0 && ` ${unanswered} left unanswered.`}
            </p>
            <div style={{ display: "flex", gap: 16 }}>
              <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setShowSubmitModal(false)}>Keep Working</button>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleSubmit}>Submit & See Score</button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
