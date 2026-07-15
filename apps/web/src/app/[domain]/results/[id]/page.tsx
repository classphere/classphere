"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import {
  RiArrowLeftLine,
  RiArrowRightLine,
  RiArrowUpSLine,
  RiArrowDownSLine,
  RiBookmarkFill,
  RiTimerLine,
  RiFocus2Line,
  RiPulseLine,
  RiBarChartBoxLine,
  RiPieChartLine,
  RiExchangeLine,
  RiErrorWarningFill,
  RiTargetLine,
  RiCheckboxCircleFill,
  RiLoader4Line,
  RiFlashlightFill,
} from "@remixicon/react";
import { ResultSummaryHeader } from "@/components/results/ResultSummaryHeader";
import { DetailedPerformanceTabs } from "@/components/results/DetailedPerformanceTabs";
import { SyllabusGapsCard } from "@/components/results/SyllabusGapsCard";
import { AttemptStrategyCard } from "@/components/results/AttemptStrategyCard";
import { ErrorPatternsCard } from "@/components/results/ErrorPatternsCard";
import { PanicCascadeCard } from "@/components/results/PanicCascadeCard";
import { FatigueCurveCard } from "@/components/results/FatigueCurveCard";
import { DifficultyAnalysisCard } from "@/components/results/DifficultyAnalysisCard";
import { AttemptClassificationCard } from "@/components/results/AttemptClassificationCard";
import { SubjectMovementCard } from "@/components/results/SubjectMovementCard";
import { DailyRecoveryPlanCard } from "@/components/results/DailyRecoveryPlanCard";
import { formatTimeSpent, getSubjectStats, getOverviewLabel } from "@/lib/results-utils";

import { useAuth } from "@/lib/auth-context";
import { apiClient } from "@/lib/api.client";

