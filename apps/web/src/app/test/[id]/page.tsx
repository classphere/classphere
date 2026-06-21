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

const DEMO_QUESTIONS: Question[] = [
  {
    id: "demo-q1",
    question_number: 1,
    question_text: "Position of an ant moving in the Y-Z plane is given by $\vec{s}=2t^2\hat{j}+5\hat{k}$. The magnitude and direction of velocity at $t=1\,s$ will be:",
    question_images: [],
    options: [
      { id: "A", text: "$16\,m/s$ in $y$-direction", image_url: null },
      { id: "B", text: "$4\,m/s$ in $x$-direction", image_url: null },
      { id: "C", text: "$9\,m/s$ in $z$-direction", image_url: null },
      { id: "D", text: "$4\,m/s$ in y-direction", image_url: null },
    ],
    correct_answer: ["D"],
    explanation: "",
    question_type: "mcq_single",
    subject: "Physics",
    chapter: "Kinematics",
    topic: "speed and velocity",
    difficulty: "medium",
    marking_scheme: { correct: 4, incorrect: -1, unattempted: 0 },
  },
  {
    id: "demo-q2",
    question_number: 2,
    question_text: "The number of significant figures in 0.004560 is:",
    question_images: [],
    options: [
      { id: "A", text: "2", image_url: null },
      { id: "B", text: "3", image_url: null },
      { id: "C", text: "4", image_url: null },
      { id: "D", text: "5", image_url: null },
    ],
    correct_answer: ["C"],
    explanation: "",
    question_type: "mcq_single",
    subject: "Chemistry",
    chapter: "Some Basic Concepts",
    topic: "significant figures",
    difficulty: "easy",
    marking_scheme: { correct: 4, incorrect: -1, unattempted: 0 },
  },
  {
    id: "demo-q3",
    question_number: 3,
    question_text: "If $\int x\,dx = \frac{x^n}{n}+C$, then the value of $n$ is:",
    question_images: [],
    options: [
      { id: "A", text: "1", image_url: null },
      { id: "B", text: "2", image_url: null },
      { id: "C", text: "0", image_url: null },
      { id: "D", text: "3", image_url: null },
    ],
    correct_answer: ["B"],
    explanation: "",
    question_type: "mcq_single",
    subject: "Mathematics",
    chapter: "Differentiation and Integration",
    topic: "indefinite integration",
    difficulty: "medium",
    marking_scheme: { correct: 4, incorrect: -1, unattempted: 0 },
  },
  {
    id: "demo-q4",
    question_number: 4,
    question_text: "In a diploid cell, the chromosome number after mitosis remains:",
    question_images: [],
    options: [
      { id: "A", text: "Haploid", image_url: null },
      { id: "B", text: "Diploid", image_url: null },
      { id: "C", text: "Triploid", image_url: null },
      { id: "D", text: "Tetraploid", image_url: null },
    ],
    correct_answer: ["B"],
    explanation: "",
    question_type: "mcq_single",
    subject: "Biology",
    chapter: "Cell Division",
    topic: "mitosis",
    difficulty: "easy",
    marking_scheme: { correct: 4, incorrect: -1, unattempted: 0 },
  },
  {
    id: "demo-q5",
    question_number: 5,
    question_text: "For a first-order reaction, the unit of rate constant is:",
    question_images: [],
    options: [
      { id: "A", text: "$s^{-1}$", image_url: null },
      { id: "B", text: "$mol\,L^{-1}\,s^{-1}$", image_url: null },
      { id: "C", text: "$L\,mol^{-1}\,s^{-1}$", image_url: null },
      { id: "D", text: "$mol\,s^{-1}$", image_url: null },
    ],
    correct_answer: ["A"],
    explanation: "",
    question_type: "mcq_single",
    subject: "Chemistry",
    chapter: "Chemical Kinetics",
    topic: "rate constant",
    difficulty: "medium",
    marking_scheme: { correct: 4, incorrect: -1, unattempted: 0 },
  },
];

