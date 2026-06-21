"use client";

import Link from "next/link";
import { useState } from "react";
import Navbar from "@/components/layout/Navbar";
import { mockUser, mockStats, mockRecentTests, mockStudentDPPs } from "@/lib/mock-data";
import {
  RiBarChartBoxLine,
  RiArrowRightUpLine,
  RiArrowDownSLine,
  RiMoreFill,
  RiRulerLine,
  RiTestTubeLine,
  RiMore2Fill,
  RiAlertFill,
  RiSparklingFill,
  RiShieldCrossFill
} from "@remixicon/react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LineChart, Line } from "recharts";

const scoreDataOverallJEE = [ { name: 'Test 1', score: 120 }, { name: 'Test 2', score: 150 }, { name: 'Mock 1', score: 140 }, { name: 'Test 3', score: 180 }, { name: 'Test 4', score: 175 }, { name: 'Mock 2', score: 210 }, { name: 'Test 5', score: 200 }, { name: 'Mock 3', score: 255 } ];
const scoreDataPhysicsJEE = [ { name: 'Test 1', score: 45 }, { name: 'Test 2', score: 52 }, { name: 'Mock 1', score: 48 }, { name: 'Test 3', score: 61 }, { name: 'Test 4', score: 58 }, { name: 'Mock 2', score: 72 }, { name: 'Test 5', score: 68 }, { name: 'Mock 3', score: 86 } ];
const scoreDataChemJEE = [ { name: 'Test 1', score: 35 }, { name: 'Test 2', score: 42 }, { name: 'Mock 1', score: 38 }, { name: 'Test 3', score: 51 }, { name: 'Test 4', score: 48 }, { name: 'Mock 2', score: 62 }, { name: 'Test 5', score: 58 }, { name: 'Mock 3', score: 76 } ];
const scoreDataMathsJEE = [ { name: 'Test 1', score: 40 }, { name: 'Test 2', score: 56 }, { name: 'Mock 1', score: 54 }, { name: 'Test 3', score: 68 }, { name: 'Test 4', score: 69 }, { name: 'Mock 2', score: 76 }, { name: 'Test 5', score: 74 }, { name: 'Mock 3', score: 93 } ];

const scoreDataOverallNEET = [ { name: 'Test 1', score: 320 }, { name: 'Test 2', score: 410 }, { name: 'Mock 1', score: 390 }, { name: 'Test 3', score: 520 }, { name: 'Test 4', score: 490 }, { name: 'Mock 2', score: 610 }, { name: 'Test 5', score: 580 }, { name: 'Mock 3', score: 680 } ];
const scoreDataPhysicsNEET = [ { name: 'Test 1', score: 70 }, { name: 'Test 2', score: 95 }, { name: 'Mock 1', score: 85 }, { name: 'Test 3', score: 120 }, { name: 'Test 4', score: 110 }, { name: 'Mock 2', score: 145 }, { name: 'Test 5', score: 135 }, { name: 'Mock 3', score: 160 } ];
const scoreDataChemNEET = [ { name: 'Test 1', score: 80 }, { name: 'Test 2', score: 105 }, { name: 'Mock 1', score: 95 }, { name: 'Test 3', score: 130 }, { name: 'Test 4', score: 120 }, { name: 'Mock 2', score: 155 }, { name: 'Test 5', score: 145 }, { name: 'Mock 3', score: 170 } ];
const scoreDataBioNEET = [ { name: 'Test 1', score: 170 }, { name: 'Test 2', score: 210 }, { name: 'Mock 1', score: 210 }, { name: 'Test 3', score: 270 }, { name: 'Test 4', score: 260 }, { name: 'Mock 2', score: 310 }, { name: 'Test 5', score: 300 }, { name: 'Mock 3', score: 350 } ];

const microLineData = [
  { value: 12 }, { value: 15 }, { value: 18 }, { value: 14 }, { value: 20 }, { value: 24 }, { value: 34 }
];

const microBarData = [
  { value: 40 }, { value: 60 }, { value: 30 }, { value: 80 }, { value: 50 }, { value: 90 }, { value: 70 }, { value: 60 }, { value: 80 }, { value: 50 }
];

