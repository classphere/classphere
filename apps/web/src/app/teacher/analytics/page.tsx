"use client";

import { useState } from "react";
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
  RiGroupLine
} from "@remixicon/react";
const mockBatches: any[] = [];

// ── Mock Analytics Data ──────────────────────────────────────────
const batchStats = [
  { batchName: "JEE 2026 Morning",   exam: "JEE", avg: 67.4, top: 94, bottom: 21, students: 142, trend: +2.1 },
  { batchName: "NEET 2026 Droppers", exam: "NEET", avg: 59.8, top: 88, bottom: 18, students: 185, trend: -1.4 },
  { batchName: "JEE Foundation",     exam: "JEE", avg: 72.1, top: 97, bottom: 34, students: 138, trend: +5.6 },
];

const weakTopics = [
  { topic: "Carnot Cycle Efficiency",    subject: "Physics",   failRate: 73, students: 134, priority: "Critical" },
  { topic: "Pulley + Sign Conventions",  subject: "Physics",   failRate: 68, students: 124, priority: "Critical" },
  { topic: "Organic Name Reactions",     subject: "Chemistry", failRate: 61, students: 112, priority: "High"     },
  { topic: "Integration by Parts",       subject: "Maths",     failRate: 54, students: 99,  priority: "High"     },
  { topic: "Genetic Inheritance Ratios", subject: "Biology",   failRate: 48, students: 88,  priority: "Medium"   },
];

const trapQuestions = [
  { q: "Q14", option: "B", trap: "sign_error",      pct: 54.2, desc: "Confused direction of friction with surface normal" },
  { q: "Q27", option: "C", trap: "partial_solve",   pct: 48.7, desc: "Stopped after finding velocity, ignored angular momentum" },
  { q: "Q33", option: "D", trap: "unit_error",      pct: 41.3, desc: "Mixed up kJ/mol with J/mol in Hess's Law" },
  { q: "Q41", option: "A", trap: "common_mistake",  pct: 39.1, desc: "Confused dominant with codominant inheritance" },
];

const subjectBreakdown = [
  { subject: "Physics",   avg: 63, correct: 12.6, wrong: 7.2, unattempted: 10.2 },
  { subject: "Chemistry", avg: 71, correct: 14.2, wrong: 5.4, unattempted: 10.4 },
  { subject: "Maths",     avg: 58, correct: 11.6, wrong: 8.8, unattempted: 9.6  },
];

const priorityColor: Record<string, string> = {
  Critical: "label-red",
  High: "label-yellow",
  Medium: "label-gray",
};

