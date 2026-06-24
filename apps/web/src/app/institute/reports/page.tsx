"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  RiSearchLine,
  RiNotification3Line,
  RiMailLine,
  RiBarChartBoxLine,
  RiLineChartLine,
  RiPieChart2Line,
  RiArrowDownSLine,
  RiDownload2Line,
  RiTeamLine,
  RiGroupLine,
  RiStarFill,
  RiGraduationCapLine,
  RiRulerLine,
  RiTestTubeLine,
  RiArrowRightLine
} from "@remixicon/react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend
} from "recharts";
import { mockBatches, mockInstituteStudents } from "@/lib/mock-data";

// Mock Data for Analytics Trends
const trendData = [
  { month: "Jan", Physics: 65, Chemistry: 70, Mathematics: 60 },
  { month: "Feb", Physics: 70, Chemistry: 75, Mathematics: 62 },
  { month: "Mar", Physics: 72, Chemistry: 74, Mathematics: 68 },
  { month: "Apr", Physics: 78, Chemistry: 80, Mathematics: 75 },
  { month: "May", Physics: 82, Chemistry: 83, Mathematics: 80 },
  { month: "Jun", Physics: 85, Chemistry: 82, Mathematics: 84 },
];

const masteryData = [
  { subject: "Mechanics", Score: 85 },
  { subject: "Electrodynamics", Score: 78 },
  { subject: "Organic Chem", Score: 90 },
  { subject: "Physical Chem", Score: 82 },
  { subject: "Algebra", Score: 72 },
  { subject: "Calculus", Score: 88 },
];

// Custom Premium Tooltip for Area Charts
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-b-surface2 border border-s-subtle rounded-2xl px-4 py-3.5 shadow-dropdown text-left z-50">
        <p className="text-[10px] font-sans font-bold text-t-tertiary uppercase tracking-wider mb-2.5">{label}</p>
        <div className="flex flex-col gap-2 min-w-[120px]">
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-4 justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                <span className="text-xs font-sans font-semibold text-t-primary">{entry.name}</span>
              </div>
              <span className="text-xs font-mono font-bold text-t-primary">{entry.value}%</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

// Custom Premium Tooltip for Radar Charts
const CustomRadarTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const entry = payload[0];
    return (
      <div className="bg-b-surface2 border border-s-subtle rounded-2xl px-4 py-2.5 shadow-dropdown text-left z-50">
        <p className="text-[10px] font-sans font-bold text-t-tertiary uppercase tracking-wider mb-1.5">{entry.payload.subject}</p>
        <div className="flex items-center gap-4 justify-between min-w-[120px]">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: entry.color }} />
            <span className="text-xs font-sans font-semibold text-t-primary">Avg Accuracy</span>
          </div>
          <span className="text-xs font-mono font-bold text-t-primary">{entry.value}%</span>
        </div>
      </div>
    );
  }
  return null;
};

