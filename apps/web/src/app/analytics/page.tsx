"use client";

import Navbar from "@/components/layout/Navbar";
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
      
      <main className="mx-auto w-full max-w-screen-2xl px-4 pb-10 pt-6 md:px-6 overflow-x-hidden">
        
        {/* KPI Cards Row */}
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 p-2 gap-4 w-full bg-[#F9F9F9] dark:bg-b-surface1/60 border border-[rgba(123,123,123,0.1)] dark:border-s-stroke2/40 rounded-lg mb-8 select-none">
          
          {/* Card 1: Overall Accuracy */}
          <div className="flex flex-col items-start p-6 gap-2 bg-[#FDFDFD] dark:bg-b-surface2 border border-[#FDFDFD] dark:border-s-stroke2/30 rounded-lg shadow-[0px_0px_36px_-8px_rgba(0,0,0,0.05),0px_6px_4px_-4px_rgba(8,8,8,0.05),0px_5px_1.5px_-4px_rgba(8,8,8,0.09)]">
            <div className="flex flex-row items-center gap-3 w-full mb-1">
              <span className="text-[#101010] dark:text-t-primary"><RiCrosshair2Line size={20} /></span>
              <span className="font-sans font-semibold text-[16px] leading-[150%] tracking-[0.0015em] text-[#101010] dark:text-t-primary">
                Overall Accuracy
              </span>
            </div>
            <div className="flex flex-row items-center gap-4 w-full mt-1">
              <div className="font-sans text-[54px] font-medium tracking-[-0.005em] text-[#101010] dark:text-t-primary leading-none">
                76.4%
              </div>
              <div className="flex flex-col items-start gap-0.5">
                <div className="flex flex-row justify-center items-center px-1.5 py-0.5 gap-1 border border-s-stroke2/20 bg-transparent rounded-lg">
                  <span className="text-[#7B7B7B] text-[12px] font-semibold leading-none">+4.2%</span>
                </div>
                <span className="text-[12px] font-sans text-[#7B7B7B]">
                  from last month
                </span>
              </div>
            </div>
          </div>

          {/* Card 2: Avg Time */}
          <div className="flex flex-col items-start p-6 gap-2 bg-[#FDFDFD] dark:bg-b-surface2 border border-[#FDFDFD] dark:border-s-stroke2/30 rounded-lg shadow-[0px_0px_36px_-8px_rgba(0,0,0,0.05),0px_6px_4px_-4px_rgba(8,8,8,0.05),0px_5px_1.5px_-4px_rgba(8,8,8,0.09)]">
            <div className="flex flex-row items-center gap-3 w-full mb-1">
              <span className="text-[#101010] dark:text-t-primary"><RiTimeLine size={20} /></span>
              <span className="font-sans font-semibold text-[16px] leading-[150%] tracking-[0.0015em] text-[#101010] dark:text-t-primary">
                Avg Time / Q
              </span>
            </div>
            <div className="flex flex-row items-center gap-4 w-full mt-1">
              <div className="font-sans text-[54px] font-medium tracking-[-0.005em] text-[#101010] dark:text-t-primary leading-none">
                1m 45s
              </div>
              <div className="flex flex-col items-start gap-0.5">
                <div className="flex flex-row justify-center items-center px-1.5 py-0.5 gap-1 border border-s-stroke2/20 bg-transparent rounded-lg">
                  <span className="text-[#7B7B7B] text-[12px] font-semibold leading-none">+15s</span>
                </div>
                <span className="text-[12px] font-sans text-[#7B7B7B]">
                  slower than target
                </span>
              </div>
            </div>
          </div>

          {/* Card 3: Batch Percentile */}
          <div className="flex flex-col items-start p-6 gap-2 bg-[#FDFDFD] dark:bg-b-surface2 border border-[#FDFDFD] dark:border-s-stroke2/30 rounded-lg shadow-[0px_0px_36px_-8px_rgba(0,0,0,0.05),0px_6px_4px_-4px_rgba(8,8,8,0.05),0px_5px_1.5px_-4px_rgba(8,8,8,0.09)]">
            <div className="flex flex-row items-center gap-3 w-full mb-1">
              <span className="text-[#101010] dark:text-t-primary"><RiTrophyLine size={20} /></span>
              <span className="font-sans font-semibold text-[16px] leading-[150%] tracking-[0.0015em] text-[#101010] dark:text-t-primary">
                Batch Percentile
              </span>
            </div>
            <div className="flex flex-row items-center gap-4 w-full mt-1">
              <div className="font-sans text-[54px] font-medium tracking-[-0.005em] text-[#101010] dark:text-t-primary leading-none">
                88th
              </div>
              <div className="flex flex-col items-start gap-0.5">
                <div className="flex flex-row justify-center items-center px-1.5 py-0.5 gap-1 border border-s-stroke2/20 bg-transparent rounded-lg">
                  <span className="text-[#7B7B7B] text-[12px] font-semibold leading-none">Top 12%</span>
                </div>
                <span className="text-[12px] font-sans text-[#7B7B7B]">
                  of Aakash Target Batch
                </span>
              </div>
            </div>
          </div>

          {/* Card 4: Tests Attempted */}
          <div className="flex flex-col items-start p-6 gap-2 bg-[#FDFDFD] dark:bg-b-surface2 border border-[#FDFDFD] dark:border-s-stroke2/30 rounded-lg shadow-[0px_0px_36px_-8px_rgba(0,0,0,0.05),0px_6px_4px_-4px_rgba(8,8,8,0.05),0px_5px_1.5px_-4px_rgba(8,8,8,0.09)]">
            <div className="flex flex-row items-center gap-3 w-full mb-1">
              <span className="text-[#101010] dark:text-t-primary"><RiLineChartLine size={20} /></span>
              <span className="font-sans font-semibold text-[16px] leading-[150%] tracking-[0.0015em] text-[#101010] dark:text-t-primary">
                Tests Attempted
              </span>
            </div>
            <div className="flex flex-row items-center gap-4 w-full mt-1">
              <div className="font-sans text-[54px] font-medium tracking-[-0.005em] text-[#101010] dark:text-t-primary leading-none">
                42
              </div>
              <div className="flex flex-col items-start gap-0.5">
                <div className="flex flex-row justify-center items-center px-1.5 py-0.5 gap-1 border border-s-stroke2/20 bg-transparent rounded-lg">
                  <span className="text-[#7B7B7B] text-[12px] font-semibold leading-none">Active</span>
                </div>
                <span className="text-[12px] font-sans text-[#7B7B7B]">
                  this academic year
                </span>
              </div>
            </div>
          </div>

        </div>

        {/* Details Grid Section */}
        <div className="mb-8 grid gap-6 xl:grid-cols-2">
          
          {/* Topic Wise Analysis */}
          <div className="group relative flex flex-col p-6 md:p-8 rounded-lg bg-[#FDFDFD] dark:bg-b-surface2 shadow-[0px_5px_1.5px_-4px_rgba(8,8,8,0.09),0px_6px_4px_-4px_rgba(8,8,8,0.05)] border border-s-stroke2/40 select-none">
            <div className="box-hover" />
            <h2 className="relative z-10 text-[20px] font-semibold tracking-[0.0015em] leading-[145%] text-[#101010] dark:text-t-primary mb-6">Topic-wise Strengths & Weaknesses</h2>
            
            {/* Nested container card wrapper */}
            <div className="relative z-10 flex flex-col gap-4 p-2.5 bg-[#F9F9F9] dark:bg-b-surface1/60 border border-[rgba(123,123,123,0.1)] dark:border-s-stroke2/40 rounded-lg">
              {topicPerformance.map((item, idx) => {
                const isStrong = item.accuracy > 80;
                const isGood = item.accuracy > 50;
                const progressColor = isStrong ? "bg-[#00A656]" : isGood ? "bg-[#EF9D0E]" : "bg-[#FF6A55]";
                const badgeBorder = isStrong ? "border-[rgba(0,166,86,0.15)] bg-[rgba(0,166,86,0.05)] text-[#00A656]" : isGood ? "border-[rgba(239,157,14,0.15)] bg-[rgba(239,157,14,0.05)] text-[#EF9D0E]" : "border-[rgba(255,106,85,0.15)] bg-[rgba(255,106,85,0.05)] text-[#FF6A55]";
                
                return (
                  <div key={idx} className="flex flex-col p-4 bg-[#FDFDFD] dark:bg-b-surface2 border border-[#FDFDFD] dark:border-s-stroke2/30 rounded-lg shadow-[0px_2px_8px_-4px_rgba(0,0,0,0.05),0px_3px_2px_-3px_rgba(8,8,8,0.03)]">
                    <div className="mb-2.5 flex items-center justify-between gap-3">
                      <span className="font-sans font-semibold text-[14px] leading-[150%] tracking-[0.0015em] text-[#101010] dark:text-t-primary">{item.topic}</span>
                      <span className="text-[12px] font-sans text-[#7B7B7B] font-semibold">{item.accuracy}% Accuracy</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-[#EBEBEB] dark:bg-b-surface1/60 border border-s-stroke2/20">
                        <div 
                          style={{ width: `${item.accuracy}%` }} 
                          className={`h-full rounded-full ${progressColor}`}
                        />
                      </div>
                      <span className={`px-2 py-0.5 rounded-lg border text-[10px] font-bold uppercase tracking-wider ${badgeBorder}`}>
                        {item.status}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Time Management Analysis */}
          <div className="group relative flex flex-col p-6 md:p-8 rounded-lg bg-[#FDFDFD] dark:bg-b-surface2 shadow-[0px_5px_1.5px_-4px_rgba(8,8,8,0.09),0px_6px_4px_-4px_rgba(8,8,8,0.05)] border border-s-stroke2/40 select-none">
            <div className="box-hover" />
            <h2 className="relative z-10 text-[20px] font-semibold tracking-[0.0015em] leading-[145%] text-[#101010] dark:text-t-primary mb-2">Time Management (Physics)</h2>
            <p className="relative z-10 text-[13px] font-sans text-[#7B7B7B] mb-6 leading-relaxed">
              You are spending too much time on mechanics questions. Try to use our time-bound booster tests to improve speed.
            </p>
            
            {/* Nested container card wrapper */}
            <div className="relative z-10 flex flex-col gap-4 p-2.5 bg-[#F9F9F9] dark:bg-b-surface1/60 border border-[rgba(123,123,123,0.1)] dark:border-s-stroke2/40 rounded-lg">
              
              <div className="flex flex-col p-4 bg-[#FDFDFD] dark:bg-b-surface2 border border-[#FDFDFD] dark:border-s-stroke2/30 rounded-lg shadow-[0px_2px_8px_-4px_rgba(0,0,0,0.05),0px_3px_2px_-3px_rgba(8,8,8,0.03)]">
                <div className="mb-2.5 flex items-center justify-between gap-3">
                  <span className="font-sans font-semibold text-[14px] leading-[150%] tracking-[0.0015em] text-[#101010] dark:text-t-primary">Mechanics (Avg: 3m 12s)</span>
                  <span className="text-[12px] font-sans font-bold text-[#FF6A55]">Target: 2m 00s</span>
                </div>
                <div className="relative h-2.5 rounded-full bg-[#EBEBEB] dark:bg-b-surface1/60 border border-s-stroke2/20 overflow-hidden">
                  <div className="h-full w-[80%] bg-[#FF6A55] rounded-full" />
                  {/* Taller Target Marker Line */}
                  <div className="absolute left-1/2 top-0 bottom-0 z-10 w-0.5 bg-[#101010] dark:bg-t-primary" />
                </div>
              </div>
              
              <div className="flex flex-col p-4 bg-[#FDFDFD] dark:bg-b-surface2 border border-[#FDFDFD] dark:border-s-stroke2/30 rounded-lg shadow-[0px_2px_8px_-4px_rgba(0,0,0,0.05),0px_3px_2px_-3px_rgba(8,8,8,0.03)]">
                <div className="mb-2.5 flex items-center justify-between gap-3">
                  <span className="font-sans font-semibold text-[14px] leading-[150%] tracking-[0.0015em] text-[#101010] dark:text-t-primary">Electrodynamics (Avg: 1m 45s)</span>
                  <span className="text-[12px] font-sans font-bold text-[#00A656]">Target: 2m 00s</span>
                </div>
                <div className="relative h-2.5 rounded-full bg-[#EBEBEB] dark:bg-b-surface1/60 border border-s-stroke2/20 overflow-hidden">
                  <div className="h-full w-[40%] bg-[#00A656] rounded-full" />
                  <div className="absolute left-1/2 top-0 bottom-0 z-10 w-0.5 bg-[#101010] dark:bg-t-primary" />
                </div>
              </div>

              <div className="flex flex-col p-4 bg-[#FDFDFD] dark:bg-b-surface2 border border-[#FDFDFD] dark:border-s-stroke2/30 rounded-lg shadow-[0px_2px_8px_-4px_rgba(0,0,0,0.05),0px_3px_2px_-3px_rgba(8,8,8,0.03)]">
                <div className="mb-2.5 flex items-center justify-between gap-3">
                  <span className="font-sans font-semibold text-[14px] leading-[150%] tracking-[0.0015em] text-[#101010] dark:text-t-primary">Modern Physics (Avg: 2m 10s)</span>
                  <span className="text-[12px] font-sans font-bold text-[#EF9D0E]">Target: 2m 00s</span>
                </div>
                <div className="relative h-2.5 rounded-full bg-[#EBEBEB] dark:bg-b-surface1/60 border border-s-stroke2/20 overflow-hidden">
                  <div className="h-full w-[55%] bg-[#EF9D0E] rounded-full" />
                  <div className="absolute left-1/2 top-0 bottom-0 z-10 w-0.5 bg-[#101010] dark:bg-t-primary" />
                </div>
              </div>

            </div>
            
            {/* Enhanced Speed Booster Test Button */}
            <div className="relative z-10 mt-6 w-full">
              <button className="flex flex-row justify-center items-center h-12 w-full bg-[#101010] hover:bg-[#202020] text-[#FDFDFD] dark:bg-t-primary dark:text-b-surface1 dark:hover:bg-t-primary/90 text-[14px] font-sans font-semibold rounded-lg transition-all active:scale-98 shadow-widget cursor-pointer gap-2">
                <RiTimeLine size={18} />
                <span>Generate Speed Booster Test</span>
              </button>
            </div>

          </div>

        </div>

      </main>
    </>
  );
}
