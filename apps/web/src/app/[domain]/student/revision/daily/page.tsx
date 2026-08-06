"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import { PageWrapper } from "@/components/ui";
import { PremiumSectionCard as SectionCard } from "@/components/premium-ui";
import { QuestionBody, hasRenderableQuestionContent } from "@/components/QuestionBody";
import {
  RiArrowRightLine,
  RiCheckLine,
  RiCloseLine,
  RiHistoryLine,
  RiLoader4Line,
  RiCheckboxCircleFill,
} from "@remixicon/react";
import { useAuth } from "@/lib/auth-context";
import { apiClient } from "@/lib/api.client";

interface RevisionQuestion {
  id: string;
  question_text?: string;
  image_url?: string | null;
  /** All figures for the stem; image_url is the legacy single-figure field. */
  question_images?: string[] | null;
  content_blocks?: unknown[] | null;
  options?: Array<{ id: string; text?: string; image_url?: string | null; content_blocks?: unknown[] | null }>;
  question_type?: string;
  subject?: string;
  chapter?: string;
  topic?: string;
  difficulty?: string;
}

interface RevisionTopic {
  reviewId: string;
  subject: string;
  chapter: string;
  topic: string;
  lastAccuracy: number | null;
  lastReviewedAt: string | null;
  intervalDays: number;
  lapses: number;
  overdueDays: number;
  questions: RevisionQuestion[];
}

interface TopicResult {
  correctCount: number;
  totalQuestions: number;
  accuracyPct: number;
  passed: boolean;
  nextReviewInDays: number;
  results: Array<{ question_id: string; is_correct: boolean; correct_answer: string[]; explanation: string }>;
}

const difficultyChip = (difficulty?: string) => {
  const d = (difficulty ?? "").toLowerCase();
  if (d === "easy") return "border-s-stroke2/40 bg-[rgba(0,166,86,0.05)] text-primary-02";
  if (d === "hard") return "border-s-stroke2/40 bg-[rgba(255,106,85,0.05)] text-primary-03";
  return "border-s-stroke2/40 bg-[rgba(239,157,14,0.05)] text-primary-05";
};

const Chip = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <span className={`flex flex-row items-center justify-center rounded-[10px] border border-s-stroke2 bg-b-surface1 px-2 py-0.5 text-[12px] font-sans font-semibold tracking-[0.004em] text-t-secondary ${className}`}>
    {children}
  </span>
);