export default function ReportsPage() {
  const [mounted, setMounted] = useState(false);
  const [timeRange, setTimeRange] = useState("Last 30 Days");
  const [activeTab, setActiveTab] = useState<"Overview" | "Batch Performance" | "Student Performance">("Overview");

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <main className="mx-auto w-full max-w-[1560px] px-6 pb-12 pt-6 flex flex-col gap-6 select-none bg-transparent">

      {/* ── Top Navigation Row (Figma Style) ── */}
      <div className="flex flex-row justify-between items-center w-full h-12 gap-6">
        {/* Title */}
        <h1 className="font-sans font-semibold text-[32px] leading-[145%] tracking-[0.0025em] text-[#101010] dark:text-t-primary">
          Reports & Analytics
        </h1>

        {/* Navigation Items (Right Side) */}
        <div className="flex flex-row items-center gap-3">
          {/* Search Box */}
          <div className="flex flex-row items-center bg-b-surface2 border border-s-stroke2 rounded-full px-3 py-2 w-[315px] h-12 gap-2 shadow-xs">
            <RiSearchLine size={20} className="text-[#727272] dark:text-t-tertiary" />
            <input
              type="text"
              placeholder="Search"
              className="bg-transparent border-none outline-none text-sm text-[#101010] dark:text-t-primary placeholder-[#727272] w-full"
            />
          </div>

          {/* Export PDF Button (Gradient) */}
          <button className="btn btn-primary w-[100px] h-12 rounded-full cursor-pointer">
            Export
          </button>

          {/* Bell Button */}
          <button className="btn btn-outline w-12 h-12 !px-0 rounded-full flex items-center justify-center relative shrink-0">
            <RiNotification3Line size={20} />
            <div className="absolute top-3.5 right-3.5 size-1.5 rounded-full bg-[#FF6A55]" />
          </button>

          {/* Mail Button */}
          <button className="btn btn-outline w-12 h-12 !px-0 rounded-full flex items-center justify-center shrink-0">
            <RiMailLine size={20} />
          </button>

          {/* Avatar Profile */}
          <div className="flex items-center justify-center size-12 rounded-full border border-s-stroke2 bg-b-surface2 shrink-0 cursor-pointer shadow-xs">
            <div className="size-9 rounded-full bg-b-depth text-t-primary flex items-center justify-center text-xs font-bold">
              AA
            </div>
          </div>
        </div>
      </div>


      {/* Main Content */}
      <div className="flex justify-between items-end mt-6">
        <div className="flex flex-col gap-2">
          <h2 className="font-sans font-semibold text-[20px] leading-[145%] text-[#101010] dark:text-t-primary">Performance Analytics</h2>
          <p className="text-xs text-[#7B7B7B] dark:text-t-tertiary">Track general average test outcomes, monthly progress trends, and syllabus area coverage.</p>
        </div>

        {/* Filter Controls (Tabs) */}
        <div className="flex gap-2 items-center">
          {/* Tab buttons */}
          <div className="flex gap-2">
            {["Overview", "Batch Performance", "Student Performance"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`btn h-10 px-5 rounded-full text-xs font-semibold font-sans transition-all active:scale-95 shadow-xs cursor-pointer ${
                  activeTab === tab
                    ? "btn-primary"
                    : "btn-outline"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <span className="text-[#D4D4D4] dark:text-s-stroke2/30 mx-2">|</span>

          {/* Time Selector Dropdown */}
          <div className="relative">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="appearance-none pl-4.5 pr-10 h-10 border border-s-stroke2 rounded-full bg-b-surface2 text-xs font-sans font-semibold text-t-secondary hover:border-s-highlight transition-all outline-none cursor-pointer"
            >
              <option>Last 30 Days</option>
              <option>Last 3 Months</option>
              <option>This Year</option>
            </select>
            <RiArrowDownSLine size={18} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-t-secondary pointer-events-none" />
          </div>
        </div>
      </div>

      {/* ── Active Tab content: Overview ── */}
      {activeTab === "Overview" && (
        <>
          {/* KPI Cards Row */}
          <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 p-2 gap-4 w-full bg-[#F9F9F9] dark:bg-b-surface1/60 border border-[rgba(123,123,123,0.1)] dark:border-s-stroke2/40 rounded-[32px] mt-4">
            {[
              { label: "Average Test Score", value: "76.4%", desc: "+1.8%", descSuffix: "vs last month", icon: <RiBarChartBoxLine size={20} />, iconColor: "text-[#2A85FF]" },
              { label: "Tests Conducted", value: "142", desc: "12 tests", descSuffix: "scheduled this week", icon: <RiLineChartLine size={20} />, iconColor: "text-[#00A656]" },
              { label: "Active Students", value: "1,204", desc: "+34", descSuffix: "new enrollments", icon: <RiPieChart2Line size={20} />, iconColor: "text-[#EF9D0E]" },
            ].map((card, idx) => (
              <div
                key={idx}
                className="flex flex-col items-start p-6 gap-2 bg-[#FDFDFD] dark:bg-b-surface2 border border-[#FDFDFD] dark:border-s-stroke2/30 rounded-[24px] shadow-[0px_0px_36px_-8px_rgba(0,0,0,0.05),0px_6px_4px_-4px_rgba(8,8,8,0.05),0px_5px_1.5px_-4px_rgba(8,8,8,0.09)]"
              >
                <div className="flex flex-row items-center gap-3 w-full mb-1">
                  <span className={card.iconColor}>{card.icon}</span>
                  <span className="font-sans font-semibold text-[16px] leading-[150%] tracking-[0.0015em] text-[#101010] dark:text-t-primary">
                    {card.label}
                  </span>
                </div>
                <div className="flex flex-row items-center gap-4 w-full mt-1">
                  <div className="font-sans text-[54px] font-medium tracking-[-0.005em] text-[#101010] dark:text-t-primary leading-none">
                    {card.value}
                  </div>
                  <div className="flex flex-col items-start gap-0.5">
                    <div className="flex flex-row justify-center items-center px-1.5 py-0.5 gap-1 border border-[rgba(0,166,86,0.15)] bg-[rgba(0,166,86,0.05)] rounded-lg">
                      <span className="text-[#00A656] text-[12px] font-semibold leading-none">{card.desc}</span>
                    </div>
                    <span className="text-[12px] font-sans text-[#7B7B7B] dark:text-t-tertiary">
                      {card.descSuffix}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>


          {/* Visual Chart Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full mt-4 items-stretch">
            {/* Batch Performance Area Chart Card (ColSpan 2) */}
            <div className="group lg:col-span-2 relative flex flex-col justify-between p-6 md:p-8 bg-[#FDFDFD] dark:bg-b-surface2 border border-s-stroke2/40 rounded-[32px] shadow-[0px_5px_1.5px_-4px_rgba(8,8,8,0.09),0px_6px_4px_-4px_rgba(8,8,8,0.05)] overflow-hidden transition-all duration-300 hover:shadow-[0px_12px_24px_-8px_rgba(0,0,0,0.06),0px_6px_10px_-4px_rgba(8,8,8,0.04)] hover:-translate-y-0.5">
              <div className="box-hover" />
              <div className="relative z-10 flex flex-row justify-between items-start mb-6 w-full">
                <div className="flex flex-col gap-1">
                  <h3 className="font-sans font-bold text-[20px] text-[#101010] dark:text-t-primary">Batch Performance Trend</h3>
                  <p className="text-xs text-[#7B7B7B] dark:text-t-tertiary">Subject performance index over consecutive cycles</p>
                </div>
                {/* Custom Legend */}
                <div className="flex flex-row items-center gap-4 bg-[#F9F9F9] dark:bg-b-surface1/40 px-3 py-1.5 rounded-full border border-s-stroke2/10 shrink-0">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#2A85FF]" />
                    <span className="text-[11px] font-sans font-semibold text-[#727272] dark:text-t-secondary">Physics</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#EF9D0E]" />
                    <span className="text-[11px] font-sans font-semibold text-[#727272] dark:text-t-secondary">Chemistry</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#00A656]" />
                    <span className="text-[11px] font-sans font-semibold text-[#727272] dark:text-t-secondary">Mathematics</span>
                  </div>
                </div>
              </div>

              <div className="relative z-10 w-full h-[320px]">
                {mounted ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorPhysics" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#2A85FF" stopOpacity={0.25}/>
                          <stop offset="95%" stopColor="#2A85FF" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorChem" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#EF9D0E" stopOpacity={0.25}/>
                          <stop offset="95%" stopColor="#EF9D0E" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorMath" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#00A656" stopOpacity={0.25}/>
                          <stop offset="95%" stopColor="#00A656" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(123, 123, 123, 0.15)"/>
                      <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#7B7B7B", fontWeight: 500, fontFamily: "var(--font-sans)" }} dy={10}/>
                      <YAxis domain={[40, 100]} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#7B7B7B", fontWeight: 500, fontFamily: "var(--font-sans)" }} dx={-10}/>
                      <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(123,123,123,0.2)', strokeWidth: 1, strokeDasharray: '4 4' }} />
                      <Area type="monotone" dataKey="Physics" stroke="#2A85FF" strokeWidth={3} fillOpacity={1} fill="url(#colorPhysics)" activeDot={{ r: 6, strokeWidth: 0, fill: '#2A85FF' }} />
                      <Area type="monotone" dataKey="Chemistry" stroke="#EF9D0E" strokeWidth={3} fillOpacity={1} fill="url(#colorChem)" activeDot={{ r: 6, strokeWidth: 0, fill: '#EF9D0E' }} />
                      <Area type="monotone" dataKey="Mathematics" stroke="#00A656" strokeWidth={3} fillOpacity={1} fill="url(#colorMath)" activeDot={{ r: 6, strokeWidth: 0, fill: '#00A656' }} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs text-[#7B7B7B]">Loading chart...</div>
                )}
              </div>
            </div>

            {/* Subject Mastery Radar Chart Card (ColSpan 1) */}
            <div className="group relative flex flex-col justify-between p-6 md:p-8 bg-[#FDFDFD] dark:bg-b-surface2 border border-s-stroke2/40 rounded-[32px] shadow-[0px_5px_1.5px_-4px_rgba(8,8,8,0.09),0px_6px_4px_-4px_rgba(8,8,8,0.05)] overflow-hidden transition-all duration-300 hover:shadow-[0px_12px_24px_-8px_rgba(0,0,0,0.06),0px_6px_10px_-4px_rgba(8,8,8,0.04)] hover:-translate-y-0.5">
              <div className="box-hover" />
              <div className="relative z-10 flex flex-col gap-1 mb-6">
                <h3 className="font-sans font-bold text-[20px] text-[#101010] dark:text-t-primary">Subject Mastery</h3>
                <p className="text-xs text-[#7B7B7B] dark:text-t-tertiary">Overall core module accuracy index</p>
              </div>

              <div className="relative z-10 w-full h-[320px] flex items-center justify-center">
                {mounted ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="65%" data={masteryData}>
                      <defs>
                        <linearGradient id="colorRadar1" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#2A85FF" stopOpacity={0.35}/>
                          <stop offset="95%" stopColor="#2A85FF" stopOpacity={0.05}/>
                        </linearGradient>
                      </defs>
                      <PolarGrid stroke="rgba(123, 123, 123, 0.15)"/>
                      <PolarAngleAxis dataKey="subject" tick={{ fill: "#727272", fontSize: 10, fontWeight: 600, fontFamily: "var(--font-sans)" }} dy={4} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                      <Radar name="Accuracy Index" dataKey="Score" stroke="#2A85FF" strokeWidth={2.5} fill="url(#colorRadar1)" fillOpacity={1} dot={{ r: 3, fill: '#2A85FF', strokeWidth: 0 }} activeDot={{ r: 5, fill: '#2A85FF', strokeWidth: 0 }} />
                      <Tooltip content={<CustomRadarTooltip />} cursor={{ fill: 'rgba(123,123,123,0.05)' }} />
                    </RadarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs text-[#7B7B7B]">Loading radar chart...</div>
                )}
              </div>
            </div>
          </div>

          {/* Recent Test Reports List */}
          <div className="group relative flex flex-col p-6 md:p-8 gap-6 rounded-[32px] bg-[#FDFDFD] dark:bg-b-surface2 shadow-[0px_5px_1.5px_-4px_rgba(8,8,8,0.09),0px_6px_4px_-4px_rgba(8,8,8,0.05)] border border-s-stroke2/40 w-full min-w-0 overflow-hidden select-none mt-4 transition-all duration-300 hover:shadow-[0px_12px_24px_-8px_rgba(0,0,0,0.06),0px_6px_10px_-4px_rgba(8,8,8,0.04)] hover:-translate-y-0.5">
            <div className="box-hover" />
            <div className="relative z-10 flex flex-row items-center justify-between py-2.5 px-3 w-full h-12 gap-2">
              <h4 className="font-sans font-semibold text-[20px] leading-[145%] tracking-[0.0015em] text-[#101010] dark:text-t-primary">
                Recent Test Reports
              </h4>
              <Link 
                href="/institute/tests" 
                className="flex flex-row justify-center items-center px-4.5 py-2.5 gap-2 border border-[#E2E2E2] dark:border-s-stroke2 rounded-[90px] bg-transparent text-[#727272] dark:text-t-secondary text-sm font-sans transition-all hover:border-[#727272] active:scale-98 no-underline"
              >
                <span>View All</span>
                <RiArrowRightLine size={16} />
              </Link>
            </div>

            <div className="relative z-10 flex flex-col gap-2 w-full min-w-0">
              {[
                { id: "T-101", title: "JEE Full Mock Test 12", exam: "JEE", batch: "JEE 2026 Morning", accuracy: 78, high: 96, date: "2026-06-22" },
                { id: "T-102", title: "NEET Physics Unit 4", exam: "NEET", batch: "NEET 2026 Droppers", accuracy: 82, high: 98, date: "2026-06-20" },
                { id: "T-103", title: "JEE Maths Chapterwise 2", exam: "JEE", batch: "Class 11 - JEE Advanced", accuracy: 68, high: 88, date: "2026-06-18" },
                { id: "T-104", title: "Chemistry Periodic Table", exam: "NEET", batch: "Class 12 - NEET", accuracy: 89, high: 100, date: "2026-06-15" },
              ].map((report) => (
                <div
                  key={report.id}
                  className="flex flex-row items-center justify-between p-3 gap-8 rounded-[20px] transition-all w-full h-[88px] min-w-0 overflow-hidden bg-transparent hover:bg-[#F9F9F9] dark:hover:bg-b-surface1/30 border border-transparent hover:border-s-stroke2/10"
                >
                  {/* Left: Avatar/Icon + Title & Batch details */}
                  <div className="flex flex-row items-center gap-5 flex-1 min-w-0 overflow-hidden">
                    <div className="flex w-16 h-16 items-center justify-center rounded-xl bg-b-surface1 dark:bg-b-surface1/50 border border-s-stroke2/40 dark:border-s-stroke2/20 shrink-0 text-t-secondary dark:text-t-tertiary font-bold text-lg">
                      {report.exam === "JEE" ? <RiRulerLine size={24} /> : <RiTestTubeLine size={24} />}
                    </div>
                    <div className="min-w-0 flex-1 flex flex-col">
                      <span className="font-sans font-semibold text-[16px] leading-[150%] tracking-[0.0015em] text-[#101010] dark:text-t-primary truncate">
                        {report.title}
                      </span>
                      <span className="text-xs text-[#7B7B7B] dark:text-t-tertiary mt-0.5">
                        {report.batch} · {report.date}
                      </span>
                    </div>
                  </div>

                  {/* Right Info & Actions */}
                  <div className="flex flex-row items-center gap-8 shrink-0">
                    <div className="flex flex-col items-end justify-center min-w-[90px]">
                      <span className="text-[10px] font-sans font-bold text-[#7B7B7B] dark:text-t-tertiary uppercase tracking-wider">
                        Avg Accuracy
                      </span>
                      <span className="text-[16px] font-sans font-bold text-[#00A656] mt-0.5">
                        {report.accuracy}%
                      </span>
                    </div>

                    <div className="flex flex-col items-end justify-center min-w-[90px]">
                      <span className="text-[10px] font-sans font-bold text-[#7B7B7B] dark:text-t-tertiary uppercase tracking-wider">
                        High Score
                      </span>
                      <span className="text-[16px] font-sans font-bold text-[#101010] dark:text-t-primary mt-0.5">
                        {report.high}%
                      </span>
                    </div>

                    <div className="min-w-[110px] flex justify-end">
                      <button className="btn btn-outline btn-sm font-sans cursor-pointer">
                        View Report
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </>
      )}

      {/* ── Active Tab content: Batch Performance ── */}
      {activeTab === "Batch Performance" && (
        <>
          {/* Full-width Trend Chart */}
          <div className="group relative flex flex-col justify-between p-6 md:p-8 bg-[#FDFDFD] dark:bg-b-surface2 border border-s-stroke2/40 rounded-[32px] shadow-[0px_5px_1.5px_-4px_rgba(8,8,8,0.09),0px_6px_4px_-4px_rgba(8,8,8,0.05)] overflow-hidden w-full mt-4 transition-all duration-300 hover:shadow-[0px_12px_24px_-8px_rgba(0,0,0,0.06),0px_6px_10px_-4px_rgba(8,8,8,0.04)] hover:-translate-y-0.5">
            <div className="box-hover" />
            <div className="relative z-10 flex flex-row justify-between items-start mb-6">
              <div className="flex flex-col gap-1">
                <h3 className="font-sans font-bold text-[20px] text-[#101010] dark:text-t-primary">Cross-Batch Accuracy Over Time</h3>
                <p className="text-xs text-[#7B7B7B] dark:text-t-tertiary">Longitudinal performance trend for the active coaching batches</p>
              </div>
              {/* Custom Legend */}
              <div className="flex flex-row items-center gap-4 bg-[#F9F9F9] dark:bg-b-surface1/40 px-3 py-1.5 rounded-full border border-s-stroke2/10">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#2A85FF]" />
                  <span className="text-[11px] font-sans font-semibold text-[#727272] dark:text-t-secondary">Physics</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#EF9D0E]" />
                  <span className="text-[11px] font-sans font-semibold text-[#727272] dark:text-t-secondary">Chemistry</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#00A656]" />
                  <span className="text-[11px] font-sans font-semibold text-[#727272] dark:text-t-secondary">Mathematics</span>
                </div>
              </div>
            </div>

            <div className="relative z-10 w-full h-[360px]">
              {mounted ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorPhysicsBatch" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2A85FF" stopOpacity={0.25}/>
                        <stop offset="95%" stopColor="#2A85FF" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorChemBatch" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#EF9D0E" stopOpacity={0.25}/>
                        <stop offset="95%" stopColor="#EF9D0E" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorMathBatch" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#00A656" stopOpacity={0.25}/>
                        <stop offset="95%" stopColor="#00A656" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(123, 123, 123, 0.15)"/>
                    <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#7B7B7B", fontWeight: 500, fontFamily: "var(--font-sans)" }} dy={10}/>
                    <YAxis domain={[40, 100]} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#7B7B7B", fontWeight: 500, fontFamily: "var(--font-sans)" }} dx={-10}/>
                    <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(123,123,123,0.2)', strokeWidth: 1, strokeDasharray: '4 4' }} />
                    <Area type="monotone" dataKey="Physics" stroke="#2A85FF" strokeWidth={3} fillOpacity={1} fill="url(#colorPhysicsBatch)" activeDot={{ r: 6, strokeWidth: 0, fill: '#2A85FF' }} />
                    <Area type="monotone" dataKey="Chemistry" stroke="#EF9D0E" strokeWidth={3} fillOpacity={1} fill="url(#colorChemBatch)" activeDot={{ r: 6, strokeWidth: 0, fill: '#EF9D0E' }} />
                    <Area type="monotone" dataKey="Mathematics" stroke="#00A656" strokeWidth={3} fillOpacity={1} fill="url(#colorMathBatch)" activeDot={{ r: 6, strokeWidth: 0, fill: '#00A656' }} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs text-[#7B7B7B]">Loading chart...</div>
              )}
            </div>
          </div>

          {/* Batch Metrics Rows */}
          <div className="group relative flex flex-col p-3 pb-6 gap-6 rounded-[32px] bg-[#FDFDFD] dark:bg-b-surface2 shadow-[0px_5px_1.5px_-4px_rgba(8,8,8,0.09),0px_6px_4px_-4px_rgba(8,8,8,0.05)] border border-s-stroke2/40 w-full min-w-0 overflow-hidden select-none mt-4 transition-all duration-300 hover:shadow-[0px_12px_24px_-8px_rgba(0,0,0,0.06),0px_6px_10px_-4px_rgba(8,8,8,0.04)] hover:-translate-y-0.5">
            <div className="box-hover" />
            <div className="relative z-10 flex flex-row items-center justify-between py-2.5 px-3 w-full h-12 gap-2">
              <h4 className="font-sans font-semibold text-[20px] leading-[145%] tracking-[0.0015em] text-[#101010] dark:text-t-primary">
                Cohort Batch Comparison
              </h4>
              <Link 
                href="/institute/batches" 
                className="flex flex-row justify-center items-center px-4.5 py-2.5 gap-2 border border-[#E2E2E2] dark:border-s-stroke2 rounded-[90px] bg-transparent text-[#727272] dark:text-t-secondary text-sm font-sans transition-all hover:border-[#727272] active:scale-98 no-underline"
              >
                <span>View All</span>
                <RiArrowRightLine size={16} />
              </Link>
            </div>

            <div className="relative z-10 flex flex-col gap-2 w-full min-w-0">
              {mockBatches.map((batch: any, index: number) => {
                const colors = [
                  { bg: "bg-[#2A85FF]/10 text-[#2A85FF] border-[#2A85FF]/20" },
                  { bg: "bg-[#00A656]/10 text-[#00A656] border-[#00A656]/20" },
                  { bg: "bg-[#EF9D0E]/10 text-[#EF9D0E] border-[#EF9D0E]/20" },
                  { bg: "bg-[#FF6A55]/10 text-[#FF6A55] border-[#FF6A55]/20" }
                ][index % 4];

                return (
                  <div 
                    key={batch.id}
                    className="flex flex-row items-center justify-between p-3 gap-8 rounded-[20px] transition-all w-full h-[88px] min-w-0 overflow-hidden bg-transparent hover:bg-[#F9F9F9] dark:hover:bg-b-surface1/30 border border-transparent hover:border-s-stroke2/10"
                  >
                    <div className="flex flex-row items-center gap-5 flex-1 min-w-0 overflow-hidden">
                      <div className={`flex w-16 h-16 items-center justify-center rounded-xl border shrink-0 text-t-secondary font-bold ${colors.bg}`}>
                        <RiTeamLine size={24} />
                      </div>
                      <div className="min-w-0 flex-1 flex flex-col">
                        <span className="font-sans font-semibold text-[16px] leading-[150%] tracking-[0.0015em] text-[#101010] dark:text-t-primary truncate">
                          {batch.name}
                        </span>
                        <span className="text-xs text-[#7B7B7B] mt-0.5">
                          {batch.exam} · {batch.studentsCount} Students enrolled
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-row items-center gap-8 shrink-0">
                      <div className="flex flex-col items-end justify-center min-w-[80px]">
                        <span className="text-[10px] font-sans font-bold text-[#7B7B7B] uppercase tracking-wider">
                          Avg Accuracy
                        </span>
                        <span className="text-[16px] font-sans font-bold text-[#00A656] mt-0.5">
                          {batch.avgScore}%
                        </span>
                      </div>

                      <div className="min-w-[100px] flex justify-end">
                        <span className="px-3 py-1.5 border rounded-lg text-[10px] font-bold uppercase tracking-wider bg-[rgba(0,166,86,0.05)] border-[rgba(0,166,86,0.15)] text-[#00A656]">
                          Active
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* ── Active Tab content: Student Performance ── */}
      {activeTab === "Student Performance" && (
        <>
          {/* Radar Chart */}
          <div className="group relative flex flex-col justify-between p-6 md:p-8 bg-[#FDFDFD] dark:bg-b-surface2 border border-s-stroke2/40 rounded-[32px] shadow-[0px_5px_1.5px_-4px_rgba(8,8,8,0.09),0px_6px_4px_-4px_rgba(8,8,8,0.05)] overflow-hidden w-full mt-4 transition-all duration-300 hover:shadow-[0px_12px_24px_-8px_rgba(0,0,0,0.06),0px_6px_10px_-4px_rgba(8,8,8,0.04)] hover:-translate-y-0.5">
            <div className="box-hover" />
            <div className="relative z-10 flex flex-col gap-1 mb-6">
              <h3 className="font-sans font-bold text-[20px] text-[#101010] dark:text-t-primary">Student Weakness & Strength Index</h3>
              <p className="text-xs text-[#7B7B7B] dark:text-t-tertiary">Comparative review of syllabus mastery averages</p>
            </div>

            <div className="relative z-10 w-full h-[360px] flex items-center justify-center">
              {mounted ? (
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="65%" data={masteryData}>
                    <defs>
                      <linearGradient id="colorRadar2" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2A85FF" stopOpacity={0.35}/>
                        <stop offset="95%" stopColor="#2A85FF" stopOpacity={0.05}/>
                      </linearGradient>
                    </defs>
                    <PolarGrid stroke="rgba(123, 123, 123, 0.15)"/>
                    <PolarAngleAxis dataKey="subject" tick={{ fill: "#727272", fontSize: 11, fontWeight: 600, fontFamily: "var(--font-sans)" }} dy={4} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                    <Radar name="Accuracy Index" dataKey="Score" stroke="#2A85FF" strokeWidth={2.5} fill="url(#colorRadar2)" fillOpacity={1} dot={{ r: 3, fill: '#2A85FF', strokeWidth: 0 }} activeDot={{ r: 5, fill: '#2A85FF', strokeWidth: 0 }} />
                    <Tooltip content={<CustomRadarTooltip />} cursor={{ fill: 'rgba(123,123,123,0.05)' }} />
                  </RadarChart>
                </ResponsiveContainer>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs text-[#7B7B7B]">Loading radar chart...</div>
              )}
            </div>
          </div>

          {/* Student list rows */}
          <div className="group relative flex flex-col p-3 pb-6 gap-6 rounded-[32px] bg-[#FDFDFD] dark:bg-b-surface2 shadow-[0px_5px_1.5px_-4px_rgba(8,8,8,0.09),0px_6px_4px_-4px_rgba(8,8,8,0.05)] border border-s-stroke2/40 w-full min-w-0 overflow-hidden select-none mt-4 transition-all duration-300 hover:shadow-[0px_12px_24px_-8px_rgba(0,0,0,0.06),0px_6px_10px_-4px_rgba(8,8,8,0.04)] hover:-translate-y-0.5">
            <div className="box-hover" />
            <div className="relative z-10 flex flex-row items-center justify-between py-2.5 px-3 w-full h-12 gap-2">
              <h4 className="font-sans font-semibold text-[20px] leading-[145%] tracking-[0.0015em] text-[#101010] dark:text-t-primary">
                Top Performing Students List
              </h4>
              <Link 
                href="/institute/students" 
                className="flex flex-row justify-center items-center px-4.5 py-2.5 gap-2 border border-[#E2E2E2] dark:border-s-stroke2 rounded-[90px] bg-transparent text-[#727272] dark:text-t-secondary text-sm font-sans transition-all hover:border-[#727272] active:scale-98 no-underline"
              >
                <span>View Directory</span>
                <RiArrowRightLine size={16} />
              </Link>
            </div>

            <div className="relative z-10 flex flex-col gap-2 w-full min-w-0">
              {mockInstituteStudents.map((student: any, index: number) => {
                const initials = student.name.split(" ").map((n: string) => n[0]).join("");
                const scoreColor = student.avgScore >= 85 ? "text-[#00A656]" : "text-[#EF9D0E]";
                const performanceLevel = student.avgScore >= 90 ? "Elite" : "Excellent";
                const performanceBadgeClass = student.avgScore >= 90
                  ? "bg-[#00A656]/5 border-[#00A656]/15 text-[#00A656]"
                  : "bg-[#EF9D0E]/5 border-[#EF9D0E]/15 text-[#EF9D0E]";

                return (
                  <div 
                    key={student.id}
                    className="flex flex-row items-center justify-between p-3 gap-8 rounded-[20px] transition-all w-full h-[88px] min-w-0 overflow-hidden bg-transparent hover:bg-[#F9F9F9] dark:hover:bg-b-surface1/30 border border-transparent hover:border-s-stroke2/10"
                  >
                    <div className="flex flex-row items-center gap-5 flex-1 min-w-0 overflow-hidden">
                      <div className="flex w-16 h-16 items-center justify-center rounded-xl bg-b-surface1 border border-s-stroke2/40 shrink-0 text-t-secondary font-bold text-lg">
                        {initials}
                      </div>
                      <div className="min-w-0 flex-1 flex flex-col">
                        <span className="font-sans font-semibold text-[16px] leading-[150%] tracking-[0.0015em] text-[#101010] dark:text-t-primary truncate">
                          {student.name}
                        </span>
                        <span className="text-xs text-[#7B7B7B] mt-0.5">
                          {student.batch} · Student ID: {student.id}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-row items-center gap-8 shrink-0">
                      <div className="flex flex-col items-end justify-center min-w-[80px]">
                        <span className="text-[10px] font-sans font-bold text-[#7B7B7B] uppercase tracking-wider">
                          Avg Score
                        </span>
                        <span className={`text-[16px] font-sans font-bold mt-0.5 ${scoreColor}`}>
                          {student.avgScore}%
                        </span>
                      </div>

                      <div className="flex flex-col items-end justify-center min-w-[90px]">
                        <span className="text-[10px] font-sans font-bold text-[#7B7B7B] uppercase tracking-wider flex items-center gap-0.5">
                          <RiStarFill size={10} className="text-[#F4A109]" /> Standing
                        </span>
                        <span className={`px-2 py-0.5 border rounded-md text-[10px] font-bold mt-0.5 leading-none ${performanceBadgeClass}`}>
                          {performanceLevel}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

    </main>
  );
}