export default function TeacherAnalyticsPage() {
  const [selectedBatch, setSelectedBatch] = useState(0);
  const stat = batchStats[selectedBatch];

  return (
    <>
      <Navbar
        title="Batch Analytics"
        subtitle="Cross-batch performance insights, weak topic detection, and trap question analysis."
        breadcrumbs="Dashboard > Analytics"
      />
      
      <main className="mx-auto w-full max-w-screen-2xl px-6 pb-10 md:px-8">
        {/* Batch Selector */}
        <div className="flex items-center gap-4 mb-8 mt-6">
          <span className="text-body-2 font-bold text-t-secondary">Viewing batch:</span>
          <div className="flex gap-2">
            {batchStats.map((b, i) => (
              <button
                key={b.batchName}
                onClick={() => setSelectedBatch(i)}
                className={`px-4 py-1.5 rounded-[10px] text-caption font-bold border transition-all cursor-pointer ${
                  selectedBatch === i
                    ? "bg-shade-02 dark:bg-t-primary text-t-light dark:text-black border-transparent"
                    : "bg-b-surface2 dark:bg-b-surface2 border-s-stroke2 text-t-secondary hover:text-t-primary"
                }`}
              >
                {b.batchName}
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
          <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
            {subjectBreakdown.map(s => (
              <div 
                key={s.subject} 
                className="flex flex-col p-[22px] bg-white dark:bg-white/[0.02] border border-s-stroke2/40 rounded-[24px] overflow-hidden transition-all hover:scale-[1.005]"
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
                className="h-9 px-4 rounded-[10px] text-xs font-semibold bg-shade-02 dark:bg-t-primary text-t-light dark:text-black hover:bg-shade-04 dark:hover:bg-t-secondary transition-all active:scale-95 shadow-xs shrink-0 flex items-center gap-1.5 cursor-pointer w-fit"
              >
                <RiAddLine size={16} /> Assign Booster DPP
              </Link>
            }
          >
            <div className="relative z-10 flex flex-col gap-1 w-full mt-2">
              {weakTopics.map((t, i) => {
                const badgeClass = priorityColor[t.priority];
                return (
                  <div 
                    key={i} 
                    className="group/item relative flex flex-row items-center justify-between p-3 hover:bg-b-surface1 dark:hover:bg-b-surface1/40 border border-transparent hover:border-s-stroke2 dark:hover:border-s-stroke2/30 rounded-[16px] transition-all h-[88px]"
                  >
                    <div className="flex flex-row items-center gap-5 flex-1 min-w-0">
                      <div className="size-16 rounded-[10px] flex items-center justify-center bg-primary-03/10 border border-primary-03/20 text-primary-03 shrink-0">
                        <RiAlertLine size={24} />
                      </div>
                      <div className="flex flex-col justify-center min-w-0 flex-1">
                        <span className="font-sans font-semibold text-[16px] leading-[150%] text-t-primary dark:text-t-primary truncate">
                          {t.topic}
                        </span>
                        <span className="font-sans text-[12px] font-normal text-t-secondary mt-0.5">
                          {t.subject}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-row justify-center items-center gap-8 shrink-0">
                      <div className="flex flex-col justify-center items-end gap-1">
                        <span className="font-sans font-semibold text-[16px] leading-[150%] text-t-primary dark:text-t-primary">
                          {t.failRate}%
                        </span>
                        <span className={`px-2 py-[2px] border-[1.5px] rounded-[10px] text-[12px] font-normal tracking-[0.004em] leading-[160%] ${
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

          {/* Trap Questions */}
          <SectionCard
            title="Common Traps"
            subtitle="Questions where students select the same wrong answer."
          >
            <div className="relative z-10 flex flex-col gap-1 w-full mt-2">
              {trapQuestions.map((t, i) => (
                <div 
                  key={i} 
                  className="group/item relative flex flex-row items-center justify-between p-3 hover:bg-b-surface1 dark:hover:bg-b-surface1/40 border border-transparent hover:border-s-stroke2 dark:hover:border-s-stroke2/30 rounded-[16px] transition-all h-[88px]"
                >
                  <div className="flex flex-row items-center gap-5 flex-1 min-w-0">
                    <div className="size-16 rounded-[10px] flex items-center justify-center bg-primary-03/10 border border-primary-03/20 text-primary-03 shrink-0">
                      <RiCloseCircleFill size={24} />
                    </div>
                    <div className="flex flex-col justify-center min-w-0 flex-1">
                      <span className="font-sans font-semibold text-[16px] leading-[150%] text-t-primary dark:text-t-primary truncate">
                        {t.q} · Option {t.option}
                      </span>
                      <span className="font-sans text-[12px] font-normal text-t-secondary truncate mt-0.5">
                        {t.desc}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-row justify-center items-center gap-8 shrink-0">
                    <div className="flex flex-col justify-center items-end gap-1">
                      <span className="font-sans font-semibold text-[16px] leading-[150%] text-t-primary dark:text-t-primary">
                        {t.pct}%
                      </span>
                      <span className="px-2 py-[2px] bg-[rgba(255,106,85,0.05)] border-[1.5px] border-s-stroke2/40 text-primary-03 rounded-[10px] text-[12px] font-normal tracking-[0.004em] leading-[160%] capitalize">
                        {t.trap.replace(/_/g, " ")}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="relative z-10 flex flex-col items-start px-3 w-full">
              <Link 
                href="/teacher/analytics" 
                className="w-full h-12 flex items-center justify-center border-[1.5px] border-s-stroke2 dark:border-s-stroke2/50 rounded-[10px] text-[14px] font-semibold text-t-secondary dark:text-t-secondary hover:text-t-primary hover:border-t-secondary transition-all active:scale-95 cursor-pointer"
              >
                View Detailed Trap Report
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
            {batchStats.map((b, i) => (
              <div
                key={i}
                className="group/item relative flex flex-row items-center justify-between p-3 hover:bg-b-surface1 dark:hover:bg-b-surface1/40 border border-transparent hover:border-s-stroke2 dark:hover:border-s-stroke2/30 rounded-[16px] transition-all h-[88px]"
              >
                {/* Left — icon + batch name + exam */}
                <div className="flex flex-row items-center gap-5 flex-1 min-w-0">
                  <div className="size-16 rounded-[10px] flex items-center justify-center bg-primary-01/10 border border-primary-01/20 text-primary-01 shrink-0">
                    <RiGroupLine size={24} />
                  </div>
                  <div className="flex flex-col justify-center min-w-0 flex-1">
                    <span className="font-sans font-semibold text-[16px] leading-[150%] text-t-primary dark:text-t-primary truncate">
                      {b.batchName}
                    </span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="font-sans text-[12px] font-normal text-t-secondary">{b.exam}</span>
                      <span className="text-s-stroke2">·</span>
                      <span className="font-sans text-[12px] font-normal text-t-secondary">{b.students} students</span>
                    </div>
                  </div>
                </div>

                {/* Right — avg score bar + top score + trend badge + action */}
                <div className="flex flex-row items-center gap-6 shrink-0">
                  {/* Avg score with progress bar */}
                  <div className="hidden sm:flex flex-col items-end gap-1.5">
                    <span className="font-sans font-semibold text-[16px] leading-[150%] text-t-primary dark:text-t-primary">
                      {b.avg}%
                    </span>
                    <div className="w-[80px] h-1.5 bg-shade-09 dark:bg-b-surface1 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary-01"
                        style={{ width: `${b.avg}%` }}
                      />
                    </div>
                  </div>
                  {/* Top score */}
                  <div className="hidden md:flex flex-col items-end gap-1">
                    <span className="font-sans font-semibold text-[16px] leading-[150%] text-t-primary dark:text-t-primary">{b.top}%</span>
                    <span className="font-sans text-[12px] text-t-secondary">top score</span>
                  </div>
                  {/* Trend badge */}
                  <span className={`px-2 py-[2px] border-[1.5px] rounded-[10px] text-[12px] font-normal tracking-[0.004em] leading-[160%] ${
                    b.trend > 0
                      ? "bg-[rgba(0,166,86,0.05)] border-s-stroke2/40 text-primary-02"
                      : "bg-[rgba(255,106,85,0.05)] border-s-stroke2/40 text-primary-03"
                  }`}>
                    {b.trend > 0 ? "+" : ""}{b.trend}%
                  </span>
                  {/* View Batch button */}
                  <Link
                    href={`/teacher/batch/${mockBatches[i]?.id || "batch-001"}`}
                    className="h-9 px-4 rounded-[10px] text-xs font-semibold border-[1.5px] border-s-stroke2 dark:border-s-stroke2/50 text-t-secondary dark:text-t-secondary hover:text-t-primary hover:border-t-secondary transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer w-fit shrink-0"
                  >
                    <RiFileListLine size={15} /> View Batch
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
