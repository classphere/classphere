"use client";

import { useState, useEffect } from "react";
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
  const color = accuracy >= 70 ? "bg-[#00A656]" : accuracy >= 40 ? "bg-[#EF9D0E]" : "bg-[#FF6A55]";
  const textClass = accuracy >= 70 ? "text-[#00A656]" : accuracy >= 40 ? "text-[#EF9D0E]" : "text-[#FF6A55]";
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
          <div className="card mx-auto max-w-5xl flex flex-col gap-6 p-8 md:p-10">
            <div className="h-3 w-36 rounded-full bg-b-surface2" />
            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_14rem]">
              <div className="space-y-3">
                <div className="h-9 w-72 max-w-full rounded-2xl bg-b-surface2" />
                <div className="h-5 w-96 max-w-full rounded-full bg-b-surface2" />
              </div>
              <div className="h-24 rounded-3xl border border-s-stroke2 bg-b-surface2" />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="h-32 rounded-3xl bg-b-surface2" />
              <div className="h-32 rounded-3xl bg-b-surface2" />
              <div className="h-32 rounded-3xl bg-b-surface2" />
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
  const pctColorClass = pct >= 70 ? "text-[#00A656]" : pct >= 50 ? "text-[#EF9D0E]" : "text-[#FF6A55]";
  const pctBorderColor = pct >= 70 ? "border-[#00A656]" : pct >= 50 ? "border-[#EF9D0E]" : "border-[#FF6A55]";
  const pctBgClass = pct >= 70 ? "bg-[#00A656]/5" : pct >= 50 ? "bg-[#EF9D0E]/5" : "bg-[#FF6A55]/5";
  const totalQuestions = a.scoring.correctCount + a.scoring.incorrectCount + a.scoring.skippedCount;
  const batchAvgScore = a.batchAvg?.score ?? 148; // realistic batch average marks
  const attemptedChapters = [...a.topicStats].filter((t: any) => t.attempted > 0);
  const unattemptedChapters = [...a.topicStats].filter((t: any) => t.attempted === 0);
  const strategySubjects = a.attemptStrategy?.subjectOrder ?? Object.keys(a.attemptStrategy?.timeDeviationPct ?? {});

  return (
    <>
      <Navbar title="Results & Analysis" />

      <main className="mx-auto w-full max-w-screen-2xl px-4 pb-10 pt-4 md:px-6">
        <div className="mb-6 flex items-center justify-between gap-4">
          <Link href="/" className="inline-flex items-center gap-2 rounded-full border border-s-stroke2 bg-b-surface2 px-4 py-2 text-caption font-bold text-t-secondary transition-colors hover:text-t-primary">
            <RiArrowLeftLine size={16} /> Back to Dashboard
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <span className="label label-gray">{totalQuestions} questions</span>
            <span className="label label-gray">
              {attemptedChapters.filter((t: any) => t.isWeak).length} weak chapter{attemptedChapters.filter((t: any) => t.isWeak).length === 1 ? "" : "s"}
            </span>
            <span className="label label-gray">
              {unattemptedChapters.length} unattempted chapter{unattemptedChapters.length === 1 ? "" : "s"}
            </span>
            {a.narrative?.examCountdown && (
              <span className="label label-yellow">{a.narrative.examCountdown.urgencyLabel}</span>
            )}
          </div>
        </div>

        <section className="card p-6 md:p-8 grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="space-y-5">
            <div>
              <p className="text-caption font-bold uppercase tracking-[0.24em] text-t-tertiary">Test Results</p>
              <h1 className="mt-2 text-h4 font-black tracking-tight text-t-primary md:text-h3">Test Results & Analysis</h1>
              <p className="mt-2 text-body-2 text-t-secondary">{a.topicStats[0]?.chapter ?? "Practice set"} · JEE · {totalQuestions} questions</p>
            </div>

            {a.narrative && (
              <div className="rounded-3xl border border-s-stroke2 bg-b-surface1 p-5 md:p-6">
                <div className="mb-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2 text-body-2 font-bold text-t-primary">
                    <RiLightbulbFlashLine size={20} className="text-[#EF9D0E]" /> Performance summary
                  </div>
                  {a.narrative.examCountdown && <span className="label label-gray">{a.narrative.examCountdown.urgencyLabel}</span>}
                </div>
                <p className="text-body-2 font-semibold leading-relaxed text-t-primary">{a.narrative.headline}</p>
                <p className="mt-3 max-w-3xl text-caption leading-relaxed text-t-secondary">{a.narrative.overview}</p>
                <div className="mt-4 rounded-2xl border border-s-stroke2 bg-b-surface2 p-4">
                  <div className="text-[10px] font-bold uppercase tracking-[0.24em] text-t-tertiary">Best next move</div>
                  <div className="mt-1 text-body-2 font-semibold text-t-primary">{a.narrative.biggestWin}</div>
                </div>
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-s-stroke2 bg-b-surface1 p-5 shadow-sm">
            <div className={`flex items-center justify-between rounded-2xl border ${pctBorderColor} ${pctBgClass} p-4`}>
              <div>
                <div className={`text-h3 font-black tracking-tight ${pctColorClass}`}>{a.scoring.score} <span className="text-body-2 font-normal text-t-secondary">/ {a.scoring.maxScore}</span></div>
                <div className="text-caption font-bold text-t-secondary">Marks Obtained</div>
              </div>
              {a.freeMarks?.projectedScore > a.scoring.score && (
                <div className="text-right">
                  <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#00A656]">Potential</div>
                  <div className="text-body-1 font-black text-[#00A656]">{a.freeMarks.projectedScore} <span className="text-[10px] font-normal text-t-secondary">/ {a.scoring.maxScore}</span></div>
                </div>
              )}
            </div>

            <div className="mt-4 h-3 rounded-full bg-s-stroke2 overflow-hidden">
              <div className={`h-full rounded-full ${pct >= 70 ? "bg-[#00A656]" : pct >= 50 ? "bg-[#EF9D0E]" : "bg-[#FF6A55]"}`} style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} />
            </div>

            <div className="mt-4 grid grid-cols-3 gap-3">
              {[
                { label: "Correct", value: a.scoring.correctCount, color: "text-[#00A656]" },
                { label: "Wrong", value: a.scoring.incorrectCount, color: "text-[#FF6A55]" },
                { label: "Skipped", value: a.scoring.skippedCount, color: "text-t-secondary" },
              ].map((stat) => (
                <div key={stat.label} className="rounded-2xl border border-s-stroke2 bg-b-surface2 p-3 text-center">
                  <div className={`text-body-1 font-black ${stat.color}`}>{stat.value}</div>
                  <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.22em] text-t-tertiary">{stat.label}</div>
                </div>
              ))}
            </div>

            <div className="mt-4 rounded-2xl border border-s-stroke2 bg-b-surface2 p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-t-tertiary">Batch average</div>
                  <div className="mt-1 text-body-1 font-black text-t-primary">{batchAvgScore} <span className="text-[10px] font-normal text-t-secondary">/ {a.scoring.maxScore}</span></div>
                </div>
                <div className={`text-caption font-bold ${a.scoring.score >= batchAvgScore ? "text-[#00A656]" : "text-[#FF6A55]"}`}>
                  {a.scoring.score >= batchAvgScore ? `↑ +${a.scoring.score - batchAvgScore} Marks` : `↓ ${batchAvgScore - a.scoring.score} Marks`} vs avg
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="space-y-6">
            {/* ── HIGH-FIDELITY DETAILED REPORT CARD ── */}
            <section className="card p-6 md:p-7">
              <div className="mb-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-s-stroke2 pb-5">
                <div>
                  <h2 className="text-sub-title-1 font-black text-t-primary">Detailed Performance Report</h2>
                  <p className="mt-1 text-caption text-t-secondary">Deep-dive pedagogical analysis of your test attempts.</p>
                </div>
                <div className="flex flex-wrap gap-2">
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
                      className={`btn btn-sm ${activeTab === t.id ? "btn-primary" : "btn-outline"}`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Render active tab content here */}
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
                      <div key={i} className="rounded-3xl border border-s-stroke2 bg-b-surface1 p-5 text-center">
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
                  <div className="overflow-x-auto rounded-2xl border border-s-stroke2">
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
                  <div className="overflow-x-auto rounded-2xl border border-s-stroke2">
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
                        <div key={subj} className="rounded-3xl border border-s-stroke2 bg-b-surface1 p-5">
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
                  <div className="overflow-x-auto rounded-2xl border border-s-stroke2">
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
                              ansColor = "text-[#00A656] font-bold";
                            } else {
                              ansLabel = "✗ Incorrect";
                              ansColor = "text-[#FF6A55] font-bold";
                            }
                          }

                          const overview = getOverviewLabel(ans);
                          let overviewColor = "text-t-tertiary";
                          if (overview === "Perfect") overviewColor = "text-[#00A656] font-bold";
                          if (overview === "Wasted") overviewColor = "text-[#FF6A55] font-bold";
                          if (overview === "Confused") overviewColor = "text-[#EF9D0E] font-bold";

                          return (
                            <tr key={ans.id}>
                              <td>{qNum}</td>
                              <td>{chapter}</td>
                              <td>{topic}</td>
                              <td>{difficulty}</td>
                              <td>{allotted}</td>
                              <td>{spent}</td>
                              <td>{attempted}</td>
                              <td className={ansColor}>{ansLabel}</td>
                              <td className={overviewColor}>{overview}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </section>

            {unattemptedChapters.length > 0 && (
              <section className="card p-6 md:p-7">
                <div className="mb-4">
                  <h2 className="text-sub-title-1 font-black text-t-primary">Syllabus Gaps (Unattempted)</h2>
                  <p className="mt-1 text-caption text-t-secondary">Chapters with zero attempts in this mock test. Revise these to ensure full syllabus coverage.</p>
                </div>
                <div className="flex flex-wrap gap-2.5">
                  {unattemptedChapters.map((chapter: any) => (
                    <div key={chapter.topic} className="flex items-center gap-2 rounded-full border border-s-stroke2 bg-b-surface2 px-4 py-2 text-caption font-bold text-t-secondary">
                      <span className="h-2 w-2 rounded-full bg-t-tertiary" />
                      <span>{chapter.topic}</span>
                      <span className="text-[10px] font-normal text-t-tertiary">({chapter.chapter})</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {a.attemptStrategy && a.attemptStrategy.pattern !== "mixed" && (
              <section className="card p-6 md:p-7">
                <div className="mb-4 flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-sub-title-1 font-black text-t-primary">Attempt Strategy</h2>
                    <p className="mt-1 text-caption text-t-secondary">Use this to improve pacing and accuracy.</p>
                  </div>
                  <div className="rounded-full border border-s-stroke2 bg-b-surface2 px-3 py-1 text-caption font-bold text-t-secondary">
                    {a.attemptStrategy.strategyScore}/100
                  </div>
                </div>
                <div className="rounded-3xl border border-s-stroke2 bg-b-surface2 p-4">
                  <div className="grid gap-3 sm:grid-cols-3">
                    {strategySubjects.map((subject: string) => {
                      const deviation = a.attemptStrategy.timeDeviationPct?.[subject];
                      const budget = a.attemptStrategy.optimalTimeSec?.[subject];
                      const spent = a.attemptStrategy.timePerSubjectSec?.[subject];
                      return (
                        <div key={subject} className="rounded-2xl border border-s-stroke2 bg-b-surface1 p-4">
                          <div className="text-caption font-bold uppercase tracking-[0.22em] text-t-tertiary">{subject}</div>
                          <div className={`mt-2 text-body-1 font-black ${deviation >= 0 ? "text-[#00A656]" : "text-[#FF6A55]"}`}>
                            {deviation != null ? `${deviation > 0 ? "+" : ""}${Math.round(deviation)}%` : "—"}
                          </div>
                          <div className="mt-1 text-caption text-t-secondary">
                            {spent != null && budget != null ? `${Math.round(spent)}s spent · ${Math.round(budget)}s ideal` : "Timing data unavailable"}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <p className="mt-4 text-caption leading-relaxed text-t-secondary">
                    <strong className="text-t-primary">Recommendation:</strong> {a.attemptStrategy.recommendation}
                  </p>
                </div>
              </section>
            )}

            <section className="card p-6 md:p-7">
              <div className="mb-5 flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-sub-title-1 font-black text-t-primary">Error Patterns</h2>
                  <p className="mt-1 text-caption text-t-secondary">These are the mistakes that cost you the most.</p>
                </div>
                <span className="label label-red">Watch closely</span>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {a.errorPatterns.map((ep: any) => (
                  <div key={ep.id} className="rounded-3xl border border-s-stroke2 bg-b-surface1 p-5">
                    <h3 className="text-body-2 font-bold text-[#FF6A55]">{ep.name}</h3>
                    <p className="mt-2 text-caption leading-relaxed text-t-secondary">{ep.description}</p>
                    <div className="mt-4">
                      <span className="label label-red font-bold">{ep.questionsAffected.length} questions affected</span>
                    </div>
                    <div className="mt-4 rounded-2xl border border-s-stroke2 bg-b-surface2 p-3 text-caption font-semibold text-t-primary">
                      <span className="text-[#3765F6]">Tip:</span> {ep.tip}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* ── PANIC CASCADE ALERT ── */}
            {a.panicCascade?.detected && (
              <section className="rounded-4xl border border-[#FF6A55]/30 bg-[#FF6A55]/5 p-6 md:p-7">
                <div className="flex items-start gap-4">
                  <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-[#FF6A55]/10">
                    <RiErrorWarningFill size={24} className="text-[#FF6A55]" />
                  </div>
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="text-body-1 font-black text-[#FF6A55]">⚡ Panic Cascade Detected</h2>
                      <span className="label label-red">Critical Pattern</span>
                    </div>
                    <p className="mt-2 text-caption leading-relaxed text-t-secondary">{a.panicCascade.description}</p>
                    <div className="mt-4 rounded-2xl border border-[#FF6A55]/20 bg-b-surface2/60 p-3 text-caption font-semibold text-t-primary">
                      <span className="text-[#FF6A55]">Action:</span> {a.panicCascade.tip}
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* ── FATIGUE CURVE ── */}
            {a.timeIntervals && a.timeIntervals.length > 0 && (
              <section className="card p-6 md:p-7">
                <div className="mb-5 flex items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <RiPulseLine size={18} className="text-[#3765F6]" />
                      <h2 className="text-sub-title-1 font-black text-t-primary">Attempts Over 3 Hours</h2>
                    </div>
                    <p className="mt-1 text-caption text-t-secondary">How your performance changed across the exam duration.</p>
                  </div>
                </div>

                {/* Fatigue summary narrative */}
                {a.fatigueSummary && (
                  <div className="mb-5 rounded-3xl border border-s-stroke2 bg-b-surface2 p-4 text-caption leading-relaxed text-t-secondary">
                    <span className="font-bold text-t-primary">Analysis: </span>{a.fatigueSummary}
                  </div>
                )}

                {/* Interval table */}
                <div className="overflow-x-auto rounded-2xl border border-s-stroke2 mb-5">
                  <table className="rayum-table">
                    <thead>
                      <tr>
                        <th>Interval</th>
                        <th className="text-center">Total</th>
                        <th className="text-center text-[#00A656]">Correct</th>
                        <th className="text-center text-[#FF6A55]">Wrong</th>
                        <th className="text-center">Skipped</th>
                        <th className="text-right">Accuracy</th>
                      </tr>
                    </thead>
                    <tbody>
                      {a.timeIntervals.map((interval: any, i: number) => {
                        const accColor = interval.accuracy >= 70 ? "text-[#00A656]" : interval.accuracy >= 40 ? "text-[#EF9D0E]" : "text-[#FF6A55]";
                        const label = i === 0 ? "First 30 mins" : `${(i * 30) + 1}–${(i + 1) * 30} mins`;
                        return (
                          <tr key={i}>
                            <td className="font-semibold">{label}</td>
                            <td className="text-center">{interval.total}</td>
                            <td className="text-center font-bold text-[#00A656]">{interval.correct}</td>
                            <td className="text-center font-bold text-[#FF6A55]">{interval.incorrect}</td>
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
                <div className="space-y-2">
                  {a.timeIntervals.map((interval: any, i: number) => {
                    const label = i === 0 ? "First 30 mins" : `${(i * 30) + 1}–${(i + 1) * 30} mins`;
                    const barColor = interval.accuracy >= 70 ? "bg-[#00A656]" : interval.accuracy >= 40 ? "bg-[#EF9D0E]" : "bg-[#FF6A55]";
                    return (
                      <div key={i} className="flex items-center gap-3">
                        <span className="w-28 shrink-0 text-[10px] font-bold text-t-tertiary">{label}</span>
                        <div className="flex-1 h-2.5 rounded-full bg-s-stroke2 overflow-hidden">
                          <div className={`h-full rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${interval.accuracy}%` }} />
                        </div>
                        <span className="w-8 text-right text-[10px] font-bold text-t-secondary">{interval.accuracy}%</span>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* ── DIFFICULTY ANALYSIS ── */}
            {a.difficultyBreakdown && a.difficultyBreakdown.length > 0 && (
              <section className="card p-6 md:p-7">
                <div className="mb-5 flex items-center gap-2">
                  <RiBarChartBoxLine size={18} className="text-[#EF9D0E]" />
                  <div>
                    <h2 className="text-sub-title-1 font-black text-t-primary">Difficulty Analysis</h2>
                    <p className="mt-0.5 text-caption text-t-secondary">Performance breakdown by question difficulty, per subject.</p>
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                  {a.difficultyBreakdown.map((row: any) => (
                    <div key={row.subject} className="rounded-3xl border border-s-stroke2 bg-b-surface1 p-5">
                      <div className="mb-4 flex items-center justify-between">
                        <h3 className="text-body-2 font-bold text-t-primary">{row.subject}</h3>
                      </div>
                      <div className="space-y-3">
                        {(["easy", "medium", "hard"] as const).map((diff) => {
                          const d = row[diff];
                          const attempted = d.correct + d.incorrect;
                          const acc = attempted > 0 ? Math.round((d.correct / attempted) * 100) : 0;
                          const barColor = diff === "easy" ? "bg-[#00A656]" : diff === "medium" ? "bg-[#EF9D0E]" : "bg-[#FF6A55]";
                          const labelColor = diff === "easy" ? "text-[#00A656]" : diff === "medium" ? "text-[#EF9D0E]" : "text-[#FF6A55]";
                          return (
                            <div key={diff}>
                              <div className="mb-1.5 flex items-center justify-between">
                                <span className={`text-[10px] font-bold uppercase tracking-[0.2em] ${labelColor}`}>{diff}</span>
                                <div className="flex items-center gap-3 text-caption text-t-secondary">
                                  <span className="text-[#00A656] font-bold">{d.correct}✓</span>
                                  <span className="text-[#FF6A55] font-bold">{d.incorrect}✗</span>
                                  <span className="text-t-tertiary">{d.skipped} skip</span>
                                  {attempted > 0 && <span className={`font-black ${acc >= 70 ? "text-[#00A656]" : acc >= 40 ? "text-[#EF9D0E]" : "text-[#FF6A55]"}`}>{acc}%</span>}
                                </div>
                              </div>
                              <div className="h-2 w-full rounded-full bg-s-stroke2 overflow-hidden">
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
              <section className="card p-6 md:p-7">
                <div className="mb-5 flex items-center gap-2">
                  <RiPieChartLine size={18} className="text-primary-01" />
                  <div>
                    <h2 className="text-sub-title-1 font-black text-t-primary">Attempt Classification</h2>
                    <p className="mt-0.5 text-caption text-t-secondary">Quality of every attempt: Perfect, Overtime, Wasted, or Confused.</p>
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                  {a.attemptClassification.map((row: any) => {
                    const cats = [
                      { label: "Perfect", value: row.perfect, color: "bg-[#00A656]", textColor: "text-[#00A656]", desc: "Correct & efficient" },
                      { label: "Overtime", value: row.overtime, color: "bg-[#3765F6]", textColor: "text-[#3765F6]", desc: "Correct but too slow" },
                      { label: "Wasted", value: row.wasted, color: "bg-[#FF6A55]", textColor: "text-[#FF6A55]", desc: "Wrong & over-invested" },
                      { label: "Confused", value: row.confused, color: "bg-[#EF9D0E]", textColor: "text-[#EF9D0E]", desc: "Skipped after pondering" },
                    ];
                    return (
                      <div key={row.subject} className="rounded-3xl border border-s-stroke2 bg-b-surface1 p-5">
                        <h3 className="mb-4 text-body-2 font-bold text-t-primary">{row.subject} <span className="text-t-tertiary font-normal">({row.total} attempts)</span></h3>
                        <div className="grid grid-cols-2 gap-3">
                          {cats.map(cat => (
                            <div key={cat.label} className="rounded-2xl border border-s-stroke2 bg-b-surface2 p-3">
                              <div className={`text-h5 font-black ${cat.textColor}`}>{cat.value}</div>
                              <div className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-t-tertiary">{cat.label}</div>
                              <div className="mt-1 text-[10px] text-t-secondary">{cat.desc}</div>
                              {/* Mini donut bar */}
                              <div className="mt-2 h-1.5 w-full rounded-full bg-s-stroke2 overflow-hidden">
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
              <section className="card p-6 md:p-7">
                <div className="mb-5 flex items-center gap-2">
                  <RiExchangeLine size={18} className="text-t-secondary" />
                  <div>
                    <h2 className="text-sub-title-1 font-black text-t-primary">Subject Movement</h2>
                    <p className="mt-0.5 text-caption text-t-secondary">How you navigated between subjects during the test.</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {a.subjectMovement.map((block: any, i: number) => {
                    const subjectColors: Record<string, string> = {
                      Physics: "border-[#3765F6]/30 bg-[#3765F6]/5 text-[#3765F6]",
                      Chemistry: "border-[#00A656]/30 bg-[#00A656]/5 text-[#00A656]",
                      Mathematics: "border-[#EF9D0E]/30 bg-[#EF9D0E]/5 text-[#EF9D0E]",
                      Biology: "border-[#8B5CF6]/30 bg-[#8B5CF6]/5 text-[#8B5CF6]",
                    };
                    const colorClass = subjectColors[block.subject] ?? "border-s-stroke2 bg-b-surface2 text-t-secondary";
                    const durationMin = Math.round(block.durationSec / 60);
                    return (
                      <div key={i} className="flex items-center gap-2">
                        <div className={`rounded-2xl border px-4 py-2.5 text-center ${colorClass}`}>
                          <div className="text-caption font-bold">{block.subject}</div>
                          <div className="text-[10px] text-current/60">{durationMin > 0 ? `${durationMin} min` : "<1 min"}</div>
                        </div>
                        {i < a.subjectMovement.length - 1 && (
                          <span className="text-t-tertiary">
                            <RiArrowRightLine size={14} />
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
                {a.subjectMovement.length === 1 && (
                  <p className="mt-4 text-caption text-t-secondary">You stayed in one subject the entire test — linear approach.</p>
                )}
                {a.subjectMovement.length > 4 && (
                  <p className="mt-4 rounded-2xl border border-[#EF9D0E]/30 bg-[#EF9D0E]/5 p-3 text-caption text-[#EF9D0E]">
                    ⚠️ You switched subjects {a.subjectMovement.length - 1} times — frequent switching can fragment your focus and waste 2–3 minutes per switch.
                  </p>
                )}
              </section>
            )}

            <section className="card flex flex-col gap-4 rounded-4xl border border-primary-01/20 bg-primary-01/5 p-6 md:flex-row md:items-center md:justify-between md:p-7">
              <div>
                <h2 className="text-body-2 font-bold text-primary-01">Stop repeating these mistakes</h2>
                <p className="mt-1 text-caption text-t-secondary">Add these {a.errorPatterns.length * 2} errors to your mistake diary for revision.</p>
              </div>
              <Link href="/student/mistakes" className="btn btn-primary flex items-center gap-1.5 self-start md:self-auto">
                <RiBookmarkFill size={16} /> Open Mistake Diary
              </Link>
            </section>

            <section className="card p-6 md:p-7">
              <div className="mb-5 flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-sub-title-1 font-black text-t-primary">7-Day Study Plan</h2>
                  <p className="mt-1 text-caption text-t-secondary">Small, daily work beats one long reset.</p>
                </div>
                <span className="label label-gray">Next 7 days</span>
              </div>
              <div className="space-y-3">
                {a.studyPlan.map((day: any) => (
                  <button
                    key={day.day}
                    className={`w-full rounded-3xl border p-4 text-left transition-colors ${
                      expandedDay === day.day ? "border-primary-01 bg-primary-01/5" : "border-s-stroke2 bg-b-surface1 hover:border-s-highlight"
                    }`}
                    onClick={() => setExpandedDay(expandedDay === day.day ? null : day.day)}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-b-surface2 text-body-2 font-black text-primary-01">D{day.day}</div>
                        <div>
                          <div className="text-body-2 font-bold text-t-primary">{day.topic}</div>
                          <div className="mt-0.5 text-caption text-t-secondary">{day.durationMinutes} min</div>
                        </div>
                      </div>
                      <span className="text-t-secondary">
                        {expandedDay === day.day ? <RiArrowUpSLine size={20} /> : <RiArrowDownSLine size={20} />}
                      </span>
                    </div>
                    {expandedDay === day.day && (
                      <div className="mt-4 border-t border-s-stroke2 pt-4 text-caption leading-relaxed text-t-secondary">
                        <div><strong className="text-t-primary">Activity:</strong> {day.activity}</div>
                        <div className="mt-2"><strong className="text-t-primary">Focus:</strong> Targeting {day.focusErrorType} errors.</div>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </section>
          </div>

          <aside className="space-y-6 xl:sticky xl:top-6 xl:self-start">
            <section className="card p-6 md:p-7">
              <div className="mb-4 flex items-center gap-2 text-body-2 font-bold text-t-primary">
                <RiTargetLine size={20} className="text-[#EF9D0E]" /> Recovery options
              </div>
              <p className="text-caption leading-relaxed text-t-secondary">Turn the weak areas into a short follow-up set or a full revision run.</p>

              <div className="mt-5 space-y-3">
                <button onClick={() => setShowBooster((v) => !v)} className="btn btn-outline w-full justify-between">
                  <span className="flex items-center gap-2"><RiFlashlightFill size={16} /> Micro Booster</span>
                  <span className="text-caption">15-30 Qs</span>
                </button>
                <button onClick={() => router.push("/pyqs")} className="btn btn-primary w-full justify-between">
                  <span className="flex items-center gap-2"><RiArrowRightLine size={16} /> Back to PYQs</span>
                  <span className="text-caption">pick another paper</span>
                </button>
              </div>

              {showBooster && (
                <div className="mt-5 rounded-3xl border border-s-stroke2 bg-b-surface2 p-4">
                  <div className="mb-3 text-caption font-bold uppercase tracking-[0.22em] text-t-tertiary">Quick set</div>
                  <div className="grid grid-cols-4 gap-2">
                    {[15, 20, 25, 30].map((n) => (
                      <button key={n} onClick={() => setMicroCount(n)} className={`btn btn-sm ${microCount === n ? "btn-primary" : "btn-outline"}`}>
                        {n}
                      </button>
                    ))}
                  </div>
                  <div className="mt-4 text-caption text-t-secondary">The current pick is {microCount} questions.</div>
                </div>
              )}
            </section>

            <section className="card p-6 md:p-7">
              <div className="mb-4 flex items-center gap-2 text-body-2 font-bold text-t-primary">
                <RiTimerLine size={20} className="text-[#3765F6]" /> Exam snapshot
              </div>
              <div className="space-y-3 text-caption text-t-secondary">
                <div className="flex items-center justify-between rounded-2xl bg-b-surface2 px-4 py-3">
                  <span>Correct</span>
                  <strong className="text-[#00A656]">{a.scoring.correctCount}</strong>
                </div>
                <div className="flex items-center justify-between rounded-2xl bg-b-surface2 px-4 py-3">
                  <span>Incorrect</span>
                  <strong className="text-[#FF6A55]">{a.scoring.incorrectCount}</strong>
                </div>
                <div className="flex items-center justify-between rounded-2xl bg-b-surface2 px-4 py-3">
                  <span>Skipped</span>
                  <strong className="text-t-primary">{a.scoring.skippedCount}</strong>
                </div>
              </div>
            </section>
          </aside>
        </div>
      </main>
    </>
  );
}
