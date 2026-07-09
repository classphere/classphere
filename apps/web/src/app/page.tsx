"use client";

import Link from "next/link";
import { useState } from "react";
import Navbar from "@/components/layout/Navbar";
import { useAuth } from "@/lib/auth-context";
import { StatCard, StatCardGrid } from "@/components/shared/StatCard";
import {
  RiBarChartBoxLine,
  RiArrowRightUpLine,
  RiRulerLine,
  RiTestTubeLine,
  RiMore2Fill,
  RiAlertFill,
  RiSparklingFill,
  RiShieldCrossFill,
  RiArrowRightLine,
  RiArrowDownSLine
} from "@remixicon/react";

interface BarData {
  label: string;
  score: number; // actual marks
  height: number; // visual height in pixels
}

const subjectPerformanceBars: Record<string, { bars: BarData[]; maxMarks: number }> = {
  Overall_JEE: {
    maxMarks: 300,
    bars: [
      { label: "Mock 1", score: 120, height: 122 },
      { label: "Mock 2", score: 150, height: 150 },
      { label: "Mock 3", score: 140, height: 140 },
      { label: "Mock 4", score: 211, height: 211 }, // Active Mock 4
      { label: "Mock 5", score: 175, height: 175 },
      { label: "Mock 6", score: 160, height: 160 },
      { label: "Mock 7", score: 200, height: 200 }
    ]
  },
  Physics_JEE: {
    maxMarks: 100,
    bars: [
      { label: "Mock 1", score: 45, height: 112 },
      { label: "Mock 2", score: 52, height: 130 },
      { label: "Mock 3", score: 48, height: 120 },
      { label: "Mock 4", score: 86, height: 211 }, // Active Mock 4
      { label: "Mock 5", score: 58, height: 145 },
      { label: "Mock 6", score: 72, height: 180 },
      { label: "Mock 7", score: 68, height: 170 }
    ]
  },
  Chemistry_JEE: {
    maxMarks: 100,
    bars: [
      { label: "Mock 1", score: 55, height: 137 },
      { label: "Mock 2", score: 75, height: 187 },
      { label: "Mock 3", score: 60, height: 150 },
      { label: "Mock 4", score: 76, height: 190 }, // Active Mock 4
      { label: "Mock 5", score: 70, height: 175 },
      { label: "Mock 6", score: 48, height: 120 },
      { label: "Mock 7", score: 83, height: 207 }
    ]
  },
  Maths_JEE: {
    maxMarks: 100,
    bars: [
      { label: "Mock 1", score: 65, height: 150 },
      { label: "Mock 2", score: 85, height: 195 },
      { label: "Mock 3", score: 55, height: 126 },
      { label: "Mock 4", score: 93, height: 214 }, // Active Mock 4
      { label: "Mock 5", score: 75, height: 172 },
      { label: "Mock 6", score: 60, height: 138 },
      { label: "Mock 7", score: 98, height: 225 }
    ]
  },
  Overall_NEET: {
    maxMarks: 720,
    bars: [
      { label: "Mock 1", score: 320, height: 106 },
      { label: "Mock 2", score: 410, height: 136 },
      { label: "Mock 3", score: 390, height: 130 },
      { label: "Mock 4", score: 520, height: 173 }, // Active Mock 4
      { label: "Mock 5", score: 490, height: 163 },
      { label: "Mock 6", score: 610, height: 203 },
      { label: "Mock 7", score: 630, height: 210 }
    ]
  },
  Physics_NEET: {
    maxMarks: 180,
    bars: [
      { label: "Mock 1", score: 70, height: 95 },
      { label: "Mock 2", score: 95, height: 128 },
      { label: "Mock 3", score: 85, height: 115 },
      { label: "Mock 4", score: 120, height: 162 }, // Active Mock 4
      { label: "Mock 5", score: 110, height: 148 },
      { label: "Mock 6", score: 145, height: 195 },
      { label: "Mock 7", score: 150, height: 202 }
    ]
  },
  Chemistry_NEET: {
    maxMarks: 180,
    bars: [
      { label: "Mock 1", score: 80, height: 108 },
      { label: "Mock 2", score: 105, height: 141 },
      { label: "Mock 3", score: 95, height: 128 },
      { label: "Mock 4", score: 130, height: 175 }, // Active Mock 4
      { label: "Mock 5", score: 120, height: 162 },
      { label: "Mock 6", score: 155, height: 209 },
      { label: "Mock 7", score: 160, height: 216 }
    ]
  },
  Biology_NEET: {
    maxMarks: 360,
    bars: [
      { label: "Mock 1", score: 170, height: 113 },
      { label: "Mock 2", score: 210, height: 140 },
      { label: "Mock 3", score: 210, height: 140 },
      { label: "Mock 4", score: 270, height: 180 }, // Active Mock 4
      { label: "Mock 5", score: 260, height: 173 },
      { label: "Mock 6", score: 310, height: 206 },
      { label: "Mock 7", score: 320, height: 213 }
    ]
  }
};

