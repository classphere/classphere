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
  RiBookmarkFill
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
  const batchAvg = a.batchAvg?.percentage ?? a.batchAvg?.score ?? a.batchAvg;
  const weakTopics = [...a.topicStats].filter((topic: any) => topic.isWeak);
  const visibleWeakTopics = showAllWeakTopics ? weakTopics : weakTopics.slice(0, 8);
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
            <span className="label label-gray">{a.scoring.correctCount + a.scoring.incorrectCount + a.scoring.skippedCount} questions</span>
            <span className="label label-gray">{a.topicStats.filter((t: any) => t.isWeak).length} weak topics</span>
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
                  <div className={`text-h3 font-black tracking-tight ${pctColorClass}`}>{pct}%</div>
                  <div className="text-caption font-bold text-t-secondary">Your score</div>
                </div>
                {a.freeMarks?.projectedPercentage > pct && (
                  <div className="text-right">
                    <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#00A656]">Potential</div>
                    <div className="text-body-1 font-black text-[#00A656]">{Math.round(a.freeMarks.projectedPercentage)}%</div>
                  </div>
                )}
              </div>

              <div className="mt-4 h-3 rounded-full bg-s-stroke2 overflow-hidden">
                <div className={`h-full rounded-full ${pct >= 70 ? "bg-[#00A656]" : pct >= 50 ? "bg-[#EF9D0E]" : "bg-[#FF6A55]"}`} style={{ width: `${pct}%` }} />
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
                    <div className="mt-1 text-body-1 font-black text-t-primary">{a.batchAvg}%</div>
                  </div>
                  {batchAvg != null ? (
                    <div className={`text-caption font-bold ${pct >= batchAvg ? "text-[#00A656]" : "text-[#FF6A55]"}`}>
                      {pct >= batchAvg ? `↑ +${pct - batchAvg}%` : `↓ ${batchAvg - pct}%`} vs avg
                    </div>
                  ) : (
                    <div className="text-caption font-bold text-t-secondary">Batch avg unavailable</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="space-y-6">
            <section className="card p-6 md:p-7">
              <div className="mb-5 flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-sub-title-1 font-black text-t-primary">Weak Topic Breakdown</h2>
                  <p className="mt-1 text-caption text-t-secondary">The fastest marks are in the topics below.</p>
                </div>
                <button className="label label-yellow cursor-pointer" onClick={() => setShowAllWeakTopics((v) => !v)}>
                  {showAllWeakTopics ? "Showing all" : `Top ${Math.min(8, weakTopics.length)}`} · {weakTopics.length} weak topics
                </button>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                {visibleWeakTopics.map((topic: any) => (
                  <div key={topic.topic} className="rounded-[28px] border border-s-stroke2 bg-b-surface1 p-5 transition-colors hover:border-s-highlight">
                    <div className="mb-4 flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-body-2 font-bold text-t-primary">{topic.topic}</h3>
                        <p className="mt-1 text-caption text-t-secondary">{topic.chapter}</p>
                      </div>
                      <div className={`text-h5 font-black ${topic.accuracy >= 70 ? "text-[#00A656]" : topic.accuracy >= 40 ? "text-[#EF9D0E]" : "text-[#FF6A55]"}`}>
                        {topic.accuracy.toFixed(0)}%
                      </div>
                    </div>
                    <AccuracyBar accuracy={topic.accuracy} />
                    <p className="mt-4 text-caption leading-relaxed text-t-secondary">
                      <strong className="text-t-primary">Analysis:</strong> Needs attention based on {topic.attempted} attempts.
                    </p>
                  </div>
                ))}
              </div>

              {!showAllWeakTopics && weakTopics.length > visibleWeakTopics.length && (
                <div className="mt-5 flex items-center justify-between rounded-[26px] border border-s-stroke2 bg-b-surface2 px-4 py-3 text-caption text-t-secondary">
                  <span>{weakTopics.length - visibleWeakTopics.length} more weak topics hidden to keep this view readable.</span>
                  <button className="font-bold text-primary-01" onClick={() => setShowAllWeakTopics(true)}>Show all</button>
                </div>
              )}
            </section>

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
