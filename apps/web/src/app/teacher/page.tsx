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
  RiFileListLine
} from "@remixicon/react";
import { mockTeacher, mockBatches, mockDPPs } from "../../lib/mock-data";

export default function TeacherDashboardPage() {
  const pendingDPPs = mockDPPs.filter(d => d.status === "pending" || d.status === "upcoming");
  const completedDPPs = mockDPPs.filter(d => d.status === "completed");

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
        
        {/* KPI Cards */}
        <div className="mb-6 grid gap-6 md:grid-cols-3">
          
          {/* KPI 1: Total Students */}
          <div className="group relative card flex flex-col p-6 rounded-[32px] bg-[#FDFDFD] dark:bg-b-surface2 shadow-[0px_5px_1.5px_-4px_rgba(8,8,8,0.09),0px_6px_4px_-4px_rgba(8,8,8,0.05)] border border-s-stroke2/40 overflow-hidden select-none">
            <div className="box-hover" />
            <div className="relative z-10 flex items-center gap-3.5 mb-4">
              <div className="flex items-center justify-center size-10 rounded-xl bg-[#FDFDFD] dark:bg-b-surface2 border border-s-stroke2/30 text-[#727272] dark:text-t-secondary shadow-xs">
                <RiTeamLine size={20} />
              </div>
              <span className="font-sans text-[14px] font-semibold text-[#7B7B7B] tracking-[0.005em]">
                Total Students
              </span>
            </div>
            <div className="relative z-10 font-sans text-[48px] font-medium tracking-[-0.015em] text-[#101010] dark:text-t-primary leading-[110%] mb-1">
              465
            </div>
            <span className="relative z-10 font-sans text-[12px] font-medium text-[#7B7B7B] tracking-[0.004em]">
              Across 3 active batches
            </span>
          </div>

          {/* KPI 2: Average Batch Score */}
          <div className="group relative card flex flex-col p-6 rounded-[32px] bg-[#FDFDFD] dark:bg-b-surface2 shadow-[0px_5px_1.5px_-4px_rgba(8,8,8,0.09),0px_6px_4px_-4px_rgba(8,8,8,0.05)] border border-s-stroke2/40 overflow-hidden select-none">
            <div className="box-hover" />
            <div className="relative z-10 flex items-center gap-3.5 mb-4">
              <div className="flex items-center justify-center size-10 rounded-xl bg-[#FDFDFD] dark:bg-b-surface2 border border-s-stroke2/30 text-[#727272] dark:text-t-secondary shadow-xs">
                <RiFileChartLine size={20} />
              </div>
              <span className="font-sans text-[14px] font-semibold text-[#7B7B7B] tracking-[0.005em]">
                Avg Batch Score
              </span>
            </div>
            <div className="relative z-10 flex items-baseline gap-2.5 mb-1">
              <div className="font-sans text-[48px] font-medium tracking-[-0.015em] text-[#101010] dark:text-t-primary leading-[110%]">
                67.4%
              </div>
              <div className="flex flex-row justify-center items-center px-1.75 py-0.75 gap-0.5 border border-[#00A656]/15 bg-[#00A656]/5 text-[#00A656] rounded-[6px] shrink-0 h-6">
                <RiArrowRightUpLine size={12} className="shrink-0" />
                <span className="text-[11px] font-sans font-bold leading-none">+2.1%</span>
              </div>
            </div>
            <span className="relative z-10 font-sans text-[12px] font-medium text-[#7B7B7B] tracking-[0.004em]">
              Compared to last week
            </span>
          </div>

          {/* KPI 3: Upcoming Tests */}
          <div className="group relative card flex flex-col p-6 rounded-[32px] bg-[#FDFDFD] dark:bg-b-surface2 shadow-[0px_5px_1.5px_-4px_rgba(8,8,8,0.09),0px_6px_4px_-4px_rgba(8,8,8,0.05)] border border-s-stroke2/40 overflow-hidden select-none">
            <div className="box-hover" />
            <div className="relative z-10 flex items-center gap-3.5 mb-4">
              <div className="flex items-center justify-center size-10 rounded-xl bg-[#FDFDFD] dark:bg-b-surface2 border border-s-stroke2/30 text-[#727272] dark:text-t-secondary shadow-xs">
                <RiCalendarEventLine size={20} />
              </div>
              <span className="font-sans text-[14px] font-semibold text-[#7B7B7B] tracking-[0.005em]">
                Upcoming Tests
              </span>
            </div>
            <div className="relative z-10 font-sans text-[48px] font-medium tracking-[-0.015em] text-[#101010] dark:text-t-primary leading-[110%] mb-1">
              2
            </div>
            <span className="relative z-10 font-sans text-[12px] font-medium text-[#7B7B7B] tracking-[0.004em]">
              Scheduled for this week
            </span>
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
          <div className="group relative card flex min-w-0 flex-col overflow-hidden rounded-[32px] bg-[#FDFDFD] dark:bg-b-surface2 shadow-[0px_5px_1.5px_-4px_rgba(8,8,8,0.09),0px_6px_4px_-4px_rgba(8,8,8,0.05)] border border-s-stroke2/40 p-6 md:p-8 select-none">
            <div className="flex justify-between items-center mb-6 z-10">
              <h2 className="font-sans font-bold text-[20px] text-[#101010] dark:text-t-primary">AI Attention Flags</h2>
              <button className="flex items-center justify-center size-8 rounded-full text-[#7B7B7B] hover:text-[#101010] dark:hover:text-t-primary hover:bg-[#F9F9F9] dark:hover:bg-b-surface3 border border-s-stroke2/30 bg-[#FDFDFD] dark:bg-b-surface2 transition-all active:scale-95 shadow-xs cursor-pointer shrink-0">
                <RiSettings4Line size={18} />
              </button>
            </div>

            <div className="flex flex-col gap-4 flex-1 z-10">
              {[
                { name: "Rohan Gupta", batch: "JEE 2026 Morning", issue: "Score dropped 30% since last week's Physics test. Recommending a 1-on-1 session." },
                { name: "Carnot Cycle Failure", batch: "Concept revision", issue: "73% of NEET 2026 Droppers failed Carnot Cycle efficiency problems. Needs revision class." },
                { name: "Sneha Reddy", batch: "NEET 2026 Droppers", issue: "Missed 3 consecutive batch tests." }
              ].map((flag, idx) => (
                <div key={idx} className="p-4 bg-[#F9F9F9] dark:bg-[#1E1E1E]/40 border border-s-stroke2/20 rounded-[20px] shadow-xs hover:border-s-stroke2/40 transition-colors">
                  <h4 className="font-sans font-semibold text-sm text-[#101010] dark:text-t-primary mb-0.5">{flag.name}</h4>
                  <div className="font-sans text-[11px] text-[#7B7B7B] font-bold tracking-wider uppercase mb-2">{flag.batch}</div>
                  <p className="font-sans text-[12px] text-[#7B7B7B] dark:text-t-secondary leading-relaxed">{flag.issue}</p>
                </div>
              ))}
            </div>

            <button className="w-full h-10 rounded-xl text-xs font-semibold bg-[#FDFDFD] dark:bg-b-surface2 hover:bg-[#F9F9F9] dark:hover:bg-b-surface3 border border-s-stroke2/30 text-t-secondary hover:text-t-primary transition-all active:scale-95 shadow-xs cursor-pointer mt-6 z-10">
              View All Flags
            </button>
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
