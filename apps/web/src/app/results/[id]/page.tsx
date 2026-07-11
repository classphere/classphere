"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import {
  RiTargetLine,
  RiFlashlightFill,
  RiTimerLine,
  RiSearchLine,
  RiAlertFill,
  RiCalendarEventLine,
  RiArrowUpSLine,
  RiArrowDownSLine,
  RiLightbulbFlashLine,
  RiArrowLeftLine,
  RiArrowRightLine,
  RiLoader4Line,
  RiBookmarkFill,
  RiBarChartBoxLine,
  RiPieChartLine,
  RiPulseLine,
  RiExchangeLine,
  RiErrorWarningFill,
  RiCheckboxCircleFill,
  RiCloseCircleFill,
  RiSubtractLine,
} from "@remixicon/react";

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

function formatTimeSpent(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins > 0) {
    return `${mins} min ${secs} s`;
  }
  return `${secs} s`;
}

export default function ResultsPage() {
  const router = useRouter();
  const params = useParams();
  const attemptId = params?.id as string;

  const [showBooster, setShowBooster] = useState(false);
  const [showAllWeakTopics, setShowAllWeakTopics] = useState(false);
  const [selectedMode, setSelectedMode] = useState<"micro" | "full" | null>(null);
  const [microCount, setMicroCount] = useState(15);
  const [fullHours, setFullHours] = useState<1 | 2 | 3>(1);
  const [expandedDay, setExpandedDay] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "analysis" | "time" | "missed" | "complete">("overview");
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const [a, setAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!attemptId) return;
    const fetchAnalysis = async () => {
      try {
        const res = await fetch(`/api/v1/analysis/${attemptId}`);
        if (!res.ok) throw new Error(`API error: ${res.status}`);
        const contentType = res.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) throw new Error("Invalid response format");
        const data = await res.json();
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
  }, [attemptId]);

  const getSubjectStats = (subj: string | null) => {
    const answers = subj 
      ? a.classified.filter((ans: any) => ans.question.subject === subj)
      : a.classified;
    
    const total = answers.length;
    const correct = answers.filter((ans: any) => ans.is_correct).length;
    const incorrect = answers.filter((ans: any) => ans.selected_answer && !ans.is_correct).length;
    const skipped = answers.filter((ans: any) => !ans.selected_answer).length;
    const notVisited = answers.filter((ans: any) => !ans.selected_answer && (ans.time_taken_sec || 0) < 3).length;
    const unattempted = skipped - notVisited;

    // Let's compute score
    const score = answers.reduce((sum: number, ans: any) => sum + (ans.marks_awarded || 0), 0);
    const maxScore = total * 4;

    return { total, correct, incorrect, unattempted, notVisited, score, maxScore };
  };

  const getOverviewLabel = (ans: any) => {
    const allotted = ans.question.difficulty === "easy" ? 90 : ans.question.difficulty === "medium" ? 120 : 210;
    const spent = ans.time_taken_sec || 0;

    if (ans.is_correct) {
      return spent < allotted * 1.5 ? "Perfect" : "-";
    }
    if (!ans.selected_answer) {
      return spent >= 15 ? "Confused" : "-";
    }
    if (spent >= allotted * 1.2) return "Wasted";
    return "-";
  };

  if (loading || !a) {
    return (
      <>
        <Navbar title="Results & Analysis" />
        <div className="min-h-[70vh] px-4 py-10 md:px-6">
          <div className="group relative card flex flex-col overflow-hidden p-8 md:p-10 card mx-auto max-w-5xl gap-6">
            
            <div className="relative z-10 h-3 w-36 rounded-full bg-b-surface2" />
            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_14rem]">
              <div className="space-y-3">
                <div className="h-9 w-72 max-w-full rounded-[10px] bg-b-surface2" />
                <div className="h-5 w-96 max-w-full rounded-full bg-b-surface2" />
              </div>
              <div className="h-24 rounded-[10px] border border-s-stroke2 bg-b-surface2" />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="h-32 rounded-[10px] bg-b-surface2" />
              <div className="h-32 rounded-[10px] bg-b-surface2" />
              <div className="h-32 rounded-[10px] bg-b-surface2" />
            </div>

            <div className="flex items-center gap-3 text-t-secondary">
              <RiLoader4Line size={18} className="animate-spin text-primary-01" />
              <p className="text-body-2 font-semibold">Analyzing your performance...</p>
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

        <section className="group relative card flex flex-col overflow-hidden p-6 md:p-8 card select-none">

          <div className="relative z-10 grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
            <div className="space-y-5">
              <div>
                <p className="text-[12px] font-sans font-bold uppercase tracking-[0.24em] text-t-secondary">Test Results</p>
                <h1 className="mt-2 text-[28px] md:text-[32px] font-sans font-black tracking-tight text-t-primary dark:text-t-primary leading-tight">Test Results & Analysis</h1>
                <p className="mt-2 text-[14px] font-sans font-medium text-t-secondary dark:text-t-secondary">{a.topicStats[0]?.chapter ?? "Practice set"} · JEE · {totalQuestions} questions</p>
              </div>

              {a.narrative && (
                <div className="rounded-[10px] border border-s-border dark:border-s-stroke2/30 bg-b-surface2 dark:bg-b-surface2 shadow-[0px_0px_36px_-8px_rgba(0,0,0,0.05),0px_6px_4px_-4px_rgba(8,8,8,0.05)] p-5 md:p-6">
                  <div className="mb-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2 text-[16px] font-sans font-bold text-t-primary dark:text-t-primary tracking-[0.0015em]">
                      <RiLightbulbFlashLine size={20} className="text-primary-05" /> Performance summary
                    </div>
                    {a.narrative.examCountdown && <span className="flex flex-row justify-center items-center px-2 py-0.5 border border-s-stroke2 dark:border-s-stroke2 rounded-[10px] bg-b-surface1 text-t-secondary dark:text-t-secondary text-[10px] font-sans font-bold tracking-[0.004em]">{a.narrative.examCountdown.urgencyLabel}</span>}
                  </div>
                  <p className="text-[14px] font-sans font-semibold leading-[150%] text-t-primary dark:text-t-primary">{a.narrative.headline}</p>
                  <p className="mt-3 max-w-3xl text-[12px] font-sans leading-[160%] text-t-secondary dark:text-t-secondary">{a.narrative.overview}</p>
                  <div className="mt-4 rounded-[10px] border border-s-stroke2/40 dark:border-s-stroke2/40 bg-b-surface1 dark:bg-b-surface1/60 p-4">
                    <div className="text-[10px] font-sans font-bold uppercase tracking-[0.24em] text-t-secondary">Best next move</div>
                    <div className="mt-1 text-[14px] font-sans font-semibold text-t-primary dark:text-t-primary">{a.narrative.biggestWin}</div>
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-[10px] border border-s-border dark:border-s-stroke2/30 bg-b-surface2 dark:bg-b-surface2 shadow-[0px_0px_36px_-8px_rgba(0,0,0,0.05),0px_6px_4px_-4px_rgba(8,8,8,0.05)] p-5">
              <div className={`flex items-center justify-between rounded-[10px] border border-opacity-30 ${pctBorderColor} ${pctBgClass} p-4`}>
                <div>
                  <div className={`text-[32px] font-sans font-black tracking-tight leading-none ${pctColorClass}`}>{a.scoring.score} <span className="text-[14px] font-medium text-t-secondary dark:text-t-secondary">/ {a.scoring.maxScore}</span></div>
                  <div className="text-[12px] font-sans font-bold text-t-secondary dark:text-t-secondary mt-1">Marks Obtained</div>
                </div>
                {a.freeMarks?.projectedScore > a.scoring.score && (
                  <div className="text-right">
                    <div className="text-[10px] font-sans font-bold uppercase tracking-[0.22em] text-primary-02">Potential</div>
                    <div className="text-[16px] font-sans font-black text-primary-02">{a.freeMarks.projectedScore} <span className="text-[10px] font-normal text-t-secondary dark:text-t-secondary">/ {a.scoring.maxScore}</span></div>
                  </div>
                )}
              </div>

              <div className="mt-4 h-2.5 w-full rounded-full bg-s-stroke2 overflow-hidden shadow-[inset_0px_1px_2px_rgba(0,0,0,0.1)] dark:shadow-[inset_0px_1px_3px_rgba(0,0,0,0.2)]">
                <div className={`h-full rounded-full transition-all ${pct >= 70 ? "bg-primary-02" : pct >= 50 ? "bg-primary-05" : "bg-primary-03"}`} style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} />
              </div>

              <div className="mt-4 grid grid-cols-3 gap-3">
                {[
                  { label: "Correct", value: a.scoring.correctCount, color: "text-primary-02" },
                  { label: "Wrong", value: a.scoring.incorrectCount, color: "text-primary-03" },
                  { label: "Skipped", value: a.scoring.skippedCount, color: "text-t-secondary dark:text-t-secondary" },
                ].map((stat) => (
                  <div key={stat.label} className="rounded-[10px] border border-s-stroke2/40 dark:border-s-stroke2/40 bg-b-surface1 dark:bg-b-surface1/60 p-3 text-center flex flex-col justify-center items-center">
                    <div className={`text-[20px] font-sans font-black leading-none ${stat.color}`}>{stat.value}</div>
                    <div className="mt-1.5 text-[10px] font-sans font-bold uppercase tracking-[0.22em] text-t-secondary">{stat.label}</div>
                  </div>
                ))}
              </div>

              <div className="mt-4 rounded-[10px] border border-s-stroke2/40 dark:border-s-stroke2/40 bg-b-surface1 dark:bg-b-surface1/60 p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="text-[10px] font-sans font-bold uppercase tracking-[0.22em] text-t-secondary">Batch average</div>
                    <div className="mt-1 text-[16px] font-sans font-black text-t-primary dark:text-t-primary leading-none">{batchAvgScore} <span className="text-[10px] font-normal text-t-secondary dark:text-t-secondary">/ {a.scoring.maxScore}</span></div>
                  </div>
                  <div className={`flex flex-row justify-center items-center px-1.5 py-0.5 rounded-[10px] border text-[12px] font-sans font-semibold tracking-[0.004em] ${a.scoring.score >= batchAvgScore ? "border-s-stroke2/40 bg-[rgba(0,166,86,0.05)] text-primary-02" : "border-s-stroke2/40 bg-[rgba(255,106,85,0.05)] text-primary-03"}`}>
                    {a.scoring.score >= batchAvgScore ? `+${a.scoring.score - batchAvgScore} Marks` : `-${batchAvgScore - a.scoring.score} Marks`}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="space-y-6">
            {/* ── HIGH-FIDELITY DETAILED REPORT CARD ── */}
            <section className="group relative card flex flex-col overflow-hidden p-6 md:p-8 card select-none">
              
              <div className="relative z-10 mb-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-s-stroke2 pb-5">
                <div>
                  <h2 className="text-[20px] font-sans font-semibold tracking-[0.0015em] leading-[145%] text-t-primary dark:text-t-primary">Detailed Performance Report</h2>
                  <p className="mt-1 text-[12px] font-sans text-t-secondary">Deep-dive pedagogical analysis of your test attempts.</p>
                </div>
                <div className="flex items-center gap-1 p-1 rounded-full border border-s-stroke2/40 dark:border-s-stroke2/40 bg-b-surface1 dark:bg-b-surface1 w-fit max-w-full overflow-x-auto scrollbar-hide shadow-[inset_0_1px_3px_rgba(0,0,0,0.02)]">
                  {[
                    { id: "overview", label: "Overview" },
                    { id: "analysis", label: "Analysis" },
                    { id: "time", label: "Time & Accuracy" },
                    { id: "missed", label: "Missed Concepts" },
                    { id: "complete", label: "Complete Analysis" }
                  ].map(t => (
                    <button
                      key={t.id}
                      onClick={() => setActiveTab(t.id as any)}
                      className={`px-4 py-2 rounded-[10px] text-[12px] font-sans font-semibold tracking-[0.004em] transition-all whitespace-nowrap shrink-0 ${
                        activeTab === t.id 
                          ? "bg-linear-to-b from-[#2C2C2C] to-[#282828] text-white shadow-[inset_2px_0px_8px_2px_rgba(248,248,248,0.20),0px_5px_1.5px_-4px_rgba(8,8,8,0.09)] after:absolute after:inset-0 after:rounded-full after:border-[1.5px] after:border-white/20 after:[mask-image:linear-gradient(to_top,transparent_0,black_100%)] relative overflow-hidden" 
                          : "bg-transparent text-t-secondary hover:text-t-primary"
                      }`}
                    >
                      <span className="relative z-10">{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Render active tab content here */}
              <div className="relative z-10">
              {activeTab === "overview" && (
                <div className="space-y-6 animate-fadeIn">
                  <div className="text-[10px] font-bold uppercase tracking-[0.24em] text-t-tertiary">Summary of marks scored in the test</div>
                  <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
                    {[
                      { label: "Score", value: `${a.scoring.score}/${a.scoring.maxScore}`, sub: "Marks Obtained" },
                      { label: "Accuracy", value: `${a.scoring.correctCount + a.scoring.incorrectCount > 0 ? Math.round((a.scoring.correctCount / (a.scoring.correctCount + a.scoring.incorrectCount)) * 100) : 0}%`, sub: "Attempt Accuracy" },
                      { label: "Qs Attempted", value: `${a.scoring.correctCount + a.scoring.incorrectCount}/${totalQuestions}`, sub: "Out of Total Questions" },
                      { label: "Time Taken", value: `${Math.round(Object.values(a.attemptStrategy?.timePerSubjectSec || {}).reduce((sum: number, val: any) => sum + val, 0) / 60)}/180 min`, sub: "Total Spent Time" }
                    ].map((stat, i) => (
                      <div key={i} className="rounded-[10px] border border-s-stroke2 bg-b-surface1 p-5 text-center">
                        <div className="text-caption font-bold uppercase tracking-[0.22em] text-t-tertiary mb-2">{stat.label}</div>
                        <div className="text-h3 font-black tracking-tight text-t-primary">{stat.value}</div>
                        <div className="text-caption text-t-secondary mt-1">{stat.sub}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === "analysis" && (
                <div className="space-y-6 animate-fadeIn">
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-[0.24em] text-t-tertiary mb-1">Detailed analysis of your performance</div>
                    <p className="text-caption text-t-secondary leading-relaxed max-w-3xl">
                      This is a quick snapshot of your performance measured in terms of attempts that were correct, incorrect, unattempted and questions that were not visited at all. The individual subject-wise analysis will help you gauge your performance on a subject level.
                    </p>
                  </div>
                  <div className="overflow-x-auto rounded-[10px] border border-s-stroke2">
                    <table className="rayum-table">
                      <thead>
                        <tr>
                          <th>SUBJECT</th>
                          <th>SCORE</th>
                          <th>CORRECT</th>
                          <th>INCORRECT</th>
                          <th>UNATTEMPTED</th>
                          <th>NOT VISITED</th>
                        </tr>
                      </thead>
                      <tbody>
                        {/* Overall row */}
                        {(() => {
                          const overall = getSubjectStats(null);
                          return (
                            <tr className="font-bold bg-b-surface1/30">
                              <td>Overall</td>
                              <td>{overall.score}/{overall.maxScore}</td>
                              <td>{overall.correct}/75</td>
                              <td>{overall.incorrect}/75</td>
                              <td>{overall.unattempted}/75</td>
                              <td>{overall.notVisited}/75</td>
                            </tr>
                          );
                        })()}
                        {/* Subject rows */}
                        {strategySubjects.map((subj: string) => {
                          const stats = getSubjectStats(subj);
                          return (
                            <tr key={subj}>
                              <td className="font-semibold">{subj}</td>
                              <td>{stats.score}/{stats.maxScore}</td>
                              <td>{stats.correct}/25</td>
                              <td>{stats.incorrect}/25</td>
                              <td>{stats.unattempted}/25</td>
                              <td>{stats.notVisited}/25</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeTab === "time" && (
                <div className="space-y-6 animate-fadeIn">
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-[0.24em] text-t-tertiary mb-1">Time and Accuracy</div>
                    <p className="text-caption text-t-secondary leading-relaxed max-w-3xl">
                      Time is the most important resource in any competitive exam. And one major element of any test analysis is to check the time spent on an individual subject. This section will not only give you insight on the time spent but also the percentage attempt and accuracy at the subject level.
                    </p>
                  </div>
                  <div className="overflow-x-auto rounded-[10px] border border-s-stroke2">
                    <table className="rayum-table">
                      <thead>
                        <tr>
                          <th>SUBJECT</th>
                          <th>TIME SPENT</th>
                          <th>ATTEMPT (IN %)</th>
                          <th>ACCURACY (IN %)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {/* Overall Row */}
                        {(() => {
                          const spent = Object.values(a.attemptStrategy?.timePerSubjectSec || {}).reduce((sum: number, val: any) => sum + val, 0);
                          const attempted = a.scoring.correctCount + a.scoring.incorrectCount;
                          const attemptPct = Math.round((attempted / 75) * 100);
                          const accuracyPct = attempted > 0 ? Math.round((a.scoring.correctCount / attempted) * 100) : 0;
                          return (
                            <tr className="font-bold bg-b-surface1/30">
                              <td>Overall</td>
                              <td>{formatTimeSpent(spent)}</td>
                              <td>{attemptPct}%</td>
                              <td>{accuracyPct}%</td>
                            </tr>
                          );
                        })()}
                        {/* Subject Rows */}
                        {strategySubjects.map((subj: string) => {
                          const spent = a.attemptStrategy?.timePerSubjectSec?.[subj] || 0;
                          const stats = getSubjectStats(subj);
                          const attempted = stats.correct + stats.incorrect;
                          const attemptPct = Math.round((attempted / 30) * 100);
                          const accuracyPct = attempted > 0 ? Math.round((stats.correct / attempted) * 100) : 0;
                          return (
                            <tr key={subj}>
                              <td className="font-semibold">{subj}</td>
                              <td>{formatTimeSpent(spent)}</td>
                              <td>{attemptPct}%</td>
                              <td>{accuracyPct}%</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeTab === "missed" && (
                <div className="space-y-6 animate-fadeIn">
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-[0.24em] text-t-tertiary mb-1">Missed Concepts</div>
                    <p className="text-caption text-t-secondary leading-relaxed max-w-3xl">
                      This section lists all the concepts you got wrong in the exam on an individual subject level. This information becomes relevant for you as you will now need to spend some time brushing up these concepts.
                    </p>
                  </div>
                  <div className="grid gap-6 md:grid-cols-3">
                    {["Physics", "Chemistry", "Mathematics"].map((subj) => {
                      const missed = a.classified
                        .filter((ans: any) => ans.question.subject === subj && ans.selected_answer && !ans.is_correct)
                        .map((ans: any) => ans.question.topic);
                      const uniqueMissed = Array.from(new Set(missed));
                      return (
                        <div key={subj} className="rounded-[10px] border border-s-stroke2 bg-b-surface1 p-5">
                          <h3 className="text-body-2 font-bold text-t-primary mb-3 pb-2 border-b border-s-stroke2">{subj}</h3>
                          {uniqueMissed.length > 0 ? (
                            <ol className="list-decimal pl-5 space-y-2 text-caption text-t-secondary">
                              {uniqueMissed.map((topic: any, idx) => (
                                <li key={idx} className="leading-relaxed">{topic}</li>
                              ))}
                            </ol>
                          ) : (
                            <p className="text-caption text-t-tertiary italic">Great! You did not miss any concept.</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {activeTab === "complete" && (
                <div className="space-y-6 animate-fadeIn">
                  <div className="overflow-x-auto rounded-[10px] border border-s-stroke2">
                    <table className="rayum-table">
                      <thead>
                        <tr>
                          <th>QNO</th>
                          <th>CHAPTER</th>
                          <th>TOPIC</th>
                          <th>DIFFICULTY</th>
                          <th>ALLOTTED</th>
                          <th>SPENT</th>
                          <th>ATTEMPTED</th>
                          <th>ANSWER</th>
                          <th>OVERVIEW</th>
                        </tr>
                      </thead>
                      <tbody>
                        {a.classified.map((ans: any) => {
                          const qNum = ans.question.question_number;
                          const chapter = ans.question.chapter;
                          const topic = ans.question.topic;
                          const difficulty = ans.question.difficulty === "easy" ? "Easy" : ans.question.difficulty === "medium" ? "Moderate" : "Difficult";
                          const allotted = ans.question.difficulty === "easy" ? "90 s" : ans.question.difficulty === "medium" ? "120 s" : "210 s";
                          const spent = `${ans.time_taken_sec || 0} s`;
                          const attempted = ans.selected_answer ? "Yes" : "No";
                          
                          let ansLabel = "- Skipped";
                          let ansColor = "text-t-tertiary";
                          if (ans.selected_answer) {
                            if (ans.is_correct) {
                              ansLabel = "✓ Correct";
                              ansColor = "text-primary-02 font-bold";
                            } else {
                              ansLabel = "✗ Incorrect";
                              ansColor = "text-primary-03 font-bold";
                            }
                          }

                          const classification = ans.classification;
                          const isExpanded = expandedRow === ans.id;
                          
                          // Convert type to readable format
                          const fallbackOverview = getOverviewLabel(ans);
                          const typeLabel = classification?.type ? classification.type.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) : fallbackOverview;
                          let typeColor = "text-t-tertiary";
                          if (classification?.type === "correct" || classification?.type === "strategic_skip") typeColor = "text-primary-02 font-bold";
                          else if (classification?.type === "silly" || classification?.type === "wasted_time" || classification?.type === "ran_out_of_time") typeColor = "text-primary-03 font-bold";
                          else if (classification?.type) typeColor = "text-primary-05 font-bold";
                          else if (fallbackOverview === "Perfect") typeColor = "text-primary-02 font-bold";
                          else if (fallbackOverview === "Wasted") typeColor = "text-primary-03 font-bold";
                          else if (fallbackOverview === "Confused") typeColor = "text-primary-05 font-bold";

                          return (
                            <React.Fragment key={ans.id}>
                              <tr onClick={() => classification?.detail && setExpandedRow(isExpanded ? null : ans.id)} className={classification?.detail ? "cursor-pointer hover:bg-b-surface1/50 transition-colors" : ""}>
                                <td>{qNum}</td>
                                <td>{chapter}</td>
                                <td>{topic}</td>
                                <td>{difficulty}</td>
                                <td>{allotted}</td>
                                <td>{spent}</td>
                                <td>{attempted}</td>
                                <td className={ansColor}>{ansLabel}</td>
                                <td className={typeColor}>
                                  <div className="flex items-center justify-between">
                                    <span>{typeLabel}</span>
                                    {classification?.detail && (
                                      isExpanded ? <RiArrowUpSLine size={16} /> : <RiArrowDownSLine size={16} />
                                    )}
                                  </div>
                                </td>
                              </tr>
                              {isExpanded && classification?.detail && (
                                <tr className="bg-[rgba(55,101,246,0.02)] border-b border-s-stroke2">
                                  <td colSpan={9} className="p-4">
                                    <div className="flex flex-col gap-2 text-[12px] text-t-primary dark:text-t-primary">
                                      <div className="flex items-start gap-2">
                                        <RiSearchLine size={16} className="text-primary-01 mt-0.5 shrink-0" />
                                        <p><strong className="text-primary-01">Analysis:</strong> {classification.detail}</p>
                                      </div>
                                      {classification.tip && (
                                        <div className="flex items-start gap-2">
                                          <RiLightbulbFlashLine size={16} className="text-primary-05 mt-0.5 shrink-0" />
                                          <p><strong className="text-primary-05">Actionable Tip:</strong> {classification.tip}</p>
                                        </div>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              </div>
            </section>

            {unattemptedChapters.length > 0 && (
              <section className="group relative card flex flex-col overflow-hidden p-6 md:p-8 card select-none">
                
                <div className="relative z-10 mb-4">
                  <h2 className="text-[20px] font-sans font-semibold tracking-[0.0015em] leading-[145%] text-t-primary dark:text-t-primary">Syllabus Gaps (Unattempted)</h2>
                  <p className="mt-1 text-[12px] font-sans text-t-secondary">Chapters with zero attempts in this mock test. Revise these to ensure full syllabus coverage.</p>
                </div>
                <div className="relative z-10 flex flex-wrap gap-2.5">
                  {unattemptedChapters.map((chapter: any) => (
                    <div key={chapter.topic} className="flex flex-row justify-center items-center px-4 py-2 border border-s-stroke2 dark:border-s-stroke2 rounded-[10px] bg-b-surface2 dark:bg-b-surface2 text-t-secondary dark:text-t-secondary text-[12px] font-sans font-bold tracking-[0.004em] gap-2">
                      <span className="h-2 w-2 rounded-full bg-t-secondary dark:bg-t-tertiary" />
                      <span>{chapter.topic}</span>
                      <span className="text-[10px] font-normal text-t-secondary dark:text-t-tertiary">({chapter.chapter})</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {a.attemptStrategy && a.attemptStrategy.pattern !== "mixed" && (
              <section className="group relative card flex flex-col overflow-hidden p-6 md:p-8 card select-none">
                
                <div className="relative z-10 mb-4 flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-[20px] font-sans font-semibold tracking-[0.0015em] leading-[145%] text-t-primary dark:text-t-primary">Attempt Strategy</h2>
                    <p className="mt-1 text-[12px] font-sans text-t-secondary">Use this to improve pacing and accuracy.</p>
                  </div>
                  <div className="flex flex-row justify-center items-center px-3 py-1 border border-s-stroke2 dark:border-s-stroke2 rounded-[10px] bg-b-surface2 text-t-secondary dark:text-t-secondary text-[12px] font-sans font-bold tracking-[0.004em]">
                    {a.attemptStrategy.strategyScore}/100
                  </div>
                </div>
                <div className="relative z-10 rounded-[10px] border border-s-stroke2/40 dark:border-s-stroke2/40 bg-b-surface1 dark:bg-b-surface1/60 p-4">
                  <div className="grid gap-3 sm:grid-cols-3">
                    {strategySubjects.map((subject: string) => {
                      const deviation = a.attemptStrategy.timeDeviationPct?.[subject];
                      const budget = a.attemptStrategy.optimalTimeSec?.[subject];
                      const spent = a.attemptStrategy.timePerSubjectSec?.[subject];
                      return (
                        <div key={subject} className="rounded-[10px] border border-s-stroke2/40 dark:border-s-stroke2/40 bg-b-surface2 dark:bg-b-surface2 p-4">
                          <div className="text-[10px] font-sans font-bold uppercase tracking-[0.22em] text-t-secondary">{subject}</div>
                          <div className={`mt-2 text-[20px] font-sans font-black ${deviation >= 0 ? "text-primary-02" : "text-primary-03"}`}>
                            {deviation != null ? `${deviation > 0 ? "+" : ""}${Math.round(deviation)}%` : "—"}
                          </div>
                          <div className="mt-1 text-[12px] font-sans text-t-secondary">
                            {spent != null && budget != null ? `${Math.round(spent)}s spent · ${Math.round(budget)}s ideal` : "Timing data unavailable"}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <p className="mt-4 text-[12px] font-sans leading-[160%] text-t-secondary dark:text-t-secondary">
                    <strong className="text-t-primary dark:text-t-primary">Recommendation:</strong> {a.attemptStrategy.recommendation}
                  </p>
                </div>
              </section>
            )}

            <section className="group relative card flex flex-col overflow-hidden p-6 md:p-8 card select-none">
              
              <div className="relative z-10 mb-5 flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-[20px] font-sans font-semibold tracking-[0.0015em] leading-[145%] text-t-primary dark:text-t-primary">Error Patterns</h2>
                  <p className="mt-1 text-[12px] font-sans text-t-secondary">These are the mistakes that cost you the most.</p>
                </div>
                <span className="flex flex-row justify-center items-center px-2 py-0.5 border border-s-stroke2/40 bg-[rgba(255,106,85,0.05)] text-primary-03 text-[12px] font-sans font-bold tracking-[0.004em] rounded-[10px]">Watch closely</span>
              </div>
              <div className="relative z-10 grid gap-4 md:grid-cols-2">
                {a.errorPatterns.map((ep: any) => (
                  <div key={ep.id} className="rounded-[10px] border border-s-stroke2/40 dark:border-s-stroke2/40 bg-b-surface2 dark:bg-b-surface2 p-5 shadow-sm">
                    <h3 className="text-[14px] font-sans font-bold text-primary-03">{ep.name}</h3>
                    <p className="mt-2 text-caption leading-relaxed text-t-secondary">{ep.description}</p>
                    <div className="mt-4">
                      <span className="label label-red font-bold">{ep.questionsAffected.length} questions affected</span>
                    </div>
                    <div className="mt-4 rounded-[10px] border border-s-stroke2 bg-b-surface2 p-3 text-caption font-semibold text-t-primary">
                      <span className="text-primary-01">Tip:</span> {ep.tip}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* ── PANIC CASCADE ALERT ── */}
            {a.panicCascade?.detected && (
              <section className="flex flex-col p-6 md:p-7  bg-b-surface2 dark:bg-b-surface2 card border border-primary-03/40 select-none">
                <div className="flex items-start gap-4">
                  <div className="flex size-16 items-center justify-center rounded-full bg-gradient-to-b from-[#FFD1D1] to-[#FFA3A3] shrink-0">
                    <RiErrorWarningFill size={24} className="text-t-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="text-[16px] font-sans font-bold text-primary-03">⚡ Panic Cascade Detected</h2>
                      <span className="flex flex-row justify-center items-center px-2 py-0.5 border border-s-stroke2/40 bg-[rgba(255,106,85,0.05)] text-primary-03 text-[12px] font-sans font-bold tracking-[0.004em] rounded-[10px]">Critical Pattern</span>
                    </div>
                    <p className="mt-2 text-[12px] font-sans leading-[160%] text-t-secondary dark:text-t-secondary">{a.panicCascade.description}</p>
                    <div className="mt-4 rounded-[10px] border border-primary-03/20 bg-[rgba(255,106,85,0.02)] p-3 text-[12px] font-sans font-semibold text-t-primary dark:text-t-primary">
                      <span className="text-primary-03">Action:</span> {a.panicCascade.tip}
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* ── FATIGUE CURVE ── */}
            {a.timeIntervals && a.timeIntervals.length > 0 && (
              <section className="group relative card flex flex-col overflow-hidden p-6 md:p-8 card select-none">
                
                <div className="relative z-10 mb-5 flex items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <RiPulseLine size={18} className="text-primary-01" />
                      <h2 className="text-[20px] font-sans font-semibold tracking-[0.0015em] leading-[145%] text-t-primary dark:text-t-primary">Attempts Over 3 Hours</h2>
                    </div>
                    <p className="mt-1 text-[12px] font-sans text-t-secondary">How your performance changed across the exam duration.</p>
                  </div>
                </div>

                {/* Fatigue summary narrative */}
                {a.fatigueSummary && (
                  <div className="relative z-10 mb-5 rounded-[10px] border border-s-stroke2/40 dark:border-s-stroke2/40 bg-b-surface2 dark:bg-b-surface2 p-4 text-[12px] font-sans leading-[160%] text-t-secondary dark:text-t-secondary shadow-sm">
                    <span className="font-bold text-t-primary dark:text-t-primary">Analysis: </span>{a.fatigueSummary}
                  </div>
                )}

                {/* Interval table */}
                <div className="relative z-10 overflow-x-auto rounded-[10px] border border-s-stroke2 mb-5">
                  <table className="rayum-table">
                    <thead>
                      <tr>
                        <th>Interval</th>
                        <th className="text-center">Total</th>
                        <th className="text-center text-primary-02">Correct</th>
                        <th className="text-center text-primary-03">Wrong</th>
                        <th className="text-center">Skipped</th>
                        <th className="text-right">Accuracy</th>
                      </tr>
                    </thead>
                    <tbody>
                      {a.timeIntervals.map((interval: any, i: number) => {
                        const accColor = interval.accuracy >= 70 ? "text-primary-02" : interval.accuracy >= 40 ? "text-primary-05" : "text-primary-03";
                        const label = i === 0 ? "First 30 mins" : `${(i * 30) + 1}–${(i + 1) * 30} mins`;
                        return (
                          <tr key={i}>
                            <td className="font-semibold">{label}</td>
                            <td className="text-center">{interval.total}</td>
                            <td className="text-center font-bold text-primary-02">{interval.correct}</td>
                            <td className="text-center font-bold text-primary-03">{interval.incorrect}</td>
                            <td className="text-center">{interval.skipped}</td>
                            <td className="text-right font-black">
                              <span className={accColor}>{interval.accuracy}%</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Visual bar chart */}
                <div className="relative z-10 space-y-2">
                  {a.timeIntervals.map((interval: any, i: number) => {
                    const label = i === 0 ? "First 30 mins" : `${(i * 30) + 1}–${(i + 1) * 30} mins`;
                    const barColor = interval.accuracy >= 70 ? "bg-primary-02" : interval.accuracy >= 40 ? "bg-primary-05" : "bg-primary-03";
                    return (
                      <div key={i} className="flex items-center gap-3">
                        <span className="w-28 shrink-0 text-[10px] font-sans font-bold text-t-secondary uppercase tracking-[0.05em]">{label}</span>
                        <div className="flex-1 h-2.5 rounded-full bg-s-stroke2 overflow-hidden shadow-[inset_0px_1px_2px_rgba(0,0,0,0.1)] dark:shadow-[inset_0px_1px_3px_rgba(0,0,0,0.2)]">
                          <div className={`h-full rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${interval.accuracy}%` }} />
                        </div>
                        <span className="w-8 text-right text-[10px] font-sans font-bold text-t-secondary dark:text-t-secondary">{interval.accuracy}%</span>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* ── DIFFICULTY ANALYSIS ── */}
            {a.difficultyBreakdown && a.difficultyBreakdown.length > 0 && (
              <section className="group relative card flex flex-col overflow-hidden p-6 md:p-8 card select-none">
                
                <div className="relative z-10 mb-5 flex items-center gap-2">
                  <RiBarChartBoxLine size={18} className="text-primary-05" />
                  <div>
                    <h2 className="text-[20px] font-sans font-semibold tracking-[0.0015em] leading-[145%] text-t-primary dark:text-t-primary">Difficulty Analysis</h2>
                    <p className="mt-0.5 text-[12px] font-sans text-t-secondary">Performance breakdown by question difficulty, per subject.</p>
                  </div>
                </div>
                <div className="relative z-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                  {a.difficultyBreakdown.map((row: any) => (
                    <div key={row.subject} className="rounded-[10px] border border-s-stroke2/40 dark:border-s-stroke2/40 bg-b-surface1 dark:bg-b-surface1/60 p-5 shadow-sm">
                      <div className="mb-4 flex items-center justify-between">
                        <h3 className="text-[14px] font-sans font-bold text-t-primary dark:text-t-primary">{row.subject}</h3>
                      </div>
                      <div className="space-y-3">
                        {(["easy", "medium", "hard"] as const).map((diff) => {
                          const d = row[diff];
                          const attempted = d.correct + d.incorrect;
                          const acc = attempted > 0 ? Math.round((d.correct / attempted) * 100) : 0;
                          const barColor = diff === "easy" ? "bg-primary-02" : diff === "medium" ? "bg-primary-05" : "bg-primary-03";
                          const labelColor = diff === "easy" ? "text-primary-02" : diff === "medium" ? "text-primary-05" : "text-primary-03";
                          return (
                            <div key={diff}>
                              <div className="mb-1.5 flex items-center justify-between">
                                <span className={`text-[10px] font-sans font-bold uppercase tracking-[0.2em] ${labelColor}`}>{diff}</span>
                                <div className="flex items-center gap-3 text-[12px] font-sans text-t-secondary dark:text-t-secondary">
                                  <span className="font-bold">{d.correct}✓</span>
                                  <span className="font-bold">{d.incorrect}✗</span>
                                  <span className="text-t-secondary dark:text-t-tertiary">{d.skipped} skip</span>
                                  {attempted > 0 && <span className={`font-black ${acc >= 70 ? "text-primary-02" : acc >= 40 ? "text-primary-05" : "text-primary-03"}`}>{acc}%</span>}
                                </div>
                              </div>
                              <div className="h-2 w-full rounded-full bg-s-stroke2 overflow-hidden shadow-[inset_0px_1px_2px_rgba(0,0,0,0.1)] dark:shadow-[inset_0px_1px_3px_rgba(0,0,0,0.2)]">
                                <div className={`h-full rounded-full ${barColor}`} style={{ width: `${acc}%` }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* ── ATTEMPT CLASSIFICATION ── */}
            {a.attemptClassification && a.attemptClassification.length > 0 && (
              <section className="group relative card flex flex-col overflow-hidden p-6 md:p-8 card select-none">
                
                <div className="relative z-10 mb-5 flex items-center gap-2">
                  <RiPieChartLine size={18} className="text-primary-01" />
                  <div>
                    <h2 className="text-[20px] font-sans font-semibold tracking-[0.0015em] leading-[145%] text-t-primary dark:text-t-primary">Attempt Classification</h2>
                    <p className="mt-0.5 text-[12px] font-sans text-t-secondary">Quality of every attempt: Perfect, Overtime, Wasted, or Confused.</p>
                  </div>
                </div>
                <div className="relative z-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                  {a.attemptClassification.map((row: any) => {
                    const cats = [
                      { label: "Perfect", value: row.perfect, color: "bg-primary-02", textColor: "text-primary-02", desc: "Correct & efficient" },
                      { label: "Overtime", value: row.overtime, color: "bg-primary-01", textColor: "text-primary-01", desc: "Correct but too slow" },
                      { label: "Wasted", value: row.wasted, color: "bg-primary-03", textColor: "text-primary-03", desc: "Wrong & over-invested" },
                      { label: "Confused", value: row.confused, color: "bg-primary-05", textColor: "text-primary-05", desc: "Skipped after pondering" },
                    ];
                    return (
                      <div key={row.subject} className="rounded-[10px] border border-s-stroke2/40 dark:border-s-stroke2/40 bg-b-surface1 dark:bg-b-surface1/60 p-5 shadow-sm">
                        <h3 className="mb-4 text-[14px] font-sans font-bold text-t-primary dark:text-t-primary">{row.subject} <span className="text-t-secondary font-normal">({row.total} attempts)</span></h3>
                        <div className="grid grid-cols-2 gap-3">
                          {cats.map(cat => (
                            <div key={cat.label} className="rounded-[10px] border border-s-stroke2 bg-b-surface2 p-3">
                              <div className={`text-[20px] font-sans font-black ${cat.textColor}`}>{cat.value}</div>
                              <div className="mt-0.5 text-[10px] font-sans font-bold uppercase tracking-[0.18em] text-t-secondary">{cat.label}</div>
                              <div className="mt-1 text-[10px] font-sans text-t-secondary dark:text-t-secondary">{cat.desc}</div>
                              {/* Mini donut bar */}
                              <div className="mt-2 h-1.5 w-full rounded-full bg-s-stroke2 overflow-hidden shadow-[inset_0px_1px_2px_rgba(0,0,0,0.1)] dark:shadow-[inset_0px_1px_3px_rgba(0,0,0,0.2)]">
                                <div className={`h-full rounded-full ${cat.color}`} style={{ width: row.total > 0 ? `${Math.round((cat.value / row.total) * 100)}%` : "0%" }} />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* ── SUBJECT MOVEMENT ── */}
            {a.subjectMovement && a.subjectMovement.length > 0 && (
              <section className="group relative card flex flex-col overflow-hidden p-6 md:p-8 card select-none">
                
                <div className="relative z-10 mb-5 flex items-center gap-2">
                  <RiExchangeLine size={18} className="text-t-secondary dark:text-t-secondary" />
                  <div>
                    <h2 className="text-[20px] font-sans font-semibold tracking-[0.0015em] leading-[145%] text-t-primary dark:text-t-primary">Subject Movement</h2>
                    <p className="mt-0.5 text-[12px] font-sans text-t-secondary">How you navigated between subjects during the test.</p>
                  </div>
                </div>
                <div className="relative z-10 flex flex-wrap items-center gap-2">
                  {a.subjectMovement.map((block: any, i: number) => {
                    const subjectColors: Record<string, string> = {
                      Physics: "border-primary-01/30 bg-primary-01/5 text-primary-01",
                      Chemistry: "border-primary-02/30 bg-primary-02/5 text-primary-02",
                      Mathematics: "border-primary-05/30 bg-primary-05/5 text-primary-05",
                      Biology: "border-primary-04/30 bg-primary-04/5 text-primary-04",
                    };
                    const colorClass = subjectColors[block.subject] ?? "border-s-stroke2 bg-b-surface2 text-t-secondary";
                    const durationMin = Math.round(block.durationSec / 60);
                    return (
                      <div key={i} className="flex items-center gap-2">
                        <div className={`rounded-[10px] border px-4 py-2.5 text-center ${colorClass}`}>
                          <div className="text-[12px] font-sans font-bold">{block.subject}</div>
                          <div className="text-[10px] font-sans text-current/60">{durationMin > 0 ? `${durationMin} min` : "<1 min"}</div>
                        </div>
                        {i < a.subjectMovement.length - 1 && (
                          <span className="text-t-secondary dark:text-t-tertiary">
                            <RiArrowRightLine size={14} />
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
                {a.subjectMovement.length === 1 && (
                  <p className="relative z-10 mt-4 text-[12px] font-sans text-t-secondary dark:text-t-secondary">You stayed in one subject the entire test — linear approach.</p>
                )}
                {a.subjectMovement.length > 4 && (
                  <p className="relative z-10 mt-4 rounded-[10px] border border-s-stroke2/40 bg-[rgba(239,157,14,0.05)] p-3 text-[12px] font-sans text-primary-05">
                    ⚠️ You switched subjects {a.subjectMovement.length - 1} times — frequent switching can fragment your focus and waste 2–3 minutes per switch.
                  </p>
                )}
              </section>
            )}

            <section className="flex flex-col gap-4  bg-[rgba(55,101,246,0.05)] p-6 md:flex-row md:items-center md:justify-between md:p-8 card">
              <div>
                <h2 className="text-[16px] font-sans font-bold text-primary-01">Stop repeating these mistakes</h2>
                <p className="mt-1 text-[12px] font-sans text-t-secondary dark:text-t-secondary">Add these {a.errorPatterns.length * 2} errors to your mistake diary for revision.</p>
              </div>
              <Link href="/student/mistakes" className="flex flex-row justify-center items-center py-3 px-7 h-12 rounded-[10px] text-sm font-sans font-semibold tracking-[0.0125em] text-t-light transition-all active:scale-98 relative overflow-hidden bg-linear-to-b from-[#2C2C2C] to-[#282828] shadow-[inset_2px_0px_8px_2px_rgba(248,248,248,0.20),0px_5px_1.5px_-4px_rgba(8,8,8,0.09)] after:absolute after:inset-0 after:rounded-[10px] after:border-[1.5px] after:border-white/20 after:[mask-image:linear-gradient(to_top,transparent_0,black_100%)] gap-2 self-start md:self-auto">
                <span className="relative z-10 flex items-center gap-2"><RiBookmarkFill size={16} /> Open Mistake Diary</span>
              </Link>
            </section>

            <section className="group relative card flex flex-col overflow-hidden p-6 md:p-8 card select-none">
              
              <div className="relative z-10 mb-5 flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-[20px] font-sans font-semibold tracking-[0.0015em] leading-[145%] text-t-primary dark:text-t-primary">7-Day Study Plan</h2>
                  <p className="mt-1 text-[12px] font-sans text-t-secondary">Small, daily work beats one long reset.</p>
                </div>
                <span className="flex flex-row justify-center items-center px-2 py-1 border border-s-stroke2 dark:border-s-stroke2 rounded-[10px] bg-b-surface1 text-t-secondary dark:text-t-secondary text-[12px] font-sans font-semibold tracking-[0.004em]">Next 7 days</span>
              </div>
              <div className="relative z-10 space-y-3">
                {a.studyPlan.map((day: any) => (
                  <button
                    key={day.day}
                    className={`w-full rounded-[10px] border p-4 text-left transition-colors ${
                      expandedDay === day.day ? "border-primary-01/40 bg-[rgba(55,101,246,0.05)] shadow-widget" : "border-s-stroke2 bg-b-surface1 hover:border-s-highlight shadow-sm"
                    }`}
                    onClick={() => setExpandedDay(expandedDay === day.day ? null : day.day)}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="flex size-11 shrink-0 items-center justify-center rounded-[10px] bg-b-surface2 text-[14px] font-sans font-black text-primary-01 border border-s-stroke2">D{day.day}</div>
                        <div>
                          <div className="text-[14px] font-sans font-bold text-t-primary dark:text-t-primary">{day.topic}</div>
                          <div className="mt-0.5 text-[12px] font-sans text-t-secondary dark:text-t-secondary">{day.durationMinutes} min</div>
                        </div>
                      </div>
                      <span className="text-t-secondary dark:text-t-secondary">
                        {expandedDay === day.day ? <RiArrowUpSLine size={20} /> : <RiArrowDownSLine size={20} />}
                      </span>
                    </div>
                    {expandedDay === day.day && (
                      <div className="mt-4 border-t border-s-stroke2 pt-4 text-[12px] font-sans leading-[160%] text-t-secondary dark:text-t-secondary">
                        <div><strong className="text-t-primary dark:text-t-primary">Activity:</strong> {day.activity}</div>
                        <div className="mt-2"><strong className="text-t-primary dark:text-t-primary">Focus:</strong> Targeting {day.focusErrorType} errors.</div>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </section>
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