export default function DailyRevisionPage() {
  const { session } = useAuth();

  const [loading, setLoading] = useState(true);
  const [topics, setTopics] = useState<RevisionTopic[]>([]);
  const [nextDueAt, setNextDueAt] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<TopicResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session?.access_token) return;
    apiClient
      .get("/api/v1/revision/daily", session.access_token)
      .then((res: any) => {
        if (!res.success) throw new Error(res.message ?? "Could not load your revision.");
        setTopics(res.data?.topics ?? []);
        setNextDueAt(res.data?.nextDueAt ?? null);
      })
      .catch((err) => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setLoading(false));
  }, [session?.access_token]);

  const active = topics[index];

  const submitTopic = useCallback(async () => {
    if (!active || !session?.access_token || submitting) return;
    setSubmitting(true);
    try {
      const payload = Object.fromEntries(
        active.questions.filter((q) => answers[q.id]).map((q) => [q.id, answers[q.id]]),
      );
      const res: any = await apiClient.post(
        `/api/v1/revision/daily/${active.reviewId}/submit`,
        { answers: payload },
        session.access_token,
      );
      if (!res.success) throw new Error(res.message ?? "Could not submit.");
      setResult(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  }, [active, answers, session?.access_token, submitting]);

  const goNext = () => {
    setResult(null);
    setAnswers({});
    setIndex((i) => i + 1);
  };

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <>
        <Navbar title="Daily Revision" subtitle="Loading today's set…" />
        <PageWrapper>
          <div className="flex h-64 items-center justify-center">
            <RiLoader4Line className="animate-spin text-t-secondary" size={32} />
          </div>
        </PageWrapper>
      </>
    );
  }

  // ── Nothing due ────────────────────────────────────────────────────────────
  if (!topics.length) {
    const when = nextDueAt ? new Date(nextDueAt) : null;
    const days = when ? Math.max(0, Math.ceil((when.getTime() - Date.now()) / 86400000)) : null;
    return (
      <>
        <Navbar title="Daily Revision" subtitle="Spaced revision of everything you've studied" />
        <PageWrapper>
          <SectionCard title="Nothing due today" subtitle="Revision is spaced — topics return just before you'd forget them.">
            <div className="flex flex-col items-center justify-center rounded-[16px] bg-black/[0.02] py-10 text-center dark:bg-white/[0.02]">
              <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-primary-02/10 text-primary-02">
                <RiCheckboxCircleFill size={26} />
              </div>
              <p className="text-[14px] font-sans font-medium text-t-primary">You&apos;re all caught up.</p>
              <p className="mt-1 text-[13px] font-sans text-t-secondary">
                {days === null
                  ? "Take a test and your revision schedule will start building."
                  : days === 0
                    ? "Your next topic is due later today."
                    : `Your next topic returns in ${days} day${days === 1 ? "" : "s"}.`}
              </p>
              <Link
                href="/student/tests"
                className="mt-3 inline-flex h-11 items-center gap-2 rounded-[10px] border border-s-stroke2 bg-b-surface2 px-5 text-[13px] font-sans font-semibold text-t-primary transition-colors hover:border-s-highlight"
              >
                Go to Tests Hub <RiArrowRightLine size={15} />
              </Link>
            </div>
          </SectionCard>
        </PageWrapper>
      </>
    );
  }

  // ── All topics finished ────────────────────────────────────────────────────
  if (!active) {
    return (
      <>
        <Navbar title="Daily Revision" subtitle="Today's set complete" />
        <PageWrapper>
          <SectionCard title="Revision complete" subtitle={`You revised ${topics.length} topic${topics.length === 1 ? "" : "s"} today.`}>
            <div className="flex flex-col items-center justify-center rounded-[16px] bg-black/[0.02] py-10 text-center dark:bg-white/[0.02]">
              <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-primary-02/10 text-primary-02">
                <RiCheckboxCircleFill size={26} />
              </div>
              <p className="text-[14px] font-sans font-medium text-t-primary">Done for today.</p>
              <p className="mt-1 text-[13px] font-sans text-t-secondary">Each topic will return automatically when it&apos;s due.</p>
              <Link
                href="/student/dashboard"
                className="mt-3 inline-flex h-11 items-center gap-2 rounded-[10px] border border-s-stroke2 bg-b-surface2 px-5 text-[13px] font-sans font-semibold text-t-primary transition-colors hover:border-s-highlight"
              >
                Back to Dashboard <RiArrowRightLine size={15} />
              </Link>
            </div>
          </SectionCard>
        </PageWrapper>
      </>
    );
  }

  const answeredCount = active.questions.filter((q) => answers[q.id]).length;
  const resultFor = (questionId: string) => result?.results.find((r) => r.question_id === questionId);

  return (
    <>
      <Navbar title="Daily Revision" subtitle="Topics returning before you forget them" />
      <PageWrapper>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/student/dashboard"
            className="inline-flex items-center gap-2 rounded-[10px] border border-s-stroke2 bg-b-surface2 px-4 py-2 text-caption font-semibold text-t-secondary transition-colors hover:text-t-primary"
          >
            Back to Dashboard
          </Link>
          <Chip>Topic {index + 1} of {topics.length}</Chip>
        </div>

        <SectionCard
          title={active.topic || active.chapter}
          subtitle={[active.subject, active.chapter].filter(Boolean).join(" · ")}
          headerRight={
            <div className="flex flex-wrap items-center gap-2">
              {active.overdueDays > 0 && (
                <Chip className="border-s-stroke2/40 !bg-[rgba(239,157,14,0.05)] !text-primary-05">
                  {active.overdueDays}d overdue
                </Chip>
              )}
              {active.lastAccuracy !== null && (
                <Chip>
                  <RiHistoryLine size={13} className="mr-1" /> Last {active.lastAccuracy}%
                </Chip>
              )}
              {active.lapses > 0 && <Chip>{active.lapses} lapse{active.lapses === 1 ? "" : "s"}</Chip>}
            </div>
          }
        >
          {error && (
            <div className="mb-3 rounded-[10px] border border-s-stroke2/40 bg-[rgba(255,106,85,0.05)] p-4 text-[13px] font-sans font-semibold text-primary-03">
              {error}
            </div>
          )}

          {/* ── Result banner ─────────────────────────────────────────────── */}
          {result && (
            <div
              className={`mb-3 rounded-[10px] border p-5 ${
                result.passed
                  ? "border-s-stroke2/40 bg-[rgba(0,166,86,0.05)]"
                  : "border-s-stroke2/40 bg-[rgba(255,106,85,0.05)]"
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[10px] font-sans font-semibold uppercase tracking-[0.18em] text-t-secondary">
                    {result.passed ? "Topic retained" : "Needs another pass"}
                  </div>
                  <div className={`mt-1 font-sans text-[22px] font-semibold leading-none tracking-[-0.03em] ${result.passed ? "text-primary-02" : "text-primary-03"}`}>
                    {result.correctCount}/{result.totalQuestions}
                    <span className="ml-2 text-[13px] font-normal text-t-secondary">{result.accuracyPct}%</span>
                  </div>
                </div>
                <Chip>
                  Returns in {result.nextReviewInDays} day{result.nextReviewInDays === 1 ? "" : "s"}
                </Chip>
              </div>
            </div>
          )}

          {/* ── Questions ─────────────────────────────────────────────────── */}
          <div className="space-y-3">
            {active.questions.map((q, qIndex) => {
              const feedback = resultFor(q.id);
              return (
                <div key={q.id} className="rounded-[10px] border border-s-stroke2/40 bg-b-surface1 p-4 sm:p-5">
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-sans font-semibold uppercase tracking-[0.18em] text-t-tertiary">
                      Question {qIndex + 1} of {active.questions.length}
                    </span>
                    {q.difficulty && (
                      <span className={`flex items-center rounded-[10px] border px-2 py-0.5 text-[12px] font-sans font-semibold tracking-[0.004em] ${difficultyChip(q.difficulty)}`}>
                        {q.difficulty}
                      </span>
                    )}
                    {feedback && (
                      <span className={`flex items-center gap-1 rounded-[10px] border border-s-stroke2/40 px-2 py-0.5 text-[12px] font-sans font-semibold ${feedback.is_correct ? "bg-[rgba(0,166,86,0.05)] text-primary-02" : "bg-[rgba(255,106,85,0.05)] text-primary-03"}`}>
                        {feedback.is_correct ? <RiCheckLine size={13} /> : <RiCloseLine size={13} />}
                        {feedback.is_correct ? "Correct" : `Answer: ${feedback.correct_answer.join(", ")}`}
                      </span>
                    )}
                  </div>

                  <div className="question-stem text-sub-title-1 leading-relaxed text-t-primary [&_.katex-display]:my-2">
                    <QuestionBody
                      blocks={q.content_blocks as never}
                      legacyText={q.question_text}
                      images={q.question_images}
                      legacyImageAlt={`Figure for question ${qIndex + 1}`}
                    />
                  </div>

                  {q.options && q.options.length > 0 ? (
                    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
                      {q.options.map((opt) => {
                        const selected = answers[q.id] === opt.id;
                        const isEmpty = !hasRenderableQuestionContent(opt.content_blocks as never, opt.text, opt.image_url);
                        const isAnswer = feedback?.correct_answer.includes(opt.id.toUpperCase());
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            disabled={isEmpty || !!result}
                            onClick={() => setAnswers((a) => ({ ...a, [q.id]: opt.id }))}
                            className={`group/opt relative flex min-h-[72px] items-center gap-3 overflow-hidden rounded-[10px] border p-3 text-left transition-all ${
                              isEmpty
                                ? "cursor-not-allowed border-dashed border-s-stroke2 bg-b-surface2/30 opacity-50"
                                : result
                                  ? isAnswer
                                    ? "border-primary-02 bg-[rgba(0,166,86,0.05)]"
                                    : selected
                                      ? "border-primary-03 bg-[rgba(255,106,85,0.05)]"
                                      : "border-s-stroke2 bg-b-surface2 opacity-60"
                                  : selected
                                    ? "border-primary-01 bg-primary-01/5"
                                    : "border-s-stroke2 bg-b-surface2 hover:border-s-highlight"
                            }`}
                          >
                            <div
                              className={`flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition-colors ${
                                result && isAnswer
                                  ? "bg-primary-02 text-t-light"
                                  : selected
                                    ? "bg-primary-01 text-t-light"
                                    : "border border-s-stroke2 bg-b-surface1 text-t-primary group-hover/opt:border-s-highlight"
                              }`}
                            >
                              {opt.id}
                            </div>
                            <div className="min-w-0 flex-1 text-sub-title-1 leading-relaxed text-t-primary">
                              {isEmpty ? (
                                <span className="text-caption italic text-t-tertiary">Option not available</span>
                              ) : (
                                <QuestionBody
                                  blocks={opt.content_blocks as never}
                                  legacyText={opt.text}
                                  legacyImageUrl={opt.image_url}
                                  legacyImageAlt={`Option ${opt.id}`}
                                  compact
                                />
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="mt-4 max-w-xl">
                      <label className="mb-2 block text-caption font-semibold uppercase tracking-wider text-t-tertiary">
                        Enter numerical answer
                      </label>
                      <input
                        type="text"
                        disabled={!!result}
                        value={answers[q.id] ?? ""}
                        onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                        placeholder="Type your answer…"
                        className="input h-12 rounded-[10px] px-4 text-body-1 font-semibold disabled:cursor-not-allowed disabled:bg-b-surface2 disabled:text-t-tertiary"
                      />
                    </div>
                  )}

                  {feedback?.explanation && (
                    <div className="mt-4 rounded-[10px] border border-s-stroke2/40 bg-b-surface2 p-4">
                      <div className="text-[10px] font-sans font-semibold uppercase tracking-[0.18em] text-t-secondary">Explanation</div>
                      <div className="mt-1.5 text-[13px] font-sans leading-[160%] text-t-primary">{feedback.explanation}</div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* ── Action ────────────────────────────────────────────────────── */}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-s-stroke2/50 pt-6">
            <span className="text-[13px] font-sans text-t-secondary">
              {result
                ? "Your schedule has been updated."
                : `${answeredCount} of ${active.questions.length} answered`}
            </span>
            {result ? (
              <button
                type="button"
                onClick={goNext}
                className="inline-flex h-12 items-center gap-2 rounded-[10px] bg-linear-to-b from-[#2C2C2C] to-[#282828] px-7 text-sm font-sans font-semibold tracking-[0.0125em] text-t-light transition-transform active:scale-98"
              >
                {index + 1 < topics.length ? "Next topic" : "Finish"} <RiArrowRightLine size={16} />
              </button>
            ) : (
              <button
                type="button"
                onClick={submitTopic}
                disabled={answeredCount === 0 || submitting}
                className="inline-flex h-12 items-center gap-2 rounded-[10px] bg-linear-to-b from-[#2C2C2C] to-[#282828] px-7 text-sm font-sans font-semibold tracking-[0.0125em] text-t-light transition-transform active:scale-98 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? <><RiLoader4Line className="animate-spin" size={16} /> Checking…</> : "Submit topic"}
              </button>
            )}
          </div>
        </SectionCard>
      </PageWrapper>
    </>
  );
}