const DEMO_META: PYQMeta = {
  id: "demo-pyq-jee-main-2024-jan-shift1",
  exam: "JEE Main",
  year: 2024,
  shift: "27 Jan Shift 1",
  questions: DEMO_QUESTIONS.length,
  duration: 180,
};

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
  const [timeLeft, setTimeLeft]           = useState<number | null>(null);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [isDemoMode, setIsDemoMode]       = useState(false);

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
            setIsDemoMode(false);
          } else {
            setError(res.message ?? "Failed to load questions.");
          }
        })
        .catch(() => {
          setQuestions(DEMO_QUESTIONS);
          setMeta(DEMO_META);
          setTimeLeft(DEMO_META.duration * 60);
          setIsDemoMode(true);
        })
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
    if (timeLeft === null || timeLeft <= 0 || loading) return;
    const t = setTimeout(() => setTimeLeft((s) => (s !== null ? s - 1 : null)), 1000);
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
      <div className="min-h-screen bg-b-surface1 text-t-primary">
        <header className="border-b border-s-stroke2/70 bg-b-surface1/95">
          <div className="mx-auto flex w-full max-w-screen-2xl flex-col gap-4 px-4 py-4 md:px-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-2">
              <div className="h-5 w-28 rounded-full bg-b-surface2" />
              <div className="h-8 w-72 max-w-full rounded-2xl bg-b-surface2" />
            </div>
            <div className="flex items-center gap-3">
              <div className="h-11 w-28 rounded-3xl bg-b-surface2" />
              <div className="h-11 w-36 rounded-3xl bg-b-surface2" />
            </div>
          </div>
        </header>
        <main className="mx-auto grid w-full max-w-screen-2xl gap-6 px-4 py-6 lg:px-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
          <section className="card min-w-0 p-5 md:p-7">
            <div className="mb-5 flex flex-wrap gap-2">
              <div className="h-7 w-20 rounded-full bg-b-surface2" />
              <div className="h-7 w-28 rounded-full bg-b-surface2" />
              <div className="h-7 w-20 rounded-full bg-b-surface2" />
            </div>
            <div className="mb-6 h-6 w-40 rounded-full bg-b-surface2" />
            <div className="space-y-3">
              <div className="h-20 rounded-3xl bg-b-surface2" />
              <div className="h-20 rounded-3xl bg-b-surface2" />
              <div className="h-20 rounded-3xl bg-b-surface2" />
              <div className="h-20 rounded-3xl bg-b-surface2" />
            </div>
            <div className="mt-8 flex gap-3 border-t border-s-stroke2 pt-6">
              <div className="h-11 flex-1 rounded-3xl bg-b-surface2" />
              <div className="h-11 flex-1 rounded-3xl bg-b-surface2" />
              <div className="h-11 flex-1 rounded-3xl bg-b-surface2" />
            </div>
          </section>
          <aside className="card min-w-0 p-5 md:p-6">
            <div className="mb-5 grid grid-cols-3 gap-3">
              <div className="h-20 rounded-3xl bg-b-surface2" />
              <div className="h-20 rounded-3xl bg-b-surface2" />
              <div className="h-20 rounded-3xl bg-b-surface2" />
            </div>
            <div className="space-y-5">
              <div className="h-28 rounded-3xl bg-b-surface2" />
              <div className="h-28 rounded-3xl bg-b-surface2" />
            </div>
          </aside>
        </main>
        <div className="mx-auto flex w-full max-w-screen-2xl items-center justify-center gap-3 px-4 pb-6 text-t-secondary">
          <RiLoader4Line size={18} className="animate-spin text-primary-01" />
          <p className="text-body-2 font-semibold">Loading questions from backend…</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-b-surface1 px-6 text-center">
        <div className="text-5xl">⚠️</div>
        <p className="text-body-1 font-semibold text-[#FF6A55]">{error}</p>
        <button className="btn btn-outline" onClick={() => router.push("/pyqs")}>← Back to PYQs</button>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-b-surface1 px-6">
        <p className="text-body-1 text-t-secondary">No questions found.</p>
      </div>
    );
  }

  const q          = questions[current];
  const answered   = Object.values(status).filter((s) => s === "answered").length;
  const marked     = Object.values(status).filter((s) => s === "review").length;
  const unanswered = questions.length - answered - marked;
  const timeWarning = timeLeft !== null && timeLeft < 300;

  // ── Group questions by subject for navigator labels ─────────────────────────
  const subjects = [...new Set(questions.map((q) => q.subject))];

  return (
    <div className="min-h-screen bg-b-surface1 text-t-primary">
      {/* ── Top Bar ── */}
      <header className="sticky top-0 z-50 border-b border-s-stroke2/70 bg-b-surface1/95 backdrop-blur-0">
        <div className="mx-auto flex w-full max-w-screen-2xl flex-col gap-4 px-4 py-4 md:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-3 text-h6 font-bold tracking-tight text-t-primary">
              <span>Exam</span>
              <span className="text-primary-01">Prep</span>
            </div>
            {meta && (
              <div className="mt-1 flex flex-wrap items-center gap-2 text-caption text-t-secondary">
                <span className="label label-gray">{meta.exam} {meta.year}</span>
                <span className="label label-gray">{meta.shift}</span>
                <span className="label label-gray">{questions.length} Questions</span>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className={`flex items-center gap-3 rounded-3xl border px-4 py-2.5 ${timeWarning ? "border-[#FF6A55]/30 bg-[#FF6A55]/5" : "border-s-stroke2 bg-b-surface2"}`}>
              <span className={`${timeWarning ? "text-[#FF6A55]" : "text-t-primary"}`}>
                <RiTimerLine size={18} />
              </span>
              <span className={`text-body-2 font-bold tabular-nums ${timeWarning ? "text-[#FF6A55]" : "text-t-primary"}`}>
                {timeLeft !== null ? formatTime(timeLeft) : "--:--"}
              </span>
            </div>

            <button id="submit-test-btn" className="btn btn-primary" onClick={() => setShowSubmitModal(true)}>
              Submit Test
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-screen-2xl gap-6 px-4 py-6 lg:px-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        {isDemoMode && (
          <div className="xl:col-span-2">
            <div className="flex flex-col gap-3 rounded-[32px] border border-amber-200/70 bg-amber-50/70 px-5 py-4 text-amber-950 shadow-sm backdrop-blur-sm md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-caption font-bold uppercase tracking-[0.24em] text-amber-700">Demo preview</p>
                <p className="mt-1 text-body-2 font-medium text-amber-950/90">
                  The API is unavailable in this session, so the exam shell is rendering against a local paper sample.
                </p>
              </div>
              <button className="btn btn-outline border-amber-300 bg-white/70 text-amber-950" onClick={() => router.push("/pyqs")}>Open PYQs</button>
            </div>
          </div>
        )}

        {/* ── Question Area ── */}
        <section className="card min-w-0 p-5 md:p-7">
          <div className="mb-5 flex flex-wrap items-center gap-2">
            <span className="label label-gray">{q.subject}</span>
            <span className="label label-gray">{q.chapter}</span>
            {q.topic && <span className="label label-gray">{q.topic}</span>}
            <span className={`label ${q.difficulty === "easy" ? "label-green" : q.difficulty === "hard" ? "label-red" : "label-yellow"}`}>
              {q.difficulty}
            </span>
          </div>

          <div className="mb-6 flex items-start justify-between gap-4 border-b border-s-stroke2 pb-5">
            <div className="min-w-0">
              <div className="text-overline font-bold uppercase tracking-wider text-t-tertiary">
                Question {current + 1} of {questions.length}
              </div>
              <p className="mt-2 text-h6 leading-relaxed text-t-primary md:text-h5">
                <Latex>{q.question_text}</Latex>
              </p>
            </div>
            <div className="hidden shrink-0 rounded-3xl border border-s-stroke2 bg-b-surface2 px-4 py-2 text-right sm:block">
              <div className="text-caption text-t-secondary">Progress</div>
              <div className="text-body-2 font-bold text-t-primary">{answered + marked}/{questions.length}</div>
            </div>
          </div>

          {/* Question images */}
          {q.question_images && q.question_images.length > 0 && (
            <div className="mb-6 flex flex-wrap gap-3">
              {q.question_images.map((url, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={i} src={url} alt={`Figure ${i + 1}`} className="max-w-full rounded-2xl border border-s-stroke2" referrerPolicy="no-referrer" />
              ))}
            </div>
          )}

          {/* Options or Text Input */}
          <div className="space-y-3">
            {!q.options || q.options.length === 0 ? (
              <div className="max-w-xl">
                <label className="mb-2 block text-caption font-bold uppercase tracking-wider text-t-tertiary">
                  Enter numerical answer
                </label>
                <input
                  type="text"
                  className="input h-12 rounded-3xl px-4 text-body-1 font-semibold"
                  placeholder="Type your answer..."
                  value={answers[q.id] || ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    setAnswers((a) => ({ ...a, [q.id]: val }));
                    setStatus((s) => ({ ...s, [q.id]: val ? "answered" : "unanswered" }));
                  }}
                />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {q.options.map((opt) => {
                  const selected = answers[q.id] === opt.id;
                  return (
                    <button
                      key={opt.id}
                      id={`option-${opt.id}`}
                      className={`flex items-center gap-4 rounded-3xl border p-4 text-left transition-all ${
                        selected
                          ? "border-primary-01 bg-primary-01/5 shadow-widget"
                          : "border-s-stroke2 bg-b-surface2 hover:border-s-highlight"
                      }`}
                      onClick={() => selectAnswer(q.id, opt.id)}
                    >
                      <div className={`flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${selected ? "bg-primary-01 text-t-light" : "bg-b-surface1 text-t-primary"}`}>
                        {opt.id}
                      </div>
                      <div className="min-w-0 flex-1 text-body-2 font-medium text-t-primary">
                        {opt.text && <Latex>{opt.text}</Latex>}
                        {opt.image_url && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={opt.image_url} alt={`Option ${opt.id}`} className="mt-2 size-36 object-contain rounded-2xl bg-white p-2 border border-s-stroke2/50" referrerPolicy="no-referrer" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Nav buttons */}
          <div className="mt-8 flex flex-col gap-3 border-t border-s-stroke2 pt-6 sm:flex-row">
            <button
              className="btn btn-outline justify-center gap-2 sm:flex-1"
              onClick={() => setCurrent((c) => Math.max(0, c - 1))}
              disabled={current === 0}
            >
              <RiArrowLeftLine size={18} /> Previous
            </button>
            <button
              className={`btn justify-center gap-2 sm:flex-1 ${status[q.id] === "review" ? "btn-outline" : "btn-ghost"}`}
              onClick={() => toggleReview(q.id)}
            >
              {status[q.id] === "review" ? <><RiStarFill size={18} /> Marked</> : <><RiStarLine size={18} /> Mark for Review</>}
            </button>
            {current < questions.length - 1 ? (
              <button className="btn btn-primary justify-center gap-2 sm:flex-1" onClick={() => setCurrent((c) => c + 1)}>
                Next Question <RiArrowRightLine size={18} />
              </button>
            ) : (
              <button className="btn btn-primary justify-center sm:flex-1" onClick={() => setShowSubmitModal(true)}>
                Submit Test
              </button>
            )}
          </div>
        </section>

        {/* ── Right Panel: Question Navigator ── */}
        <aside className="card min-w-0 p-5 md:p-6 xl:sticky xl:top-[7.5rem] xl:h-[calc(100vh-9rem)] xl:overflow-y-auto">
          <div className="mb-5 grid grid-cols-3 gap-3">
            {[
              { label: "Done", value: answered, color: "text-[#00A656]" },
              { label: "Review", value: marked, color: "text-[#EF9D0E]" },
              { label: "Left", value: unanswered, color: "text-t-secondary" },
            ].map((s) => (
              <div key={s.label} className="rounded-3xl bg-b-surface2 p-3 text-center">
                <div className={`text-h6 font-bold ${s.color}`}>{s.value}</div>
                <div className="text-caption font-semibold text-t-secondary">{s.label}</div>
              </div>
            ))}
          </div>

          {subjects.map((subj) => {
            const subjQs = questions.filter((item) => item.subject === subj);
            return (
              <div key={subj} className="mb-5 last:mb-0">
                <div className="mb-3 text-overline font-bold uppercase tracking-wider text-t-tertiary">
                  {subj}
                </div>
                <div className="grid grid-cols-5 gap-2 sm:grid-cols-6 lg:grid-cols-5">
                  {subjQs.map((sq) => {
                    const globalIdx = questions.findIndex((gq) => gq.id === sq.id);
                    const s = status[sq.id] || "unanswered";
                    const isCurrent = globalIdx === current;

                    let classes = "border-s-stroke2 bg-b-surface1 text-t-secondary";
                    if (s === "answered") classes = "border-[#00A656]/30 bg-[#00A656]/5 text-[#00A656]";
                    if (s === "review") classes = "border-[#EF9D0E]/30 bg-[#EF9D0E]/5 text-[#EF9D0E]";
                    if (isCurrent) classes = "border-primary-01 bg-primary-01 text-t-light shadow-widget";

                    return (
                      <button
                        key={sq.id}
                        id={`nav-q-${sq.question_number}`}
                        className={`aspect-square rounded-2xl border text-sm font-bold transition-all hover:scale-[1.02] ${classes}`}
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
        </aside>
      </main>

      {/* ── Submit Modal ── */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 px-4 py-6">
          <div className="card w-full max-w-lg p-6 text-center md:p-8">
            <div className="mb-4 flex justify-center text-t-primary">
              <RiFlag2Fill size={48} />
            </div>
            <h2 className="text-h4 font-semibold text-t-primary">Ready to Submit?</h2>
            <p className="mt-3 text-body-2 leading-relaxed text-t-secondary">
              You&apos;ve answered <strong className="text-t-primary">{answered}</strong> of{" "}
              <strong className="text-t-primary">{questions.length}</strong> questions.
              {unanswered > 0 && ` ${unanswered} questions are still unanswered.`}
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button className="btn btn-outline flex-1" onClick={() => setShowSubmitModal(false)}>Keep Working</button>
              <button id="confirm-submit-btn" className="btn btn-primary flex-1" onClick={handleSubmit}>Submit Test</button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
