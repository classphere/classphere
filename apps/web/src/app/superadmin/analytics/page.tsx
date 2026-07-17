"use client";

import Navbar from "@/components/layout/Navbar";
import { PremiumMetricCard as MetricCard, PremiumMetricGrid as MetricGrid, PremiumSectionCard as SectionCard } from "@/components/premium-ui";
import { RiBrainLine, RiGlobalLine, RiBookOpenLine, RiRobot2Line, RiLoader4Line } from "@remixicon/react";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { apiClient } from "@/lib/api.client";

export default function GlobalAnalyticsPage() {
  const { session } = useAuth();
  const token = session?.access_token;

  const [loading, setLoading] = useState(true);
  const [analyticsData, setAnalyticsData] = useState<{
    totalTests: number;
    examBreakdown: any[];
    topInstitutes: any[];
    aiBreakdown: any[];
  } | null>(null);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    apiClient.get<any>("/api/v1/superadmin/analytics", token)
      .then(res => {
        if (res.success && res.data) {
          setAnalyticsData(res.data);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [token]);

  if (loading || !analyticsData) {
    return (
      <>
        <Navbar title="Global Analytics & AI Usage" subtitle="Platform-wide engagement and AI consumption metrics." />
        <main className="mx-auto w-full max-w-[1560px] flex items-center justify-center py-32 text-t-secondary">
          <RiLoader4Line size={24} className="animate-spin text-primary-01" />
          <span className="font-sans font-semibold text-[15px] ml-2">Loading platform analytics...</span>
        </main>
      </>
    );
  }

  const { totalTests, examBreakdown, topInstitutes, aiBreakdown } = analyticsData;

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
              { label: "Total Tests Conducted", value: totalTests.toLocaleString(), sub: "+45K", subLabel: "this week", icon: <RiGlobalLine size={20} /> },
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
              <span className="font-sans text-sm text-t-secondary mb-2 -mt-6">Distribution across all {totalTests >= 1000 ? `${(totalTests / 1000).toFixed(0)}K` : totalTests} tests conducted</span>
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
              <span className="font-sans text-sm text-t-secondary mb-2 -mt-6">Ranked by active student scale and tokens consumed</span>

              {/* Table Header */}
              <div className="hidden md:flex flex-row items-center w-full px-6 py-2 text-xs font-semibold uppercase tracking-wider text-t-secondary">
                <span className="flex-1">Institute</span>
                <span className="w-24 text-right">Tests</span>
                <span className="w-24 text-right">AI Tokens</span>
              </div>

              {topInstitutes.map((inst, i) => (
                <div key={i} className="group/item relative flex flex-row items-center w-full p-3 sm:p-4 gap-3 sm:gap-4 bg-b-surface2 dark:bg-[#161616] border border-s-stroke2/40 rounded-[16px] hover:scale-[1.005] transition-all cursor-pointer overflow-hidden h-[72px] sm:h-[80px]">
                  <div className="flex-1 flex flex-row items-center gap-3 sm:gap-4 min-w-0">
                    <div className="size-8 sm:w-10 sm:h-10 rounded-[10px] bg-b-surface1 border border-s-stroke2/40 flex items-center justify-center font-sans font-bold text-xs sm:text-sm text-t-primary shrink-0 shadow-sm">
                      {i + 1}
                    </div>
                    <span className="font-sans font-semibold text-[13px] sm:text-[15px] text-t-primary truncate">{inst.name}</span>
                  </div>
                  <div className="flex flex-col sm:flex-row items-end sm:items-center justify-center shrink-0">
                    <span className="sm:w-24 font-sans font-medium text-[11px] sm:text-[15px] text-t-secondary text-right">{inst.tests.toLocaleString()} tests</span>
                    <span className="sm:w-24 font-sans font-semibold text-[13px] sm:text-[15px] text-t-primary text-right">{inst.tokens} tok</span>
                  </div>
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
                  <div key={i} className="group/item relative flex flex-col w-full p-4 sm:p-5 gap-2 sm:gap-3 bg-b-surface2 dark:bg-[#161616] border border-s-stroke2/40 rounded-[16px] hover:scale-[1.005] transition-all cursor-pointer overflow-hidden h-[76px] sm:h-[88px] justify-center">
                    <div className="flex flex-row justify-between items-center w-full min-w-0">
                      <span className="font-sans text-[13px] sm:text-base font-semibold text-t-primary truncate pr-2">{item.label}</span>
                      <div className="flex flex-row items-center gap-2 sm:gap-4 shrink-0">
                        <span className="font-sans text-[12px] sm:text-base font-semibold text-t-primary">{item.value}M <span className="hidden sm:inline">tokens</span></span>
                        <span className="font-sans text-[12px] sm:text-sm font-bold text-t-secondary w-8 sm:w-12 text-right">{pct}%</span>
                      </div>
                    </div>
                    
                    <div className="w-full h-2 sm:h-3 bg-b-surface1 dark:bg-b-surface1 border border-s-stroke2/40 rounded-full relative overflow-hidden">
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
