"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  RiLoader4Line,
} from "@remixicon/react";
import { Question, Option, TestMeta, AnswerMap, StatusMap } from "@/components/test/TestTypes";
import { TestHeader } from "@/components/test/TestHeader";
import { QuestionContent } from "@/components/test/QuestionContent";
import { QuestionNavigator } from "@/components/test/QuestionNavigator";
import { SubmitModal } from "@/components/test/SubmitModal";
import "katex/dist/katex.min.css";
import { apiClient } from "@/lib/api.client";
import { useAuth } from "@/lib/auth-context";

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function InstituteTestViewPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const testId = params.id;
  const { session, loading: authLoading } = useAuth();

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

  // ── Timing tracking ─────────────────────────────────────────────────────────
  const examStartMsRef = useRef<number | null>(null);
  const questionOpenTimestamps = useRef<Record<string, number>>({});
  const questionTimeSpentRef = useRef<Record<string, number>>({});
  const currentQuestionEntryTime = useRef<number>(Date.now());
  const currentQuestionIdRef = useRef<string | null>(null);

  const recordQuestionOpen = useCallback((qId: string) => {
    setVisitedQs((prev) => prev[qId] ? prev : { ...prev, [qId]: true });
    if (examStartMsRef.current === null) return;
    if (questionOpenTimestamps.current[qId] !== undefined) return;
    const offsetSec = Math.floor((Date.now() - examStartMsRef.current) / 1000);
    questionOpenTimestamps.current[qId] = offsetSec;
  }, []);

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
    // Wait for Supabase auth to initialise before firing — prevents spurious 401
    // on hard-refresh when the session is not yet available in the first render.
    if (authLoading) return;
    if (!session?.access_token) {
      setError("Authentication required. Please log back in.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null); // clear any stale error from a previous attempt

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(testId)) {
      setError(`Invalid test ID format: "${testId}".`);
      setLoading(false);
      return;
    }

    // Coerce any field value to a plain string (guards against JSONB bleed from Supabase)
    const str = (v: any): string =>
      v == null ? "" : typeof v === "string" ? v : JSON.stringify(v);

    const token = session?.access_token ?? "";
    apiClient.get<{ success: boolean; data: any; message?: string }>(`/api/v1/tests/${testId}`, token)
      .then((res) => {
        if (res.success) {
          // Normalize every question to ensure text fields are plain strings
          const normalized = (res.data.questions ?? []).map((q: any) => ({
            ...q,
            question_text: str(q.question_text),
            explanation: str(q.explanation),
            options: Array.isArray(q.options)
              ? q.options.map((opt: any) => ({
                  ...opt,
                  id: str(opt.id),
                  text: str(opt.text),
                  image_url: opt.image_url ?? null,
                }))
              : [],
          }));
          setQuestions(normalized);
          setMeta(res.data.paper);
          setTimeLeft(res.data.paper.duration * 60);
          examStartMsRef.current = Date.now();
        } else {
          setError(res.message ?? "Failed to load questions.");
        }
      })
      .catch((err) => {
        setError(err.message || "Failed to load test.");
      })
      .finally(() => setLoading(false));
  }, [testId, session?.access_token, authLoading]);

  // ── Submit handler ──────────────────────────────────────────────────────────
  const handleSubmit = useCallback(async () => {
    if (questions.length === 0) return;

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
          const qId = q.id;
          const rawMs = questionTimeSpentRef.current[qId] || 0;
          const actualSec = Math.floor(rawMs / 1000);
          const finalSec = (actualSec === 0 && answers[qId]) ? 2 : actualSec;

          acc[qId] = {
            selected_answer: answers[qId] || null,
            time_taken_sec: finalSec,
            start_timestamp: questionOpenTimestamps.current[qId] ?? -1,
            marked_review: status[qId] === "review",
          };
          return acc;
        }, {} as Record<string, any>),
      };

      const token = session?.access_token ?? "";
      const data = await apiClient.post<{ success: boolean; data: any; message?: string }>(
        `/api/v1/attempts/${testId}/submit`,
        payload,
        token
      );

      if (data.success) {
        // Use window.location.href to avoid middleware subdomain routing conflict
        window.location.href = `/student/results/${data.data.attempt_id}`;
      } else {
        alert("Failed to submit: " + data.message);
        setLoading(false);
      }
    } catch (err) {
      console.error(err);
      alert("Submission error: " + (err instanceof Error ? err.message : String(err)));
      setLoading(false);
    }
  }, [answers, status, testId, questions.length]);

  // ── Timer ───────────────────────────────────────────────────────────────────
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

  const navigateTo = useCallback((idx: number) => {
    const qId = questions[idx]?.id;
    if (qId) recordQuestionOpen(qId);
    setCurrent(idx);
  }, [questions, recordQuestionOpen]);

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

  // ── Loading skeleton ────────────────────────────────────────────────────────
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
            </div>
            <div className="space-y-3">
              <div className="h-20 rounded-[10px] bg-b-surface2" />
              <div className="h-20 rounded-[10px] bg-b-surface2" />
              <div className="h-20 rounded-[10px] bg-b-surface2" />
            </div>
          </section>
          <aside className="card min-w-0 p-5 md:p-6">
            <div className="mb-5 grid grid-cols-3 gap-3">
              <div className="h-20 rounded-[10px] bg-b-surface2" />
              <div className="h-20 rounded-[10px] bg-b-surface2" />
              <div className="h-20 rounded-[10px] bg-b-surface2" />
            </div>
          </aside>
        </main>
        <div className="mx-auto flex w-full max-w-screen-2xl items-center justify-center gap-3 px-4 pb-6 text-t-secondary">
          <RiLoader4Line size={18} className="animate-spin text-primary-01" />
          <p className="text-body-2 font-semibold">Loading test questions…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-b-surface1 px-6 text-center">
        <div className="text-5xl">⚠️</div>
        <p className="text-body-1 font-semibold text-primary-03">{error}</p>
        <button
          onClick={() => window.history.back()}
          className="mt-2 px-5 py-2.5 rounded-[10px] bg-shade-02 text-white text-[13px] font-sans font-semibold hover:opacity-90 transition-all"
        >
          Go Back
        </button>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-b-surface1 px-6">
        <p className="text-body-1 text-t-secondary">No questions found for this test.</p>
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

  return (
    <div className="min-h-screen bg-b-surface1 text-t-primary">
      <TestHeader
        meta={meta}
        questionsLength={questions.length}
        timeLeft={timeLeft}
        isTimed={timeLeft !== null}
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
