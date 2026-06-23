"use client";

import { useState } from "react";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import {
  RiTeamLine,
  RiFileChartLine,
  RiCalendarEventLine,
  RiArrowRightUpLine,
  RiSettings4Line,
  RiFileListLine,
  RiArrowDownSLine
} from "@remixicon/react";
import { mockTeacher, mockBatches, mockDPPs } from "../../lib/mock-data";

export default function TeacherDashboardPage() {
  const pendingDPPs = mockDPPs.filter(d => d.status === "pending" || d.status === "upcoming");
  const completedDPPs = mockDPPs.filter(d => d.status === "completed");
  const [isOverviewDropdownOpen, setIsOverviewDropdownOpen] = useState(false);

  const flags = [
    {
      name: "Rohan Gupta",
      batch: "JEE 2026 Morning",
      avatar: "https://ui-avatars.com/api/?name=Rohan+Gupta&background=FF6A55&color=fff&size=128",
      metric: "-30% Score",
      status: "Critical",
      statusType: "red",
      highlighted: true
    },
    {
      name: "Carnot Cycle Failure",
      batch: "NEET 2026 Droppers",
      avatar: "https://ui-avatars.com/api/?name=Carnot+Cycle&background=EF9D0E&color=fff&size=128",
      metric: "73% Fail Rate",
      status: "Revision",
      statusType: "yellow",
      highlighted: false
    },
    {
      name: "Sneha Reddy",
      batch: "NEET Droppers",
      avatar: "https://ui-avatars.com/api/?name=Sneha+Reddy&background=00A656&color=fff&size=128",
      metric: "3 Missed",
      status: "Alert",
      statusType: "red",
      highlighted: false
    }
  ];

  // Time-based greeting title
  const getGreeting = () => {
    const hours = new Date().getHours();
    const nameParts = mockTeacher.name.split(" ");
    const displayName = nameParts.length > 1 ? `${nameParts[0]} ${nameParts[nameParts.length - 1]}` : mockTeacher.name;
    
    if (hours < 12) {
      return `Good morning, ${displayName}`;
    } else if (hours < 17) {
      return `Good afternoon, ${displayName}`;
    } else {
      return `Good evening, ${displayName}`;
    }
  };

  const greetingTitle = getGreeting();

  return (
    <>
      <Navbar 
        title={greetingTitle} 
        subtitle={`Here's the latest from your assigned batches at ${mockTeacher.instituteName}.`} 
        breadcrumbs="Dashboard" 
      />
      
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
                className="flex flex-row justify-between items-center px-5 py-3 gap-2 w-[160px] max-w-[180px] h-12 border border-[#E2E2E2] dark:border-s-stroke2 rounded-[90px] bg-transparent text-[#727272] dark:text-t-secondary text-sm font-sans transition-all hover:border-[#727272] active:scale-98 cursor-pointer"
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
                        className="w-full rounded-xl px-3.5 py-2 text-left text-sm font-semibold bg-b-surface1 text-t-primary cursor-pointer"
                      >
                        This Week
                      </button>
                    </li>
                    <li>
                      <button
                        onClick={() => setIsOverviewDropdownOpen(false)}
                        className="w-full rounded-xl px-3.5 py-2 text-left text-sm font-semibold bg-transparent text-t-secondary hover:bg-b-surface3 hover:text-t-primary cursor-pointer"
                      >
                        Last Week
                      </button>
                    </li>
                  </ul>
                </>
              )}
            </div>
          </div>

          {/* Stats Section Wrapper (Row of 3 active highlighted boxes) */}
          <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 p-2 gap-4 w-full bg-[#F9F9F9] dark:bg-b-surface1/60 border border-[rgba(123,123,123,0.1)] dark:border-s-stroke2/40 rounded-[32px]">
            
            {/* Metric 1: Total Students */}
            <div className="flex flex-col items-start p-6 gap-2 bg-[#FDFDFD] dark:bg-b-surface2 border border-[#FDFDFD] dark:border-s-stroke2/30 rounded-[24px] shadow-[0px_0px_36px_-8px_rgba(0,0,0,0.05),0px_6px_4px_-4px_rgba(8,8,8,0.05),0px_5px_1.5px_-4px_rgba(8,8,8,0.09)]">
              <div className="flex flex-row items-center gap-3 w-full mb-1">
                <span className="text-[#101010] dark:text-t-primary"><RiTeamLine size={20} /></span>
                <span className="font-sans font-semibold text-[16px] leading-[150%] tracking-[0.0015em] text-[#101010] dark:text-t-primary">
                  Total Students
                </span>
              </div>
              <div className="flex flex-row items-center gap-4 w-full mt-1">
                <div className="font-sans text-[54px] font-medium tracking-[-0.005em] text-[#101010] dark:text-t-primary leading-none">
                  465
                </div>
                <div className="flex flex-col items-start gap-0.5">
                  <span className="text-[12px] font-sans text-[#7B7B7B]">
                    across 3 batches
                  </span>
                </div>
              </div>
            </div>

            {/* Metric 2: Avg Batch Score */}
            <div className="flex flex-col items-start p-6 gap-2 bg-[#FDFDFD] dark:bg-b-surface2 border border-[#FDFDFD] dark:border-s-stroke2/30 rounded-[24px] shadow-[0px_0px_36px_-8px_rgba(0,0,0,0.05),0px_6px_4px_-4px_rgba(8,8,8,0.05),0px_5px_1.5px_-4px_rgba(8,8,8,0.09)]">
              <div className="flex flex-row items-center gap-3 w-full mb-1">
                <span className="text-[#101010] dark:text-t-primary"><RiFileChartLine size={20} /></span>
                <span className="font-sans font-semibold text-[16px] leading-[150%] tracking-[0.0015em] text-[#101010] dark:text-t-primary">
                  Avg Batch Score
                </span>
              </div>
              <div className="flex flex-row items-center gap-4 w-full mt-1">
                <div className="font-sans text-[54px] font-medium tracking-[-0.005em] text-[#101010] dark:text-t-primary leading-none">
                  67.4%
                </div>
                <div className="flex flex-col items-start gap-0.5">
                  <div className="flex flex-row justify-center items-center px-1.5 py-0.5 gap-1 border border-[rgba(0,166,86,0.15)] bg-[rgba(0,166,86,0.05)] rounded-lg">
                    <span className="text-[#00A656] text-[12px] font-semibold leading-none">+2.1%</span>
                  </div>
                  <span className="text-[12px] font-sans text-[#7B7B7B]">
                    vs last week
                  </span>
                </div>
              </div>
            </div>

            {/* Metric 3: Upcoming Tests */}
            <div className="flex flex-col items-start p-6 gap-2 bg-[#FDFDFD] dark:bg-b-surface2 border border-[#FDFDFD] dark:border-s-stroke2/30 rounded-[24px] shadow-[0px_0px_36px_-8px_rgba(0,0,0,0.05),0px_6px_4px_-4px_rgba(8,8,8,0.05),0px_5px_1.5px_-4px_rgba(8,8,8,0.09)]">
              <div className="flex flex-row items-center gap-3 w-full mb-1">
                <span className="text-[#101010] dark:text-t-primary"><RiCalendarEventLine size={20} /></span>
                <span className="font-sans font-semibold text-[16px] leading-[150%] tracking-[0.0015em] text-[#101010] dark:text-t-primary">
                  Upcoming Tests
                </span>
              </div>
              <div className="flex flex-row items-center gap-4 w-full mt-1">
                <div className="font-sans text-[54px] font-medium tracking-[-0.005em] text-[#101010] dark:text-t-primary leading-none">
                  2
                </div>
                <div className="flex flex-col items-start gap-0.5">
                  <span className="text-[12px] font-sans text-[#7B7B7B]">
                    this week
                  </span>
                </div>
              </div>
            </div>
            
          </div>
        </div>

        {/* Main Content Grid — Batches (left) + AI Flags (right) */}
        <div className="mb-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">

          {/* Batches Table Card */}
          <div className="group relative card flex min-w-0 flex-col overflow-hidden rounded-[32px] bg-[#FDFDFD] dark:bg-b-surface2 shadow-[0px_5px_1.5px_-4px_rgba(8,8,8,0.09),0px_6px_4px_-4px_rgba(8,8,8,0.05)] border border-s-stroke2/40 p-6 md:p-8 select-none">
            <div className="flex justify-between items-center mb-6 z-10">
              <h2 className="font-sans font-bold text-[20px] text-[#101010] dark:text-t-primary">Your Active Batches</h2>
              <button className="h-9 px-4 rounded-xl text-xs font-semibold bg-[#FDFDFD] dark:bg-b-surface2 hover:bg-[#F9F9F9] dark:hover:bg-b-surface3 border border-s-stroke2/30 text-t-secondary hover:text-t-primary transition-all active:scale-95 shadow-xs shrink-0 cursor-pointer">
                View All
              </button>
            </div>
            
            <div className="overflow-x-auto z-10 w-full">
              <table className="w-full text-left border-collapse min-w-[500px]">
                <thead>
                  <tr className="border-b border-s-stroke2 text-[12px] font-bold text-[#7B7B7B] uppercase tracking-wider">
                    <th className="pb-3 pr-4 font-semibold">Batch Name</th>
                    <th className="pb-3 px-4 font-semibold">Exam</th>
                    <th className="pb-3 px-4 font-semibold">Students</th>
                    <th className="pb-3 px-4 font-semibold">Avg Score</th>
                    <th className="pb-3 pl-4 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {mockBatches.map(batch => (
                    <tr key={batch.id} className="border-b border-s-stroke2 last:border-b-0 group/row hover:bg-[#FDFDFD]/50 dark:hover:bg-b-surface3/20 transition-colors">
                      <td className="py-4 pr-4 font-sans font-semibold text-sm text-[#101010] dark:text-t-primary">{batch.name}</td>
                      <td className="py-4 px-4 font-sans text-xs font-semibold text-[#7B7B7B]">{batch.exam}</td>
                      <td className="py-4 px-4 font-sans text-xs font-bold text-[#101010] dark:text-t-primary">{batch.studentsCount}</td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <span className="font-sans text-xs font-bold text-[#101010] dark:text-t-primary min-w-[36px]">{batch.avgScore}%</span>
                          <div className="flex-1 h-1.5 bg-[rgba(123,123,123,0.15)] dark:bg-[rgba(229,229,229,0.08)] rounded-full overflow-hidden max-w-[120px]">
                            <div
                              className="h-full rounded-full bg-linear-to-r from-[#00B512] to-[#00A656]"
                              style={{ width: `${batch.avgScore}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="py-4 pl-4 text-right">
                        <Link 
                          href={`/teacher/batch/${batch.id}`} 
                          className="inline-flex items-center justify-center h-8 px-3 rounded-lg text-[11px] font-bold bg-[#FDFDFD] dark:bg-b-surface2 hover:bg-[#F9F9F9] dark:hover:bg-b-surface3 border border-s-stroke2/30 text-t-secondary hover:text-t-primary transition-all active:scale-95 shadow-xs cursor-pointer"
                        >
                          Analysis
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* AI Attention Flags Card */}
          <div className="flex w-full xl:max-w-[368px] flex-col overflow-hidden rounded-[32px] bg-[#FDFDFD] dark:bg-b-surface2 shadow-[0px_5px_1.5px_-4px_rgba(8,8,8,0.09),0px_6px_4px_-4px_rgba(8, 8, 8, 0.05)] border border-s-stroke2/40 p-3 pb-6 select-none box-sizing:border-box">
            
            {/* Container (Header + Product List) */}
            <div className="flex flex-col items-start p-0 gap-3 w-full">
              
              {/* Header */}
              <div className="flex flex-row items-center justify-between p-2.5 px-3 gap-2 w-full h-12">
                <h3 className="font-sans font-semibold text-[20px] leading-[145%] tracking-[0.0015em] text-[#101010] dark:text-t-primary">
                  AI Attention Flags
                </h3>
                <button className="flex items-center justify-center size-8 rounded-full text-[#7B7B7B] hover:text-[#101010] dark:hover:text-t-primary hover:bg-[#F9F9F9] dark:hover:bg-b-surface3 border border-s-stroke2/30 bg-[#FDFDFD] dark:bg-b-surface2 transition-all active:scale-95 shadow-xs cursor-pointer shrink-0">
                  <RiSettings4Line size={18} />
                </button>
              </div>

              {/* Product List */}
              <div className="flex flex-col items-start p-0 gap-1 w-full">
                {flags.map((flag, idx) => (
                  <div 
                    key={idx} 
                    className={`flex flex-row items-center p-3 gap-8 w-full h-[88px] rounded-[20px] transition-all ${
                      flag.highlighted 
                        ? "bg-[#F9F9F9] dark:bg-b-surface1 shadow-[inset_0_0_0_3px_#FFFFFF] dark:shadow-[inset_0_0_0_3px_rgba(255,255,255,0.05)] border border-s-stroke2/20" 
                        : "bg-transparent border border-transparent"
                    }`}
                  >
                    {/* Frame 1000002574 (Image + Title/Batch) */}
                    <div className="flex flex-row items-center gap-5 flex-1 min-w-0 h-16">
                      {/* Image / Icon */}
                      <img 
                        src={flag.avatar} 
                        alt={flag.name}
                        className="w-16 h-16 rounded-[12px] shrink-0 object-cover border border-s-stroke2/20"
                      />

                      {/* Title & Batch */}
                      <div className="flex flex-col items-start justify-center flex-1 min-w-0 h-12">
                        <span className="font-sans font-semibold text-[16px] leading-[150%] tracking-[0.0015em] text-[#101010] dark:text-t-primary truncate w-full">
                          {flag.name}
                        </span>
                        <span className="font-sans text-[12px] font-normal leading-[160%] tracking-[0.004em] text-[#7B7B7B] truncate w-full">
                          {flag.batch}
                        </span>
                      </div>
                    </div>

                    {/* Frame 1000002607 (Price/Metric + Status Badge) */}
                    <div className="flex flex-col justify-center items-end p-0 gap-1 shrink-0 w-24">
                      {/* Metric */}
                      <span className="font-sans font-semibold text-[16px] leading-[150%] tracking-[0.0015em] text-right text-[#101010] dark:text-t-primary truncate w-full">
                        {flag.metric}
                      </span>
                      
                      {/* Status badge */}
                      <div className={`box-sizing-border-box flex flex-row justify-center items-center px-2 py-0.5 gap-2 h-6 rounded-[8px] ${
                        flag.statusType === "green"
                          ? "bg-[#00A656]/5 border border-[#00A656]/15 text-[#00A656]"
                          : flag.statusType === "yellow"
                            ? "bg-[#EF9D0E]/5 border border-[#EF9D0E]/15 text-[#EF9D0E]"
                            : "bg-[#FF6A55]/5 border border-[#FF6A55]/15 text-[#FF6A55]"
                      }`}>
                        <span className="font-sans text-[12px] font-normal leading-[160%] tracking-[0.004em]">
                          {flag.status}
                        </span>
                      </div>
                    </div>

                  </div>
                ))}
              </div>

            </div>

            {/* Footer / All Products Button */}
            <div className="flex flex-col items-start p-0 px-3 gap-2 w-full mt-6">
              <button className="flex flex-row justify-center items-center p-3.5 px-7 gap-2 w-full h-12 border border-[#E2E2E2] dark:border-s-stroke2 rounded-[32px] bg-transparent text-[#727272] dark:text-t-secondary font-sans font-semibold text-[14px] leading-none tracking-[0.0125em] transition-all hover:border-[#727272] hover:text-[#101010] dark:hover:text-t-primary active:scale-98 cursor-pointer">
                View All Flags
              </button>
            </div>

          </div>

        </div>

        {/* DPP Activity — full width row below the main grid */}
        <div className="group relative card flex flex-col overflow-hidden rounded-[32px] bg-[#FDFDFD] dark:bg-b-surface2 shadow-[0px_5px_1.5px_-4px_rgba(8,8,8,0.09),0px_6px_4px_-4px_rgba(8,8,8,0.05)] border border-s-stroke2/40 p-6 md:p-8 select-none">
          <div className="flex justify-between items-center mb-6 z-10">
            <div className="flex items-center gap-3.5">
              <div className="flex items-center justify-center size-10 rounded-xl bg-[#FDFDFD] dark:bg-b-surface2 border border-s-stroke2/30 text-[#727272] dark:text-t-secondary shadow-xs">
                <RiFileListLine size={20} />
              </div>
              <div>
                <h2 className="font-sans font-bold text-[20px] text-[#101010] dark:text-t-primary">DPP Activity</h2>
                <p className="font-sans text-[12px] font-medium text-[#7B7B7B] tracking-[0.004em] mt-0.5">{pendingDPPs.length} active · {completedDPPs.length} completed across all batches</p>
              </div>
            </div>
            <Link 
              href="/teacher/dpps" 
              className="h-9 px-4 rounded-xl text-xs font-semibold bg-[#101010] dark:bg-t-primary text-[#FDFDFD] dark:text-black hover:bg-[#202020] dark:hover:bg-t-secondary transition-all active:scale-95 shadow-xs shrink-0 flex items-center gap-1.5 cursor-pointer"
            >
              <RiFileListLine size={16} /> Manage DPPs
            </Link>
          </div>

          <div className="grid gap-4 md:grid-cols-3 z-10">
            {mockDPPs.map(dpp => {
              const completion = Math.round((dpp.completedCount / dpp.totalStudents) * 100);
              const isComplete = dpp.status === "completed";
              const isUpcoming = dpp.status === "upcoming";
              return (
                <div
                  key={dpp.id}
                  className={`group relative flex min-h-[12rem] flex-col gap-3 overflow-hidden rounded-[24px] border p-6 transition-all hover:border-transparent cursor-pointer ${
                    isComplete
                      ? "border-[#00A656]/20 bg-[#00A656]/5"
                      : isUpcoming
                        ? "border-s-stroke2 bg-[#F9F9F9] dark:bg-[#1E1E1E]/40"
                        : "border-[#EF9D0E]/20 bg-[#EF9D0E]/5"
                  }`}
                >
                  <div className="box-hover" />
                  
                  <div className="relative z-10 flex justify-between items-start">
                    <div className="mr-3 truncate font-sans font-bold text-sm text-[#101010] dark:text-t-primary">{dpp.title}</div>
                    <span className={`flex flex-row justify-center items-center px-1.75 py-0.75 rounded-[6px] shrink-0 h-6 text-[10px] font-sans font-bold leading-none ${
                      isComplete 
                        ? "border border-[#00A656]/15 bg-[#00A656]/5 text-[#00A656]" 
                        : isUpcoming 
                          ? "border border-s-stroke2 bg-b-surface1 text-t-secondary" 
                          : "border border-[#EF9D0E]/15 bg-[#EF9D0E]/5 text-[#EF9D0E]"
                    } shrink-0`}>
                      {isComplete ? "Done" : isUpcoming ? "Upcoming" : "Active"}
                    </span>
                  </div>
                  
                  <div className="relative z-10 mb-2 font-sans text-xs text-[#7B7B7B]">
                    {dpp.batchName} · {dpp.subject} · Due {dpp.dueDate}
                  </div>
                  
                  <div className="relative z-10 flex justify-between items-center gap-3 mt-auto pt-2">
                    <div className="flex-1 h-1.5 bg-[rgba(123,123,123,0.15)] dark:bg-[rgba(229,229,229,0.08)] rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${isComplete ? "bg-[#00A656]" : "bg-linear-to-r from-[#00B512] to-[#00A656]"}`}
                        style={{ width: `${completion}%` }}
                      />
                    </div>
                    <span className="font-sans text-xs font-bold text-[#101010] dark:text-t-primary shrink-0">{dpp.completedCount}/{dpp.totalStudents}</span>
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
