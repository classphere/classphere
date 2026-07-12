"use client";

import Navbar from "@/components/layout/Navbar";
import { PremiumMetricCard as MetricCard, PremiumMetricGrid as MetricGrid, PremiumSectionCard as SectionCard } from "@/components/premium-ui";
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
        <div className="flex flex-col gap-4 w-full">
          <div className="flex justify-between items-end w-full px-2">
            <h3 className="font-sans text-[20px] font-semibold tracking-[-0.02em] text-t-primary leading-snug">
              Platform Metrics
            </h3>
          </div>
          
          <MetricGrid cols={4} className="mt-2">
            {[
              { label: "Total Tests Conducted", value: "845,210", sub: "+45K", subLabel: "this week", icon: <RiGlobalLine size={20} /> },
              { label: "Avg Completion Rate", value: "92.4%", sub: "+1.2%", subLabel: "this month", icon: <RiBookOpenLine size={20} /> },
              { label: "AI Tokens (Monthly)", value: "142.8M", sub: "84%", subLabel: "of limit", icon: <RiBrainLine size={20} /> },
              { label: "Booster Tests Generated", value: "12,450", sub: "+12%", subLabel: "growth", icon: <RiRobot2Line size={20} /> },
            ].map((kpi, i) => (
              <MetricCard
                key={i}
                icon={kpi.icon}
                label={kpi.label}
                value={kpi.value}
                badge={kpi.sub}
                badgeLabel={kpi.subLabel}
              />
            ))}
          </MetricGrid>
        
        </div>

        {/* ── Middle Row: Exam Breakdown + Top Institutes ── */}
        <div className="flex flex-col xl:flex-row items-start gap-6 w-full">
          
          {/* Tests by Exam Type */}
          <SectionCard title="Tests by Exam Type" className="flex-1 min-w-0 h-full">
            <div className="flex flex-col items-start w-full gap-5 mt-4">
              <span className="font-sans text-sm text-t-secondary mb-2 -mt-6">Distribution across all 845K tests conducted</span>
              {examBreakdown.map((exam, i) => (
                <div key={i} className="group/item relative flex flex-col w-full p-4 md:px-6 gap-3 bg-white dark:bg-white/[0.02] border border-s-stroke2/40 rounded-[24px] shadow-[0px_0px_36px_-8px_rgba(0,0,0,0.05),0px_6px_4px_-4px_rgba(8,8,8,0.05)] hover:scale-[1.005] transition-all cursor-pointer">
                  <div className="flex flex-row justify-between items-center w-full">
                    <span className="font-sans text-base font-semibold text-t-primary">{exam.exam}</span>
                    <span className="font-sans text-sm font-medium text-t-secondary">
                      {exam.tests.toLocaleString()} <span className="font-semibold text-t-primary ml-1">({exam.pct}%)</span>
                    </span>
                  </div>
                  
                  <div className="w-full h-2.5 bg-b-surface1 dark:bg-b-surface1 border border-s-stroke2/40 rounded-full relative overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-1000 ease-out bg-gradient-to-r ${exam.color} ${exam.shadow}`}
                      style={{ width: `${exam.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>

          {/* Top Institutes by Activity */}
          <SectionCard title="Top Institutes" className="w-full xl:w-[600px] shrink-0 h-full min-h-[354px]">
            <div className="flex flex-col items-start gap-3 w-full mt-4">
              <span className="font-sans text-sm text-t-secondary mb-2 -mt-6">Ranked by tests conducted this month</span>

              {/* Table Header */}
              <div className="hidden md:flex flex-row items-center w-full px-6 py-2 text-xs font-semibold uppercase tracking-wider text-t-secondary">
                <span className="flex-1">Institute</span>
                <span className="w-24 text-right">Tests</span>
                <span className="w-24 text-right">AI Tokens</span>
              </div>

              {topInstitutes.map((inst, i) => (
                <div key={i} className="group/item relative flex flex-row items-center w-full p-4 md:px-6 gap-4 bg-white dark:bg-white/[0.02] border border-s-stroke2/40 rounded-[24px] shadow-[0px_0px_36px_-8px_rgba(0,0,0,0.05),0px_6px_4px_-4px_rgba(8,8,8,0.05)] hover:scale-[1.005] transition-all cursor-pointer">
                  <div className="flex-1 flex flex-row items-center gap-4">
                    <div className="w-10 h-10 rounded-[10px] bg-b-surface1 border border-s-stroke2/40 flex items-center justify-center font-sans font-bold text-sm text-t-primary shrink-0 shadow-sm">
                      {i + 1}
                    </div>
                    <span className="font-sans font-semibold text-[15px] text-t-primary truncate">{inst.name}</span>
                  </div>
                  <span className="w-24 font-sans font-medium text-[15px] text-t-secondary text-right">{inst.tests.toLocaleString()}</span>
                  <span className="w-24 font-sans font-semibold text-[15px] text-t-primary text-right">{inst.tokens}</span>
                </div>
              ))}
            </div>
          </SectionCard>

        </div>

        {/* ── Bottom Row: AI Token Consumption ── */}
        <SectionCard title="AI Token Consumption" className="w-full">
          <div className="flex flex-col items-start gap-4 w-full mt-4">
            
            <div className="flex flex-row justify-between items-center w-full mb-2 -mt-6">
              <span className="font-sans text-sm text-t-secondary">142.8M tokens used this month across all generative workflows</span>
              <div className="flex flex-row justify-center items-center px-4 py-2 gap-2 border border-s-stroke2/40 bg-[rgba(255,106,85,0.05)] rounded-[10px]">
                <span className="text-sm font-semibold text-primary-03 leading-none">84% of monthly budget</span>
              </div>
            </div>

            <div className="flex flex-col items-start w-full gap-4 mt-2">
              {aiBreakdown.map((item, i) => {
                const pct = Math.round((item.value / item.total) * 100);
                return (
                  <div key={i} className="group/item relative flex flex-col w-full p-5 gap-3 bg-white dark:bg-white/[0.02] border border-s-stroke2/40 rounded-[24px] shadow-[0px_0px_36px_-8px_rgba(0,0,0,0.05),0px_6px_4px_-4px_rgba(8,8,8,0.05)] hover:scale-[1.005] transition-all cursor-pointer">
                    <div className="flex flex-row justify-between items-center w-full">
                      <span className="font-sans text-base font-semibold text-t-primary">{item.label}</span>
                      <div className="flex flex-row items-center gap-4">
                        <span className="font-sans text-base font-semibold text-t-primary">{item.value}M tokens</span>
                        <span className="font-sans text-sm font-bold text-t-secondary w-12 text-right">{pct}%</span>
                      </div>
                    </div>
                    
                    <div className="w-full h-3 bg-b-surface1 dark:bg-b-surface1 border border-s-stroke2/40 rounded-full relative overflow-hidden">
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
        </SectionCard>

      </main>
    </>
  );
}
