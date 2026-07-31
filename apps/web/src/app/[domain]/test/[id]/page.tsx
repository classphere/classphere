"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import {
  RiTimerLine,
  RiArrowLeftLine,
  RiArrowRightLine,
  RiFlag2Fill,
  RiLoader4Line,
  RiLayoutGridLine,
  RiCloseLine,
} from "@remixicon/react";
import { Question, Option, TestMeta, AnswerMap, StatusMap } from "@/components/test/TestTypes";
import { TestHeader } from "@/components/test/TestHeader";
import { QuestionContent } from "@/components/test/QuestionContent";
import { QuestionNavigator } from "@/components/test/QuestionNavigator";
import { SubmitModal } from "@/components/test/SubmitModal";
import { ProctorWarningModal } from "@/components/test/ProctorWarningModal";
import { ReportQuestionModal } from "@/components/test/ReportQuestionModal";
import { DualDeviceModal } from "@/components/test/DualDeviceModal";
import "katex/dist/katex.min.css";
import { apiClient } from "@/lib/api.client";
import { useAuth } from "@/lib/auth-context";

// ─── Constants ────────────────────────────────────────────────────────────────

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TestPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const testId = params.id; // e.g. "pyq-jee-main-2024-jan-shift1"
  const requestedTestMode = searchParams.get("mode") === "practice" ? "practice" : "attempt";
  const { session, user, loading: authLoading } = useAuth();

  const [questions, setQuestions] = useState<Question[]>([]);
  const [meta, setMeta] = useState<TestMeta | null>(null);
  const [loading, setLoading] = useState(true);
  // Kept separate from `loading`: that flag renders the "Preparing your test"
  // skeleton, which is the wrong thing to say while a finished test is being
  // submitted. Both still freeze the timer and proctoring.
  const [submitting, setSubmitting] = useState(false);
  // Guards against a double submit from the timer, proctor and modal paths all
  // racing. A ref applies synchronously; state would not settle until re-render.
  const submittingRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [status, setStatus] = useState<StatusMap>({});
  const [visitedQs, setVisitedQs] = useState<Record<string, boolean>>({});
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showDualDeviceModal, setShowDualDeviceModal] = useState(false);
  const [isNavigatorOpen, setIsNavigatorOpen] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<"saved" | "saving" | "offline">("saved");

  // ── Anti-Cheat Proctoring state ─────────────────────────────────────────────
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [showProctorWarning, setShowProctorWarning] = useState(false);
  const [proctorCountdown, setProctorCountdown] = useState(10);

  // ── Timing tracking (Option B: start_timestamp) ─────────────────────────────
  /** Unix ms when the exam timer started (set once when questions load) */
  const examStartMsRef = useRef<number | null>(null);
  /** Maps question_id → seconds-offset-from-exam-start when student first opened it */
  const questionOpenTimestamps = useRef<Record<string, number>>({});
  /** Maps question_id → cumulative milliseconds spent on it */
  const questionTimeSpentRef = useRef<Record<string, number>>({});

  const currentQuestionEntryTime = useRef<number>(Date.now());
  const currentQuestionIdRef = useRef<string | null>(null);
  const answersRef = useRef<AnswerMap>({});
  const statusRef = useRef<StatusMap>({});
  const saveVersionRef = useRef(0);
  const savedVersionRef = useRef(0);
  const saveInFlightRef = useRef(false);

  useEffect(() => {
    answersRef.current = answers;
    statusRef.current = status;
  }, [answers, status]);

  /** Called whenever the student navigates to a question */
  const recordQuestionOpen = useCallback((qId: string) => {
    setVisitedQs((prev) => prev[qId] ? prev : { ...prev, [qId]: true });
    setStatus((prev) => {
      const currentStatus = prev[qId];
      if (!currentStatus || currentStatus === "not_visited" || currentStatus === "unanswered") {
        return { ...prev, [qId]: answersRef.current[qId] ? "answered" : "not_answered" };
      }
      return prev;
    });
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
    // Wait for auth to finish loading before sending a request — avoids premature
    // empty-token requests that trigger NO_SESSION_TOKEN 401 and redirect to /login.
    if (authLoading) return;
    if (!session?.access_token) {
      setError("Please log in to access this test.");
      setLoading(false);
      return;
    }

    // Tests Hub papers: id is a raw UUID from the papers table
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(testId)) {
      setError(`Unknown test format: "${testId}".`);
      setLoading(false);
      return;
    }

    const token = session.access_token;
    let cancelled = false;

    const loadTestAndAttempt = async () => {
      setLoading(true);
      try {
        // Starting an attempt only needs testId from the URL, not the test-details
        // response — the backend independently re-validates the paper (existence,
        // access, delivery mode) and resumes an existing in-progress attempt rather
        // than duplicating, so these two calls are safe to run concurrently instead
        // of one after the other.
        const [testResponse, startResponse] = await Promise.all([
          apiClient.get<{ success: boolean; data: any; message?: string }>(`/api/v1/tests/${testId}`, token),
          apiClient.post<{ success: boolean; data: { attempt: { id: string } }; message?: string }>(
            "/api/v1/attempts",
            { paper_id: testId, test_mode: requestedTestMode },
            token
          ),
        ]);
        if (!testResponse.success) throw new Error(testResponse.message ?? "Failed to load questions.");
        if (!startResponse.success) throw new Error(startResponse.message ?? "Failed to start your test attempt.");

        const startedAttemptId = startResponse.data.attempt.id;
        const attemptResponse = await apiClient.get<{ success: boolean; data: any; message?: string }>(`/api/v1/attempts/${startedAttemptId}`, token);
        if (!attemptResponse.success) throw new Error(attemptResponse.message ?? "Failed to restore your test attempt.");
        if (cancelled) return;

        const restoredAnswers: AnswerMap = {};
        const restoredStatus: StatusMap = {};
        const restoredVisited: Record<string, boolean> = {};
        for (const saved of attemptResponse.data.saved_answers ?? []) {
          const hasProgress = Boolean(saved.selected_answer) || Boolean(saved.marked_review) || (saved.start_timestamp ?? -1) >= 0 || (saved.time_taken_sec ?? 0) > 0;
          if (!hasProgress) continue;
          if (saved.selected_answer) restoredAnswers[saved.question_id] = saved.selected_answer;
          restoredStatus[saved.question_id] = saved.marked_review ? "review" : saved.selected_answer ? "answered" : "unanswered";
          restoredVisited[saved.question_id] = true;
          questionOpenTimestamps.current[saved.question_id] = saved.start_timestamp ?? -1;
          questionTimeSpentRef.current[saved.question_id] = (saved.time_taken_sec ?? 0) * 1000;
        }

        const attempt = attemptResponse.data.attempt;
        const configuredDuration = Number(attempt.total_duration_sec ?? testResponse.data.paper.duration * 60);
        const elapsedSeconds = attempt.created_at ? Math.max(0, Math.floor((Date.now() - new Date(attempt.created_at).getTime()) / 1000)) : 0;

        setQuestions(testResponse.data.questions);
        setMeta(testResponse.data.paper);
        setAttemptId(startedAttemptId);
        setAnswers(restoredAnswers);
        setStatus(restoredStatus);
        setVisitedQs(restoredVisited);
        setTimeLeft(configuredDuration > 0 ? Math.max(0, configuredDuration - elapsedSeconds) : null);
        setIsDemoMode(false);
        examStartMsRef.current = Date.now() - elapsedSeconds * 1000;
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load test.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void loadTestAndAttempt();
    return () => { cancelled = true; };
  }, [testId, requestedTestMode, session?.access_token, authLoading]);

  const buildAttemptAnswers = useCallback(() => questions.reduce((acc, q) => {
    const qId = q.id;
    const liveTime = currentQuestionIdRef.current === qId ? Date.now() - currentQuestionEntryTime.current : 0;
    const actualSec = Math.floor(((questionTimeSpentRef.current[qId] || 0) + liveTime) / 1000);
    acc[qId] = {
      selected_answer: answersRef.current[qId] || null,
      time_taken_sec: actualSec,
      start_timestamp: questionOpenTimestamps.current[qId] ?? -1,
      marked_review: statusRef.current[qId] === "review",
    };
    return acc;
  }, {} as Record<string, any>), [questions]);

  const markAttemptDirty = useCallback(() => {
    saveVersionRef.current += 1;
  }, []);

  const persistAttempt = useCallback(async () => {
    if (!attemptId || !session?.access_token || questions.length === 0) return;
    if (saveInFlightRef.current || saveVersionRef.current === savedVersionRef.current) return;

    const versionBeingSaved = saveVersionRef.current;
    saveInFlightRef.current = true;
    const payload = { answers: buildAttemptAnswers() };
    const localKey = `classphere-attempt-${attemptId}`;
    setSaveState("saving");
    try {
      await apiClient.patch(`/api/v1/attempts/${attemptId}`, payload, session.access_token);
      localStorage.removeItem(localKey);
      savedVersionRef.current = versionBeingSaved;
      if (saveVersionRef.current === savedVersionRef.current) setSaveState("saved");
    } catch {
      localStorage.setItem(localKey, JSON.stringify(payload));
      setSaveState("offline");
    } finally {
      saveInFlightRef.current = false;
    }
  }, [attemptId, buildAttemptAnswers, questions.length, session?.access_token]);

  useEffect(() => {
    if (!attemptId || questions.length === 0) return;
    const timer = window.setTimeout(() => { void persistAttempt(); }, 1200);
    return () => window.clearTimeout(timer);
  }, [answers, status, attemptId, persistAttempt, questions.length]);

  useEffect(() => {
    if (!attemptId) return;
    const interval = window.setInterval(() => { void persistAttempt(); }, 30000);
    const onOnline = () => { void persistAttempt(); };
    const onPageHide = () => {
      localStorage.setItem(`classphere-attempt-${attemptId}`, JSON.stringify({ answers: buildAttemptAnswers() }));
    };
    window.addEventListener("online", onOnline);
    window.addEventListener("pagehide", onPageHide);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("pagehide", onPageHide);
    };
  }, [attemptId, buildAttemptAnswers, persistAttempt]);

  // ── Timer ──────────────────────────────────────────────────────────────────
  const handleSubmit = useCallback(async () => {
    // Guard: never submit if questions haven't loaded yet, and never submit
    // twice — the timer, proctor and modal paths can all fire this.
    if (questions.length === 0 || !attemptId || submittingRef.current) return;
    submittingRef.current = true;

    // Flush the time for the currently active question
    const now = Date.now();
    const prevQId = currentQuestionIdRef.current;
    if (prevQId) {
      const spentMs = now - currentQuestionEntryTime.current;
      questionTimeSpentRef.current[prevQId] = (questionTimeSpentRef.current[prevQId] || 0) + spentMs;
      currentQuestionEntryTime.current = now;
    }

    setSubmitting(true);
    try {
      const payload = { answers: buildAttemptAnswers() };

      const token = session?.access_token ?? "";
      const data = await apiClient.post<{ success: boolean; data: any; message?: string }>(
        `/api/v1/attempts/${attemptId}/submit`,
        payload,
        token
      );

      if (data.success) {
        localStorage.removeItem(`classphere-attempt-${attemptId}`);
        router.push(`/results/${data.data.attempt_id}`);
      } else {
        alert("Failed to submit: " + data.message);
        submittingRef.current = false;
        setSubmitting(false);
      }
    } catch (err) {
      console.error(err);
      alert("Submission error: " + (err instanceof Error ? err.message : String(err)));
      submittingRef.current = false;
      setSubmitting(false);
    }
  }, [attemptId, buildAttemptAnswers, questions.length, router, session?.access_token]);

  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0 || loading || submitting) return;
    const t = setTimeout(() => setTimeLeft((s) => (s !== null ? s - 1 : null)), 1000);
    return () => clearTimeout(t);
  }, [timeLeft, loading, submitting]);

  useEffect(() => {
    if (!loading && !submitting && timeLeft === 0 && questions.length > 0) {
      handleSubmit();
    }
  }, [timeLeft, loading, submitting, questions.length, handleSubmit]);

  // ── Anti-Cheat Tab-Switch / Focus Proctoring Listener ────────────────────────
  useEffect(() => {
    if (loading || submitting || !attemptId || showSubmitModal || requestedTestMode === "practice") return;

    const handleFocusLoss = () => {
      setTabSwitchCount((prev) => {
        const nextCount = prev + 1;
        if (nextCount >= 3) {
          setShowProctorWarning(true);
          setProctorCountdown(0);
          void handleSubmit();
        } else {
          setShowProctorWarning(true);
          setProctorCountdown(10);
        }
        return nextCount;
      });
    };

    const onVisibilityChange = () => {
      if (document.hidden) {
        handleFocusLoss();
      }
    };

    window.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("blur", handleFocusLoss);

    return () => {
      window.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("blur", handleFocusLoss);
    };
  }, [loading, submitting, attemptId, showSubmitModal, requestedTestMode, handleSubmit]);

  // Proctor countdown timer
  useEffect(() => {
    if (!showProctorWarning || proctorCountdown <= 0) return;
    const timer = setTimeout(() => {
      setProctorCountdown((c) => {
        if (c <= 1) {
          void handleSubmit();
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearTimeout(timer);
  }, [showProctorWarning, proctorCountdown, handleSubmit]);

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
    markAttemptDirty();
    setAnswers((a) => ({ ...a, [qId]: optId }));
    setStatus((s) => ({ ...s, [qId]: "answered" }));
  };

  const toggleReview = (qId: string) => {
    markAttemptDirty();
    setStatus((s) => ({
      ...s,
      [qId]: s[qId] === "review" ? (answers[qId] ? "answered" : "unanswered") : "review",
    }));
  };

  // ── Loading / Error ─────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex min-h-dvh flex-col bg-b-surface1 text-t-primary">
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
        <main className="relative mx-auto grid w-full max-w-screen-2xl flex-1 min-h-0 gap-3 px-4 py-6 lg:px-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
          <section className="card h-full min-h-[420px] min-w-0 p-5 md:p-7">
            <div className="mb-3 flex flex-wrap gap-2">
              <div className="h-7 w-20 rounded-[10px] bg-b-surface2" />
              <div className="h-7 w-28 rounded-[10px] bg-b-surface2" />
              <div className="h-7 w-20 rounded-[10px] bg-b-surface2" />
            </div>
            <div className="mb-3 h-6 w-40 rounded-full bg-b-surface2" />
            <div className="space-y-3">
              <div className="h-20 rounded-[10px] bg-b-surface2" />
              <div className="h-20 rounded-[10px] bg-b-surface2" />
              <div className="h-20 rounded-[10px] bg-b-surface2" />
              <div className="h-20 rounded-[10px] bg-b-surface2" />
            </div>
            <div className="mt-3 flex gap-3 border-t border-s-stroke2 pt-6">
              <div className="h-11 flex-1 rounded-[10px] bg-b-surface2" />
              <div className="h-11 flex-1 rounded-[10px] bg-b-surface2" />
              <div className="h-11 flex-1 rounded-[10px] bg-b-surface2" />
            </div>
          </section>
          <aside className="card h-full min-h-[420px] min-w-0 p-5 md:p-6">
            <div className="mb-3 grid grid-cols-3 gap-3">
              <div className="h-20 rounded-[10px] bg-b-surface2" />
              <div className="h-20 rounded-[10px] bg-b-surface2" />
              <div className="h-20 rounded-[10px] bg-b-surface2" />
            </div>
            <div className="space-y-3">
              <div className="h-28 rounded-[10px] bg-b-surface2" />
              <div className="h-28 rounded-[10px] bg-b-surface2" />
            </div>
          </aside>
          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center px-6">
            <div className="flex items-center gap-3">
              <div className="flex size-8 items-center justify-center">
                <RiLoader4Line size={19} className="animate-spin text-primary-01" />
              </div>
              <div>
                <p className="text-body-2 font-semibold text-t-primary">Preparing your test</p>
                <p className="mt-0.5 text-caption text-t-secondary">Setting up your question paper…</p>
              </div>
            </div>
          </div>
        </main>
        <div className="hidden">
          <RiLoader4Line size={18} className="animate-spin text-primary-01" />
          <p className="text-body-2 font-semibold">Preparing your test…</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // Submitting covers the modal path and the automatic ones (time expiry,
  // proctor violation) where no modal is open to convey that anything is
  // happening. Deliberately not the "Preparing your test" skeleton above.
  if (submitting) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-b-surface1 px-6 text-center">
        <RiLoader4Line size={28} className="animate-spin text-primary-01" />
        <div>
          <p className="text-body-2 font-semibold text-t-primary">Submitting your test</p>
          <p className="mt-1 text-caption text-t-secondary">Saving your answers — don’t close this page.</p>
        </div>
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
        isTimed={timeLeft !== null}
        timeWarning={timeWarning}
        candidateName={user?.name}
        setShowSubmitModal={setShowSubmitModal}
        formatTime={formatTime}
      />

      <main className="mx-auto grid w-full max-w-screen-2xl gap-4 px-4 py-4 sm:gap-3 sm:py-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:px-6 items-stretch">
        <div className="lg:hidden">
          <button
            type="button"
            aria-label="Open question palette"
            aria-expanded={isNavigatorOpen}
            aria-controls="test-question-palette"
            onClick={() => setIsNavigatorOpen(true)}
            className="flex h-12 w-full items-center justify-between rounded-[10px] border border-s-stroke2 bg-b-surface2 px-4 text-sm font-semibold text-t-primary shadow-sm active:scale-[0.99]"
          >
            <span className="flex items-center gap-2"><RiLayoutGridLine size={18} /> Question palette</span>
            <span className="text-xs text-t-secondary">{answered}/{questions.length} answered</span>
          </button>
        </div>
        <QuestionContent
          question={q}
          current={current}
          questionsLength={questions.length}
          answers={answers}
          setAnswers={setAnswers}
          setStatus={setStatus}
          onAttemptChanged={markAttemptDirty}
          selectAnswer={selectAnswer}
          navigateTo={navigateTo}
          setShowSubmitModal={setShowSubmitModal}
          answered={answered}
          markedCount={markedCount}
          isSectionBLimitReached={isSectionBLimitReached}
          onReportQuestion={() => setShowReportModal(true)}
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

      {isNavigatorOpen && (
        <div className="lg:hidden fixed inset-0 z-[90] bg-black/40 backdrop-blur-sm">
          <button
            type="button"
            aria-label="Close question palette"
            onClick={() => setIsNavigatorOpen(false)}
            className="absolute inset-0 h-full w-full cursor-default"
          />
          <section
            id="test-question-palette"
            role="dialog"
            aria-modal="true"
            aria-label="Question palette"
            className="absolute inset-y-0 right-0 flex w-full max-w-[440px] flex-col bg-b-surface1 shadow-2xl"
          >
            <div className="flex h-16 shrink-0 items-center justify-between border-b border-s-stroke2 px-4">
              <div>
                <p className="text-sm font-bold text-t-primary">Question palette</p>
                <p className="text-xs text-t-secondary">Choose a question to continue</p>
              </div>
              <button
                type="button"
                aria-label="Close question palette"
                onClick={() => setIsNavigatorOpen(false)}
                className="flex size-11 items-center justify-center rounded-[10px] border border-s-stroke2 bg-b-surface2 text-t-primary"
              >
                <RiCloseLine size={20} />
              </button>
            </div>
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
              variant="drawer"
              onNavigate={() => setIsNavigatorOpen(false)}
            />
          </section>
        </div>
      )}

      <SubmitModal
        show={showSubmitModal}
        answered={answered}
        questionsLength={questions.length}
        unanswered={unanswered}
        onClose={() => setShowSubmitModal(false)}
        onSubmit={handleSubmit}
      />

      <ProctorWarningModal
        show={showProctorWarning}
        warningCount={tabSwitchCount}
        maxWarnings={3}
        countdown={proctorCountdown}
        onResume={() => setShowProctorWarning(false)}
      />

      <ReportQuestionModal
        show={showReportModal}
        questionId={q.id}
        questionNumber={q.question_number}
        token={session?.access_token}
        onClose={() => setShowReportModal(false)}
      />

      <DualDeviceModal
        show={showDualDeviceModal}
        onExit={() => router.push("/student/dashboard")}
      />

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