export default function Dashboard() {
  const { user } = useAuth();
  const isNEET = user?.batch?.includes("NEET") ?? false;
  const subjects = ["Overall", "Physics", "Chemistry", isNEET ? "Biology" : "Maths"];
  
  const [activeSubject, setActiveSubject] = useState("Overall");
  const [selectedBarIndex, setSelectedBarIndex] = useState(3); // Mock 4 is index 3
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isOverviewDropdownOpen, setIsOverviewDropdownOpen] = useState(false);

  // Retrieve current bars & max marks based on active target key
  const targetKey = `${activeSubject}_${isNEET ? "NEET" : "JEE"}`;
  const performanceData = subjectPerformanceBars[targetKey] || subjectPerformanceBars[isNEET ? "Overall_NEET" : "Overall_JEE"];
  
  const { bars, maxMarks } = performanceData;
  const activeBar = bars[selectedBarIndex];

  // Time-based greeting title
  const getGreeting = () => {
    const hours = new Date().getHours();
    const firstName = (user?.name ?? "there").split(" ")[0];
    if (hours < 12) {
      return `Good morning, ${firstName}`;
    } else if (hours < 17) {
      return `Good afternoon, ${firstName}`;
    } else {
      return `Good evening, ${firstName}`;
    }
  };

  const greetingTitle = getGreeting();

  // Dynamic performance subtitle based on selected bar score trend
  let performanceSubtitle = "";
  if (selectedBarIndex > 0) {
    const prevBar = bars[selectedBarIndex - 1];
    const diff = activeBar.score - prevBar.score;
    if (diff > 0) {
      performanceSubtitle = "Your scores are on the rise! You're doing great.";
    } else if (diff < 0) {
      performanceSubtitle = "Keep pushing! Let's focus on improvement.";
    } else {
      performanceSubtitle = "You're holding steady! Push harder to break your peak.";
    }
  } else {
    performanceSubtitle = "Welcome back! Ready to level up your score?";
  }

  return (
    <>
      <Navbar title={greetingTitle} subtitle={performanceSubtitle} />
      
      <main className="mx-auto w-full max-w-screen-2xl px-4 pb-10 pt-6 md:px-6 overflow-x-hidden">
        
        {/* Figma-Inspired Dashboard Overview Wrapper */}
        <div className="group relative card flex flex-col overflow-hidden p-6 md:p-8 rounded-lg bg-b-surface2 dark:bg-b-surface2 shadow-[0px_5px_1.5px_-4px_rgba(8,8,8,0.09),0px_6px_4px_-4px_rgba(8,8,8,0.05)] border border-s-stroke2/40 mb-6 select-none">
          <div className="box-hover" />
          
          {/* Header Row */}
          <div className="relative z-10 flex flex-row justify-between items-center w-full mb-6">
            <h3 className="font-sans text-[20px] font-semibold tracking-[0.0015em] leading-[145%] text-t-primary dark:text-t-primary">
              Overview
            </h3>
            
            {/* Custom Filter */}
            <div className="relative">
              <button 
                onClick={() => setIsOverviewDropdownOpen(!isOverviewDropdownOpen)}
                className="flex flex-row justify-between items-center px-5 py-3 gap-2 w-[160px] max-w-[180px] h-12 border border-s-stroke2 dark:border-s-stroke2 rounded-lg bg-transparent text-t-secondary dark:text-t-secondary text-sm font-sans transition-all hover:border-t-secondary active:scale-98"
              >
                <span>This Week</span>
                <RiArrowDownSLine size={20} className="text-t-secondary dark:text-t-secondary" />
              </button>
              
              {isOverviewDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsOverviewDropdownOpen(false)} />
                  <ul className="absolute right-0 top-13 z-50 w-full rounded-lg border border-s-stroke2 bg-b-surface2 p-1.5 shadow-dropdown animate-in fade-in slide-in-from-top-1 duration-150">
                    <li>
                      <button
                        onClick={() => setIsOverviewDropdownOpen(false)}
                        className="w-full rounded-lg px-3.5 py-2 text-left text-sm font-semibold bg-b-surface1 text-t-primary"
                      >
                        This Week
                      </button>
                    </li>
                    <li>
                      <button
                        onClick={() => setIsOverviewDropdownOpen(false)}
                        className="w-full rounded-lg px-3.5 py-2 text-left text-sm font-semibold bg-transparent text-t-secondary hover:bg-b-surface3 hover:text-t-primary"
                      >
                        Last Week
                      </button>
                    </li>
                  </ul>
                </>
              )}
            </div>
          </div>

          {/* Stats Section Wrapper (Row of 4 active highlighted boxes) */}
          <StatCardGrid cols={4} className="relative z-10">
            <StatCard
              icon={<RiBarChartBoxLine size={20} />}
              title="Tests Taken"
              value={8}
              badge="+2"
              subtext="this week"
            />
            <StatCard
              icon={<RiArrowRightUpLine size={20} />}
              title="Accuracy Rate"
              value="71.2%"
              badge="+5.2%"
              subtext="boost"
            />
            <StatCard
              icon={<RiRulerLine size={20} />}
              title="Average Score"
              value={86}
              badge="+15%"
              subtext="vs last week"
            />
            <StatCard
              icon={<RiAlertFill size={20} className="text-primary-05" />}
              title="Booster Queue"
              value={3}
              badge="High Risk"
              badgeVariant="red"
              subtext="pending"
            />
          </StatCardGrid>

        </div>

        {/* Main Grid Layout - Changed right column size from 320px to 420px to give Recent Tests widget ample room */}
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px] items-start overflow-x-hidden">
          
          {/* Left Column */}
          <div className="grid gap-6 min-w-0 overflow-x-hidden">
            
            {/* Figma-Inspired Score Performance Widget */}
            <div className="group relative card flex flex-col overflow-hidden p-6 md:p-8 rounded-lg bg-b-surface2 dark:bg-b-surface2 shadow-[0px_5px_1.5px_-4px_rgba(8,8,8,0.09),0px_6px_4px_-4px_rgba(8,8,8,0.05)] border border-s-stroke2/40">
              <div className="box-hover" />
              
              {/* Widget Header */}
              <div className="relative z-10 flex flex-row justify-between items-center w-full mb-8">
                {/* Header Title Section */}
                <div className="flex flex-row items-center gap-2">
                  <h3 className="font-sans text-[20px] font-semibold tracking-[0.0015em] leading-[145%] text-t-primary dark:text-t-primary">
                    Score Performance
                  </h3>
                </div>
                
                {/* Custom Filter Dropdown */}
                <div className="relative">
                  <button 
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="flex flex-row justify-between items-center px-5 py-3 gap-2 w-[160px] max-w-[180px] h-12 border border-s-stroke2 dark:border-s-stroke2 rounded-lg bg-transparent text-t-secondary dark:text-t-secondary text-sm font-sans transition-all hover:border-t-secondary active:scale-98"
                  >
                    <span>{activeSubject}</span>
                    <RiArrowDownSLine size={20} className="text-t-secondary dark:text-t-secondary" />
                  </button>
                  
                  {isDropdownOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setIsDropdownOpen(false)} />
                      <ul className="absolute right-0 top-13 z-50 w-full rounded-lg border border-s-stroke2 bg-b-surface2 p-1.5 shadow-dropdown animate-in fade-in slide-in-from-top-1 duration-150">
                        {subjects.map((sub) => (
                          <li key={sub}>
                            <button
                              onClick={() => {
                                setActiveSubject(sub);
                                setIsDropdownOpen(false);
                                setSelectedBarIndex(3); // Reset to active bar 4
                              }}
                              className={`w-full rounded-lg px-3.5 py-2 text-left text-sm font-semibold transition-colors ${
                                activeSubject === sub
                                  ? "bg-b-surface1 text-t-primary"
                                  : "bg-transparent text-t-secondary hover:bg-b-surface3 hover:text-t-primary"
                              }`}
                            >
                              {sub}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>
              </div>

              {/* Widget Content Area */}
              <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-8 md:gap-12 w-full pt-4">
                
                {/* Stats Container (Left Side) */}
                <div className="flex flex-col items-start gap-4 shrink-0 w-52">
                  
                  {/* Amount Container - Displaying Score Marks */}
                  <div className="flex flex-row items-end gap-1.5 leading-none select-none">
                    <span className="font-sans text-5xl font-medium tracking-[-0.005em] text-t-primary dark:text-t-primary">
                      {activeBar?.score}
                    </span>
                    <span className="font-sans text-[36px] font-medium text-t-secondary">
                      / {maxMarks}
                    </span>
                  </div>
                  
                  {/* Comparison Container */}
                  <div className="flex flex-row items-center gap-2 w-full">
                    {/* Trend Badge */}
                    <div className="flex flex-row justify-center items-center px-2 py-1 gap-1 border border-s-stroke2/40 bg-[rgba(0,166,86,0.05)] rounded-lg shrink-0">
                      <span className="text-[16px] font-medium leading-none">+15m</span>
                    </div>
                    {/* Comparison Text */}
                    <span className="text-[12px] font-sans font-medium text-t-secondary leading-[160%] tracking-[0.004em]">
                      vs last test
                    </span>
                  </div>

                </div>

                {/* Chart Container (Right Side) */}
                {/* Chart Container (Right Side) */}
                <div className="flex flex-col flex-1 h-[296px] min-w-0 select-none">
                  {/* Row 1: Tooltips + Bars */}
                  <div className="flex flex-row items-end justify-between flex-1 gap-3 md:gap-5 min-w-0">
                    {bars.map((bar, idx) => {
                      const isSelected = selectedBarIndex === idx;
                      
                      return (
                        <div 
                          key={idx} 
                          onClick={() => setSelectedBarIndex(idx)}
                          className="flex flex-col justify-end items-center flex-1 gap-3 cursor-pointer group/bar h-full"
                        >
                          {/* Selected Tooltip Area */}
                          <div className="relative w-full h-[42px] flex flex-col justify-end items-center shrink-0">
                            {isSelected && (
                              <div className="absolute bottom-0 flex flex-col items-center animate-in fade-in slide-in-from-bottom-2 duration-150">
                                {/* Tooltip Box */}
                                <div className="flex items-center justify-center bg-shade-03 px-2.5 py-1.5 rounded-[6px] text-t-light text-[11px] font-sans font-semibold leading-none shadow-depth">
                                  {bar.score} marks
                                </div>
                                {/* Tooltip Arrow */}
                                <div className="w-2.5 h-1 bg-shade-03 clip-triangle -mt-0.5" style={{ clipPath: "polygon(50% 100%, 0 0, 100% 0)" }} />
                                {/* Indicator Dot */}
                                <div className="size-3 bg-b-surface2 border-[3px] border-primary-01 rounded-full mt-2" />
                              </div>
                            )}
                          </div>

                          {/* Bar */}
                          <div 
                            style={{ height: `${bar.height}px` }}
                            className={`w-full rounded-lg transition-all ${
                              isSelected 
                                ? "bg-gradient-to-t from-primary-04 to-primary-01 shadow-[0_0_12px_rgba(42,133,255,0.4)]" 
                                : "bg-primary-01/10 dark:bg-white/5 group-hover/bar:bg-primary-01/20 dark:group-hover/bar:bg-white/10 border border-primary-01/10 dark:border-white/5"
                            }`}
                          />
                        </div>
                      );
                    })}
                  </div>

                  {/* Row 2: Labels */}
                  <div className="flex flex-row justify-between gap-3 md:gap-5 mt-3 shrink-0">
                    {bars.map((bar, idx) => (
                      <div 
                        key={idx}
                        onClick={() => setSelectedBarIndex(idx)}
                        className="flex-1 text-center text-[12px] font-sans font-medium text-t-secondary leading-[160%] tracking-[0.004em] shrink-0 cursor-pointer hover:text-t-primary transition-colors"
                      >
                        {bar.label}
                      </div>
                    ))}
                  </div>
                </div>

              </div>

            </div>

            {/* Pending DPPs - Restructured to look exactly like the Overview Widget container */}
            <div className="group relative card flex flex-col overflow-hidden p-6 md:p-8 rounded-lg bg-b-surface2 dark:bg-b-surface2 shadow-[0px_5px_1.5px_-4px_rgba(8,8,8,0.09),0px_6px_4px_-4px_rgba(8,8,8,0.05)] border border-s-stroke2/40 select-none">
              <div className="box-hover" />
              
              {/* Header Row */}
              <div className="relative z-10 flex flex-row justify-between items-center w-full mb-6">
                <div>
                  <h3 className="font-sans text-[20px] font-semibold tracking-[0.0015em] leading-[145%] text-t-primary dark:text-t-primary">
                    Pending DPPs
                  </h3>
                  <p className="text-[12px] font-sans text-t-secondary mt-0.5">
                    No assignments yet
                  </p>
                </div>
                <Link 
                  href="/assignments" 
                  className="flex flex-row justify-center items-center px-4.5 py-2.5 gap-2 border border-s-stroke2 dark:border-s-stroke2 rounded-lg bg-transparent text-t-secondary dark:text-t-secondary text-sm font-sans transition-all hover:border-t-secondary active:scale-98"
                >
                  <span>View All</span>
                  <RiArrowRightLine size={16} />
                </Link>
              </div>

              {/* DPPs Grid — empty state until DPPs API is wired */}
              <div className="relative z-10 flex flex-col items-center justify-center py-12 w-full mt-6 text-center">
                <p className="text-[14px] font-sans text-t-secondary">No DPPs assigned yet. Your teacher will assign practice papers here.</p>
              </div>
            </div>

          </div>

          {/* Right Column (Figma Sidebar Widget Style for Recent Tests - adapted to parent width with min-w-0 to prevent overflow) */}
          <div className="grid gap-6 min-w-0 overflow-x-hidden">
            
            {/* Recent Tests Widget (Figma 624px Height Sidebar Widget Style) */}
            <div className="flex flex-col p-3 pb-6 gap-6 rounded-lg bg-b-surface2 dark:bg-b-surface2 shadow-[0px_5px_1.5px_-4px_rgba(8,8,8,0.09),0px_6px_4px_-4px_rgba(8,8,8,0.05)] border border-s-stroke2/40 w-full h-[624px] min-w-0 overflow-hidden select-none">
              
              {/* Header */}
              <div className="flex flex-row items-center justify-between py-2.5 px-3 w-full h-12 gap-2">
                <h4 className="font-sans font-semibold text-[20px] leading-[145%] tracking-[0.0015em] text-t-primary dark:text-t-primary">
                  Recent Tests
                </h4>
              </div>

              {/* Product List (Test Items) */}
              {/* Recent Tests — empty state until attempts API is wired */}
              <div className="flex flex-col items-center justify-center w-full min-w-0 h-[456px] text-center">
                <RiTestTubeLine size={36} className="text-t-secondary/40 mb-3" />
                <p className="text-[14px] font-sans text-t-secondary">No tests taken yet.</p>
                <p className="text-[12px] font-sans text-t-secondary/60 mt-1">Complete a test to see it here.</p>
              </div>

              {/* Footer Ghost Button */}
              <div className="px-3 w-full h-12 flex flex-col items-start gap-2">
                <Link 
                  href="/history" 
                  className="flex flex-row justify-center items-center py-3.5 px-7 border-[1.5px] border-s-stroke2 dark:border-s-stroke2 rounded-lg w-full h-12 text-center text-sm font-sans font-semibold tracking-[0.0125em] text-t-secondary dark:text-t-secondary hover:bg-b-surface1/60 hover:text-t-primary transition-all active:scale-98"
                >
                  All tests
                </Link>
              </div>

            </div>

            {/* AI Insight Card (Figma AI Risk Alert Widget Style) */}
            <div className="flex flex-col p-3 pb-6 justify-between rounded-lg bg-b-surface2 dark:bg-b-surface2 shadow-[0px_5px_1.5px_-4px_rgba(8,8,8,0.09),0px_6px_4px_-4px_rgba(8,8,8,0.05)] border border-s-stroke2/40 w-full h-[240px] select-none">
              
              {/* Header */}
              <div className="flex flex-row items-center p-2.5 px-3 w-full h-12">
                <h4 className="font-sans font-semibold text-[20px] leading-[145%] tracking-[0.0015em] text-t-primary dark:text-t-primary">
                  AI Risk Alert
                </h4>
              </div>

              {/* Info Section */}
              <div className="flex flex-row items-center px-3 gap-5 w-full h-16">
                {/* Circular Icon Container with Figma orange gradient */}
                <div className="flex size-16 items-center justify-center rounded-full bg-gradient-to-b from-[#FFD5BD] to-[#FFC1B1] shrink-0">
                  <RiAlertFill size={24} className="text-t-primary" />
                </div>
                {/* Description */}
                <div className="font-sans font-medium text-[14px] leading-[150%] tracking-[0.0025em] text-t-secondary dark:text-t-secondary flex-1 line-clamp-2">
                  Accuracy in Laws of Motion dropped <span className="font-semibold text-primary-03">-15%</span> this week. Est. impact: <span className="font-semibold text-primary-03">-12 marks</span>.
                </div>
              </div>

              {/* Button Container */}
              <div className="px-3 w-full h-12">
                <button 
                  className="flex flex-row justify-center items-center py-3 px-7 border border-s-stroke2 dark:border-s-stroke2 rounded-lg w-full h-12 text-center text-sm font-sans font-semibold tracking-[0.0125em] text-t-secondary dark:text-t-secondary hover:bg-b-surface1/60 hover:text-t-primary transition-all active:scale-98 cursor-pointer"
                >
                  Take Booster Test
                </button>
              </div>

            </div>

            {/* Action Required Widget (Figma Sidebar Widget Style) */}
            <div className="flex flex-col p-3 pb-6 justify-between rounded-lg bg-b-surface2 dark:bg-b-surface2 shadow-[0px_5px_1.5px_-4px_rgba(8,8,8,0.09),0px_6px_4px_-4px_rgba(8,8,8,0.05)] border border-s-stroke2/40 w-full h-[240px] select-none">
              
              {/* Header */}
              <div className="flex flex-row items-center justify-between p-2.5 px-3 w-full h-12">
                <h4 className="font-sans font-semibold text-[20px] leading-[145%] tracking-[0.0015em] text-t-primary dark:text-t-primary">
                  Action Required
                </h4>
                <span className="label label-red h-6 px-2 text-[12px] shrink-0">
                  High Risk
                </span>
              </div>

              {/* Info Section */}
              <div className="flex flex-row items-center px-3 gap-5 w-full h-16">
                {/* Circular Icon Container with red/pink gradient */}
                <div className="flex size-16 items-center justify-center rounded-full bg-gradient-to-b from-[#FFD1D1] to-[#FFA3A3] shrink-0">
                  <RiShieldCrossFill size={24} className="text-t-primary" />
                </div>
                {/* Description */}
                <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                  <div className="font-sans font-semibold text-[16px] leading-[150%] tracking-[0.0015em] text-t-primary dark:text-t-primary truncate">
                    Critical Boosters Ready
                  </div>
                  <div className="font-sans font-medium text-[14px] leading-[150%] tracking-[0.0025em] text-t-secondary dark:text-t-secondary truncate">
                    4 topics degrading below target accuracy
                  </div>
                </div>
              </div>

              {/* Button Container */}
              <div className="px-3 w-full h-12">
                <button 
                  className="flex flex-row justify-center items-center py-3 px-7 border border-s-stroke2 dark:border-s-stroke2 rounded-lg w-full h-12 text-center text-sm font-sans font-semibold tracking-[0.0125em] text-t-secondary dark:text-t-secondary hover:bg-b-surface1/60 hover:text-t-primary transition-all active:scale-98 cursor-pointer"
                >
                  Start Booster Queue
                </button>
              </div>

            </div>

          </div>

        </div>

      </main>
    </>
  );
}