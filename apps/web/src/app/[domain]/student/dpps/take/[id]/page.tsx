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
import { Question, Option, TestMeta, AnswerMap, StatusMap } from "@/components/test/TestTypes";
import { TestHeader } from "@/components/test/TestHeader";
import { QuestionContent } from "@/components/test/QuestionContent";
import { QuestionNavigator } from "@/components/test/QuestionNavigator";
import { SubmitModal } from "@/components/test/SubmitModal";
import "katex/dist/katex.min.css";
import { API_V1_URL, apiClient } from "@/lib/api.client";
import { useAuth } from "@/lib/auth-context";



// ─── Constants ────────────────────────────────────────────────────────────────

const API_BASE = API_V1_URL;

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TestPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const testId = params.id; // e.g. "pyq-jee-main-2024-jan-shift1"
  const { session } = useAuth();

  const [questions, setQuestions] = useState<Question[]>([]);
  const [meta, setMeta] = useState<TestMeta | null>(null);
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
      <TestHeader
        meta={meta}
        questionsLength={questions.length}
        timeLeft={timeLeft}
        timeWarning={timeWarning}
        setShowSubmitModal={setShowSubmitModal}
        formatTime={formatTime}
      />

      <main className="mx-auto grid w-full max-w-screen-2xl gap-6 px-4 py-6 lg:px-6 xl:grid-cols-[minmax(0,1fr)_22rem] items-stretch">
        <QuestionContent
          question={q}
          current={current}
          questionsLength={questions.length}
          answers={answers}
          setAnswers={setAnswers}
          setStatus={setStatus}
          selectAnswer={selectAnswer}
          navigateTo={navigateTo}
          setShowSubmitModal={setShowSubmitModal}
          answered={answered}
          markedCount={markedCount}
          isSectionBLimitReached={isSectionBLimitReached}
        />

        <QuestionNavigator
          questions={questions}
          current={current}
          status={status}
          answers={answers}
          visitedQs={visitedQs}
          navigateTo={navigateTo}
          notVisitedCount={notVisitedCount}
          notAnsweredCount={notAnsweredCount}
          answeredCount={answeredCount}
          markedCount={markedCount}
          answeredMarkedCount={answeredMarkedCount}
        />
      </main>

      <SubmitModal
        show={showSubmitModal}
        answered={answered}
        questionsLength={questions.length}
        unanswered={unanswered}
        onClose={() => setShowSubmitModal(false)}
        onSubmit={handleSubmit}
      />

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
