"use client";

import Navbar from "@/components/layout/Navbar";
import {
  PageWrapper,
  SectionCard,
  MetricGrid,
  MetricCard,
} from "@/components/ui";

import { 
  RiLineChartLine, 
  RiTimeLine, 
  RiCrosshair2Line, 
  RiTrophyLine 
} from "@remixicon/react";

const topicPerformance = [
  { topic: "Kinematics", accuracy: 92, status: "Strong" },
  { topic: "Thermodynamics", accuracy: 85, status: "Good" },
  { topic: "Electromagnetism", accuracy: 45, status: "Weak" },
  { topic: "Rotational Mechanics", accuracy: 30, status: "Critical" },
  { topic: "Optics", accuracy: 78, status: "Good" },
];

export default function StudentAnalyticsPage() {
  return (
    <>
      <Navbar title="My Performance Analytics" subtitle="Track your strengths, weaknesses, and key metrics over time." breadcrumbs="Dashboard > Analytics" />
      
      <PageWrapper>
        
        {/* KPI Cards Row */}
        <MetricGrid cols={4}>
          <MetricCard
            icon={<RiCrosshair2Line size={18} />}
            label="Overall Accuracy"
            value="76.4%"
            badge="+4.2%"
            badgeLabel="from last month"
          />
          <MetricCard
            icon={<RiTimeLine size={18} />}
            label="Avg Time / Q"
            value="1m 45s"
            badge="+15s"
            badgeLabel="slower than target"
          />
          <MetricCard
            icon={<RiTrophyLine size={18} />}
            label="Batch Percentile"
            value="88th"
            badge="Top 12%"
            badgeLabel="of Aakash Target Batch"
          />
          <MetricCard
            icon={<RiLineChartLine size={18} />}
            label="Tests Attempted"
            value="42"
            badge="Active"
            badgeLabel="this academic year"
          />
        </MetricGrid>

        {/* Details Grid Section */}
        <div className="grid gap-6 xl:grid-cols-2">
          
          {/* Topic Wise Analysis */}
          <SectionCard title="Topic-wise Strengths & Weaknesses">
            <div className="flex flex-col gap-4 p-2.5 bg-black/[0.02] dark:bg-white/[0.02] rounded-[16px]">
              {topicPerformance.map((item, idx) => {
                const isStrong = item.accuracy > 80;
                const isGood = item.accuracy > 50;
                const progressColor = isStrong ? "bg-primary-02" : isGood ? "bg-primary-05" : "bg-primary-03";
                const badgeBorder = isStrong 
                  ? "border-[#ebebeb] dark:border-[#282828] bg-primary-02/10 text-primary-02" 
                  : isGood 
                    ? "border-[#ebebeb] dark:border-[#282828] bg-primary-05/10 text-primary-05" 
                    : "border-[#ebebeb] dark:border-[#282828] bg-primary-03/10 text-primary-03";
                
                return (
                  <div key={idx} className="flex flex-col p-4 bg-b-surface2 dark:bg-[#161616] rounded-[12px] hover:-translate-y-0.5 transition-transform duration-200 cursor-default">
                    <div className="mb-2.5 flex items-center justify-between gap-3">
                      <span className="font-sans font-semibold text-[15px] leading-snug tracking-[-0.02em] text-t-primary">{item.topic}</span>
                      <span className="text-[12px] font-sans text-t-secondary font-bold uppercase tracking-widest">{item.accuracy}% Accuracy</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-black/5 dark:bg-white/5">
                        <div 
                          style={{ width: `${item.accuracy}%` }} 
                          className={`h-full rounded-full ${progressColor}`}
                        />
                      </div>
                      <span className={`px-2 py-0.5 rounded-[6px] border text-[10px] font-bold uppercase tracking-wider shrink-0 ${badgeBorder}`}>
                        {item.status}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </SectionCard>

          {/* Time Management Analysis */}
          <SectionCard 
            title="Time Management (Physics)" 
            subtitle="You are spending too much time on mechanics questions. Try to use our time-bound booster tests to improve speed."
          >
            <div className="flex flex-col gap-4 p-2.5 bg-black/[0.02] dark:bg-white/[0.02] rounded-[16px]">
              
              <div className="flex flex-col p-4 bg-b-surface2 dark:bg-[#161616] rounded-[12px] hover:-translate-y-0.5 transition-transform duration-200 cursor-default">
                <div className="mb-2.5 flex items-center justify-between gap-3">
                  <span className="font-sans font-semibold text-[15px] leading-snug tracking-[-0.02em] text-t-primary">Mechanics (Avg: 3m 12s)</span>
                  <span className="text-[11px] font-sans font-bold uppercase tracking-widest text-primary-03">Target: 2m 00s</span>
                </div>
                <div className="relative h-2.5 rounded-full bg-black/5 dark:bg-white/5 overflow-hidden">
                  <div className="h-full w-[80%] bg-primary-03 rounded-full" />
                  <div className="absolute left-1/2 top-0 bottom-0 z-10 w-0.5 bg-shade-02 dark:bg-t-primary" />
                </div>
              </div>
              
              <div className="flex flex-col p-4 bg-b-surface2 dark:bg-[#161616] rounded-[12px] hover:-translate-y-0.5 transition-transform duration-200 cursor-default">
                <div className="mb-2.5 flex items-center justify-between gap-3">
                  <span className="font-sans font-semibold text-[15px] leading-snug tracking-[-0.02em] text-t-primary">Electrodynamics (Avg: 1m 45s)</span>
                  <span className="text-[11px] font-sans font-bold uppercase tracking-widest text-primary-02">Target: 2m 00s</span>
                </div>
                <div className="relative h-2.5 rounded-full bg-black/5 dark:bg-white/5 overflow-hidden">
                  <div className="h-full w-[40%] bg-primary-02 rounded-full" />
                  <div className="absolute left-1/2 top-0 bottom-0 z-10 w-0.5 bg-shade-02 dark:bg-t-primary" />
                </div>
              </div>

              <div className="flex flex-col p-4 bg-b-surface2 dark:bg-[#161616] rounded-[12px] hover:-translate-y-0.5 transition-transform duration-200 cursor-default">
                <div className="mb-2.5 flex items-center justify-between gap-3">
                  <span className="font-sans font-semibold text-[15px] leading-snug tracking-[-0.02em] text-t-primary">Modern Physics (Avg: 2m 10s)</span>
                  <span className="text-[11px] font-sans font-bold uppercase tracking-widest text-primary-05">Target: 2m 00s</span>
                </div>
                <div className="relative h-2.5 rounded-full bg-black/5 dark:bg-white/5 overflow-hidden">
                  <div className="h-full w-[55%] bg-primary-05 rounded-full" />
                  <div className="absolute left-1/2 top-0 bottom-0 z-10 w-0.5 bg-shade-02 dark:bg-t-primary" />
                </div>
              </div>

            </div>
            
            {/* Enhanced Speed Booster Test Button */}
            <div className="relative z-10 mt-6 w-full">
              <button className="flex flex-row justify-center items-center h-[46px] w-full relative overflow-hidden rounded-[10px] bg-[#161616] font-medium text-[14px] text-white shadow-[0px_6.8656px_6.8656px_-2.33333px_rgba(0,0,0,0.16),inset_0px_1px_0px_rgba(255,255,255,0.16),inset_0px_-2px_0px_#191919] transition-transform hover:scale-[1.01] active:scale-[0.99] cursor-pointer gap-2">
                <i className="absolute -left-4 top-0 h-4 w-32 -rotate-[125deg] rounded-full bg-white/10 blur-[4px]" />
                <RiTimeLine size={18} />
                <span className="relative font-sans font-semibold">Generate Speed Booster Test</span>
              </button>
            </div>
          </SectionCard>

        </div>

      </PageWrapper>
    </>
  );
}
