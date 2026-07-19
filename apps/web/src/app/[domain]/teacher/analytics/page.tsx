"use client";

import { useState, useEffect, useCallback } from "react";
import Navbar from "@/components/layout/Navbar";
import Link from "next/link";
import { PremiumMetricCard as MetricCard, PremiumMetricGrid as MetricGrid, PremiumSectionCard as SectionCard } from "@/components/premium-ui";
import {
  RiBarChartBoxLine,
  RiCheckDoubleLine,
  RiAlertLine,
  RiArrowRightUpLine,
  RiArrowRightDownLine,
  RiTeamLine,
  RiFileListLine,
  RiAddLine,
  RiCheckboxCircleFill,
  RiCloseCircleFill,
  RiQuestionLine,
  RiFileList3Line,
  RiBookOpenLine,
  RiGroupLine,
  RiLoader4Line
} from "@remixicon/react";
import { useAuth } from "@/lib/auth-context";
import { apiClient } from "@/lib/api.client";

// ── Mock Analytics Data ──────────────────────────────────────────
// Replaced with real analytics from /api/v1/dashboard/teacher/batch/:batchId/analytics

const priorityColor: Record<string, string> = {
  Critical: "label-red",
  High: "label-yellow",
  Medium: "label-gray",
};

export default function TeacherAnalyticsPage() {
  const { session } = useAuth();
  
  // Real data states
  const [batches, setBatches] = useState<any[]>([]);
  const [selectedBatchIdx, setSelectedBatchIdx] = useState(0);
  const [batchAnalytics, setBatchAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Fetch batches initially
  useEffect(() => {
    if (!session?.access_token) return;
    apiClient.get("/api/v1/dashboard/teacher", session.access_token).then((res: any) => {
      if (res.success && res.data.batches) {
        setBatches(res.data.batches);
      }
    });
  }, [session?.access_token]);

  // Fetch analytics for selected batch
  useEffect(() => {
    if (!session?.access_token || batches.length === 0) return;
    const batchId = batches[selectedBatchIdx]?.id;
    if (!batchId) return;

    setLoading(true);
    apiClient.get(`/api/v1/dashboard/teacher/batch/${batchId}/analytics`, session.access_token)
      .then((res: any) => {
        if (res.success) setBatchAnalytics(res.data);
      })
      .finally(() => setLoading(false));
  }, [session?.access_token, batches, selectedBatchIdx]);

  const stat = {
    avg: batchAnalytics?.overall?.batchAvgScore ?? 0,
    top: batchAnalytics?.overall?.topStudentAccuracy ?? 0,
    bottom: batchAnalytics?.overall?.bottomStudentAccuracy ?? 0,
    students: batchAnalytics?.overall?.totalStudents ?? 0,
    exam: batches[selectedBatchIdx]?.name ?? "Unknown",
    trend: 0
  };
  const realWeakTopics = batchAnalytics?.overall?.weakTopics ?? [];
  const subjectBreakdown = batchAnalytics?.overall?.subjectBreakdown ?? [];
  const recentTests = batchAnalytics?.recentTests ?? [];

  return (
    <>
      <Navbar
        title="Batch Analytics"
        subtitle="Cross-batch performance insights, weak topic detection, and trap question analysis."
        breadcrumbs="Dashboard > Analytics"
      />
      
      <main className="mx-auto w-full max-w-screen-2xl px-4 pb-10 sm:px-6 md:px-8">
        {/* Batch Selector */}
        <div className="flex items-center gap-4 mb-8 mt-6">
          <span className="text-body-2 font-bold text-t-secondary">Viewing batch:</span>
          <div className="flex gap-2 flex-wrap">
            {batches.length === 0 && <span className="text-t-secondary text-sm">Loading batches...</span>}
            {batches.map((b, i) => (
              <button
                key={b.id}
                onClick={() => setSelectedBatchIdx(i)}
                className={`px-4 py-1.5 rounded-[10px] text-caption font-bold border transition-all cursor-pointer ${
                  selectedBatchIdx === i
                    ? "bg-shade-02 text-t-light border-transparent dark:border-[#3e3e3b] dark:bg-linear-to-b dark:from-[#343432] dark:to-[#252523] dark:text-white"
                    : "bg-b-surface2 border-s-stroke2 text-t-secondary hover:text-t-primary"
                }`}
              >
                {b.name}
              </button>
            ))}
          </div>
        </div>

        {/* KPI Row */}
        <MetricGrid cols={4}>
          {[
            { label: "Batch Average",    value: `${stat.avg}%`,      icon: <RiBarChartBoxLine size={20} />, trend: stat.trend,    trendLabel: "vs last test",      bgClass: "bg-primary-01/10 border border-primary-01/20 text-primary-01", valColor: "text-primary-01" },
            { label: "Top Score",        value: `${stat.top}%`,       icon: <RiCheckDoubleLine size={20} />, trend: null,           trendLabel: "highest in batch",  bgClass: "bg-primary-02/10 border border-primary-02/20 text-primary-02", valColor: "text-primary-02" },
            { label: "Lowest Score",     value: `${stat.bottom}%`,    icon: <RiAlertLine size={20} />,       trend: null,           trendLabel: "needs intervention", bgClass: "bg-primary-03/10 border border-primary-03/20 text-primary-03", valColor: "text-primary-03" },
            { label: "Total Students",   value: stat.students,        icon: <RiTeamLine size={20} />,        trend: null,           trendLabel: stat.exam,            bgClass: "bg-primary-05/10 border border-primary-05/20 text-primary-05", valColor: "text-primary-05" },
          ].map((k, idx) => (
            <MetricCard
              key={idx}
              icon={k.icon}
              label={k.label}
              value={<span className={k.valColor}>{k.value}</span>}
              badge={k.trend != null ? `${k.trend > 0 ? "+" : ""}${k.trend}%` : undefined}
              badgeLabel={k.trendLabel}
            />
          ))}
        </MetricGrid>

        {/* RECENT TESTS & TRAPS (MICRO LEVEL) */}
        <div className="mb-8">
          <h2 className="text-[20px] font-sans font-bold text-t-primary mb-1">Recent Tests & Traps</h2>
          <p className="text-body-2 text-t-secondary mb-4">Immediate feedback from the most recent tests in this batch.</p>
          
          <div className="flex flex-col gap-6">
            {loading ? (
              <div className="flex items-center justify-center py-8 text-t-secondary gap-2 border border-s-stroke2/40 rounded-[24px]">
                <RiLoader4Line className="animate-spin" /> Loading recent tests...
              </div>
            ) : recentTests.length === 0 ? (
              <div className="flex items-center justify-center py-8 text-t-secondary text-sm border border-s-stroke2/40 rounded-[24px]">
                No recent tests found for this batch.
              </div>
            ) : recentTests.map((rt: any) => (
              <SectionCard
                key={rt.testId}
                title={rt.testName}
                subtitle={`Average Score: ${rt.avgScore}%`}
                className="w-full"
                headerRight={
                  <Link 
                    href="/teacher/analytics" 
                    className="h-9 px-4 rounded-[10px] text-xs font-semibold border border-s-stroke2/50 text-t-secondary hover:text-t-primary hover:bg-b-surface1 transition-all active:scale-95 shrink-0 flex items-center gap-1.5"
                  >
                    View Full Report
                  </Link>
                }
              >
                <div className="px-1 mt-2">
                  <h4 className="text-sm font-semibold text-t-primary mb-3">Common Traps</h4>
                  {rt.trapQuestions.length === 0 ? (
                    <div className="text-sm text-t-secondary py-2">No significant traps detected.</div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {rt.trapQuestions.map((t: any, i: number) => (
                        <div 
                          key={i} 
                          className="group/item relative flex flex-row items-center p-2 sm:p-3 hover:bg-b-surface1 dark:hover:bg-b-surface1/40 border border-transparent hover:border-s-stroke2 dark:hover:border-s-stroke2/30 rounded-[16px] transition-all w-full overflow-hidden"
                        >
                          <div className="flex flex-row items-center gap-3 sm:gap-4 flex-1 min-w-0">
                            <div className="size-10 sm:size-12 rounded-[10px] flex items-center justify-center bg-primary-03/10 border border-primary-03/20 text-primary-03 shrink-0">
                              <RiCloseCircleFill size={20} className="scale-75 sm:scale-100" />
                            </div>
                            <div className="flex flex-col justify-center min-w-0 flex-1">
                              <span className="font-sans font-semibold text-[13px] sm:text-[14px] leading-tight text-t-primary dark:text-t-primary truncate">
                                {t.q}
                              </span>
                              <span className="font-sans text-[11px] sm:text-[12px] font-normal text-t-secondary truncate mt-0.5">
                                {t.desc}
                              </span>
                            </div>
                          </div>
                          <div className="flex flex-row justify-end items-center gap-2 sm:gap-4 shrink-0 pl-2">
                            <div className="flex flex-col justify-center items-end gap-1">
                              <span className="font-sans font-semibold text-[13px] sm:text-[14px] leading-tight text-t-primary dark:text-t-primary">
                                {t.pct}% <span className="hidden sm:inline">Option</span> {t.option}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </SectionCard>
            ))}
          </div>
        </div>

        {/* OVERALL TRENDS (MACRO LEVEL) */}
        <h2 className="text-[20px] font-sans font-bold text-t-primary mt-12 mb-1">Overall Trends</h2>
        <p className="text-body-2 text-t-secondary mb-4">Macro performance calculated from the last 100 test attempts.</p>

        {/* Subject Breakdown */}
        <SectionCard
          title="Subject-wise Performance"
          subtitle="Average accuracy and error distribution across subjects"
          className="mb-8"
          headerRight={
            <div className="flex items-center justify-center size-10 rounded-[10px] bg-b-surface2 dark:bg-b-surface2 border border-s-stroke2/30 text-t-secondary dark:text-t-secondary shadow-xs">
              <RiBarChartBoxLine size={20} />
            </div>
          }
        >
          <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-6 w-full mt-2">
            {loading ? (
              <div className="col-span-full flex items-center justify-center py-8 text-t-secondary gap-2">
                <RiLoader4Line className="animate-spin" /> Loading subjects...
              </div>
            ) : subjectBreakdown.length === 0 ? (
              <div className="col-span-full flex items-center justify-center py-8 text-t-secondary text-sm">
                No subject data available.
              </div>
            ) : subjectBreakdown.map((s: any) => (
              <div 
                key={s.subject} 
                className="flex flex-col p-[22px] bg-b-surface2 border border-s-stroke2/40 rounded-[16px] overflow-hidden transition-all hover:scale-[1.005]"
              >
                <div className="flex justify-between items-center mb-3">
                  <span className="font-sans font-semibold text-[16px] leading-[150%] tracking-[0.0015em] text-t-primary dark:text-t-primary">{s.subject}</span>
                  <span className={`text-[16px] font-sans font-bold ${s.avg >= 70 ? "text-primary-02" : s.avg >= 55 ? "text-primary-05" : "text-primary-03"}`}>{s.avg}%</span>
                </div>
                <div className="h-1.5 bg-s-stroke2 rounded-full overflow-hidden mb-4">
                  <div
                    className={`h-full rounded-full ${s.avg >= 70 ? "bg-primary-02" : s.avg >= 55 ? "bg-primary-05" : "bg-primary-03"}`}
                    style={{ width: `${s.avg}%` }}
                  />
                </div>
                <div className="flex justify-between text-caption text-t-secondary">
                  <span className="flex items-center gap-1">
                    <RiCheckboxCircleFill size={14} className="text-primary-02" />
                    <span>{s.correct} correct</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <RiCloseCircleFill size={14} className="text-primary-03" />
                    <span>{s.wrong} wrong</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <RiQuestionLine size={14} className="text-t-secondary" />
                    <span>{s.unattempted} skip</span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        {/* Weak Topics + Trap Questions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">

          {/* Weak Topics */}
          <SectionCard
            title="Critical Weaknesses"
            subtitle="Topics where the majority of your batch failed."
            headerRight={
              <Link 
                href="/teacher/dpps" 
                className="h-9 px-4 rounded-[10px] text-xs font-semibold bg-shade-02 text-t-light hover:bg-shade-04 dark:border dark:border-[#3e3e3b] dark:bg-linear-to-b dark:from-[#343432] dark:to-[#252523] dark:text-white dark:hover:brightness-110 transition-all active:scale-95 shadow-xs shrink-0 flex items-center gap-1.5 cursor-pointer w-fit"
              >
                <RiAddLine size={16} /> Assign Booster DPP
              </Link>
            }
          >
            <div className="relative z-10 flex flex-col gap-1 w-full mt-2">
              {loading ? (
                <div className="flex items-center justify-center py-8 text-t-secondary gap-2">
                  <RiLoader4Line className="animate-spin" /> Loading weak topics...
                </div>
              ) : realWeakTopics.length === 0 ? (
                <div className="flex items-center justify-center py-8 text-t-secondary text-sm">
                  No weak topics detected for this batch yet.
                </div>
              ) : realWeakTopics.map((t: any, i: number) => {
                const badgeClass = priorityColor[t.priority] ?? "label-gray";
                return (
                  <div 
                    key={i} 
                    className="group/item relative flex flex-row items-center p-3 gap-3 sm:gap-4 hover:bg-b-surface1 dark:hover:bg-b-surface1/40 border border-transparent hover:border-s-stroke2 dark:hover:border-s-stroke2/30 rounded-[16px] transition-all h-[76px] sm:h-[88px] overflow-hidden"
                  >
                    <div className="flex flex-row items-center gap-3 sm:gap-5 flex-1 min-w-0">
                      <div className="size-12 sm:size-16 rounded-[10px] flex items-center justify-center bg-primary-03/10 border border-primary-03/20 text-primary-03 shrink-0">
                        <RiAlertLine size={24} className="scale-75 sm:scale-100" />
                      </div>
                      <div className="flex flex-col justify-center min-w-0 flex-1">
                        <span className="font-sans font-semibold text-[14px] sm:text-[16px] leading-tight text-t-primary dark:text-t-primary truncate">
                          {t.topic}
                        </span>
                        <span className="font-sans text-[11px] sm:text-[12px] font-normal text-t-secondary mt-0.5 truncate">
                          {t.subject}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-row justify-end items-center gap-2 sm:gap-8 shrink-0">
                      <div className="flex flex-col justify-center items-end gap-1">
                        <span className="font-sans font-semibold text-[13px] sm:text-[16px] text-t-primary dark:text-t-primary">
                          {t.affectedStudents} <span className="hidden sm:inline">students</span>
                        </span>
                        <span className={`px-2 py-0.5 sm:py-[2px] border sm:border-[1.5px] rounded-[6px] sm:rounded-[10px] text-[9px] sm:text-[12px] font-normal tracking-[0.004em] uppercase sm:normal-case ${
                          t.priority === "Critical"
                            ? "bg-[rgba(255,106,85,0.05)] border-s-stroke2/40 text-primary-03"
                            : t.priority === "High"
                            ? "bg-[rgba(239,157,14,0.05)] border-s-stroke2/40 text-primary-05"
                            : "bg-[rgba(123,123,123,0.05)] border-s-stroke2/40 text-t-secondary"
                        }`}>
                          {t.priority}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="relative z-10 flex flex-col items-start px-3 w-full">
              <Link 
                href="/teacher/analytics" 
                className="w-full h-12 flex items-center justify-center border-[1.5px] border-s-stroke2 dark:border-s-stroke2/50 rounded-[10px] text-[14px] font-semibold text-t-secondary dark:text-t-secondary hover:text-t-primary hover:border-t-secondary transition-all active:scale-95 cursor-pointer"
              >
                View Topic Performance Report
              </Link>
            </div>
          </SectionCard>
        </div>



        {/* All Batches Summary */}
        <SectionCard
          title="All Batches — Quick Comparison"
          subtitle="Average score, top performer, and trend across every batch."
          className="mb-8"
        >
          <div className="relative z-10 flex flex-col gap-1 w-full mt-2">
            {batches.map((b, i) => (
              <div
                key={b.id}
                className="group/item relative flex flex-row items-center p-3 gap-3 sm:gap-4 hover:bg-b-surface1 dark:hover:bg-b-surface1/40 border border-transparent hover:border-s-stroke2 dark:hover:border-s-stroke2/30 rounded-[16px] transition-all h-[76px] sm:h-[88px] overflow-hidden"
              >
                {/* Left — icon + batch name + exam */}
                <div className="flex flex-row items-center gap-3 sm:gap-5 flex-1 min-w-0">
                  <div className="size-12 sm:size-16 rounded-[10px] flex items-center justify-center bg-primary-01/10 border border-primary-01/20 text-primary-01 shrink-0">
                    <RiGroupLine size={24} className="scale-75 sm:scale-100" />
                  </div>
                  <div className="flex flex-col justify-center min-w-0 flex-1">
                    <span className="font-sans font-semibold text-[14px] sm:text-[16px] leading-tight text-t-primary dark:text-t-primary truncate">
                      {b.name}
                    </span>
                    <div className="flex items-center gap-1 sm:gap-2 mt-0.5">
                      <span className="font-sans text-[11px] sm:text-[12px] font-normal text-t-secondary truncate">Batch</span>
                      <span className="text-s-stroke2 hidden sm:inline">·</span>
                      <span className="font-sans text-[11px] sm:text-[12px] font-normal text-t-secondary truncate">{b.studentCount ?? 0} students</span>
                    </div>
                  </div>
                </div>

                {/* Right — avg score bar + top score + trend badge + action */}
                <div className="flex flex-row items-center gap-2 sm:gap-6 shrink-0 pl-1 sm:pl-0">
                  {/* Avg score with progress bar */}
                  <div className="hidden lg:flex flex-col items-end gap-1.5">
                    <span className="font-sans font-semibold text-[16px] leading-[150%] text-t-primary dark:text-t-primary">
                      {/* Note: real global per-batch avg not in list endpoint yet, using placeholder */}
                      - %
                    </span>
                    <div className="w-[80px] h-1.5 bg-shade-09 dark:bg-b-surface1 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary-01"
                        style={{ width: `0%` }}
                      />
                    </div>
                  </div>
                  {/* Top score */}
                  <div className="hidden xl:flex flex-col items-end gap-1">
                    <span className="font-sans font-semibold text-[16px] leading-[150%] text-t-primary dark:text-t-primary">- %</span>
                    <span className="font-sans text-[12px] text-t-secondary">top score</span>
                  </div>
                  {/* Trend badge */}
                  <span className={`hidden sm:inline px-2 py-[2px] border-[1.5px] rounded-[10px] text-[12px] font-normal tracking-[0.004em] leading-[160%] ${
                    b.trend > 0
                      ? "bg-[rgba(0,166,86,0.05)] border-s-stroke2/40 text-primary-02"
                      : "bg-[rgba(255,106,85,0.05)] border-s-stroke2/40 text-primary-03"
                  }`}>
                    {b.trend > 0 ? "+" : ""}{b.trend}%
                  </span>
                  {/* View Batch button */}
                  <Link
                    href={`/teacher/batch/${b.id}`}
                    className="h-8 sm:h-9 px-3 sm:px-4 rounded-[10px] text-[11px] sm:text-xs font-semibold border sm:border-[1.5px] border-s-stroke2 dark:border-s-stroke2/50 text-t-secondary dark:text-t-secondary hover:text-t-primary hover:border-t-secondary transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer w-fit shrink-0 whitespace-nowrap"
                  >
                    <RiFileListLine size={15} className="hidden sm:block" /> View
                  </Link>
                </div>
              </div>
            ))}
          </div>

          <div className="relative z-10 flex flex-col items-start px-3 w-full">
            <Link
              href="/teacher/analytics"
              className="w-full h-12 flex items-center justify-center border-[1.5px] border-s-stroke2 dark:border-s-stroke2/50 rounded-[10px] text-[14px] font-semibold text-t-secondary dark:text-t-secondary hover:text-t-primary hover:border-t-secondary transition-all active:scale-95 cursor-pointer"
            >
              View All Batch Reports
            </Link>
          </div>
        </SectionCard>

      </main>
    </>
  );
}
