"use client";

import Navbar from "@/components/layout/Navbar";
import { RiBrainLine, RiGlobalLine, RiBookOpenLine, RiRobot2Line, RiArrowRightUpLine, RiArrowRightLine } from "@remixicon/react";

const examBreakdown = [
  { exam: "JEE Main", tests: 412000, pct: 49, color: "from-[#00A656] to-[#00E576]", shadow: "shadow-[0px_2px_12px_rgba(0,181,18,0.4)]" },
  { exam: "JEE Advanced", tests: 186000, pct: 22, color: "from-[#2A85FF] to-[#60A5FA]", shadow: "shadow-[0px_2px_12px_rgba(42,133,255,0.4)]" },
  { exam: "NEET", tests: 198000, pct: 23, color: "from-[#FFD60A] to-[#FF9F0A]", shadow: "shadow-[0px_2px_12px_rgba(255,214,10,0.4)]" },
  { exam: "SSC / Other", tests: 49000, pct: 6, color: "from-[#8F5BFF] to-[#A78BFA]", shadow: "shadow-[0px_2px_12px_rgba(143,91,255,0.4)]" },
];

const topInstitutes = [
  { name: "Aakash Institute", tests: 58400, tokens: "24.2M" },
  { name: "Allen Career Institute", tests: 47200, tokens: "19.6M" },
  { name: "Resonance Eduventures", tests: 31800, tokens: "13.2M" },
  { name: "Vibrant Academy", tests: 18200, tokens: "7.5M" },
  { name: "FIITJEE Delhi", tests: 11400, tokens: "4.7M" },
];

const aiBreakdown = [
  { label: "Student AI Analysis", value: 85.2, total: 142.8, color: "from-[#2A85FF] to-[#60A5FA]", shadow: "shadow-[0px_2px_12px_rgba(42,133,255,0.4)]" },
  { label: "Booster Test Generation", value: 42.6, total: 142.8, color: "from-[#FFD60A] to-[#FF9F0A]", shadow: "shadow-[0px_2px_12px_rgba(255,214,10,0.4)]" },
  { label: "System Optimization", value: 15.0, total: 142.8, color: "from-[#FF6A55] to-[#FF453A]", shadow: "shadow-[0px_2px_12px_rgba(255,106,85,0.4)]" },
];