function AccuracyBar({ accuracy }: { accuracy: number }) {
  const color = accuracy >= 70 ? "bg-primary-02" : accuracy >= 40 ? "bg-primary-05" : "bg-primary-03";
  const textClass = accuracy >= 70 ? "text-primary-02" : accuracy >= 40 ? "text-primary-05" : "text-primary-03";
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 bg-s-stroke2 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-800 ${color}`} style={{ width: `${accuracy}%` }} />
      </div>
      <span className={`text-caption font-bold min-w-[32px] text-right ${textClass}`}>
        {accuracy.toFixed(0)}%
      </span>
    </div>
  );
}

export default function ResultsPage() {
  const router = useRouter();
  const params = useParams();
  const attemptId = params?.id as string;
  const { session } = useAuth();

  const [showBooster, setShowBooster] = useState(false);
  const [microCount, setMicroCount] = useState(15);

  const [a, setAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!attemptId || !session?.access_token) return;
    const fetchAnalysis = async () => {
      try {
        const data = await apiClient.get(`/api/v1/analysis/${attemptId}`, session.access_token);
        if (data.success && data.data.status === "ready") {
          setAnalysis(data.data.analysis);
          setLoading(false);
        } else {
          // Poll if pending
          setTimeout(fetchAnalysis, 2000);
        }
      } catch (err) {
        console.error(err);
        setLoading(false);
      }
    };
    fetchAnalysis();
  }, [attemptId, session?.access_token]);

  if (loading || !a) {
    return (
      <>
        <Navbar title="Test Submitted" />
        <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 py-10 md:px-6">
          <div className="bg-b-surface2 border border-s-stroke2 rounded-[24px] p-10 max-w-lg w-full text-center shadow-lg">
            <div className="mx-auto w-16 h-16 bg-primary-01/10 text-primary-01 rounded-full flex items-center justify-center mb-6">
              <RiCheckboxCircleFill size={32} />
            </div>
            <h1 className="text-[24px] font-black tracking-tight text-t-primary mb-3">
              Thank you for the test
            </h1>
            <p className="text-[14px] text-t-secondary mb-8">
              Your test has been successfully submitted. We are crunching the numbers and running your personalized AI analysis. The result will be displayed soon.
            </p>
            <div className="flex items-center justify-center gap-2 text-t-secondary font-medium text-[13px]">
              <RiLoader4Line className="animate-spin text-primary-02" size={18} />
              Processing results...
            </div>
          </div>
        </div>
      </>
    );
  }

  const pct = Math.round(a.scoring.percentage);
  const pctColorClass = pct >= 70 ? "text-primary-02" : pct >= 50 ? "text-primary-05" : "text-primary-03";
  const pctBorderColor = pct >= 70 ? "border-primary-02" : pct >= 50 ? "border-primary-05" : "border-primary-03";
  const pctBgClass = pct >= 70 ? "bg-primary-02/5" : pct >= 50 ? "bg-primary-05/5" : "bg-primary-03/5";
  const totalQuestions = a.scoring.correctCount + a.scoring.incorrectCount + a.scoring.skippedCount;
  const batchAvgScore = a.batchAvg?.score ?? 148; // realistic batch average marks
  const attemptedChapters = [...a.topicStats].filter((t: any) => t.attempted > 0);
  const unattemptedChapters = [...a.topicStats].filter((t: any) => t.attempted === 0);
  const strategySubjects = a.attemptStrategy?.subjectOrder ?? Object.keys(a.attemptStrategy?.timeDeviationPct ?? {});

  return (
    <>
      <Navbar title="Results & Analysis" />

      <main className="mx-auto w-full max-w-screen-2xl px-4 pb-12 pt-4 md:px-8">
        <div className="mb-6 flex items-center justify-between gap-4">
          <Link href="/" className="inline-flex items-center gap-2 rounded-[10px] border border-s-stroke2 bg-b-surface2 px-4 py-2 text-caption font-bold text-t-secondary transition-colors hover:text-t-primary">
            <RiArrowLeftLine size={16} /> Back to Dashboard
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex flex-row justify-center items-center px-2 py-1 border border-s-stroke2 dark:border-s-stroke2 rounded-[10px] bg-b-surface1 text-t-secondary text-[12px] font-sans font-semibold tracking-[0.004em]">{totalQuestions} questions</span>
            <span className="flex flex-row justify-center items-center px-2 py-1 border border-s-stroke2 dark:border-s-stroke2 rounded-[10px] bg-b-surface1 text-t-secondary text-[12px] font-sans font-semibold tracking-[0.004em]">
              {attemptedChapters.filter((t: any) => t.isWeak).length} weak chapter{attemptedChapters.filter((t: any) => t.isWeak).length === 1 ? "" : "s"}
            </span>
            <span className="flex flex-row justify-center items-center px-2 py-1 border border-s-stroke2 dark:border-s-stroke2 rounded-[10px] bg-b-surface1 text-t-secondary text-[12px] font-sans font-semibold tracking-[0.004em]">
              {unattemptedChapters.length} unattempted chapter{unattemptedChapters.length === 1 ? "" : "s"}
            </span>
            {a.narrative?.examCountdown && (
              <span className="flex flex-row justify-center items-center px-2 py-1 border border-s-stroke2/40 bg-[rgba(239,157,14,0.05)] text-primary-05 text-[12px] font-sans font-semibold tracking-[0.004em] rounded-[10px]">{a.narrative.examCountdown.urgencyLabel}</span>
            )}
          </div>
        </div>

        <ResultSummaryHeader analysis={a} totalQuestions={totalQuestions} batchAvgScore={batchAvgScore} />

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="space-y-6">
            <DetailedPerformanceTabs analysis={a} totalQuestions={totalQuestions} strategySubjects={strategySubjects} />

            <SyllabusGapsCard unattemptedChapters={unattemptedChapters} />
            <AttemptStrategyCard strategy={a.attemptStrategy} strategySubjects={strategySubjects} />
            <ErrorPatternsCard errorPatterns={a.errorPatterns} />

            <PanicCascadeCard panicCascade={a.panicCascade} />
            <FatigueCurveCard timeIntervals={a.timeIntervals} fatigueSummary={a.fatigueSummary} />
            <DifficultyAnalysisCard difficultyBreakdown={a.difficultyBreakdown} />
            <AttemptClassificationCard attemptClassification={a.attemptClassification} />
            <SubjectMovementCard subjectMovement={a.subjectMovement} />

            <section className="flex flex-col gap-4  bg-[rgba(55,101,246,0.05)] p-6 md:flex-row md:items-center md:justify-between md:p-8 card">
              <div>
                <h2 className="text-[16px] font-sans font-bold text-primary-01">Stop repeating these mistakes</h2>
                <p className="mt-1 text-[12px] font-sans text-t-secondary dark:text-t-secondary">Add these {a.errorPatterns.length * 2} errors to your mistake diary for revision.</p>
              </div>
              <Link href="/student/mistakes" className="flex flex-row justify-center items-center py-3 px-7 h-12 rounded-[10px] text-sm font-sans font-semibold tracking-[0.0125em] text-t-light transition-all active:scale-98 relative overflow-hidden bg-linear-to-b from-[#2C2C2C] to-[#282828] shadow-[inset_2px_0px_8px_2px_rgba(248,248,248,0.20),0px_5px_1.5px_-4px_rgba(8,8,8,0.09)] after:absolute after:inset-0 after:rounded-[10px] after:border-[1.5px] after:border-white/20 after:[mask-image:linear-gradient(to_top,transparent_0,black_100%)] gap-2 self-start md:self-auto">
                <span className="relative z-10 flex items-center gap-2"><RiBookmarkFill size={16} /> Open Mistake Diary</span>
              </Link>
            </section>

            <DailyRecoveryPlanCard studyPlan={a.studyPlan} />
          </div>

          <aside className="space-y-6 xl:sticky xl:top-6 xl:self-start">
            <section className="group relative card flex flex-col overflow-hidden p-6 md:p-8 card select-none">
              
              <div className="relative z-10 mb-4 flex items-center gap-2 text-[14px] font-sans font-bold text-t-primary dark:text-t-primary">
                <RiTargetLine size={20} className="text-primary-05" /> Recovery options
              </div>
              <p className="relative z-10 text-[12px] font-sans leading-[160%] text-t-secondary dark:text-t-secondary">Turn the weak areas into a short follow-up set or a full revision run.</p>

              <div className="relative z-10 mt-5 space-y-3">
                <button onClick={() => setShowBooster((v) => !v)} className="flex flex-row justify-between items-center py-3 px-6 w-full border border-s-stroke2 dark:border-s-stroke2 rounded-[10px] bg-transparent text-t-secondary dark:text-t-secondary text-[14px] font-sans font-semibold transition-all hover:border-t-secondary active:scale-98 h-12">
                  <span className="flex items-center gap-2 text-t-primary dark:text-t-primary"><RiFlashlightFill size={18} /> Micro Booster</span>
                  <span className="text-[12px] font-sans font-normal">15-30 Qs</span>
                </button>
                <button onClick={() => router.push("/pyqs")} className="flex flex-row justify-between items-center py-3 px-6 h-12 w-full rounded-[10px] text-[14px] font-sans font-semibold tracking-[0.0125em] text-t-light transition-all active:scale-98 relative overflow-hidden bg-linear-to-b from-[#2C2C2C] to-[#282828] shadow-[inset_2px_0px_8px_2px_rgba(248,248,248,0.20),0px_5px_1.5px_-4px_rgba(8,8,8,0.09)] after:absolute after:inset-0 after:rounded-[10px] after:border-[1.5px] after:border-white/20 after:[mask-image:linear-gradient(to_top,transparent_0,black_100%)]">
                  <span className="relative z-10 flex items-center gap-2"><RiArrowRightLine size={18} /> Back to PYQs</span>
                  <span className="relative z-10 text-[12px] font-sans font-normal opacity-80">pick another paper</span>
                </button>
              </div>

              {showBooster && (
                <div className="relative z-10 mt-5 rounded-[10px] border border-s-stroke2/40 dark:border-s-stroke2/40 bg-b-surface1 dark:bg-b-surface1/60 p-5 shadow-sm">
                  <div className="mb-3 text-[10px] font-sans font-bold uppercase tracking-[0.22em] text-t-secondary">Quick set</div>
                  <div className="grid grid-cols-4 gap-2">
                    {[15, 20, 25, 30].map((n) => (
                      <button 
                        key={n} 
                        onClick={() => setMicroCount(n)} 
                        className={`py-2 px-1 text-center rounded-[10px] border text-[14px] font-sans font-bold transition-all ${
                          microCount === n 
                            ? "border-transparent bg-linear-to-b from-[#2C2C2C] to-[#282828] text-white shadow-[inset_2px_0px_8px_2px_rgba(248,248,248,0.20),0px_5px_1.5px_-4px_rgba(8,8,8,0.09)] after:absolute after:inset-0 after:rounded-[10px] after:border-[1.5px] after:border-white/20 after:[mask-image:linear-gradient(to_top,transparent_0,black_100%)] relative overflow-hidden" 
                            : "border-s-stroke2 bg-b-surface2 text-t-secondary dark:text-t-secondary hover:border-s-highlight"
                        }`}
                      >
                        <span className="relative z-10">{n}</span>
                      </button>
                    ))}
                  </div>
                  <div className="mt-4 text-[12px] font-sans text-t-secondary dark:text-t-secondary">The current pick is {microCount} questions.</div>
                </div>
              )}
            </section>

            <section className="group relative card flex flex-col overflow-hidden p-6 md:p-8 card select-none">
              
              <div className="relative z-10 mb-4 flex items-center gap-2 text-[14px] font-sans font-bold text-t-primary dark:text-t-primary">
                <RiTimerLine size={20} className="text-primary-01" /> Exam snapshot
              </div>
              <div className="relative z-10 space-y-3 text-[12px] font-sans text-t-secondary dark:text-t-secondary">
                <div className="flex items-center justify-between rounded-[10px] border border-s-stroke2/30 bg-b-surface1 dark:bg-b-surface1/60 px-4 py-3">
                  <span>Correct</span>
                  <strong className="text-primary-02 text-[16px] font-black">{a.scoring.correctCount}</strong>
                </div>
                <div className="flex items-center justify-between rounded-[10px] border border-s-stroke2/30 bg-b-surface1 dark:bg-b-surface1/60 px-4 py-3">
                  <span>Incorrect</span>
                  <strong className="text-primary-03 text-[16px] font-black">{a.scoring.incorrectCount}</strong>
                </div>
                <div className="flex items-center justify-between rounded-[10px] border border-s-stroke2/30 bg-b-surface1 dark:bg-b-surface1/60 px-4 py-3">
                  <span>Skipped</span>
                  <strong className="text-t-primary dark:text-t-primary text-[16px] font-black">{a.scoring.skippedCount}</strong>
                </div>
              </div>
            </section>
          </aside>
        </div>
      </main>
    </>
  );
}