export default function Dashboard() {
  const isNEET = mockUser.batch.includes("NEET");
  const subjects = ["Overall", "Physics", "Chemistry", isNEET ? "Biology" : "Maths"];
  const [activeSubject, setActiveSubject] = useState("Overall");

  const currentScoreData = isNEET
    ? (activeSubject === "Overall" ? scoreDataOverallNEET :
       activeSubject === "Physics" ? scoreDataPhysicsNEET :
       activeSubject === "Chemistry" ? scoreDataChemNEET : scoreDataBioNEET)
    : (activeSubject === "Overall" ? scoreDataOverallJEE :
       activeSubject === "Physics" ? scoreDataPhysicsJEE :
       activeSubject === "Chemistry" ? scoreDataChemJEE : scoreDataMathsJEE);

  const getScoreDisplay = () => {
    if (activeSubject === "Overall") return { score: isNEET ? "680 / 720" : "255 / 300", text: "Best performing month driven by Physics." };
    if (activeSubject === "Physics") return { score: isNEET ? "160 / 180" : "86 / 100", text: "Your strongest subject. Top 5% in batch." };
    if (activeSubject === "Chemistry") return { score: isNEET ? "170 / 180" : "76 / 100", text: "Consistent improvement over last 3 tests." };
    if (activeSubject === "Maths") return { score: "93 / 100", text: "Steady progress. Calculus needs attention." };
    return { score: "350 / 360", text: "Excellent performance in Genetics." }; // Biology
  };

  const { score, text } = getScoreDisplay();

  const getYAxisDomain = () => {
    if (isNEET) {
       if (activeSubject === "Overall") return [0, 720];
       if (activeSubject === "Biology") return [0, 360];
       return [0, 180];
    } else {
       if (activeSubject === "Overall") return [0, 300];
       return [0, 100];
    }
  };

  return (
    <>
      <Navbar />
      
      <main className="mx-auto w-full max-w-screen-2xl px-6 pb-10 md:px-8">
        {/* Hero Summary */}
        <div className="group relative card mb-6 overflow-hidden border border-s-stroke2 bg-b-surface1 p-6">
          <div className="box-hover" />
          <div className="relative z-10 grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(18rem,0.7fr)]">
            <div className="min-w-0">
              <div className="t-label mb-3 flex items-center gap-2 text-primary-01">
                <RiSparklingFill size={14} /> Weekly snapshot
              </div>
              <h2 className="text-h4 font-semibold tracking-tight text-t-primary sm:text-h5">
                You’re on a strong run this week.
              </h2>
              <p className="mt-2 max-w-2xl text-body-2 text-t-secondary">
                Accuracy is trending up, the next booster is ready, and your pace is ahead of target. Keep momentum on the weak chapters before they snowball.
              </p>

              <div className="mt-5 flex flex-wrap gap-3">
                <Link href="/analytics" className="btn btn-primary">
                  Review analytics
                </Link>
                <Link href="/history" className="btn btn-outline">
                  Open test history
                </Link>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
              <div className="rounded-3xl bg-b-surface2 p-4">
                <div className="text-caption font-semibold text-t-secondary">Tests this week</div>
                <div className="mt-2 text-h5 font-semibold tracking-tight text-t-primary">8</div>
                <div className="mt-1 text-caption text-primary-02">+2 from last week</div>
              </div>
              <div className="rounded-3xl bg-b-surface2 p-4">
                <div className="text-caption font-semibold text-t-secondary">Accuracy</div>
                <div className="mt-2 text-h5 font-semibold tracking-tight text-t-primary">71.2%</div>
                <div className="mt-1 text-caption text-primary-02">+5.2% boost</div>
              </div>
              <div className="rounded-3xl bg-b-surface2 p-4">
                <div className="text-caption font-semibold text-t-secondary">Booster queue</div>
                <div className="mt-2 text-h5 font-semibold tracking-tight text-t-primary">3</div>
                <div className="mt-1 text-caption text-[#EF9D0E]">Needs review</div>
              </div>
            </div>
          </div>
        </div>
        
        {/* ── Top Row: Performance Overview (Left) + Team Updates (Right) ── */}
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px] mb-6 items-stretch">
          
          {/* Performance Overview Section */}
          <div className="min-w-0">
            <div className="mb-4 flex items-center justify-between gap-4">
              <h2 className="text-sub-title-1 font-bold text-t-primary">Performance Overview</h2>
              <div className="flex items-center gap-1.5 text-caption font-semibold text-t-secondary cursor-pointer">
                This week <RiArrowDownSLine size={16} />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              
              {/* Stat 1: Total Tests */}
              <div className="group relative card flex min-h-[17rem] flex-col overflow-hidden border border-s-stroke2 bg-b-surface1 p-5 transition-all hover:border-transparent">
                <div className="box-hover" />
                <div className="relative z-10 flex justify-between items-center mb-3">
                  <span className="text-body-2 font-bold text-t-primary">Total Tests Taken</span>
                  <span className="text-t-secondary"><RiBarChartBoxLine size={18} /></span>
                </div>
                <div className="relative z-10 text-h4 font-bold text-t-primary mb-2 tracking-tight">
                  {mockStats.totalTests}
                </div>
                <div className="relative z-10 mb-6">
                  <span className="label label-gray">
                    +12% vs last week
                  </span>
                </div>
                {/* Micro Chart (Line) */}
                <div className="relative z-10 mt-auto h-16 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={microLineData}>
                      <Line type="monotone" dataKey="value" stroke="var(--primary-01)" strokeWidth={3} dot={false} isAnimationActive={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Stat 2: Avg Score */}
              <div className="group relative card flex min-h-[17rem] flex-col overflow-hidden border border-s-stroke2 bg-b-surface1 p-5 transition-all hover:border-transparent">
                <div className="box-hover" />
                <div className="relative z-10 flex justify-between items-center mb-3">
                  <span className="text-body-2 font-bold text-t-primary">Average Score</span>
                  <span className="text-t-secondary"><RiBarChartBoxLine size={18} /></span>
                </div>
                <p className="relative z-10 text-caption text-t-secondary mb-6">
                  <strong className="text-t-primary">86 marks</strong> avg. +15% vs last week.
                </p>
                {/* Micro Chart (Bars) */}
                <div className="relative z-10 mt-auto h-16 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={microBarData} margin={{ top: 0, bottom: 0, left: 0, right: 0 }}>
                      <Bar dataKey="value" fill="var(--primary-02)" radius={[2, 2, 0, 0]} isAnimationActive={false}>
                        {
                          microBarData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={index % 2 === 0 ? "rgba(0, 166, 86, 0.2)" : "var(--primary-02)"} />
                          ))
                        }
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Stat 3: Accuracy */}
              <div className="group relative card flex min-h-[17rem] flex-col overflow-hidden border border-s-stroke2 bg-b-surface1 p-5 transition-all hover:border-transparent">
                <div className="box-hover" />
                <div className="relative z-10 flex justify-between items-center mb-3">
                  <span className="text-body-2 font-bold text-t-primary">Accuracy Rate</span>
                  <span className="text-t-secondary"><RiMoreFill size={18} /></span>
                </div>
                <div className="relative z-10 mt-auto mb-3">
                  <div className="text-h4 font-bold text-t-primary mb-2 tracking-tight">
                    {mockStats.accuracy}%
                  </div>
                  <span className="label label-green">
                    <RiArrowRightUpLine size={12} /> +5.2%
                  </span>
                </div>
              </div>

            </div>
          </div>

          {/* Team/Batch Updates Right Panel */}
          <div className="min-w-0">
            <div className="group relative card flex h-full min-h-[17rem] flex-col items-center overflow-hidden border border-s-stroke2 bg-b-surface1 p-8 text-center transition-all hover:border-transparent">
              <div className="box-hover" />
              <div className="relative z-10 mb-6 flex flex-col gap-0">
                 {/* Top row of 2 avatars */}
                 <div className="flex justify-center -mb-3 z-10">
                   <div className="avatar avatar-lg border-2 border-b-surface2 z-10 bg-primary-01">JD</div>
                   <div className="avatar avatar-lg border-2 border-b-surface2 -ml-3 z-[1] bg-primary-02">AS</div>
                 </div>
                 {/* Bottom row of 2 avatars */}
                 <div className="flex justify-center z-0">
                   <div className="avatar avatar-lg border-2 border-b-surface2 z-10 bg-primary-05">MK</div>
                   <div className="avatar avatar-lg border-2 border-b-surface2 -ml-3 z-[1] bg-primary-03">RJ</div>
                 </div>
              </div>
              <h3 className="relative z-10 text-body-2 font-bold mb-1 text-t-primary">Batch Updates</h3>
              <p className="relative z-10 text-caption text-t-secondary mb-6">3 urgent from "Target JEE 2026"</p>
              <button className="relative z-10 btn btn-outline w-full bg-transparent">
                Open Inbox
              </button>
            </div>
          </div>

        </div>

        {/* ── Middle Row: Charts ── */}
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px] mb-6 items-stretch">
          
          {/* Main Chart Card */}
          <div className="group relative card flex min-w-0 flex-col overflow-hidden border border-s-stroke2 bg-b-surface1 p-6 transition-all hover:border-transparent">
             <div className="box-hover" />
             <div className="relative z-10 flex flex-col justify-between gap-6 sm:flex-row sm:items-start mb-8">
                <div>
                  <h3 className="text-sub-title-1 font-bold text-t-primary">Score Performance</h3>
                  <div className="mt-1 flex items-center gap-3">
                    <span className="text-h5 font-bold text-t-primary">{score}</span>
                    <span className="label label-gray">
                      <RiArrowRightUpLine size={12} /> 105% of Goal
                    </span>
                  </div>
                  <p className="text-caption text-t-secondary mt-2">{text}</p>
                </div>
                
                <div className="flex flex-col items-start gap-4 sm:items-end">
                  {/* Subject Tabs */}
                  <div className="flex max-w-full gap-1 overflow-x-auto rounded-3xl border border-s-stroke2 bg-b-surface2 p-1">
                    {subjects.map(sub => (
                      <button
                        key={sub}
                        onClick={() => setActiveSubject(sub)}
                        className={`shrink-0 rounded-2xl border-none px-3 py-1.5 text-caption font-semibold transition-all cursor-pointer ${
                          activeSubject === sub 
                            ? "bg-b-surface1 text-t-primary shadow-widget" 
                            : "bg-transparent text-t-secondary hover:text-t-primary"
                        }`}
                      >
                        {sub}
                      </button>
                    ))}
                  </div>
                </div>
             </div>
             
             {/* Real Recharts Bar Chart */}
             <div className="relative z-10 mt-auto h-64 w-full min-w-0">
               <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={currentScoreData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }} barSize={36}>
                   <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-default)" />
                   <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--fg-muted)', fontWeight: 500 }} dy={10} />
                   <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--fg-muted)', fontWeight: 500 }} dx={-10} domain={getYAxisDomain()} />
                   <Tooltip 
                     cursor={{ fill: 'var(--n-10)' }}
                     contentStyle={{ borderRadius: 'var(--r-md)', border: '1px solid var(--border-default)', boxShadow: 'var(--sh-200)' }}
                     itemStyle={{ fontWeight: 600, color: 'var(--fg-default)' }}
                   />
                   <Bar dataKey="score" fill="var(--s-50)" radius={[4, 4, 0, 0]} />
                 </BarChart>
               </ResponsiveContainer>
             </div>
             {/* Chart Legend */}
             <div className="relative z-10 mt-4 flex gap-4 text-caption font-semibold text-t-secondary">
                <div className="flex items-center gap-1.5"><div className="size-3 bg-primary-01 rounded-[2px]"/> Test Score</div>
             </div>
          </div>

          {/* AI Insight Card */}
           <div className="card flex min-h-[24rem] flex-col border border-s-stroke2 bg-b-dark1 p-8 text-t-light shadow-depth">
            <div className="flex justify-between items-center mb-6">
               <div className="flex items-center gap-2 font-bold text-t-light">
                 <RiSparklingFill className="text-primary-05" size={18} /> AI Insight
               </div>
               <span className="cursor-pointer text-t-tertiary hover:text-t-light"><RiMoreFill size={20} /></span>
            </div>
            
            <h2 className="text-h6 font-bold mb-6 text-t-light">Topic Risk Alert</h2>
            
            <div className="flex-1 flex justify-center items-center mb-6">
               <RiShieldCrossFill size={80} className="text-primary-03/80" />
            </div>

            <p className="text-body-2 font-semibold text-t-secondary leading-relaxed mb-8">
               Accuracy for <span className="font-bold text-t-light">Laws of Motion</span> dropped <span className="text-primary-03 font-bold">-15%</span> this week. 
               Knowledge gap identified by Friday. Est. impact: <span className="font-bold text-primary-03">-12 marks</span>.
            </p>

            <button className="btn btn-outline w-full bg-transparent mb-3 text-t-light border-white/20 hover:border-white/40">
              Take Booster Test
            </button>
            <button className="btn btn-primary w-full">
              Review Concepts
            </button>
          </div>
        </div>

        {/* ── Bottom Row: Recent Tests & Live Activity ── */}
        <div className="grid gap-6 lg:grid-cols-2 mb-6">
          
          {/* Recent Tests List */}
          <div className="group relative card flex flex-col overflow-hidden border border-s-stroke2 bg-b-surface1 p-6 transition-all hover:border-transparent">
            <div className="box-hover" />
            <div className="relative z-10 flex justify-between items-center mb-6">
               <h3 className="text-sub-title-1 font-bold text-t-primary">Recent Tests</h3>
               <Link href="/history" className="text-caption text-primary-01 hover:text-primary-01/80 font-bold no-underline">View All</Link>
            </div>
            <div className="relative z-10 flex flex-col gap-4">
              {mockRecentTests.slice(0, 4).map(test => (
                <div key={test.id} className="flex justify-between items-center pb-4 border-b border-s-stroke2 last:border-b-0 last:pb-0">
                  <div className="flex items-center gap-3">
                    <div className="size-11 bg-b-surface2 rounded-xl flex items-center justify-center text-t-secondary">
                      {test.exam === "JEE" ? <RiRulerLine size={22} /> : <RiTestTubeLine size={22} />}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-body-2 font-bold text-t-primary">{test.title}</div>
                      <div className="text-caption text-t-secondary mt-0.5">Score: {test.percentage}%</div>
                    </div>
                  </div>
                  <span className="text-t-secondary hover:text-t-primary cursor-pointer">
                    <RiMore2Fill size={20} />
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Alerts & Live Activity */}
          <div className="flex flex-col gap-6">
            <div className="group relative card flex flex-col overflow-hidden border border-s-stroke2 bg-b-surface1 p-6 transition-all hover:border-transparent">
              <div className="box-hover" />
              <div className="relative z-10 mb-3">
                <span className="label label-red">
                  <RiAlertFill size={12} className="mr-1" /> Action Required
                </span>
              </div>
              <h3 className="relative z-10 text-sub-title-1 font-bold text-t-primary mb-4">Critical Boosters Ready</h3>
              <div className="relative z-10 flex gap-0 mb-4">
                <div className="avatar avatar-lg border-2 border-b-surface2 z-20 bg-shade-02"><RiShieldCrossFill size={20} /></div>
                <div className="avatar avatar-lg border-2 border-b-surface2 -ml-3 z-10 bg-shade-04"><RiTestTubeLine size={20} /></div>
                <div className="avatar avatar-lg border-2 border-b-surface2 -ml-3 z-[1] flex items-center justify-center bg-shade-08 text-shade-06">+2</div>
              </div>
              <div className="relative z-10 flex gap-3 items-center mt-auto">
                <span className="text-caption text-t-secondary">Topics degrading</span>
                <span className="label label-red">High Risk</span>
              </div>
            </div>
          </div>

        </div>

        {/* ── DPP Row ── */}
        <div className="group relative card mt-6 flex flex-col overflow-hidden border border-s-stroke2 bg-b-surface1 p-6 transition-all hover:border-transparent">
          <div className="box-hover" />
          <div className="relative z-10 flex justify-between items-center mb-6">
            <div>
              <h3 className="text-sub-title-1 font-bold text-t-primary">Pending DPPs</h3>
              <p className="text-caption text-t-secondary mt-1">{mockStudentDPPs.filter(d => d.status === "pending" || d.status === "late").length} assignments need your attention</p>
            </div>
            <Link href="/assignments" className="text-caption text-primary-01 hover:text-primary-01/80 font-bold no-underline">View All</Link>
          </div>
          <div className="relative z-10 grid gap-4 md:grid-cols-3">
            {mockStudentDPPs.map(dpp => {
              const isLate = dpp.status === "late";
              const isPending = dpp.status === "pending";
              const isDone = dpp.status === "completed";
              return (
                <div 
                  key={dpp.id} 
                  className={`flex min-h-[10rem] flex-col gap-3 rounded-3xl border p-5 ${
                    isLate 
                      ? "border-[#FF6A55]/20 bg-[#FF6A55]/5" 
                      : isDone 
                        ? "border-[#00A656]/20 bg-[#00A656]/5" 
                        : "border-s-stroke2 bg-b-surface2"
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 truncate font-bold text-body-2 text-t-primary">{dpp.title}</div>
                      <div className="text-caption text-t-secondary">{dpp.subject} · {dpp.totalQuestions} questions</div>
                    </div>
                    <span className={`label ${isLate ? "label-red" : isDone ? "label-green" : "label-gray"} ml-3 shrink-0`}>
                      {isLate ? "⚠ Late" : isDone ? "✓ Done" : "Pending"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center mt-auto pt-2">
                    <span className={`text-caption font-semibold ${isLate ? "text-[#FF6A55]" : "text-t-secondary"}`}>
                      Due: {dpp.dueDate}
                    </span>
                    {isDone ? (
                      <span className="text-caption font-bold text-[#00A656]">{dpp.score}/{dpp.maxScore} marks</span>
                    ) : (
                      <Link href={`/assignments/${dpp.id}`} className="btn btn-sm btn-primary">
                        {isLate ? "Submit Late" : "Start"}
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </main>
    </>
  );
}