export default function GlobalAnalyticsPage() {
  return (
    <>
      <Navbar title="Global Analytics & AI Usage" subtitle="Platform-wide engagement and AI consumption metrics." />
      <main className="mx-auto w-full max-w-[1560px] flex flex-col items-center pb-12 pt-6 gap-6 px-6 bg-transparent">

        {/* ── KPI Cards (Full Width) ── */}
        <div className="group relative card flex flex-col overflow-hidden p-6 md:p-8 rounded-lg bg-[#FDFDFD] dark:bg-b-surface2 shadow-[0px_5px_1.5px_-4px_rgba(8,8,8,0.09),0px_6px_4px_-4px_rgba(8,8,8,0.05)] border border-s-stroke2/40 w-full select-none">
          <div className="box-hover" />
          
          <div className="relative z-10 flex flex-row justify-between items-center w-full mb-6">
            <h3 className="font-sans text-[20px] font-semibold tracking-[0.0015em] leading-[145%] text-[#101010] dark:text-t-primary m-0">
              Platform Metrics
            </h3>
          </div>

          <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 p-2 gap-4 w-full bg-[#F9F9F9] dark:bg-b-surface1/60 border border-[rgba(123,123,123,0.1)] dark:border-s-stroke2/40 rounded-lg">
            
            {[
              { label: "Total Tests Conducted", value: "845,210", sub: "+45K", subLabel: "this week", icon: <RiGlobalLine size={20} /> },
              { label: "Avg Completion Rate", value: "92.4%", sub: "+1.2%", subLabel: "this month", icon: <RiBookOpenLine size={20} /> },
              { label: "AI Tokens (Monthly)", value: "142.8M", sub: "84%", subLabel: "of limit", icon: <RiBrainLine size={20} /> },
              { label: "Booster Tests Generated", value: "12,450", sub: "+12%", subLabel: "growth", icon: <RiRobot2Line size={20} /> },
            ].map((kpi, i) => (
              <div key={i} className="flex flex-col items-start p-6 gap-2 bg-[#FDFDFD] dark:bg-b-surface2 border border-[#FDFDFD] dark:border-s-stroke2/30 rounded-lg shadow-[0px_0px_36px_-8px_rgba(0,0,0,0.05),0px_6px_4px_-4px_rgba(8,8,8,0.05),0px_5px_1.5px_-4px_rgba(8,8,8,0.09)]">
                <div className="flex flex-row items-center gap-3 w-full mb-1">
                  <span className="text-[#101010] dark:text-t-primary">{kpi.icon}</span>
                  <span className="font-sans font-semibold text-[16px] leading-[150%] tracking-[0.0015em] text-[#101010] dark:text-t-primary">
                    {kpi.label}
                  </span>
                </div>
                <div className="flex flex-row items-center gap-4 w-full mt-1">
                  <div className="font-sans text-[42px] lg:text-[48px] font-medium tracking-[-0.005em] text-[#101010] dark:text-t-primary leading-none">
                    {kpi.value}
                  </div>
                  <div className="flex flex-col items-start gap-0.5">
                    <div className="flex flex-row justify-center items-center px-1.5 py-0.5 gap-1 border border-[rgba(0,166,86,0.15)] bg-[rgba(0,166,86,0.05)] rounded-lg">
                      <span className="text-[#00A656] text-[12px] font-semibold leading-none">{kpi.sub}</span>
                    </div>
                    <span className="text-[12px] font-sans text-[#7B7B7B]">
                      {kpi.subLabel}
                    </span>
                  </div>
                </div>
              </div>
            ))}

          </div>
        </div>

        {/* ── Middle Row: Exam Breakdown + Top Institutes ── */}
        <div className="flex flex-col xl:flex-row items-start gap-6 w-full">
          
          {/* Tests by Exam Type */}
          <div className="group relative card flex flex-col overflow-hidden p-6 md:p-8 rounded-lg bg-[#FDFDFD] dark:bg-b-surface2 shadow-[0px_5px_1.5px_-4px_rgba(8,8,8,0.09),0px_6px_4px_-4px_rgba(8,8,8,0.05)] border border-s-stroke2/40 flex-1 min-w-0 h-full">
            <div className="box-hover" />
            <div className="relative z-10 flex flex-col items-start gap-6 w-full h-full">
              
              <div className="flex flex-col items-start gap-1 w-full">
                <h3 className="font-sans text-[20px] font-semibold tracking-[0.0015em] leading-[145%] text-[#101010] dark:text-t-primary m-0">
                  Tests by Exam Type
                </h3>
                <span className="font-sans text-[14px] text-[#7B7B7B]">Distribution across all 845K tests conducted</span>
              </div>

              <div className="flex flex-col items-start w-full gap-5 pt-2">
                {examBreakdown.map((exam, i) => (
                  <div key={i} className="flex flex-col w-full gap-2">
                    <div className="flex flex-row justify-between items-center w-full">
                      <span className="font-sans text-[16px] font-semibold text-[#101010] dark:text-t-primary">{exam.exam}</span>
                      <span className="font-sans text-[15px] font-medium text-[#7B7B7B]">
                        {exam.tests.toLocaleString()} <span className="font-semibold text-[#101010] dark:text-t-primary ml-1">({exam.pct}%)</span>
                      </span>
                    </div>
                    
                    <div className="w-full h-2.5 bg-[#F9F9F9] dark:bg-b-surface1 border border-[rgba(123,123,123,0.1)] dark:border-s-stroke2/40 rounded-full relative overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-1000 ease-out bg-gradient-to-r ${exam.color} ${exam.shadow}`}
                        style={{ width: `${exam.pct}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

            </div>
          </div>

          {/* Top Institutes by Activity */}
          <div className="group relative card flex flex-col overflow-hidden p-6 md:p-8 rounded-lg bg-[#FDFDFD] dark:bg-b-surface2 shadow-[0px_5px_1.5px_-4px_rgba(8,8,8,0.09),0px_6px_4px_-4px_rgba(8,8,8,0.05)] border border-s-stroke2/40 w-full xl:w-[600px] shrink-0 h-full min-h-[354px]">
            <div className="box-hover" />
            
            <div className="relative z-10 flex flex-col items-start gap-6 w-full">
              <div className="flex flex-col items-start gap-1 w-full">
                <h3 className="font-sans text-[20px] font-semibold tracking-[0.0015em] leading-[145%] text-[#101010] dark:text-t-primary m-0">
                  Top Institutes
                </h3>
                <span className="font-sans text-[14px] text-[#7B7B7B]">Ranked by tests conducted this month</span>
              </div>

              <div className="flex flex-col items-start gap-2 w-full">
                {/* Table Header */}
                <div className="flex flex-row items-center w-full px-4 py-2 bg-[#F9F9F9] dark:bg-b-surface1/60 rounded-lg border border-s-stroke2/20">
                  <span className="flex-1 font-sans text-[13px] font-semibold text-[#7B7B7B] uppercase tracking-[0.02em]">Institute</span>
                  <span className="w-24 font-sans text-[13px] font-semibold text-[#7B7B7B] uppercase tracking-[0.02em] text-right">Tests</span>
                  <span className="w-24 font-sans text-[13px] font-semibold text-[#7B7B7B] uppercase tracking-[0.02em] text-right">AI Tokens</span>
                </div>

                {topInstitutes.map((inst, i) => (
                  <div key={i} className="flex flex-row items-center w-full px-4 py-3 rounded-lg hover:bg-[#F9F9F9] dark:hover:bg-b-surface1/40 transition-colors cursor-pointer">
                    <div className="flex-1 flex flex-row items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[#F9F9F9] dark:bg-b-surface1 border border-s-stroke2/40 flex items-center justify-center font-sans font-bold text-[13px] text-[#101010] dark:text-t-primary shrink-0">
                        {i + 1}
                      </div>
                      <span className="font-sans font-semibold text-[15px] text-[#101010] dark:text-t-primary truncate">{inst.name}</span>
                    </div>
                    <span className="w-24 font-sans font-medium text-[15px] text-[#7B7B7B] text-right">{inst.tests.toLocaleString()}</span>
                    <span className="w-24 font-sans font-semibold text-[15px] text-[#101010] dark:text-t-primary text-right">{inst.tokens}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>

        {/* ── Bottom Row: AI Token Consumption ── */}
        <div className="group relative card flex flex-col overflow-hidden p-6 md:p-8 rounded-lg bg-[#FDFDFD] dark:bg-b-surface2 shadow-[0px_5px_1.5px_-4px_rgba(8,8,8,0.09),0px_6px_4px_-4px_rgba(8,8,8,0.05)] border border-s-stroke2/40 w-full select-none">
          <div className="box-hover" />
          <div className="relative z-10 flex flex-col items-start gap-6 w-full">
            
            <div className="flex flex-row justify-between items-center w-full mb-2">
              <div className="flex flex-col items-start gap-1">
                <h3 className="font-sans text-[20px] font-semibold tracking-[0.0015em] leading-[145%] text-[#101010] dark:text-t-primary m-0">
                  AI Token Consumption
                </h3>
                <span className="font-sans text-[14px] text-[#7B7B7B]">142.8M tokens used this month across all generative workflows</span>
              </div>
              <div className="flex flex-row justify-center items-center px-4 py-2 gap-2 border border-[rgba(255,106,85,0.15)] bg-[rgba(255,106,85,0.05)] rounded-lg">
                <span className="text-[#FF6A55] text-[14px] font-semibold leading-none">84% of monthly budget</span>
              </div>
            </div>

            <div className="flex flex-col items-start w-full gap-6">
              {aiBreakdown.map((item, i) => {
                const pct = Math.round((item.value / item.total) * 100);
                return (
                  <div key={i} className="flex flex-col w-full gap-3">
                    <div className="flex flex-row justify-between items-center w-full">
                      <span className="font-sans text-[16px] font-semibold text-[#101010] dark:text-t-primary">{item.label}</span>
                      <div className="flex flex-row items-center gap-4">
                        <span className="font-sans text-[16px] font-semibold text-[#101010] dark:text-t-primary">{item.value}M tokens</span>
                        <span className="font-sans text-[15px] font-bold text-[#7B7B7B] w-12 text-right">{pct}%</span>
                      </div>
                    </div>
                    
                    <div className="w-full h-3 bg-[#F9F9F9] dark:bg-b-surface1 border border-[rgba(123,123,123,0.1)] dark:border-s-stroke2/40 rounded-full relative overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-1000 ease-out bg-gradient-to-r ${item.color} ${item.shadow}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

          </div>
        </div>

      </main>
    </>
  );
}

