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
  RiLoader4Line
} from "@remixicon/react";
import { useAuth } from "@/lib/auth-context";
import { apiClient } from "@/lib/api.client";

type AnswerMap = Record<string, string>;
type StatusMap = Record<string, "unanswered" | "answered" | "review">;

export default function DPPSolvePage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const dppId = params.id as string;
  const { session } = useAuth();

  const [dpp, setDpp] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [status, setStatus] = useState<StatusMap>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [score, setScore] = useState<{ correct: number; total: number; marks: number } | null>(null);

  useEffect(() => {
    if (!session?.access_token || !dppId) return;
    setLoading(true);
    apiClient.get(`/api/v1/dpps/${dppId}/questions`, session.access_token)
      .then((res: any) => {
        if (res.success) {
           setDpp(res.data.dpp);
           // Map DB shape to UI shape
           const mappedQs = res.data.questions.map((q: any) => {
             // Convert options object to array if needed
             let optionsArray = q.options;
             if (q.options && !Array.isArray(q.options)) {
                optionsArray = Object.entries(q.options).map(([k, v]) => ({ id: k, text: String(v) }));
             }
             return {
               ...q,
               options: optionsArray || []
             };
           });
           setQuestions(mappedQs);
           setTimeLeft((res.data.dpp?.total_questions ?? 10) * 90);
        }
      })
      .finally(() => setLoading(false));
  }, [session?.access_token, dppId]);

  const handleSubmit = useCallback(async () => {
    // Submit to real API endpoint here
    let correct = 0;
    const answerUpserts = questions.map((q) => {
      const isCorrect = answers[q.id] === q.correct_answer;
      if (isCorrect) correct++;
      return {
        questionId: q.id,
        selectedAnswer: answers[q.id] ?? null,
        isCorrect,
        timeTakenSec: 0, // Placeholder for real time tracking
        markedReview: status[q.id] === "review"
      };
    });

    const marks = correct * 4 - (Object.keys(answers).length - correct) * 1;
    
    // In a real app we'd await this, but for UX let's set local state immediately
    if (session?.access_token) {
      apiClient.post(`/api/v1/attempts`, {
        examCode: `dpp-${dppId}`,
        status: "submitted",
        score: marks,
        maxScore: questions.length * 4,
        answers: answerUpserts
      }, session.access_token);
    }

    setScore({ correct, total: questions.length, marks });
    setSubmitted(true);
    setShowSubmitModal(false);
  }, [answers, questions, session?.access_token, dppId, status]);

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
  // ── Not found / Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-b-surface2 flex flex-col items-center justify-center gap-4">
        <RiLoader4Line size={48} className="text-t-tertiary animate-spin" />
        <p className="text-body-1 font-bold text-t-secondary">Loading your assignment...</p>
      </div>
    );
  }

  if (!dpp) {
    return (
      <div className="min-h-screen bg-b-surface2 flex flex-col items-center justify-center gap-4">
        <div className="text-h3">📭</div>
        <p className="text-body-1 font-bold text-t-secondary">DPP not found or you don't have access.</p>
        <Link href="/" className="btn btn-outline">← Back to Dashboard</Link>
      </div>
    );
  }

  if (dpp.status === "completed") {
    return (
      <div className="min-h-screen bg-b-surface2 flex flex-col items-center justify-center gap-4">
        <div className="text-h3">✅</div>
        <p className="text-h6 font-bold text-t-primary">You have already completed this DPP.</p>
        <p className="text-body-2 text-t-secondary">Score: {dpp.score} / {dpp.maxScore}</p>
        <Link href="/" className="btn btn-outline">← Back to Dashboard</Link>
      </div>
    );
  }

  // ── Results Screen ──────────────────────────────────────────────────────────
  if (submitted && score) {
    const pct = Math.round((score.correct / score.total) * 100);
    return (
      <div className="min-h-screen bg-b-surface2 flex items-center justify-center p-8">
        <div className="card max-w-[560px] w-full p-8 text-center border border-s-stroke2 bg-b-surface1 shadow-depth">
          <div className={`size-20 rounded-full flex items-center justify-center mx-auto mb-6 text-h4 ${
            pct >= 70
              ? "bg-primary-02/10 text-primary-02"
              : pct >= 40
                ? "bg-primary-05/10 text-primary-05"
                : "bg-primary-03/10 text-primary-03"
          }`}>
            {pct >= 70 ? "🎉" : pct >= 40 ? "📈" : "💪"}
          </div>
          <span className="label label-gray mb-4">DPP Completed</span>
          <h1 className="text-h5 font-bold text-t-primary mb-1">{dpp.title}</h1>
          <p className="text-caption text-t-secondary mb-8">{dpp.chapter} · {dpp.subject}</p>

          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="p-5 bg-b-surface2 border border-s-stroke2 rounded-[10px]">
              <div className="text-h4 font-bold text-primary-02 mb-1">{score.correct}</div>
              <div className="text-caption text-t-secondary">Correct</div>
            </div>
            <div className="p-5 bg-b-surface2 border border-s-stroke2 rounded-[10px]">
              <div className="text-h4 font-bold text-primary-03 mb-1">{score.total - score.correct}</div>
              <div className="text-caption text-t-secondary">Wrong</div>
            </div>
            <div className="p-5 bg-b-surface2 border border-s-stroke2 rounded-[10px]">
              <div className="text-h4 font-bold text-t-primary mb-1">{Math.max(0, score.marks)}</div>
              <div className="text-caption text-t-secondary">Marks</div>
            </div>
          </div>

          {/* Correct answer review */}
          <div className="text-left mb-8">
            <h3 className="text-body-2 font-bold text-t-primary mb-4">Answer Review</h3>
            <div className="flex flex-col gap-3">
              {questions.map((q, i) => {
                const yourAns = answers[q.id];
                const correctAns = q.correct_answer;
                const isRight = yourAns === correctAns;
                return (
                  <div
                    key={q.id}
                    className={`p-4 rounded-[10px] border flex gap-3 text-left ${
                      isRight
                        ? "bg-primary-02/5 border-primary-02/20 text-t-primary"
                        : "bg-primary-03/5 border-primary-03/20 text-t-primary"
                    }`}
                  >
                    <div className={`shrink-0 mt-0.5 ${isRight ? "text-primary-02" : "text-primary-03"}`}>
                      {isRight ? <RiCheckLine size={18} /> : <RiAlertLine size={18} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-body-2 font-bold text-t-primary mb-1">
                        Q{i + 1}. {(q.question_text || "").substring(0, 80)}{(q.question_text || "").length > 80 ? "…" : ""}
                      </p>
                      <p className="text-caption text-t-secondary">
                        Your answer: <strong className="text-t-primary">{yourAns ?? "Not attempted"}</strong> &nbsp;·&nbsp; Correct: <strong className="text-primary-02">{correctAns}</strong>
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex gap-4">
            <Link href="/" className="btn btn-outline flex-1">← Dashboard</Link>
            <Link href="/doubts" className="btn btn-primary flex-1">Ask a Doubt</Link>
          </div>
        </div>
      </div>
    );
  }

  // ── No questions yet ────────────────────────────────────────────────────────
  if (questions.length === 0) {
    return (
      <div className="min-h-screen bg-b-surface2 flex flex-col items-center justify-center gap-4">
        <RiBookOpenLine size={48} className="text-t-tertiary" />
        <p className="text-body-1 font-bold text-t-secondary">Questions are not available yet.</p>
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
    <div className="min-h-screen bg-b-surface2 flex flex-col">
      {/* ── Top Bar ── */}
      <header className="h-16 flex items-center justify-between px-8 bg-b-surface1 border-b border-s-stroke2 sticky top-0 z-50 shadow-widget">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex text-t-secondary hover:text-t-primary transition-colors">
            <RiArrowLeftLine size={20} />
          </Link>
          <div>
            <div className="text-body-2 font-bold text-t-primary">
              📝 DPP &nbsp;·&nbsp; {dpp.title}
            </div>
            <div className="text-caption text-t-secondary mt-0.5">
              {dpp.subject} · {dpp.chapter}
            </div>
          </div>
        </div>

        {/* Timer */}
        <div className={`flex items-center gap-2 px-5 py-2 rounded-[10px] border transition-all font-bold text-caption font-mono ${
          timeWarning
            ? "bg-primary-03/5 border-primary-03/20 text-primary-03"
            : "bg-b-surface2 border-s-stroke2 text-t-primary"
        }`}>
          <RiTimerLine size={18} className={timeWarning ? "text-primary-03" : "text-t-secondary"} />
          <span className="tabular-nums">
            {formatTime(timeLeft)}
          </span>
        </div>

        <button className="btn btn-sm btn-primary" onClick={() => setShowSubmitModal(true)}>Submit DPP</button>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* ── Question Area ── */}
        <div className="flex-1 p-8 overflow-y-auto">
          <div className="card max-w-[860px] mx-auto p-8 border border-s-stroke2 bg-b-surface1">
            {/* Tags */}
            <div className="flex gap-2 mb-6 flex-wrap">
              <span className="label label-gray">{q.subject}</span>
              <span className="label label-yellow">{q.chapter}</span>
              {q.topic && <span className="label label-gray">{q.topic}</span>}
              <span className={`label ${
                q.difficulty === "easy"
                  ? "label-green"
                  : q.difficulty === "hard"
                    ? "label-red"
                    : "label-yellow"
              }`}>
                {q.difficulty}
              </span>
            </div>

            {/* Question */}
            <div className="mb-8">
              <div className="text-caption font-bold text-t-secondary mb-2 uppercase tracking-wider">
                QUESTION {current + 1} OF {questions.length}
              </div>
              <p className="text-body-1 font-bold text-t-primary leading-relaxed">
                {q.question_text}
              </p>
            </div>

            {/* Options */}
            <div className="flex flex-col gap-3">
              {q.options.map((opt: any) => {
                const selected = answers[q.id] === opt.id;
                return (
                  <button
                    key={opt.id}
                    className={`flex items-center gap-4 p-4 rounded-[10px] cursor-pointer text-left text-body-2 transition-all ${
                      selected
                        ? "border-2 border-primary-01 bg-primary-01/5 text-t-primary font-bold shadow-depth"
                        : "border border-s-stroke2 bg-b-surface2 text-t-secondary hover:text-t-primary hover:border-s-highlight"
                    }`}
                    onClick={() => selectAnswer(q.id, opt.id)}
                  >
                    <div className={`size-8 rounded-full flex items-center justify-center shrink-0 text-caption font-bold transition-colors ${
                      selected
                        ? "bg-primary-01 text-white"
                        : "bg-b-surface1 border border-s-stroke2 text-t-primary"
                    }`}>
                      {opt.id}
                    </div>
                    <span>{opt.text}</span>
                  </button>
                );
              })}
            </div>

            {/* Navigation Buttons */}
            <div className="flex gap-4 mt-8 pt-6 border-t border-s-stroke2">
              <button
                className="btn btn-outline flex items-center gap-1"
                onClick={() => setCurrent((c) => Math.max(0, c - 1))}
                disabled={current === 0}
              >
                <RiArrowLeftLine size={16} /> Previous
              </button>
              
              <button
                className={`btn flex items-center gap-1.5 ${
                  status[q.id] === "review"
                    ? "border border-primary-05 bg-primary-05/10 text-primary-05"
                    : "btn-outline"
                }`}
                onClick={() => toggleReview(q.id)}
              >
                {status[q.id] === "review" ? (
                  <>
                    <RiStarFill size={16} /> Marked
                  </>
                ) : (
                  <>
                    <RiStarLine size={16} /> Mark for Review
                  </>
                )}
              </button>
              
              {current < questions.length - 1 ? (
                <button
                  className="btn btn-primary flex items-center gap-1 ml-auto"
                  onClick={() => setCurrent((c) => c + 1)}
                >
                  Next <RiArrowRightLine size={16} />
                </button>
              ) : (
                <button className="btn btn-primary ml-auto" onClick={() => setShowSubmitModal(true)}>
                  Submit DPP
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── Right Navigator Sidebar ── */}
        <div className="w-[280px] border-l border-s-stroke2 p-6 overflow-y-auto bg-b-surface1 flex flex-col">
          <div className="grid grid-cols-3 gap-2 p-4 bg-b-surface2 border border-s-stroke2 rounded-[10px] mb-6">
            {[
              { label: "Done", value: answered, color: "text-primary-02" },
              { label: "Review", value: marked, color: "text-primary-05" },
              { label: "Left", value: unanswered, color: "text-t-secondary" },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <div className={`text-body-2 font-bold ${s.color}`}>{s.value}</div>
                <div className="text-caption text-t-secondary mt-1">{s.label}</div>
              </div>
            ))}
          </div>
          
          <div className="text-caption font-bold text-t-secondary mb-3 uppercase tracking-wider">Questions</div>
          
          <div className="grid grid-cols-5 gap-2">
            {questions.map((sq, idx) => {
              const s = status[sq.id] || "unanswered";
              const isCurrent = idx === current;
              
              let btnClass = "bg-b-surface2 border border-s-stroke2 text-t-secondary hover:border-s-highlight";
              if (s === "answered") {
                btnClass = "bg-primary-02/10 border border-primary-02 text-primary-02";
              } else if (s === "review") {
                btnClass = "bg-primary-05/10 border border-primary-05 text-primary-05";
              }
              if (isCurrent) {
                btnClass = "bg-primary-01 text-white border-none shadow-depth";
              }
              
              return (
                <button
                  key={sq.id}
                  className={`aspect-square rounded-[10px] flex items-center justify-center text-caption font-bold cursor-pointer transition-all ${btnClass}`}
                  onClick={() => setCurrent(idx)}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>

          <div className="mt-8 p-4 bg-b-surface2 border border-s-stroke2 rounded-[10px]">
            <div className="text-caption font-bold text-t-primary mb-1">📌 Due Date</div>
            <div className="text-caption text-t-secondary">{dpp.dueDate}</div>
            
            <div className="text-caption font-bold text-t-primary mt-4 mb-1">Marking Scheme</div>
            <div className="text-caption text-t-secondary">✅ +4 correct &nbsp;·&nbsp; ❌ -1 wrong</div>
          </div>
        </div>
      </div>

      {/* ── Submit Modal ── */}
      {showSubmitModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50">
          <div className="card max-w-[440px] w-[90%] p-8 text-center border border-s-stroke2 bg-b-surface1 shadow-depth">
            <RiFlag2Fill size={48} className="mx-auto mb-4 text-t-primary" />
            <h2 className="text-sub-title-2 font-bold text-t-primary mb-2">Submit DPP?</h2>
            <p className="text-caption text-t-secondary leading-relaxed mb-6">
              You&apos;ve answered <strong className="text-t-primary">{answered}</strong> of{" "}
              <strong className="text-t-primary">{questions.length}</strong> questions.
              {unanswered > 0 && ` ${unanswered} left unanswered.`}
            </p>
            <div className="flex gap-4">
              <button className="btn btn-outline flex-1" onClick={() => setShowSubmitModal(false)}>
                Keep Working
              </button>
              <button className="btn btn-primary flex-1" onClick={handleSubmit}>
                Submit & Score
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
