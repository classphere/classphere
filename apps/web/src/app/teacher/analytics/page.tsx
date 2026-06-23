"use client";

import { useState } from "react";
import Navbar from "@/components/layout/Navbar";
import Link from "next/link";
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
  RiBookOpenLine
} from "@remixicon/react";
import { mockBatches } from "@/lib/mock-data";

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
                className={`px-4 py-1.5 rounded-full text-caption font-bold border transition-all cursor-pointer ${
                  selectedBatch === i
                    ? "bg-[#101010] dark:bg-t-primary text-[#FDFDFD] dark:text-black border-transparent"
                    : "bg-[#FDFDFD] dark:bg-b-surface2 border-s-stroke2 text-t-secondary hover:text-t-primary"
                }`}
              >
                {b.batchName}
              </button>
            ))}
          </div>
        </div>

        {/* KPI Row (p-2 grey nested background container) */}
        <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 p-2 gap-4 w-full bg-[#F9F9F9] dark:bg-b-surface1/60 border border-[rgba(123,123,123,0.1)] dark:border-s-stroke2/40 rounded-[32px] mb-8">
          {[
            { label: "Batch Average",    value: `${stat.avg}%`,      icon: <RiBarChartBoxLine size={20} />, trend: stat.trend,    trendLabel: "vs last test",      bgClass: "bg-[#2A85FF]/10 border border-[#2A85FF]/20 text-[#2A85FF]", valColor: "text-[#2A85FF]" },
            { label: "Top Score",        value: `${stat.top}%`,       icon: <RiCheckDoubleLine size={20} />, trend: null,           trendLabel: "highest in batch",  bgClass: "bg-[#00A656]/10 border border-[#00A656]/20 text-[#00A656]", valColor: "text-[#00A656]" },
            { label: "Lowest Score",     value: `${stat.bottom}%`,    icon: <RiAlertLine size={20} />,       trend: null,           trendLabel: "needs intervention", bgClass: "bg-[#FF6A55]/10 border border-[#FF6A55]/20 text-[#FF6A55]", valColor: "text-[#FF6A55]" },
            { label: "Total Students",   value: stat.students,        icon: <RiTeamLine size={20} />,        trend: null,           trendLabel: stat.exam,            bgClass: "bg-[#EF9D0E]/10 border border-[#EF9D0E]/20 text-[#EF9D0E]", valColor: "text-[#EF9D0E]" },
          ].map(k => (
            <div key={k.label} className="group relative flex flex-col p-5 bg-[#FDFDFD] dark:bg-b-surface2 border border-[#FDFDFD] dark:border-s-stroke2/30 rounded-[24px] shadow-[0px_0px_36px_-8px_rgba(0,0,0,0.05),0px_6px_4px_-4px_rgba(8,8,8,0.05),0px_5px_1.5px_-4px_rgba(8,8,8,0.09)] transition-all overflow-hidden w-full min-h-[140px] justify-between">
              <div className="box-hover" />
              <div className="relative z-10 flex justify-between items-start w-full">
                <div className={`p-2.5 rounded-xl flex items-center justify-center shrink-0 ${k.bgClass}`}>{k.icon}</div>
                {k.trend != null && (
                  <span className={`text-caption font-bold flex items-center gap-0.5 px-2 py-0.5 rounded-lg ${k.trend > 0 ? "bg-[#00A656]/10 text-[#00A656]" : "bg-[#FF6A55]/10 text-[#FF6A55]"}`}>
                    {k.trend > 0 ? <RiArrowRightUpLine size={14} /> : <RiArrowRightDownLine size={14} />}
                    {k.trend > 0 ? "+" : ""}{k.trend}%
                  </span>
                )}
              </div>
              <div className="relative z-10 mt-3">
                <div className={`text-h4 font-bold mb-0.5 tracking-tight ${k.valColor}`}>{k.value}</div>
                <div className="text-caption text-t-secondary">{k.label} · {k.trendLabel}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Subject Breakdown */}
        <div className="group relative flex flex-col overflow-hidden rounded-[32px] bg-[#FDFDFD] dark:bg-b-surface2 shadow-[0px_5px_1.5px_-4px_rgba(8,8,8,0.09),0px_6px_4px_-4px_rgba(8,8,8,0.05)] border border-s-stroke2/40 p-6 md:p-8 select-none mb-8">
          <div className="flex items-center gap-3.5 mb-6 z-10">
            <div className="flex items-center justify-center size-10 rounded-xl bg-[#FDFDFD] dark:bg-b-surface2 border border-s-stroke2/30 text-[#727272] dark:text-t-secondary shadow-xs">
              <RiBarChartBoxLine size={20} />
            </div>
            <div>
              <h2 className="font-sans font-bold text-[20px] text-[#101010] dark:text-t-primary">Subject-wise Performance</h2>
              <p className="font-sans text-[12px] font-medium text-[#7B7B7B] tracking-[0.004em] mt-0.5">Average accuracy and error distribution across subjects</p>
            </div>
          </div>

          <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 p-2 gap-4 w-full bg-[#F9F9F9] dark:bg-b-surface1/60 border border-[rgba(123,123,123,0.1)] dark:border-s-stroke2/40 rounded-[32px]">
            {subjectBreakdown.map(s => (
              <div 
                key={s.subject} 
                className="flex flex-col p-5 bg-[#FDFDFD] dark:bg-b-surface2 border border-[#FDFDFD] dark:border-s-stroke2/30 rounded-[24px] shadow-[0px_0px_36px_-8px_rgba(0,0,0,0.05),0px_6px_4px_-4px_rgba(8,8,8,0.05),0px_5px_1.5px_-4px_rgba(8,8,8,0.09)] transition-all hover:scale-[1.01]"
              >
                <div className="flex justify-between items-center mb-3">
                  <span className="font-sans font-semibold text-[16px] leading-[150%] tracking-[0.0015em] text-[#101010] dark:text-t-primary">{s.subject}</span>
                  <span className={`text-[16px] font-sans font-bold ${s.avg >= 70 ? "text-[#00A656]" : s.avg >= 55 ? "text-[#EF9D0E]" : "text-[#FF6A55]"}`}>{s.avg}%</span>
                </div>
                <div className="h-1.5 bg-s-stroke2 rounded-full overflow-hidden mb-4">
                  <div
                    className={`h-full rounded-full ${s.avg >= 70 ? "bg-[#00A656]" : s.avg >= 55 ? "bg-[#EF9D0E]" : "bg-[#FF6A55]"}`}
                    style={{ width: `${s.avg}%` }}
                  />
                </div>
                <div className="flex justify-between text-caption text-t-secondary">
                  <span className="flex items-center gap-1">
                    <RiCheckboxCircleFill size={14} className="text-[#00A656]" />
                    <span>{s.correct} correct</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <RiCloseCircleFill size={14} className="text-[#FF6A55]" />
                    <span>{s.wrong} wrong</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <RiQuestionLine size={14} className="text-[#7B7B7B]" />
                    <span>{s.unattempted} skip</span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Weak Topics + Trap Questions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">

          {/* Weak Topics */}
          <div className="group relative flex flex-col overflow-hidden rounded-[32px] bg-[#FDFDFD] dark:bg-b-surface2 shadow-[0px_5px_1.5px_-4px_rgba(8,8,8,0.09),0px_6px_4px_-4px_rgba(8,8,8,0.05)] border border-s-stroke2/40 p-3 pb-6 select-none gap-6">
            <div className="box-hover" />
            <div className="relative z-10 flex flex-col sm:flex-row justify-between sm:items-center gap-3 px-3 pt-3">
              <div>
                <h2 className="font-sans font-semibold text-[20px] leading-[145%] text-[#101010] dark:text-t-primary">Critical Weaknesses</h2>
                <p className="font-sans text-[12px] font-medium text-[#7B7B7B] tracking-[0.004em] mt-0.5">Topics where the majority of your batch failed.</p>
              </div>
              <Link 
                href="/teacher/dpps" 
                className="h-9 px-4 rounded-xl text-xs font-semibold bg-[#101010] dark:bg-t-primary text-[#FDFDFD] dark:text-black hover:bg-[#202020] dark:hover:bg-t-secondary transition-all active:scale-95 shadow-xs shrink-0 flex items-center gap-1.5 cursor-pointer w-fit"
              >
                <RiAddLine size={16} /> Assign Booster DPP
              </Link>
            </div>
            
            <div className="relative z-10 flex flex-col gap-1 w-full px-3">
              {weakTopics.map((t, i) => {
                const badgeClass = priorityColor[t.priority];
                return (
                  <div 
                    key={i} 
                    className="group/item relative flex flex-row items-center justify-between p-3 hover:bg-[#F9F9F9] dark:hover:bg-b-surface1/40 border border-transparent hover:border-[#E2E2E2] dark:hover:border-s-stroke2/30 rounded-[20px] transition-all h-[88px]"
                  >
                    <div className="flex flex-row items-center gap-5 flex-1 min-w-0">
                      <div className="size-16 rounded-[12px] flex items-center justify-center bg-[#FF6A55]/10 border border-[#FF6A55]/20 text-[#FF6A55] shrink-0">
                        <RiAlertLine size={24} />
                      </div>
                      <div className="flex flex-col justify-center min-w-0 flex-1">
                        <span className="font-sans font-semibold text-[16px] leading-[150%] text-[#101010] dark:text-t-primary truncate">
                          {t.topic}
                        </span>
                        <span className="font-sans text-[12px] font-normal text-t-secondary mt-0.5">
                          {t.subject}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-row justify-center items-center gap-8 shrink-0">
                      <div className="flex flex-col justify-center items-end gap-1">
                        <span className="font-sans font-semibold text-[16px] leading-[150%] text-[#101010] dark:text-t-primary">
                          {t.failRate}%
                        </span>
                        <span className={`px-2 py-[2px] border-[1.5px] rounded-lg text-[12px] font-normal tracking-[0.004em] leading-[160%] ${
                          t.priority === "Critical"
                            ? "bg-[rgba(255,106,85,0.05)] border-[rgba(255,106,85,0.15)] text-[#FF6A55]"
                            : t.priority === "High"
                            ? "bg-[rgba(239,157,14,0.05)] border-[rgba(239,157,14,0.15)] text-[#EF9D0E]"
                            : "bg-[rgba(123,123,123,0.05)] border-[rgba(123,123,123,0.15)] text-[#7B7B7B]"
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
                className="w-full h-12 flex items-center justify-center border-[1.5px] border-[#E2E2E2] dark:border-s-stroke2/50 rounded-[32px] text-[14px] font-semibold text-[#727272] dark:text-t-secondary hover:text-t-primary hover:border-t-secondary transition-all active:scale-95 cursor-pointer"
              >
                View Topic Performance Report
              </Link>
            </div>
          </div>

          {/* Trap Questions */}
          <div className="group relative flex flex-col overflow-hidden rounded-[32px] bg-[#FDFDFD] dark:bg-b-surface2 shadow-[0px_5px_1.5px_-4px_rgba(8,8,8,0.09),0px_6px_4px_-4px_rgba(8,8,8,0.05)] border border-s-stroke2/40 p-3 pb-6 select-none gap-6">
            <div className="box-hover" />
            <div className="px-3 pt-3">
              <h2 className="relative z-10 font-sans font-semibold text-[20px] leading-[145%] text-[#101010] dark:text-t-primary">Common Traps</h2>
              <p className="relative z-10 text-[12px] text-[#7B7B7B] mt-0.5">Questions where students select the same wrong answer.</p>
            </div>
            
            <div className="relative z-10 flex flex-col gap-1 w-full px-3">
              {trapQuestions.map((t, i) => (
                <div 
                  key={i} 
                  className="group/item relative flex flex-row items-center justify-between p-3 hover:bg-[#F9F9F9] dark:hover:bg-b-surface1/40 border border-transparent hover:border-[#E2E2E2] dark:hover:border-s-stroke2/30 rounded-[20px] transition-all h-[88px]"
                >
                  <div className="flex flex-row items-center gap-5 flex-1 min-w-0">
                    <div className="size-16 rounded-[12px] flex items-center justify-center bg-[#FF6A55]/10 border border-[#FF6A55]/20 text-[#FF6A55] shrink-0">
                      <RiCloseCircleFill size={24} />
                    </div>
                    <div className="flex flex-col justify-center min-w-0 flex-1">
                      <span className="font-sans font-semibold text-[16px] leading-[150%] text-[#101010] dark:text-t-primary truncate">
                        {t.q} · Option {t.option}
                      </span>
                      <span className="font-sans text-[12px] font-normal text-[#7B7B7B] truncate mt-0.5">
                        {t.desc}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-row justify-center items-center gap-8 shrink-0">
                    <div className="flex flex-col justify-center items-end gap-1">
                      <span className="font-sans font-semibold text-[16px] leading-[150%] text-[#101010] dark:text-t-primary">
                        {t.pct}%
                      </span>
                      <span className="px-2 py-[2px] bg-[rgba(255,106,85,0.05)] border-[1.5px] border-[rgba(255,106,85,0.15)] text-[#FF6A55] rounded-lg text-[12px] font-normal tracking-[0.004em] leading-[160%] capitalize">
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
                className="w-full h-12 flex items-center justify-center border-[1.5px] border-[#E2E2E2] dark:border-s-stroke2/50 rounded-[32px] text-[14px] font-semibold text-[#727272] dark:text-t-secondary hover:text-t-primary hover:border-t-secondary transition-all active:scale-95 cursor-pointer"
              >
                View Detailed Trap Report
              </Link>
            </div>
          </div>
        </div>

        {/* All Batches Summary Table */}
        <div className="group relative flex flex-col overflow-hidden rounded-[32px] bg-[#FDFDFD] dark:bg-b-surface2 shadow-[0px_5px_1.5px_-4px_rgba(8,8,8,0.09),0px_6px_4px_-4px_rgba(8,8,8,0.05)] border border-s-stroke2/40 p-6 md:p-8 select-none">
          <div className="box-hover" />
          <h2 className="relative z-10 font-sans font-bold text-[20px] text-[#101010] dark:text-t-primary mb-6">All Batches — Quick Comparison</h2>
          <div className="relative z-10 overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-s-stroke2 text-caption font-bold text-t-secondary">
                  <th className="pb-3 pr-4 font-semibold">Batch</th>
                  <th className="pb-3 px-4 font-semibold">Exam</th>
                  <th className="pb-3 px-4 font-semibold">Students</th>
                  <th className="pb-3 px-4 font-semibold">Avg Score</th>
                  <th className="pb-3 px-4 font-semibold">Top Score</th>
                  <th className="pb-3 pl-4 text-right font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {batchStats.map((b, i) => (
                  <tr key={i} className="border-b border-s-stroke2/50 last:border-b-0 hover:bg-b-surface1/30 transition-colors">
                    <td className="py-4 pr-4 text-body-2 font-bold text-[#101010] dark:text-t-primary">{b.batchName}</td>
                    <td className="py-4 px-4 text-caption text-t-secondary">{b.exam}</td>
                    <td className="py-4 px-4 text-caption font-bold text-t-primary">{b.students}</td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <span className="text-caption font-bold text-t-primary">{b.avg}%</span>
                        <div className="w-[100px] h-1.5 bg-s-stroke2 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-linear-to-r from-primary-01 to-primary-02"
                            style={{ width: `${b.avg}%` }}
                          />
                        </div>
                        <span className={`text-caption font-bold ${b.trend > 0 ? "text-[#00A656]" : "text-[#FF6A55]"}`}>
                          {b.trend > 0 ? "+" : ""}{b.trend}%
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-caption font-bold text-t-primary">{b.top}%</td>
                    <td className="py-4 pl-4 text-right">
                      <Link 
                        href={`/teacher/batch/${mockBatches[i]?.id || "batch-001"}`} 
                        className="h-9 px-4 rounded-xl text-xs font-semibold border border-s-stroke2 hover:border-t-primary text-t-secondary hover:text-t-primary transition-all active:scale-95 flex items-center gap-1.5 ml-auto cursor-pointer w-fit"
                      >
                        <RiFileListLine size={16} /> View Batch
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </main>
    </>
  );
}
