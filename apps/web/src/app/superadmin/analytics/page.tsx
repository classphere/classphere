"use client";

import Navbar from "@/components/layout/Navbar";
import { PremiumMetricCard as MetricCard, PremiumMetricGrid as MetricGrid, PremiumSectionCard as SectionCard } from "@/components/premium-ui";
import { RiBrainLine, RiGlobalLine, RiBookOpenLine, RiRobot2Line, RiLoader4Line } from "@remixicon/react";
import { useApiQuery } from "@/lib/hooks/useApiQuery";

export default function GlobalAnalyticsPage() {
  const { data: analyticsData, isPending: loading } = useApiQuery<{
    totalAttempts: number;
    activePapers: number;
    examBreakdown: any[];
    topInstitutes: any[];
    aiUsageAvailable: boolean;
  }>("/api/v1/superadmin/analytics");


  if (loading || !analyticsData) {
    return (
      <>
        <Navbar title="Global Analytics & AI Usage" subtitle="Platform-wide engagement and AI consumption metrics." />
        <main className="mx-auto w-full max-w-[1560px] flex items-center justify-center py-10 text-t-secondary">
          <RiLoader4Line size={24} className="animate-spin text-primary-01" />
          <span className="font-sans font-semibold text-[15px] ml-2">Loading platform analytics...</span>
        </main>
      </>
    );
  }

  const { totalAttempts, activePapers, examBreakdown, topInstitutes } = analyticsData;

  return (
    <>
      <Navbar title="Global Analytics & AI Usage" subtitle="Platform-wide engagement and AI consumption metrics." />
      <main className="mx-auto w-full max-w-[1560px] flex flex-col items-center pb-12 pt-6 gap-3 px-6 bg-transparent">

        {/* ── KPI Cards (Full Width) ── */}
        <div className="flex flex-col gap-4 w-full">
          <div className="flex justify-between items-end w-full px-2">
            <h3 className="font-sans text-[20px] font-semibold tracking-[-0.02em] text-t-primary leading-snug">
              Platform Metrics
            </h3>
          </div>
          
          <MetricGrid cols={4} className="mt-2">
            {[
              { label: "Test Attempts", value: totalAttempts.toLocaleString(), sub: "Live", subLabel: "all time", icon: <RiGlobalLine size={20} /> },
              { label: "Active Question Papers", value: activePapers.toLocaleString(), sub: "Live", subLabel: "catalog", icon: <RiBookOpenLine size={20} /> },
              { label: "AI Usage", value: "Not enabled", sub: "-", subLabel: "metering required", icon: <RiBrainLine size={20} /> },
              { label: "Completion Rate", value: "Not measured", sub: "-", subLabel: "event data required", icon: <RiRobot2Line size={20} /> },
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
        <div className="flex flex-col xl:flex-row items-start gap-3 w-full">
          
          {/* Tests by Exam Type */}
          <SectionCard title="Tests by Exam Type" className="flex-1 min-w-0 h-full">
            <div className="flex flex-col items-start w-full gap-3 mt-4">
              <span className="font-sans text-sm text-t-secondary mb-2 -mt-3">Distribution across {activePapers >= 1000 ? `${(activePapers / 1000).toFixed(0)}K` : activePapers} active catalog papers</span>
              {examBreakdown.map((exam, i) => (
                <div key={i} className="group/item relative flex flex-col w-full p-3 sm:p-4 gap-2 sm:gap-3 bg-b-surface2 dark:bg-[#161616] border border-s-stroke2/40 rounded-[16px] hover:scale-[1.005] transition-all cursor-pointer overflow-hidden h-[72px] sm:h-[88px] justify-center">
                  <div className="flex flex-row justify-between items-center w-full">
                    <span className="font-sans text-[14px] sm:text-base font-semibold text-t-primary">{exam.exam}</span>
                    <span className="font-sans text-[12px] sm:text-sm font-medium text-t-secondary">
                      {exam.tests.toLocaleString()} <span className="font-semibold text-t-primary ml-1">({exam.pct}%)</span>
                    </span>
                  </div>
                  
                  <div className="w-full h-2 sm:h-2.5 bg-b-surface1 dark:bg-b-surface1 border border-s-stroke2/40 rounded-full relative overflow-hidden">
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
              <span className="font-sans text-sm text-t-secondary mb-2 -mt-3">Ranked by students enrolled in active batches</span>

              {/* Table Header */}
              <div className="hidden md:flex flex-row items-center w-full px-6 py-2 text-xs font-semibold uppercase tracking-wider text-t-secondary">
                <span className="flex-1">Institute</span>
                <span className="w-28 text-right">Students</span>
              </div>

              {topInstitutes.map((inst, i) => (
                <div key={i} className="group/item relative flex flex-row items-center w-full p-3 sm:p-4 gap-3 sm:gap-4 bg-b-surface2 dark:bg-[#161616] border border-s-stroke2/40 rounded-[16px] hover:scale-[1.005] transition-all cursor-pointer overflow-hidden h-[72px] sm:h-[80px]">
                  <div className="flex-1 flex flex-row items-center gap-3 sm:gap-4 min-w-0">
                    <div className="size-8 sm:w-10 sm:h-10 rounded-[10px] bg-b-surface1 border border-s-stroke2/40 flex items-center justify-center font-sans font-bold text-xs sm:text-sm text-t-primary shrink-0 shadow-widget">
                      {i + 1}
                    </div>
                    <span className="font-sans font-semibold text-[13px] sm:text-[15px] text-t-primary truncate">{inst.name}</span>
                  </div>
                  <div className="flex flex-col sm:flex-row items-end sm:items-center justify-center shrink-0">
                    <span className="sm:w-28 font-sans font-medium text-[11px] sm:text-[15px] text-t-secondary text-right">{inst.studentCount.toLocaleString()} students</span>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>

        </div>

        {/* ── Bottom Row: AI Token Consumption ── */}
        <SectionCard title="AI Usage" className="w-full">
          <div className="flex flex-row justify-between items-center w-full gap-4 mt-4">
            <span className="font-sans text-sm text-t-secondary">Usage metering is not enabled. No estimated token total is displayed.</span>
            <div className="flex flex-row justify-center items-center px-4 py-2 gap-2 border border-s-stroke2/40 bg-[rgba(255,106,85,0.05)] rounded-md shrink-0">
              <span className="text-sm font-semibold text-primary-03 leading-none">Awaiting metering</span>
            </div>
          </div>
        </SectionCard>

      </main>
    </>
  );
}
