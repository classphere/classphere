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

  if (loading || !a) {
    return (
      <>
        <Navbar title="Results & Analysis" />
        <div className="min-h-[70vh] px-4 py-10 md:px-6">
          <div className="mx-auto flex max-w-5xl flex-col gap-6 rounded-[36px] border border-s-stroke2/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.9),rgba(244,247,251,0.92))] p-8 shadow-depth md:p-10">
            <div className="h-3 w-36 rounded-full bg-b-surface2" />
            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_14rem]">
              <div className="space-y-3">
                <div className="h-9 w-72 max-w-full rounded-2xl bg-b-surface2" />
                <div className="h-5 w-96 max-w-full rounded-full bg-b-surface2" />
              </div>
              <div className="h-24 rounded-[28px] border border-s-stroke2 bg-b-surface2" />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="h-32 rounded-[28px] bg-b-surface2" />
              <div className="h-32 rounded-[28px] bg-b-surface2" />
              <div className="h-32 rounded-[28px] bg-b-surface2" />
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
            <span className="label label-gray">{attemptedChapters.filter((t: any) => t.isWeak).length} weak chapters</span>
            <span className="label label-gray">{unattemptedChapters.length} unattempted chapters</span>
            {a.narrative?.examCountdown && (
              <span className="label label-yellow">{a.narrative.examCountdown.urgencyLabel}</span>
            )}
          </div>
        </div>

        <section className="mb-6 overflow-hidden rounded-[36px] border border-s-stroke2/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(246,249,252,0.92))] shadow-depth">
          <div className="grid gap-6 p-6 md:p-8 xl:grid-cols-[minmax(0,1fr)_20rem]">
            <div className="space-y-5">
              <div>
                <p className="text-caption font-bold uppercase tracking-[0.24em] text-t-tertiary">Test Results</p>
                <h1 className="mt-2 text-h4 font-black tracking-tight text-t-primary md:text-h3">Test Results & Analysis</h1>
                <p className="mt-2 text-body-2 text-t-secondary">{a.topicStats[0]?.chapter ?? "Practice set"} · JEE · {totalQuestions} questions</p>
              </div>

              {a.narrative && (
                <div className="rounded-[28px] border border-s-stroke2 bg-b-surface1 p-5 md:p-6">
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

            <div className="rounded-[30px] border border-s-stroke2 bg-b-surface1 p-5 shadow-sm">
              <div className={`flex items-center justify-between rounded-[24px] border ${pctBorderColor} ${pctBgClass} p-4`}>
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
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="space-y-6">
            <section className="card p-6 md:p-7">
              <div className="mb-5">
                <h2 className="text-sub-title-1 font-black text-t-primary">Chapter Performance</h2>
                <p className="mt-1 text-caption text-t-secondary">Accuracy across attempted chapters in this mock test.</p>
              </div>

              {attemptedChapters.length > 0 ? (
                <div className="grid gap-4 lg:grid-cols-2">
                  {attemptedChapters.map((chapter: any) => {
                    const statusLabel = chapter.accuracy >= 80 ? "Strong" : chapter.accuracy >= 50 ? "Needs Revision" : "Struggled";
                    const statusColor = chapter.accuracy >= 80 ? "label-green" : chapter.accuracy >= 50 ? "label-yellow" : "label-red";
                    const scoreText = `${chapter.correct} / ${chapter.attempted} Correct`;
                    
                    return (
                      <div key={chapter.topic} className="rounded-[28px] border border-s-stroke2 bg-b-surface1 p-5 transition-colors hover:border-s-highlight">
                        <div className="mb-4 flex items-start justify-between gap-4">
                          <div>
                            <h3 className="text-body-2 font-bold text-t-primary">{chapter.topic}</h3>
                            <p className="mt-1 text-caption text-t-secondary">{chapter.chapter}</p>
                          </div>
                          <span className={`label ${statusColor}`}>{statusLabel}</span>
                        </div>
                        <AccuracyBar accuracy={chapter.accuracy} />
                        <div className="mt-4 flex items-center justify-between text-caption text-t-secondary">
                          <span>{scoreText}</span>
                          <span>{chapter.accuracy.toFixed(0)}% Accuracy</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-[28px] border border-dashed border-s-stroke2 p-8 text-center text-caption text-t-secondary">
                  No chapters attempted yet.
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
                <div className="rounded-[24px] border border-s-stroke2 bg-b-surface2 p-4">
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
                  <div key={ep.id} className="rounded-[28px] border border-s-stroke2 bg-b-surface1 p-5">
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
              <section className="rounded-[32px] border border-[#FF6A55]/30 bg-[#FF6A55]/5 p-6 md:p-7">
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
                    <div className="mt-4 rounded-2xl border border-[#FF6A55]/20 bg-white/60 p-3 text-caption font-semibold text-t-primary">
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
                  <div className="mb-5 rounded-[24px] border border-s-stroke2 bg-b-surface2 p-4 text-caption leading-relaxed text-t-secondary">
                    <span className="font-bold text-t-primary">Analysis: </span>{a.fatigueSummary}
                  </div>
                )}

                {/* Interval table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-caption">
                    <thead>
                      <tr className="border-b border-s-stroke2">
                        <th className="pb-3 text-left font-bold uppercase tracking-[0.18em] text-t-tertiary">Interval</th>
                        <th className="pb-3 text-center font-bold uppercase tracking-[0.18em] text-t-tertiary">Total</th>
                        <th className="pb-3 text-center font-bold uppercase tracking-[0.18em] text-[#00A656]">Correct</th>
                        <th className="pb-3 text-center font-bold uppercase tracking-[0.18em] text-[#FF6A55]">Wrong</th>
                        <th className="pb-3 text-center font-bold uppercase tracking-[0.18em] text-t-tertiary">Skipped</th>
                        <th className="pb-3 text-right font-bold uppercase tracking-[0.18em] text-t-tertiary">Accuracy</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-s-stroke2">
                      {a.timeIntervals.map((interval: any, i: number) => {
                        const accColor = interval.accuracy >= 70 ? "text-[#00A656]" : interval.accuracy >= 40 ? "text-[#EF9D0E]" : "text-[#FF6A55]";
                        const label = i === 0 ? "First 30 mins" : `${(i * 30) + 1}–${(i + 1) * 30} mins`;
                        return (
                          <tr key={i} className="hover:bg-b-surface2/50 transition-colors">
                            <td className="py-3 font-semibold text-t-primary">{label}</td>
                            <td className="py-3 text-center text-t-secondary">{interval.total}</td>
                            <td className="py-3 text-center font-bold text-[#00A656]">{interval.correct}</td>
                            <td className="py-3 text-center font-bold text-[#FF6A55]">{interval.incorrect}</td>
                            <td className="py-3 text-center text-t-secondary">{interval.skipped}</td>
                            <td className="py-3 text-right">
                              <span className={`font-black ${accColor}`}>{interval.accuracy}%</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Visual bar chart */}
                <div className="mt-5 space-y-2">
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
                    <div key={row.subject} className="rounded-[28px] border border-s-stroke2 bg-b-surface1 p-5">
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
                      <div key={row.subject} className="rounded-[28px] border border-s-stroke2 bg-b-surface1 p-5">
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

            <section className="card flex flex-col gap-4 rounded-[32px] border border-primary-01/20 bg-primary-01/5 p-6 md:flex-row md:items-center md:justify-between md:p-7">
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
                    className={`w-full rounded-[26px] border p-4 text-left transition-colors ${
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
                <div className="mt-5 rounded-[26px] border border-s-stroke2 bg-b-surface2 p-4">
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
