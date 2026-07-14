"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import "katex/dist/katex.min.css";
import { API_V1_URL, apiClient } from "@/lib/api.client";
import { useAuth } from "@/lib/auth-context";

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
  image_url?: string | null;
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

const API_BASE = API_V1_URL;

const DEMO_QUESTIONS: Question[] = [
  {
    id: "demo-q1",
    question_number: 1,
    question_text: "Position of an ant moving in the Y-Z plane is given by $\vec{s}=2t^2\hat{j}+5\hat{k}$. The magnitude and direction of velocity at $t=1\,s$ will be:",
    image_url: null,
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
    image_url: null,
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
    image_url: null,
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
    image_url: null,
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
    image_url: null,
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
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const testId = params.id; // e.g. "pyq-jee-main-2024-jan-shift1"
  const { session } = useAuth();

  const [questions, setQuestions] = useState<Question[]>([]);
  const [meta, setMeta] = useState<PYQMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [status, setStatus] = useState<StatusMap>({});
  const [visitedQs, setVisitedQs] = useState<Record<string, boolean>>({});
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);

  // ── Timing tracking (Option B: start_timestamp) ─────────────────────────────
  /** Unix ms when the exam timer started (set once when questions load) */
  const examStartMsRef = useRef<number | null>(null);
  /** Maps question_id → seconds-offset-from-exam-start when student first opened it */
  const questionOpenTimestamps = useRef<Record<string, number>>({});
  /** Maps question_id → cumulative milliseconds spent on it */
  const questionTimeSpentRef = useRef<Record<string, number>>({});

  const currentQuestionEntryTime = useRef<number>(Date.now());
  const currentQuestionIdRef = useRef<string | null>(null);

  /** Called whenever the student navigates to a question */
  const recordQuestionOpen = useCallback((qId: string) => {
    setVisitedQs((prev) => prev[qId] ? prev : { ...prev, [qId]: true });
    if (examStartMsRef.current === null) return;
    if (questionOpenTimestamps.current[qId] !== undefined) return; // only record FIRST visit
    const offsetSec = Math.floor((Date.now() - examStartMsRef.current) / 1000);
    questionOpenTimestamps.current[qId] = offsetSec;
  }, []);

  // Flush time spent when navigating between questions
  useEffect(() => {
    const now = Date.now();
    const prevQId = currentQuestionIdRef.current;
    if (prevQId) {
      const spentMs = now - currentQuestionEntryTime.current;
      questionTimeSpentRef.current[prevQId] = (questionTimeSpentRef.current[prevQId] || 0) + spentMs;
    }
    const nextQId = questions[current]?.id;
    currentQuestionIdRef.current = nextQId ?? null;
    currentQuestionEntryTime.current = now;
  }, [current, questions]);

  // ── Load questions ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!testId) return;
    setLoading(true);

    // Tests Hub papers: id is a raw UUID from the papers table
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(testId)) {
      setError(`Unknown test format: "${testId}".`);
      setLoading(false);
      return;
    }

    const token = session?.access_token ?? "";
    apiClient.get<{ success: boolean; data: any; message?: string }>(`/api/v1/dpps/${testId}/questions`, token)
      .then((res) => {
        if (res.success) {
          setQuestions(res.data.questions);
          setMeta(res.data.dpp);
          setTimeLeft(res.data.dpp?.duration ? res.data.dpp.duration * 60 : 3600); // default 60m if not set
          setIsDemoMode(false);
          examStartMsRef.current = Date.now();
        } else {
          setError(res.message ?? "Failed to load questions.");
        }
      })
      .catch((err) => {
        setError(err.message || "Failed to load test.");
      })
      .finally(() => setLoading(false));
  }, [testId, session?.access_token]);

  // ── Timer ──────────────────────────────────────────────────────────────────
  const handleSubmit = useCallback(async () => {
    // Guard: never submit if questions haven't loaded yet
    if (questions.length === 0) return;

    // Flush the time for the currently active question
    const now = Date.now();
    const prevQId = currentQuestionIdRef.current;
    if (prevQId) {
      const spentMs = now - currentQuestionEntryTime.current;
      questionTimeSpentRef.current[prevQId] = (questionTimeSpentRef.current[prevQId] || 0) + spentMs;
      currentQuestionEntryTime.current = now;
    }

    setLoading(true);
    try {
      const payload = {
        answers: questions.reduce((acc, q) => {
          if (answers[q.id]) {
            acc[q.id] = answers[q.id];
          }
          return acc;
        }, {} as Record<string, string>),
        timeTaken: Math.floor((now - (examStartMsRef.current ?? now)) / 1000)
      };

      const token = session?.access_token ?? "";
      const data = await apiClient.post<{ success: boolean; data: any; message?: string }>(
        `/api/v1/dpps/${testId}/submit`,
        payload,
        token
      );

      if (data.success) {
        router.push(`/dashboard`);
      } else {
        alert("Failed to submit: " + data.message);
        setLoading(false);
      }
    } catch (err) {
      console.error(err);
      alert("Submission error: " + (err instanceof Error ? err.message : String(err)));
      setLoading(false);
    }
  }, [answers, status, testId, router, questions.length]);

  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0 || loading) return;
    const t = setTimeout(() => setTimeLeft((s) => (s !== null ? s - 1 : null)), 1000);
    return () => clearTimeout(t);
  }, [timeLeft, loading]);

  useEffect(() => {
    if (!loading && timeLeft === 0 && questions.length > 0) {
      handleSubmit();
    }
  }, [timeLeft, loading, questions.length, handleSubmit]);

  // ── Wrapper: navigate and record timestamp (must be BEFORE early returns) ───────
  const navigateTo = useCallback((idx: number) => {
    const qId = questions[idx]?.id;
    if (qId) recordQuestionOpen(qId);
    setCurrent(idx);
  }, [questions, recordQuestionOpen]);

  // Record when the very first question is displayed
  useEffect(() => {
    if (questions.length > 0 && questions[0]?.id) {
      recordQuestionOpen(questions[0].id);
    }
  }, [questions, recordQuestionOpen]);

  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return h > 0
      ? `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`
      : `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  const isSectionBLimitReached = (q: any) => {
    if (q.question_type !== "integer") return false;
    if (answers[q.id] !== undefined && answers[q.id] !== "") return false;
    const count = questions.filter((quest) =>
      quest.subject === q.subject &&
      quest.question_type === "integer" &&
      answers[quest.id] !== undefined &&
      answers[quest.id] !== ""
    ).length;
    return count >= 5;
  };

  const selectAnswer = (qId: string, optId: string) => {
    const q = questions.find((quest) => quest.id === qId);
    if (q && isSectionBLimitReached(q)) {
      alert(`You can only attempt a maximum of 5 numerical questions in ${q.subject}. Please clear another answer in this section first.`);
      return;
    }
    recordQuestionOpen(qId);
    setAnswers((a) => ({ ...a, [qId]: optId }));
    setStatus((s) => ({ ...s, [qId]: "answered" }));
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
              <div className="h-8 w-72 max-w-full rounded-[10px] bg-b-surface2" />
            </div>
            <div className="flex items-center gap-3">
              <div className="h-11 w-28 rounded-[10px] bg-b-surface2" />
              <div className="h-11 w-36 rounded-[10px] bg-b-surface2" />
            </div>
          </div>
        </header>
        <main className="mx-auto grid w-full max-w-screen-2xl gap-6 px-4 py-6 lg:px-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
          <section className="card min-w-0 p-5 md:p-7">
            <div className="mb-5 flex flex-wrap gap-2">
              <div className="h-7 w-20 rounded-[10px] bg-b-surface2" />
              <div className="h-7 w-28 rounded-[10px] bg-b-surface2" />
              <div className="h-7 w-20 rounded-[10px] bg-b-surface2" />
            </div>
            <div className="mb-6 h-6 w-40 rounded-full bg-b-surface2" />
            <div className="space-y-3">
              <div className="h-20 rounded-[10px] bg-b-surface2" />
              <div className="h-20 rounded-[10px] bg-b-surface2" />
              <div className="h-20 rounded-[10px] bg-b-surface2" />
              <div className="h-20 rounded-[10px] bg-b-surface2" />
            </div>
            <div className="mt-8 flex gap-3 border-t border-s-stroke2 pt-6">
              <div className="h-11 flex-1 rounded-[10px] bg-b-surface2" />
              <div className="h-11 flex-1 rounded-[10px] bg-b-surface2" />
              <div className="h-11 flex-1 rounded-[10px] bg-b-surface2" />
            </div>
          </section>
          <aside className="card min-w-0 p-5 md:p-6">
            <div className="mb-5 grid grid-cols-3 gap-3">
              <div className="h-20 rounded-[10px] bg-b-surface2" />
              <div className="h-20 rounded-[10px] bg-b-surface2" />
              <div className="h-20 rounded-[10px] bg-b-surface2" />
            </div>
            <div className="space-y-5">
              <div className="h-28 rounded-[10px] bg-b-surface2" />
              <div className="h-28 rounded-[10px] bg-b-surface2" />
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
        <p className="text-body-1 font-semibold text-primary-03">{error}</p>
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

  const q = questions[current];
  let notVisitedCount = 0;
  let notAnsweredCount = 0;
  let answeredCount = 0;
  let markedCount = 0;
  let answeredMarkedCount = 0;

  questions.forEach((_q) => {
    const s = status[_q.id];
    const hasAns = !!answers[_q.id];
    const visited = !!visitedQs[_q.id];

    if (s === "answered") {
      answeredCount++;
    } else if (s === "review") {
      if (hasAns) answeredMarkedCount++;
      else markedCount++;
    } else {
      if (visited) notAnsweredCount++;
      else notVisitedCount++;
    }
  });

  const answered = answeredCount + answeredMarkedCount;
  const unanswered = questions.length - answered;
  const timeWarning = timeLeft !== null && timeLeft < 300;

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
            <div className={`flex items-center gap-3 rounded-[10px] border px-4 py-2.5 shadow-widget ${timeWarning ? "border-s-stroke2/40 bg-[rgba(255,106,85,0.05)]" : "border-s-stroke2 bg-b-surface2"}`}>
              <span className={`${timeWarning ? "text-primary-03" : "text-t-primary"}`}>
                <RiTimerLine size={18} />
              </span>
              <span className={`text-body-2 font-bold tabular-nums ${timeWarning ? "text-primary-03" : "text-t-primary"}`}>
                {timeLeft !== null ? formatTime(timeLeft) : "--:--"}
              </span>
            </div>

            <button
              id="submit-test-btn"
              className="flex flex-row justify-center items-center py-3 px-7 h-12 rounded-[10px] text-sm font-sans font-semibold tracking-[0.0125em] text-t-light transition-all active:scale-98 cursor-pointer relative overflow-hidden bg-linear-to-b from-[#2C2C2C] to-[#282828] shadow-[inset_2px_0px_8px_2px_rgba(248,248,248,0.20),0px_5px_1.5px_-4px_rgba(8,8,8,0.09)] after:absolute after:inset-0 after:rounded-[10px] after:border-[1.5px] after:border-white/20 after:[mask-image:linear-gradient(to_top,transparent_0,black_100%)]"
              onClick={() => setShowSubmitModal(true)}
            >
              <span className="relative z-10">Submit Test</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-screen-2xl gap-6 px-4 py-6 lg:px-6 xl:grid-cols-[minmax(0,1fr)_22rem] items-stretch">
        {/* ── Question Area ── */}
        <section className="group relative card flex flex-col overflow-hidden min-w-0 p-6 md:p-8 card select-none xl:sticky xl:top-[7.5rem] xl:h-[calc(100vh-9rem)] xl:overflow-y-auto">

          <div className="relative z-10 mb-5 flex flex-wrap items-center gap-2">
            <span className="flex flex-row justify-center items-center px-2 py-0.5 border border-s-stroke2 bg-b-surface1 text-t-secondary text-[12px] font-sans font-semibold rounded-[10px] tracking-[0.004em]">{q.subject}</span>
            <span className="flex flex-row justify-center items-center px-2 py-0.5 border border-s-stroke2 bg-b-surface1 text-t-secondary text-[12px] font-sans font-semibold rounded-[10px] tracking-[0.004em]">{q.chapter}</span>
            {q.topic && <span className="flex flex-row justify-center items-center px-2 py-0.5 border border-s-stroke2 bg-b-surface1 text-t-secondary text-[12px] font-sans font-semibold rounded-[10px] tracking-[0.004em]">{q.topic}</span>}
            <span className={`flex flex-row justify-center items-center px-2 py-0.5 border text-[12px] font-sans font-semibold rounded-[10px] tracking-[0.004em] ${q.difficulty === "easy" ? "border-s-stroke2/40 bg-[rgba(0,166,86,0.05)] text-primary-02" : q.difficulty === "hard" ? "border-s-stroke2/40 bg-[rgba(255,106,85,0.05)] text-primary-03" : "border-s-stroke2/40 bg-[rgba(239,157,14,0.05)] text-primary-05"}`}>
              {q.difficulty}
            </span>
          </div>

          <div className="relative z-10 mb-6 flex items-start justify-between gap-4 border-b border-s-stroke2 pb-5">
            <div className="min-w-0">
              <div className="text-overline font-bold uppercase tracking-wider text-t-tertiary">
                Question {current + 1} of {questions.length}
              </div>
              <p className="mt-2 text-h6 leading-relaxed text-t-primary md:text-h5">
                <MarkdownRenderer>{q.question_text}</MarkdownRenderer>
              </p>
            </div>
            <div className="hidden shrink-0 rounded-[10px] border border-s-stroke2 bg-b-surface2 px-4 py-2 text-right sm:block">
              <div className="text-caption text-t-secondary">Progress</div>
              <div className="text-body-2 font-bold text-t-primary">{answered + markedCount}/{questions.length}</div>
            </div>
          </div>

          {/* Question images */}
          {q.image_url && (
            <div className="mb-6">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={q.image_url} alt="Figure" className="max-w-full rounded-[10px] border border-s-stroke2" referrerPolicy="no-referrer" />
            </div>
          )}

          {/* Options or Text Input */}
          <div className="relative z-10 space-y-3">
            {isSectionBLimitReached(q) && (
              <div className="rounded-[10px] border border-amber-200/50 bg-amber-50/50 p-4 text-amber-950">
                <p className="text-caption font-bold uppercase tracking-wider text-amber-800">⚠️ Section B limit reached</p>
                <p className="mt-1 text-caption font-semibold">
                  You have already answered 5 numerical questions in {q.subject}. To attempt this question, please clear your answer on another numerical question in this subject first.
                </p>
              </div>
            )}

            {!q.options || q.options.length === 0 ? (
              <div className="max-w-xl">
                <label className="mb-2 block text-caption font-bold uppercase tracking-wider text-t-tertiary">
                  Enter numerical answer
                </label>
                <input
                  type="text"
                  className="input h-12 rounded-[10px] px-4 text-body-1 font-semibold disabled:bg-b-surface2 disabled:cursor-not-allowed disabled:text-t-tertiary"
                  placeholder={isSectionBLimitReached(q) ? "Section B limit of 5 reached" : "Type your answer..."}
                  disabled={isSectionBLimitReached(q)}
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
                  const disabled = isSectionBLimitReached(q) && !selected;
                  return (
                    <button
                      key={opt.id}
                      id={`option-${opt.id}`}
                      disabled={disabled}
                      className={`group/opt flex items-center gap-4 rounded-[10px] border p-4 text-left transition-all relative overflow-hidden ${selected
                          ? "border-primary-01 bg-primary-01/5 shadow-widget"
                          : disabled
                            ? "border-s-stroke2 bg-b-surface2/50 cursor-not-allowed opacity-50"
                            : "border-s-stroke2 bg-b-surface2 hover:border-s-highlight shadow-sm"
                        }`}
                      onClick={() => selectAnswer(q.id, opt.id)}
                    >
                      <div className={`flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-bold shadow-sm transition-colors ${selected ? "bg-primary-01 text-t-light" : "bg-b-surface1 text-t-primary border border-s-stroke2 group-hover/opt:border-s-highlight"}`}>
                        {opt.id}
                      </div>
                      <div className="min-w-0 flex-1 text-body-2 font-medium text-t-primary">
                        {opt.text && <MarkdownRenderer>{opt.text}</MarkdownRenderer>}
                        {opt.image_url && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={opt.image_url} alt={`Option ${opt.id}`} className="mt-2 size-36 object-contain rounded-[10px] bg-white p-2 border border-s-stroke2/50 shadow-sm" referrerPolicy="no-referrer" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Nav buttons */}
          <div className="relative z-10 mt-8 grid grid-cols-2 lg:grid-cols-4 gap-3 border-t border-s-stroke2 pt-6">
            <button
              className="flex flex-row justify-center items-center py-3 px-3 h-12 rounded-[10px] text-[11px] xl:text-xs font-sans font-bold tracking-[0.05em] text-t-light transition-all active:scale-98 relative overflow-hidden bg-linear-to-b from-[#00A656] to-[#008A47] shadow-[inset_2px_0px_8px_2px_rgba(248,248,248,0.20),0px_5px_1.5px_-4px_rgba(8,8,8,0.09)] after:absolute after:inset-0 after:rounded-[10px] after:border-[1.5px] after:border-white/20 after:[mask-image:linear-gradient(to_top,transparent_0,black_100%)] uppercase w-full"
              onClick={() => {
                if (answers[q.id]) setStatus((s) => ({ ...s, [q.id]: "answered" }));
                else setStatus((s) => ({ ...s, [q.id]: "unanswered" }));
                if (current < questions.length - 1) navigateTo(current + 1);
                else setShowSubmitModal(true);
              }}
            >
              <span className="relative z-10 text-center">{current < questions.length - 1 ? "Save & Next" : "Save & Submit"}</span>
            </button>

            <button
              className="flex flex-row justify-center items-center py-3 px-3 h-12 border border-s-stroke2 dark:border-s-stroke2 bg-transparent text-t-secondary dark:text-t-secondary hover:bg-b-surface1/60 hover:text-t-primary rounded-[10px] text-[11px] xl:text-xs font-sans font-bold tracking-[0.05em] transition-all active:scale-98 uppercase w-full"
              onClick={() => {
                setAnswers((a) => {
                  const newA = { ...a };
                  delete newA[q.id];
                  return newA;
                });
                setStatus((s) => ({ ...s, [q.id]: "unanswered" }));
              }}
            >
              Clear
            </button>

            <button
              className="flex flex-row justify-center items-center py-3 px-3 h-12 rounded-[10px] text-[11px] xl:text-xs font-sans font-bold tracking-[0.05em] text-t-light transition-all active:scale-98 relative overflow-hidden bg-linear-to-b from-[#EF9D0E] to-[#D98500] shadow-[inset_2px_0px_8px_2px_rgba(248,248,248,0.20),0px_5px_1.5px_-4px_rgba(8,8,8,0.09)] after:absolute after:inset-0 after:rounded-[10px] after:border-[1.5px] after:border-white/20 after:[mask-image:linear-gradient(to_top,transparent_0,black_100%)] uppercase w-full"
              onClick={() => {
                setStatus((s) => ({ ...s, [q.id]: "review" }));
                if (current < questions.length - 1) navigateTo(current + 1);
                else setShowSubmitModal(true);
              }}
            >
              <span className="relative z-10 text-center">Save & Mark for Review</span>
            </button>

            <button
              className="flex flex-row justify-center items-center py-3 px-3 h-12 rounded-[10px] text-[11px] xl:text-xs font-sans font-bold tracking-[0.05em] text-t-light transition-all active:scale-98 relative overflow-hidden bg-linear-to-b from-[#2563EB] to-[#1D4ED8] shadow-[inset_2px_0px_8px_2px_rgba(248,248,248,0.20),0px_5px_1.5px_-4px_rgba(8,8,8,0.09)] after:absolute after:inset-0 after:rounded-[10px] after:border-[1.5px] after:border-white/20 after:[mask-image:linear-gradient(to_top,transparent_0,black_100%)] uppercase w-full"
              onClick={() => {
                setStatus((s) => ({ ...s, [q.id]: "review" }));
                if (current < questions.length - 1) navigateTo(current + 1);
                else setShowSubmitModal(true);
              }}
            >
              <span className="relative z-10 text-center text-[10px] xl:text-[11px]">Mark for Review & Next</span>
            </button>
          </div>
        </section>

        {/* ── Right Panel: Question Navigator ── */}
        <aside className="group relative card flex flex-col overflow-hidden min-w-0 p-6 md:p-8 card select-none xl:sticky xl:top-[7.5rem] xl:h-[calc(100vh-9rem)] xl:overflow-y-auto">

          <div className="relative z-10 mb-6 grid grid-cols-2 gap-y-3 gap-x-2 text-[13px] font-sans text-t-primary font-medium">
            {/* 1. Not Visited */}
            <div className="flex items-center gap-2 col-span-2 xl:col-span-1">
              <div className="w-8 h-8 flex items-center justify-center rounded-[4px] border border-t-secondary bg-gradient-to-br from-shade-10 to-[#E0E0E0] shadow-[inset_1px_1px_2px_rgba(255,255,255,0.8),inset_-1px_-1px_2px_rgba(0,0,0,0.1)] text-black font-semibold text-xs shrink-0">
                {notVisitedCount}
              </div>
              <span className="leading-tight">Not Visited</span>
            </div>
            {/* 2. Not Answered */}
            <div className="flex items-center gap-2 col-span-2 xl:col-span-1">
              <div className="w-8 h-8 flex items-center justify-center bg-gradient-to-br from-[#E64125] to-[#C7270D] text-white font-semibold text-xs [clip-path:polygon(0%_0%,_100%_15%,_100%_85%,_0%_100%)] shadow-sm shrink-0">
                {notAnsweredCount}
              </div>
              <span className="leading-tight">Not Answered</span>
            </div>
            {/* 3. Answered */}
            <div className="flex items-center gap-2 col-span-2 xl:col-span-1">
              <div className="w-8 h-8 flex items-center justify-center bg-gradient-to-br from-[#4CAF50] to-[#2E7D32] text-white font-semibold text-xs [clip-path:polygon(0%_0%,_100%_15%,_100%_85%,_0%_100%)] shadow-sm shrink-0">
                {answeredCount}
              </div>
              <span className="leading-tight">Answered</span>
            </div>
            {/* 4. Marked for Review */}
            <div className="flex items-center gap-2 col-span-2 xl:col-span-1">
              <div className="w-8 h-8 flex items-center justify-center rounded-[10px] bg-gradient-to-br from-[#6A1B9A] to-[#4A148C] text-white font-semibold text-xs shadow-[inset_2px_2px_4px_rgba(255,255,255,0.3)] shrink-0">
                {markedCount}
              </div>
              <span className="leading-tight">Marked for Review</span>
            </div>
            {/* 5. Answered & Marked */}
            <div className="flex items-center gap-2 col-span-2">
              <div className="w-8 h-8 flex items-center justify-center rounded-[10px] bg-gradient-to-br from-[#6A1B9A] to-[#4A148C] text-white font-semibold text-xs shadow-[inset_2px_2px_4px_rgba(255,255,255,0.3)] relative shrink-0">
                {answeredMarkedCount}
                <div className="absolute -bottom-0.5 -right-0.5 size-[12px] bg-[#4CAF50] rounded-full border border-white flex items-center justify-center">
                  <svg viewBox="0 0 10 10" className="w-2 h-2 text-white" fill="none">
                    <path d="M2 5L4 7L8 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </div>
              <span className="leading-tight text-[11px] xl:text-[12px]">Answered & Marked for Review (will be considered for evaluation)</span>
            </div>
          </div>

          <div className="relative z-10">
            {subjects.map((subj) => {
              const subjQs = questions.filter((item) => item.subject === subj);
              return (
                <div key={subj} className="mb-6 last:mb-0">
                  <div className="mb-4 text-overline font-bold uppercase tracking-[0.05em] text-t-tertiary">
                    {subj}
                  </div>
                  <div className="grid grid-cols-5 gap-2 sm:grid-cols-6 lg:grid-cols-5">
                    {subjQs.map((sq) => {
                      const globalIdx = questions.findIndex((gq) => gq.id === sq.id);
                      const s = status[sq.id];
                      const hasAns = !!answers[sq.id];
                      const visited = !!visitedQs[sq.id];
                      const isCurrent = globalIdx === current;

                      let btnClass = "w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center text-[15px] font-bold transition-all hover:scale-[1.05] active:scale-95 cursor-pointer shrink-0 ";
                      let content: React.ReactNode = sq.question_number;

                      if (s === "answered") {
                        btnClass += "bg-gradient-to-br from-[#4CAF50] to-[#2E7D32] text-white [clip-path:polygon(0%_0%,_100%_15%,_100%_85%,_0%_100%)] shadow-sm";
                      } else if (s === "review") {
                        if (hasAns) {
                          btnClass += "rounded-full bg-gradient-to-br from-[#6A1B9A] to-[#4A148C] text-white shadow-[inset_2px_2px_4px_rgba(255,255,255,0.3)] relative";
                          content = (
                            <>
                              {sq.question_number}
                              <div className="absolute -bottom-0.5 -right-0.5 size-[14px] bg-[#4CAF50] rounded-full border-[1.5px] border-white flex items-center justify-center">
                                <svg viewBox="0 0 10 10" className="w-2 h-2 text-white" fill="none">
                                  <path d="M2 5L4 7L8 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                              </div>
                            </>
                          );
                        } else {
                          btnClass += "rounded-full bg-gradient-to-br from-[#6A1B9A] to-[#4A148C] text-white shadow-[inset_2px_2px_4px_rgba(255,255,255,0.3)]";
                        }
                      } else {
                        if (visited) {
                          btnClass += "bg-gradient-to-br from-[#E64125] to-[#C7270D] text-white [clip-path:polygon(0%_0%,_100%_15%,_100%_85%,_0%_100%)] shadow-sm";
                        } else {
                          btnClass += "rounded-[4px] border border-t-secondary bg-gradient-to-br from-shade-10 to-[#E0E0E0] text-black shadow-[inset_1px_1px_2px_rgba(255,255,255,0.8),inset_-1px_-1px_2px_rgba(0,0,0,0.1)]";
                        }
                      }

                      const wrapperClass = "p-0.5";

                      return (
                        <div key={sq.id} className={`flex items-center justify-center ${wrapperClass}`}>
                          <button
                            id={`nav-q-${sq.question_number}`}
                            className={btnClass}
                            onClick={() => navigateTo(globalIdx)}
                          >
                            {content}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </aside>
      </main>

      {/* ── Submit Modal ── */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 px-4 py-6 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="card w-full max-w-lg p-6 text-center md:p-8 animate-in zoom-in-95 duration-200">
            <div className="mb-5 flex justify-center text-t-primary">
              <div className="flex size-20 items-center justify-center rounded-full bg-gradient-to-b from-s-stroke2 to-[#C2C2C2] dark:from-[#3A3A3A] dark:to-[#222]">
                <RiFlag2Fill size={40} className="text-t-primary dark:text-white" />
              </div>
            </div>
            <h2 className="text-[24px] font-sans font-semibold tracking-[0.0015em] text-t-primary dark:text-t-primary">Ready to Submit?</h2>
            <p className="mt-4 text-[14px] font-sans text-t-secondary dark:text-t-secondary leading-[150%]">
              You&apos;ve answered <strong className="text-t-primary dark:text-t-primary">{answered}</strong> of{" "}
              <strong className="text-t-primary dark:text-t-primary">{questions.length}</strong> questions.
              {unanswered > 0 && ` ${unanswered} questions are still unanswered.`}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button
                className="flex flex-row justify-center items-center py-3 px-7 border border-s-stroke2 dark:border-s-stroke2 rounded-[10px] bg-transparent text-t-secondary dark:text-t-secondary text-sm font-sans font-semibold transition-all hover:border-t-secondary active:scale-98 flex-1 h-12"
                onClick={() => setShowSubmitModal(false)}
              >
                Keep Working
              </button>
              <button
                id="confirm-submit-btn"
                className="flex flex-row justify-center items-center py-3 px-7 h-12 rounded-[10px] text-sm font-sans font-semibold tracking-[0.0125em] text-t-light transition-all active:scale-98 relative overflow-hidden bg-linear-to-b from-[#2C2C2C] to-[#282828] shadow-[inset_2px_0px_8px_2px_rgba(248,248,248,0.20),0px_5px_1.5px_-4px_rgba(8,8,8,0.09)] after:absolute after:inset-0 after:rounded-[10px] after:border-[1.5px] after:border-white/20 after:[mask-image:linear-gradient(to_top,transparent_0,black_100%)] flex-1"
                onClick={handleSubmit}
              >
                <span className="relative z-10">Submit Test</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
