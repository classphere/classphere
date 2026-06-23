"use client";

import Link from "next/link";
import { useState } from "react";
import Navbar from "@/components/layout/Navbar";
import { mockUser, mockRecentTests, mockStudentDPPs } from "@/lib/mock-data";
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
  const isNEET = mockUser.batch.includes("NEET");
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

  return (
    <>
      <Navbar />
      
      <main className="mx-auto w-full max-w-screen-2xl px-4 pb-10 pt-6 md:px-6 overflow-x-hidden">
        
        {/* Figma-Inspired Dashboard Overview Wrapper */}
        <div className="group relative card flex flex-col overflow-hidden p-6 md:p-8 rounded-[32px] bg-[#FDFDFD] dark:bg-b-surface2 shadow-[0px_5px_1.5px_-4px_rgba(8,8,8,0.09),0px_6px_4px_-4px_rgba(8,8,8,0.05)] border border-s-stroke2/40 mb-6 select-none">
          <div className="box-hover" />
          
          {/* Header Row */}
          <div className="relative z-10 flex flex-row justify-between items-center w-full mb-6">
            <h3 className="font-sans text-[20px] font-semibold tracking-[0.0015em] leading-[145%] text-[#101010] dark:text-t-primary">
              Overview
            </h3>
            
            {/* Custom Filter */}
            <div className="relative">
              <button 
                onClick={() => setIsOverviewDropdownOpen(!isOverviewDropdownOpen)}
                className="flex flex-row justify-between items-center px-5 py-3 gap-2 w-[160px] max-w-[180px] h-12 border border-[#E2E2E2] dark:border-s-stroke2 rounded-[90px] bg-transparent text-[#727272] dark:text-t-secondary text-sm font-sans transition-all hover:border-[#727272] active:scale-98"
              >
                <span>This Week</span>
                <RiArrowDownSLine size={20} className="text-[#727272] dark:text-t-secondary" />
              </button>
              
              {isOverviewDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsOverviewDropdownOpen(false)} />
                  <ul className="absolute right-0 top-13 z-50 w-full rounded-2xl border border-s-stroke2 bg-b-surface2 p-1.5 shadow-dropdown animate-in fade-in slide-in-from-top-1 duration-150">
                    <li>
                      <button
                        onClick={() => setIsOverviewDropdownOpen(false)}
                        className="w-full rounded-xl px-3.5 py-2 text-left text-sm font-semibold bg-b-surface1 text-t-primary"
                      >
                        This Week
                      </button>
                    </li>
                    <li>
                      <button
                        onClick={() => setIsOverviewDropdownOpen(false)}
                        className="w-full rounded-xl px-3.5 py-2 text-left text-sm font-semibold bg-transparent text-t-secondary hover:bg-b-surface3 hover:text-t-primary"
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
          <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 p-2 gap-4 w-full bg-[#F9F9F9] dark:bg-b-surface1/60 border border-[rgba(123,123,123,0.1)] dark:border-s-stroke2/40 rounded-[32px]">
            
            {/* Metric 1: Tests Taken */}
            <div className="flex flex-col items-start p-6 gap-2 bg-[#FDFDFD] dark:bg-b-surface2 border border-[#FDFDFD] dark:border-s-stroke2/30 rounded-[24px] shadow-[0px_0px_36px_-8px_rgba(0,0,0,0.05),0px_6px_4px_-4px_rgba(8,8,8,0.05),0px_5px_1.5px_-4px_rgba(8,8,8,0.09)]">
              <div className="flex flex-row items-center gap-3 w-full mb-1">
                <span className="text-[#101010] dark:text-t-primary"><RiBarChartBoxLine size={20} /></span>
                <span className="font-sans font-semibold text-[16px] leading-[150%] tracking-[0.0015em] text-[#101010] dark:text-t-primary">
                  Tests Taken
                </span>
              </div>
              <div className="flex flex-row items-center gap-4 w-full mt-1">
                <div className="font-sans text-[54px] font-medium tracking-[-0.005em] text-[#101010] dark:text-t-primary leading-none">
                  8
                </div>
                <div className="flex flex-col items-start gap-0.5">
                  <div className="flex flex-row justify-center items-center px-1.5 py-0.5 gap-1 border border-[rgba(0,166,86,0.15)] bg-[rgba(0,166,86,0.05)] rounded-lg">
                    <span className="text-[#00A656] text-[12px] font-semibold leading-none">+2</span>
                  </div>
                  <span className="text-[12px] font-sans text-[#7B7B7B]">
                    this week
                  </span>
                </div>
              </div>
            </div>

            {/* Metric 2: Accuracy Rate */}
            <div className="flex flex-col items-start p-6 gap-2 bg-[#FDFDFD] dark:bg-b-surface2 border border-[#FDFDFD] dark:border-s-stroke2/30 rounded-[24px] shadow-[0px_0px_36px_-8px_rgba(0,0,0,0.05),0px_6px_4px_-4px_rgba(8,8,8,0.05),0px_5px_1.5px_-4px_rgba(8,8,8,0.09)]">
              <div className="flex flex-row items-center gap-3 w-full mb-1">
                <span className="text-[#101010] dark:text-t-primary"><RiArrowRightUpLine size={20} /></span>
                <span className="font-sans font-semibold text-[16px] leading-[150%] tracking-[0.0015em] text-[#101010] dark:text-t-primary">
                  Accuracy Rate
                </span>
              </div>
              <div className="flex flex-row items-center gap-4 w-full mt-1">
                <div className="font-sans text-[54px] font-medium tracking-[-0.005em] text-[#101010] dark:text-t-primary leading-none">
                  71.2%
                </div>
                <div className="flex flex-col items-start gap-0.5">
                  <div className="flex flex-row justify-center items-center px-1.5 py-0.5 gap-1 border border-[rgba(0,166,86,0.15)] bg-[rgba(0,166,86,0.05)] rounded-lg">
                    <span className="text-[#00A656] text-[12px] font-semibold leading-none">+5.2%</span>
                  </div>
                  <span className="text-[12px] font-sans text-[#7B7B7B]">
                    boost
                  </span>
                </div>
              </div>
            </div>

            {/* Metric 3: Average Score */}
            <div className="flex flex-col items-start p-6 gap-2 bg-[#FDFDFD] dark:bg-b-surface2 border border-[#FDFDFD] dark:border-s-stroke2/30 rounded-[24px] shadow-[0px_0px_36px_-8px_rgba(0,0,0,0.05),0px_6px_4px_-4px_rgba(8,8,8,0.05),0px_5px_1.5px_-4px_rgba(8,8,8,0.09)]">
              <div className="flex flex-row items-center gap-3 w-full mb-1">
                <span className="text-[#101010] dark:text-t-primary"><RiRulerLine size={20} /></span>
                <span className="font-sans font-semibold text-[16px] leading-[150%] tracking-[0.0015em] text-[#101010] dark:text-t-primary">
                  Average Score
                </span>
              </div>
              <div className="flex flex-row items-center gap-4 w-full mt-1">
                <div className="font-sans text-[54px] font-medium tracking-[-0.005em] text-[#101010] dark:text-t-primary leading-none">
                  86
                </div>
                <div className="flex flex-col items-start gap-0.5">
                  <div className="flex flex-row justify-center items-center px-1.5 py-0.5 gap-1 border border-[rgba(0,166,86,0.15)] bg-[rgba(0,166,86,0.05)] rounded-lg">
                    <span className="text-[#00A656] text-[12px] font-semibold leading-none">+15%</span>
                  </div>
                  <span className="text-[12px] font-sans text-[#7B7B7B]">
                    vs last week
                  </span>
                </div>
              </div>
            </div>

            {/* Metric 4: Booster Queue */}
            <div className="flex flex-col items-start p-6 gap-2 bg-[#FDFDFD] dark:bg-b-surface2 border border-[#FDFDFD] dark:border-s-stroke2/30 rounded-[24px] shadow-[0px_0px_36px_-8px_rgba(0,0,0,0.05),0px_6px_4px_-4px_rgba(8,8,8,0.05),0px_5px_1.5px_-4px_rgba(8,8,8,0.09)]">
              <div className="flex flex-row items-center gap-3 w-full mb-1">
                <span className="text-[#101010] dark:text-t-primary"><RiAlertFill size={20} className="text-[#EF9D0E]" /></span>
                <span className="font-sans font-semibold text-[16px] leading-[150%] tracking-[0.0015em] text-[#101010] dark:text-t-primary">
                  Booster Queue
                </span>
              </div>
              <div className="flex flex-row items-center gap-4 w-full mt-1">
                <div className="font-sans text-[54px] font-medium tracking-[-0.005em] text-[#101010] dark:text-t-primary leading-none">
                  3
                </div>
                <div className="flex flex-col items-start gap-0.5">
                  <div className="flex flex-row justify-center items-center px-1.5 py-0.5 gap-1 border border-[rgba(255,106,85,0.15)] bg-[rgba(255,106,85,0.05)] rounded-lg">
                    <span className="text-[#FF6A55] text-[12px] font-semibold leading-none">High Risk</span>
                  </div>
                  <span className="text-[12px] font-sans text-[#7B7B7B]">
                    pending
                  </span>
                </div>
              </div>
            </div>

          </div>

        </div>

        {/* Main Grid Layout - Changed right column size from 320px to 420px to give Recent Tests widget ample room */}
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px] items-start overflow-x-hidden">
          
          {/* Left Column */}
          <div className="grid gap-6 min-w-0 overflow-x-hidden">
            
            {/* Figma-Inspired Score Performance Widget */}
            <div className="group relative card flex flex-col overflow-hidden p-6 md:p-8 rounded-[32px] bg-[#FDFDFD] dark:bg-b-surface2 shadow-[0px_5px_1.5px_-4px_rgba(8,8,8,0.09),0px_6px_4px_-4px_rgba(8,8,8,0.05)] border border-s-stroke2/40">
              <div className="box-hover" />
              
              {/* Widget Header */}
              <div className="relative z-10 flex flex-row justify-between items-center w-full mb-8">
                {/* Header Title Section */}
                <div className="flex flex-row items-center gap-2">
                  <h3 className="font-sans text-[20px] font-semibold tracking-[0.0015em] leading-[145%] text-[#101010] dark:text-t-primary">
                    Score Performance
                  </h3>
                </div>
                
                {/* Custom Filter Dropdown */}
                <div className="relative">
                  <button 
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="flex flex-row justify-between items-center px-5 py-3 gap-2 w-[160px] max-w-[180px] h-12 border border-[#E2E2E2] dark:border-s-stroke2 rounded-[90px] bg-transparent text-[#727272] dark:text-t-secondary text-sm font-sans transition-all hover:border-[#727272] active:scale-98"
                  >
                    <span>{activeSubject}</span>
                    <RiArrowDownSLine size={20} className="text-[#727272] dark:text-t-secondary" />
                  </button>
                  
                  {isDropdownOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setIsDropdownOpen(false)} />
                      <ul className="absolute right-0 top-13 z-50 w-full rounded-2xl border border-s-stroke2 bg-b-surface2 p-1.5 shadow-dropdown animate-in fade-in slide-in-from-top-1 duration-150">
                        {subjects.map((sub) => (
                          <li key={sub}>
                            <button
                              onClick={() => {
                                setActiveSubject(sub);
                                setIsDropdownOpen(false);
                                setSelectedBarIndex(3); // Reset to active bar 4
                              }}
                              className={`w-full rounded-xl px-3.5 py-2 text-left text-sm font-semibold transition-colors ${
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
                    <span className="font-sans text-[60px] font-medium tracking-[-0.005em] text-[#101010] dark:text-t-primary">
                      {activeBar?.score}
                    </span>
                    <span className="font-sans text-[36px] font-medium text-[#7B7B7B] pb-1.5">
                      / {maxMarks}
                    </span>
                  </div>
                  
                  {/* Comparison Container */}
                  <div className="flex flex-row items-center gap-2 w-full">
                    {/* Trend Badge */}
                    <div className="flex flex-row justify-center items-center px-2 py-1 gap-1 border border-[rgba(0,166,86,0.15)] bg-[rgba(0,166,86,0.05)] rounded-lg shrink-0">
                      <span className="text-[#00A656] text-[16px] font-medium leading-none">+15m</span>
                    </div>
                    {/* Comparison Text */}
                    <span className="text-[12px] font-sans font-medium text-[#7B7B7B] leading-[160%] tracking-[0.004em]">
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
                                <div className="flex items-center justify-center bg-[#191919] px-2.5 py-1.5 rounded-[6px] text-[#FDFDFD] text-[11px] font-sans font-semibold leading-none shadow-depth">
                                  {bar.score} marks
                                </div>
                                {/* Tooltip Arrow */}
                                <div className="w-2.5 h-1 bg-[#191919] clip-triangle -mt-0.5" style={{ clipPath: "polygon(50% 100%, 0 0, 100% 0)" }} />
                                {/* Indicator Dot */}
                                <div className="size-3 bg-[#FDFDFD] border-[3px] border-[#00B512] rounded-full mt-2" />
                              </div>
                            )}
                          </div>

                          {/* Bar */}
                          <div 
                            style={{ height: `${bar.height}px` }}
                            className={`w-full rounded-lg transition-all ${
                              isSelected 
                                ? "bg-[#00B512]" 
                                : "bg-[rgba(123,123,123,0.3)] dark:bg-[rgba(229,229,229,0.15)] group-hover/bar:bg-[rgba(123,123,123,0.45)] dark:group-hover/bar:bg-[rgba(229,229,229,0.25)]"
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
                        className="flex-1 text-center text-[12px] font-sans font-medium text-[#7B7B7B] leading-[160%] tracking-[0.004em] shrink-0 cursor-pointer hover:text-t-primary transition-colors"
                      >
                        {bar.label}
                      </div>
                    ))}
                  </div>
                </div>

              </div>

            </div>

            {/* Pending DPPs - Restructured to look exactly like the Overview Widget container */}
            <div className="group relative card flex flex-col overflow-hidden p-6 md:p-8 rounded-[32px] bg-[#FDFDFD] dark:bg-b-surface2 shadow-[0px_5px_1.5px_-4px_rgba(8,8,8,0.09),0px_6px_4px_-4px_rgba(8,8,8,0.05)] border border-s-stroke2/40 select-none">
              <div className="box-hover" />
              
              {/* Header Row */}
              <div className="relative z-10 flex flex-row justify-between items-center w-full mb-6">
                <div>
                  <h3 className="font-sans text-[20px] font-semibold tracking-[0.0015em] leading-[145%] text-[#101010] dark:text-t-primary">
                    Pending DPPs
                  </h3>
                  <p className="text-[12px] font-sans text-[#7B7B7B] mt-0.5">
                    {mockStudentDPPs.filter(d => d.status === "pending" || d.status === "late").length} assignments need attention
                  </p>
                </div>
                <Link 
                  href="/assignments" 
                  className="flex flex-row justify-center items-center px-4.5 py-2.5 gap-2 border border-[#E2E2E2] dark:border-s-stroke2 rounded-[90px] bg-transparent text-[#727272] dark:text-t-secondary text-sm font-sans transition-all hover:border-[#727272] active:scale-98"
                >
                  <span>View All</span>
                  <RiArrowRightLine size={16} />
                </Link>
              </div>

              {/* DPPs Grid Wrapper (p-2 grey nested background container) */}
              <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 p-2 gap-4 w-full bg-[#F9F9F9] dark:bg-b-surface1/60 border border-[rgba(123,123,123,0.1)] dark:border-s-stroke2/40 rounded-[32px]">
                {mockStudentDPPs.slice(0, 3).map(dpp => {
                  const isLate = dpp.status === "late";
                  const isDone = dpp.status === "completed";
                  return (
                    <div 
                      key={dpp.id} 
                      className="flex min-h-[10.5rem] flex-col justify-between p-5 bg-[#FDFDFD] dark:bg-b-surface2 border border-[#FDFDFD] dark:border-s-stroke2/30 rounded-[24px] shadow-[0px_0px_36px_-8px_rgba(0,0,0,0.05),0px_6px_4px_-4px_rgba(8,8,8,0.05),0px_5px_1.5px_-4px_rgba(8,8,8,0.09)]"
                    >
                      <div className="min-w-0 flex-1">
                        {/* Header Status Badge Row */}
                        <div className="flex justify-between items-center mb-3">
                          <span className="text-[12px] font-sans font-semibold text-[#7B7B7B] uppercase tracking-wider">
                            {dpp.subject}
                          </span>
                          {isLate && (
                            <div className="flex flex-row justify-center items-center px-1.5 py-0.5 border border-[rgba(255,106,85,0.15)] bg-[rgba(255,106,85,0.05)] rounded-lg">
                              <span className="text-[#FF6A55] text-[10px] font-bold leading-none">Overdue</span>
                            </div>
                          )}
                        </div>
                        
                        <div className="truncate font-sans font-semibold text-[16px] leading-[150%] tracking-[0.0015em] text-[#101010] dark:text-t-primary">
                          {dpp.title}
                        </div>
                        <div className="text-[12px] font-sans text-[#7B7B7B] mt-1">
                          {dpp.totalQuestions} Questions
                        </div>
                      </div>

                      <div className="flex justify-between items-center mt-4 pt-3 border-t border-s-stroke2/30">
                        <span className={`text-[12px] font-sans font-semibold ${isLate ? "text-[#FF6A55]" : "text-[#7B7B7B]"}`}>
                          Due: {dpp.dueDate}
                        </span>
                        {isDone ? (
                          <span className="text-sm font-sans font-bold text-[#00A656]">{dpp.score}/{dpp.maxScore}</span>
                        ) : (
                          <Link 
                            href={`/assignments/${dpp.id}`} 
                            className="flex flex-row justify-center items-center h-8 px-3.5 bg-[#101010] hover:bg-[#202020] text-[#FDFDFD] dark:bg-t-primary dark:text-b-surface1 dark:hover:bg-t-primary/90 text-[12px] font-sans font-semibold rounded-xl transition-all active:scale-95 shadow-widget"
                          >
                            Start
                          </Link>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

          {/* Right Column (Figma Sidebar Widget Style for Recent Tests - adapted to parent width with min-w-0 to prevent overflow) */}
          <div className="grid gap-6 min-w-0 overflow-x-hidden">
            
            {/* Recent Tests Widget (Figma 624px Height Sidebar Widget Style) */}
            <div className="flex flex-col p-3 pb-6 gap-6 rounded-[32px] bg-[#FDFDFD] dark:bg-b-surface2 shadow-[0px_5px_1.5px_-4px_rgba(8,8,8,0.09),0px_6px_4px_-4px_rgba(8,8,8,0.05)] border border-s-stroke2/40 w-full h-[624px] min-w-0 overflow-hidden select-none">
              
              {/* Header */}
              <div className="flex flex-row items-center justify-between py-2.5 px-3 w-full h-12 gap-2">
                <h4 className="font-sans font-semibold text-[20px] leading-[145%] tracking-[0.0015em] text-[#101010] dark:text-t-primary">
                  Recent Tests
                </h4>
              </div>

              {/* Product List (Test Items) */}
              <div className="flex flex-col gap-1 w-full min-w-0 h-[456px]">
                {mockRecentTests.slice(0, 5).map((test, index) => {
                  const isHoverItem = index === 1; // Item 2 has the hover style
                  const isPassed = test.percentage >= 60;
                  
                  return (
                    <div 
                      key={test.id}
                      className={`flex flex-row items-center justify-between p-3 gap-8 rounded-[20px] transition-all w-full h-[88px] min-w-0 overflow-hidden ${
                        isHoverItem 
                          ? "bg-[#F9F9F9] dark:bg-b-surface1/40 shadow-[inset_0px_0px_0px_3px_#FFFFFF] dark:shadow-none border border-s-stroke2/20" 
                          : "bg-transparent hover:bg-[#F9F9F9] dark:hover:bg-b-surface1/30"
                      }`}
                    >
                      {/* Left: Avatar/Icon + Title */}
                      <div className="flex flex-row items-center gap-5 flex-1 min-w-0 overflow-hidden">
                        {/* 64x64px rounded image box */}
                        <div className="flex w-16 h-16 items-center justify-center rounded-xl bg-b-surface1 border border-s-stroke2/40 shrink-0 text-t-secondary font-bold">
                          {test.exam === "JEE" ? <RiRulerLine size={24} /> : <RiTestTubeLine size={24} />}
                        </div>
                        {/* Title text */}
                        <div className="font-sans font-semibold text-[16px] leading-[150%] tracking-[0.0015em] text-[#101010] dark:text-t-primary truncate min-w-0 flex-1">
                          {test.title}
                        </div>
                      </div>

                      {/* Right: Score + Status Badge */}
                      <div className="flex flex-col justify-center items-end gap-1 shrink-0 min-w-[77px] h-[52px]">
                        {/* Score Text */}
                        <div className="font-sans font-semibold text-[16px] leading-[150%] tracking-[0.0015em] text-[#101010] dark:text-t-primary text-right w-full">
                          {test.percentage}%
                        </div>
                        {/* Status Badge */}
                        <div className={`flex flex-row justify-center items-center px-2 py-[2px] h-6 rounded-lg border-[1.5px] text-[12px] font-sans font-normal tracking-[0.004em] ${
                          isPassed 
                            ? "bg-[rgba(0,166,86,0.05)] border-[rgba(0,166,86,0.15)] text-[#00A656] w-[49px]" 
                            : "bg-[rgba(255,106,85,0.05)] border-[rgba(255,106,85,0.15)] text-[#FF6A55] w-[51px]"
                        }`}>
                          {isPassed ? "Active" : "Offline"}
                        </div>
                      </div>

                    </div>
                  );
                })}
              </div>

              {/* Footer Ghost Button */}
              <div className="px-3 w-full h-12 flex flex-col items-start gap-2">
                <Link 
                  href="/history" 
                  className="flex flex-row justify-center items-center py-3.5 px-7 border-[1.5px] border-[#E2E2E2] dark:border-s-stroke2 rounded-[32px] w-full h-12 text-center text-sm font-sans font-semibold tracking-[0.0125em] text-[#727272] dark:text-t-secondary hover:bg-b-surface1/60 hover:text-t-primary transition-all active:scale-98"
                >
                  All tests
                </Link>
              </div>

            </div>

            {/* AI Insight Card (Figma AI Risk Alert Widget Style) */}
            <div className="flex flex-col p-3 pb-6 justify-between rounded-[32px] bg-[#FDFDFD] dark:bg-b-surface2 shadow-[0px_5px_1.5px_-4px_rgba(8,8,8,0.09),0px_6px_4px_-4px_rgba(8,8,8,0.05)] border border-s-stroke2/40 w-full h-[240px] select-none">
              
              {/* Header */}
              <div className="flex flex-row items-center p-2.5 px-3 w-full h-12">
                <h4 className="font-sans font-semibold text-[20px] leading-[145%] tracking-[0.0015em] text-[#101010] dark:text-t-primary">
                  AI Risk Alert
                </h4>
              </div>

              {/* Info Section */}
              <div className="flex flex-row items-center px-3 gap-5 w-full h-16">
                {/* Circular Icon Container with Figma orange gradient */}
                <div className="flex size-16 items-center justify-center rounded-full bg-gradient-to-b from-[#FFD5BD] to-[#FFC1B1] shrink-0">
                  <RiAlertFill size={24} className="text-[#101010]" />
                </div>
                {/* Description */}
                <div className="font-sans font-medium text-[14px] leading-[150%] tracking-[0.0025em] text-[#727272] dark:text-t-secondary flex-1 line-clamp-2">
                  Accuracy in Laws of Motion dropped <span className="font-semibold text-[#FF6A55]">-15%</span> this week. Est. impact: <span className="font-semibold text-[#FF6A55]">-12 marks</span>.
                </div>
              </div>

              {/* Button Container */}
              <div className="px-3 w-full h-12">
                <button 
                  className="flex flex-row justify-center items-center py-3 px-7 border border-[#E2E2E2] dark:border-s-stroke2 rounded-[32px] w-full h-12 text-center text-sm font-sans font-semibold tracking-[0.0125em] text-[#727272] dark:text-t-secondary hover:bg-b-surface1/60 hover:text-t-primary transition-all active:scale-98 cursor-pointer"
                >
                  Take Booster Test
                </button>
              </div>

            </div>

            {/* Action Required Widget (Figma Sidebar Widget Style) */}
            <div className="flex flex-col p-3 pb-6 justify-between rounded-[32px] bg-[#FDFDFD] dark:bg-b-surface2 shadow-[0px_5px_1.5px_-4px_rgba(8,8,8,0.09),0px_6px_4px_-4px_rgba(8,8,8,0.05)] border border-s-stroke2/40 w-full h-[240px] select-none">
              
              {/* Header */}
              <div className="flex flex-row items-center justify-between p-2.5 px-3 w-full h-12">
                <h4 className="font-sans font-semibold text-[20px] leading-[145%] tracking-[0.0015em] text-[#101010] dark:text-t-primary">
                  Action Required
                </h4>
                <span className="flex flex-row justify-center items-center px-2 py-0.5 rounded-lg border bg-[rgba(255,106,85,0.05)] border-[rgba(255,106,85,0.15)] text-[#FF6A55] text-[12px] font-sans font-medium tracking-[0.004em] shrink-0">
                  High Risk
                </span>
              </div>

              {/* Info Section */}
              <div className="flex flex-row items-center px-3 gap-5 w-full h-16">
                {/* Circular Icon Container with red/pink gradient */}
                <div className="flex size-16 items-center justify-center rounded-full bg-gradient-to-b from-[#FFD1D1] to-[#FFA3A3] shrink-0">
                  <RiShieldCrossFill size={24} className="text-[#101010]" />
                </div>
                {/* Description */}
                <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                  <div className="font-sans font-semibold text-[16px] leading-[150%] tracking-[0.0015em] text-[#101010] dark:text-t-primary truncate">
                    Critical Boosters Ready
                  </div>
                  <div className="font-sans font-medium text-[14px] leading-[150%] tracking-[0.0025em] text-[#727272] dark:text-t-secondary truncate">
                    4 topics degrading below target accuracy
                  </div>
                </div>
              </div>

              {/* Button Container */}
              <div className="px-3 w-full h-12">
                <button 
                  className="flex flex-row justify-center items-center py-3 px-7 border border-[#E2E2E2] dark:border-s-stroke2 rounded-[32px] w-full h-12 text-center text-sm font-sans font-semibold tracking-[0.0125em] text-[#727272] dark:text-t-secondary hover:bg-b-surface1/60 hover:text-t-primary transition-all active:scale-98 cursor-pointer"
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