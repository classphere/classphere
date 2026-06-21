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
      
      <main className="w-full max-w-[1200px] mx-auto px-8 pb-12">
        {/* Batch Selector */}
        <div className="flex items-center gap-4 mb-8">
          <span className="text-body-2 font-bold text-t-secondary">Viewing batch:</span>
          <div className="flex gap-2">
            {batchStats.map((b, i) => (
              <button
                key={b.batchName}
                onClick={() => setSelectedBatch(i)}
                className={`px-4 py-1.5 rounded-full text-caption font-bold border transition-all cursor-pointer ${
                  selectedBatch === i
                    ? "bg-linear-to-b from-[#2C2C2C] to-[#282828] text-t-light border-transparent"
                    : "bg-b-surface2 border-s-stroke2 text-t-secondary hover:text-t-primary"
                }`}
              >
                {b.batchName}
              </button>
            ))}
          </div>
        </div>

        {/* KPI Row */}
        <div className="grid grid-cols-4 gap-6 mb-8">
          {[
            { label: "Batch Average",    value: `${stat.avg}%`,      icon: <RiBarChartBoxLine size={20} />, trend: stat.trend,    trendLabel: "vs last test" },
            { label: "Top Score",        value: `${stat.top}%`,       icon: <RiCheckDoubleLine size={20} />, trend: null,           trendLabel: "highest in batch" },
            { label: "Lowest Score",     value: `${stat.bottom}%`,    icon: <RiAlertLine size={20} />,       trend: null,           trendLabel: "needs intervention" },
            { label: "Total Students",   value: stat.students,        icon: <RiTeamLine size={20} />,        trend: null,           trendLabel: stat.exam },
          ].map(k => (
            <div key={k.label} className="group relative card flex flex-col p-5 overflow-hidden hover:border-transparent transition-all border border-s-stroke2 bg-b-surface1">
              <div className="box-hover" />
              <div className="relative z-10 flex justify-between items-start mb-4">
                <div className="p-2.5 bg-b-surface2 rounded-xl border border-s-stroke2 text-t-secondary">{k.icon}</div>
                {k.trend != null && (
                  <span className={`text-caption font-bold flex items-center gap-0.5 ${k.trend > 0 ? "text-[#00A656]" : "text-[#FF6A55]"}`}>
                    {k.trend > 0 ? <RiArrowRightUpLine size={14} /> : <RiArrowRightDownLine size={14} />}
                    {k.trend > 0 ? "+" : ""}{k.trend}%
                  </span>
                )}
              </div>
              <div className="relative z-10 text-h4 font-bold text-t-primary mb-1 tracking-tight">{k.value}</div>
              <div className="relative z-10 text-caption text-t-secondary">{k.label} · {k.trendLabel}</div>
            </div>
          ))}
        </div>

        {/* Subject Breakdown */}
        <div className="group relative card flex flex-col p-6 border border-s-stroke2 bg-b-surface1 mb-8">
          <h2 className="text-sub-title-1 font-bold text-t-primary mb-6">Subject-wise Performance</h2>
          <div className="grid grid-cols-3 gap-6">
            {subjectBreakdown.map(s => (
              <div key={s.subject} className="p-5 bg-b-surface2 border border-s-stroke2 rounded-2xl">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-body-2 font-bold text-t-primary">{s.subject}</span>
                  <span className={`text-body-2 font-bold ${s.avg >= 70 ? "text-[#00A656]" : s.avg >= 55 ? "text-[#EF9D0E]" : "text-[#FF6A55]"}`}>{s.avg}%</span>
                </div>
                <div className="h-1.5 bg-s-stroke2 rounded-full overflow-hidden mb-3">
                  <div
                    className={`h-full rounded-full ${s.avg >= 70 ? "bg-[#00A656]" : s.avg >= 55 ? "bg-[#EF9D0E]" : "bg-[#FF6A55]"}`}
                    style={{ width: `${s.avg}%` }}
                  />
                </div>
                <div className="flex justify-between text-caption text-t-secondary">
                  <span>✅ {s.correct} correct</span>
                  <span>❌ {s.wrong} wrong</span>
                  <span>⬜ {s.unattempted} skip</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Weak Topics + Trap Questions */}
        <div className="grid grid-cols-[2fr_1fr] gap-6 mb-8">

          {/* Weak Topics */}
          <div className="group relative card flex flex-col p-6 border border-s-stroke2 bg-b-surface1">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-sub-title-1 font-bold text-t-primary">Critical Weaknesses — Lecture Planning</h2>
              <Link href="/teacher/dpps" className="btn btn-sm btn-primary flex items-center gap-1">
                <RiAddLine size={16} /> Assign Booster DPP
              </Link>
            </div>
            <p className="text-caption text-t-secondary mb-6">Topics where the majority of your batch failed. Prioritise these in your next class.</p>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-s-stroke2 text-caption font-bold text-t-secondary">
                    <th className="pb-3 pr-4">Topic</th>
                    <th className="pb-3 px-4">Subject</th>
                    <th className="pb-3 px-4">Fail Rate</th>
                    <th className="pb-3 pl-4 text-right">Priority</th>
                  </tr>
                </thead>
                <tbody>
                  {weakTopics.map((t, i) => {
                    const badgeClass = priorityColor[t.priority];
                    return (
                      <tr key={i} className="border-b border-s-stroke2 last:border-b-0">
                        <td className="py-4 pr-4 text-body-2 font-bold text-t-primary">{t.topic}</td>
                        <td className="py-4 px-4 text-caption text-t-secondary">{t.subject}</td>
                        <td className="py-4 px-4 text-caption font-bold text-[#FF6A55]">{t.failRate}%</td>
                        <td className="py-4 pl-4 text-right">
                          <span className={`label ${badgeClass}`}>{t.priority}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Trap Questions */}
          <div className="card flex flex-col p-6 border border-s-stroke2 bg-b-surface1">
            <h2 className="text-sub-title-1 font-bold text-t-primary mb-1">Common Trap Questions</h2>
            <p className="text-caption text-t-secondary mb-6">Questions where students selected the same wrong answer.</p>
            <div className="flex flex-col gap-4 flex-1">
              {trapQuestions.map((t, i) => (
                <div key={i} className="p-4 bg-[#FF6A55]/5 border border-[#FF6A55]/20 rounded-2xl">
                  <div className="flex justify-between mb-2">
                    <span className="text-body-2 font-bold text-t-primary">{t.q} — Option {t.option}</span>
                    <span className="text-caption font-bold text-[#FF6A55]">{t.pct}%</span>
                  </div>
                  <p className="text-caption text-t-secondary leading-relaxed mb-3">{t.desc}</p>
                  <span className="label label-red">{t.trap.replace(/_/g, " ")}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* All Batches Summary Table */}
        <div className="group relative card flex flex-col p-6 border border-s-stroke2 bg-b-surface1">
          <h2 className="text-sub-title-1 font-bold text-t-primary mb-6">All Batches — Quick Comparison</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-s-stroke2 text-caption font-bold text-t-secondary">
                  <th className="pb-3 pr-4">Batch</th>
                  <th className="pb-3 px-4">Exam</th>
                  <th className="pb-3 px-4">Students</th>
                  <th className="pb-3 px-4">Avg Score</th>
                  <th className="pb-3 px-4">Top Score</th>
                  <th className="pb-3 pl-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {batchStats.map((b, i) => (
                  <tr key={i} className="border-b border-s-stroke2 last:border-b-0">
                    <td className="py-4 pr-4 text-body-2 font-bold text-t-primary">{b.batchName}</td>
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
                      <Link href={`/teacher/batch/${mockBatches[i]?.id || "batch-001"}`} className="btn btn-sm btn-outline flex items-center justify-center gap-1.5 ml-auto w-fit">
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
