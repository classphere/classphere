"use client";

import { useState } from "react";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import { StatCard, StatCardGrid } from "@/components/shared/StatCard";
import {
  RiTeamLine,
  RiFileChartLine,
  RiCalendarEventLine,
  RiArrowRightUpLine,
  RiSettings4Line,
  RiFileListLine,
  RiArrowDownSLine
} from "@remixicon/react";
import { useAuth } from "@/lib/auth-context";

export default function TeacherDashboardPage() {
  const pendingDPPs: any[] = [];
  const completedDPPs: any[] = [];
  const mockBatches: any[] = [];
  const mockDPPs: any[] = [];
  const { user } = useAuth();
  const [isOverviewDropdownOpen, setIsOverviewDropdownOpen] = useState(false);

  const flags: any[] = [];

  // Time-based greeting title
  const getGreeting = () => {
    const hours = new Date().getHours();
    const nameParts = (user?.name || "Teacher").split(" ");
    const displayName = nameParts.length > 1 ? `${nameParts[0]} ${nameParts[nameParts.length - 1]}` : (user?.name || "Teacher");
    
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
        subtitle={`Here's the latest from your assigned batches.`} 
        breadcrumbs="Dashboard" 
      />
      
      <main className="mx-auto w-full max-w-screen-2xl px-4 pb-10 pt-6 md:px-6 overflow-x-hidden">
        
        {/* Stats Section Wrapper (Row of 3 active highlighted boxes) */}
        <StatCardGrid cols={3} className="relative z-10 mb-6">
          <StatCard
            icon={<RiTeamLine size={20} />}
            title="Total Students"
            value={0}
            subtext="across 0 batches"
          />
          <StatCard
            icon={<RiFileChartLine size={20} />}
            title="Avg Batch Score"
            value="0%"
            badge="0%"
            subtext="vs last week"
          />
          <StatCard
            icon={<RiCalendarEventLine size={20} />}
            title="Upcoming Tests"
            value={0}
            subtext="this week"
          />
        </StatCardGrid>

        {/* Main Content Grid — Batches (left) + AI Flags (right) */}
        <div className="mb-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">

          {/* Batches Card */}
          <div className="group relative flex min-w-0 flex-col overflow-hidden rounded-lg bg-b-surface2 dark:bg-b-surface2 shadow-[0px_5px_1.5px_-4px_rgba(8,8,8,0.09),0px_6px_4px_-4px_rgba(8,8,8,0.05)] border border-s-stroke2/40 p-6 md:p-8 select-none h-full">
            <div className="box-hover" />

            {/* Header */}
            <div className="relative z-10 flex justify-between items-center mb-6">
              <h2 className="font-sans font-semibold text-[20px] leading-[145%] text-t-primary dark:text-t-primary">Your Active Batches</h2>
              <Link
                href="/teacher/analytics"
                className="h-9 px-4 rounded-lg text-xs font-semibold border-[1.5px] border-s-stroke2 dark:border-s-stroke2/50 text-t-secondary hover:text-t-primary hover:border-t-secondary transition-all active:scale-95 cursor-pointer"
              >
                View All
              </Link>
            </div>

            {/* Nested grey DPP-style grid of cards */}
            <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1 p-2 w-full bg-b-surface1 dark:bg-b-surface1/60 border border-s-stroke2/40 dark:border-s-stroke2/40 rounded-lg">
              {mockBatches.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-8 w-full text-center">
                  <p className="text-[14px] font-sans text-t-secondary">No batches assigned yet.</p>
                </div>
              ) : (
                mockBatches.map((batch, i) => {
                  const iconMeta = [
                    { iconContainerClass: "bg-primary-01/10 border border-primary-01/20 text-primary-01" },
                    { iconContainerClass: "bg-primary-02/10 border border-primary-02/20 text-primary-02" },
                    { iconContainerClass: "bg-primary-05/10 border border-primary-05/20 text-primary-05" },
                  ][i % 3];
  
                  return (
                    <div
                      key={batch.id}
                      className="flex min-h-[10.5rem] flex-col justify-between p-5 bg-b-surface2 dark:bg-b-surface2 border border-s-border dark:border-s-stroke2/30 rounded-lg shadow-[0px_0px_36px_-8px_rgba(0,0,0,0.05),0px_6px_4px_-4px_rgba(8,8,8,0.05),0px_5px_1.5px_-4px_rgba(8,8,8,0.09)] transition-all hover:scale-[1.01]"
                    >
                      <div className="min-w-0 flex-1">
                        {/* Header Status Badge Row */}
                        <div className="flex justify-between items-center mb-3">
                          <span className="text-[12px] font-sans font-semibold text-t-secondary uppercase tracking-wider">
                            {batch.exam}
                          </span>
                          <div className={`size-8 rounded-lg flex items-center justify-center shrink-0 ${iconMeta.iconContainerClass}`}>
                            <RiTeamLine size={16} />
                          </div>
                        </div>
                        
                        <div className="truncate font-sans font-semibold text-[16px] leading-[150%] tracking-[0.0015em] text-t-primary dark:text-t-primary">
                          {batch.name}
                        </div>
                        <div className="text-[12px] font-sans text-t-secondary mt-1">
                          {batch.studentsCount} students · 3 active DPPs
                        </div>
  
                        {/* Progress Bar representing Avg Score */}
                        <div className="w-full h-1 bg-[rgba(123,123,123,0.15)] dark:bg-[rgba(229,229,229,0.08)] rounded-full overflow-hidden mt-3">
                          <div
                            className="h-full rounded-full bg-primary-02"
                            style={{ width: `${batch.avgScore}%` }}
                          />
                        </div>
                      </div>
  
                      <div className="flex justify-between items-center mt-4 pt-3 border-t border-s-stroke2/30">
                        <span className="text-[12px] font-sans font-semibold text-t-secondary">
                          Avg: {batch.avgScore}%
                        </span>
                        <Link
                          href={`/teacher/batch/${batch.id}`}
                          className="flex flex-row justify-center items-center h-8 px-4 bg-shade-02 hover:bg-shade-04 text-t-light dark:bg-t-primary dark:text-b-surface1 dark:hover:bg-t-primary/90 text-[12px] font-sans font-semibold rounded-lg transition-all active:scale-95 shadow-widget cursor-pointer"
                        >
                          Analysis
                        </Link>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* AI Attention Flags Card */}
          <div className="flex w-full xl:w-[368px] xl:h-[624px] shrink-0 flex-col justify-between overflow-hidden rounded-lg bg-b-surface2 dark:bg-b-surface2 shadow-[0px_5px_1.5px_-4px_rgba(8,8,8,0.09),0px_6px_4px_-4px_rgba(8, 8, 8, 0.05)] border border-s-stroke2/40 p-3 pb-6 select-none box-sizing:border-box">
            
            {/* Container (Header + Product List) */}
            <div className="flex flex-col items-start p-0 gap-3 w-full">
              
              {/* Header */}
              <div className="flex flex-row items-center justify-between p-2.5 px-3 gap-2 w-full h-12">
                <h3 className="font-sans font-semibold text-[20px] leading-[145%] tracking-[0.0015em] text-t-primary dark:text-t-primary">
                  AI Attention Flags
                </h3>
                <button className="flex items-center justify-center size-8 rounded-full text-t-secondary hover:text-t-primary dark:hover:text-t-primary hover:bg-b-surface1 dark:hover:bg-b-surface3 border border-s-stroke2/30 bg-b-surface2 dark:bg-b-surface2 transition-all active:scale-95 shadow-xs cursor-pointer shrink-0">
                  <RiSettings4Line size={18} />
                </button>
              </div>

              {/* Product List */}
              <div className="flex flex-col items-start p-0 gap-1 w-full">
                {flags.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 w-full text-center">
                    <p className="text-[14px] font-sans text-t-secondary">No flags to review.</p>
                  </div>
                ) : (
                  flags.map((flag, idx) => (
                    <div 
                      key={idx} 
                      className={`flex flex-row items-center p-3 gap-8 w-full h-[88px] rounded-lg transition-all ${
                        flag.highlighted 
                          ? "bg-b-surface1 dark:bg-b-surface1 shadow-[inset_0_0_0_3px_#FFFFFF] dark:shadow-[inset_0_0_0_3px_rgba(255,255,255,0.05)] border border-s-stroke2/20" 
                          : "bg-transparent border border-transparent"
                      }`}
                    >
                      {/* Frame 1000002574 (Image + Title/Batch) */}
                      <div className="flex flex-row items-center gap-5 flex-1 min-w-0 h-16">
                        {/* Image / Icon */}
                        <img 
                          src={flag.avatar} 
                          alt={flag.name}
                          className="w-16 h-16 rounded-lg shrink-0 object-cover border border-s-stroke2/20"
                        />
  
                        {/* Title & Batch */}
                        <div className="flex flex-col items-start justify-center flex-1 min-w-0 h-12">
                          <span className="font-sans font-semibold text-[16px] leading-[150%] tracking-[0.0015em] text-t-primary dark:text-t-primary truncate w-full">
                            {flag.name}
                          </span>
                          <span className="font-sans text-[12px] font-normal leading-[160%] tracking-[0.004em] text-t-secondary truncate w-full">
                            {flag.batch}
                          </span>
                        </div>
                      </div>
  
                      {/* Frame 1000002607 (Price/Metric + Status Badge) */}
                      <div className="flex flex-col justify-center items-end p-0 gap-1 shrink-0 w-24">
                        {/* Metric */}
                        <span className="font-sans font-semibold text-[16px] leading-[150%] tracking-[0.0015em] text-right text-t-primary dark:text-t-primary truncate w-full">
                          {flag.metric}
                        </span>
                        
                        {/* Status badge */}
                        <div className={`label h-6 px-2 gap-2 ${
                          flag.statusType === "green"
                            ? "label-green"
                            : flag.statusType === "yellow"
                              ? "label-yellow"
                              : "label-red"
                        }`}>
                          <span className="font-sans text-[12px] font-normal leading-[160%] tracking-[0.004em]">
                            {flag.status}
                          </span>
                        </div>
                      </div>
  
                    </div>
                  ))
                )}
              </div>

            </div>

            {/* Footer / All Products Button */}
            <div className="flex flex-col items-start p-0 px-3 gap-2 w-full mt-6">
              <button className="flex flex-row justify-center items-center p-3.5 px-7 gap-2 w-full h-12 border border-s-stroke2 dark:border-s-stroke2 rounded-lg bg-transparent text-t-secondary dark:text-t-secondary font-sans font-semibold text-[14px] leading-none tracking-[0.0125em] transition-all hover:border-t-secondary hover:text-t-primary dark:hover:text-t-primary active:scale-98 cursor-pointer">
                View All Flags
              </button>
            </div>

          </div>

        </div>

        {/* DPP Activity — full width row below the main grid */}
        <div className="group relative card flex flex-col overflow-hidden rounded-lg bg-b-surface2 dark:bg-b-surface2 shadow-[0px_5px_1.5px_-4px_rgba(8,8,8,0.09),0px_6px_4px_-4px_rgba(8,8,8,0.05)] border border-s-stroke2/40 p-6 md:p-8 select-none">
          <div className="flex justify-between items-center mb-6 z-10">
            <div className="flex items-center gap-3.5">
              <div className="flex items-center justify-center size-10 rounded-lg bg-b-surface2 dark:bg-b-surface2 border border-s-stroke2/30 text-t-secondary dark:text-t-secondary shadow-xs">
                <RiFileListLine size={20} />
              </div>
              <div>
                <h2 className="font-sans font-bold text-[20px] text-t-primary dark:text-t-primary">DPP Activity</h2>
                <p className="font-sans text-[12px] font-medium text-t-secondary tracking-[0.004em] mt-0.5">{pendingDPPs.length} active · {completedDPPs.length} completed across all batches</p>
              </div>
            </div>
            <Link 
              href="/teacher/dpps" 
              className="h-9 px-4 rounded-lg text-xs font-semibold bg-shade-02 dark:bg-t-primary text-t-light dark:text-black hover:bg-shade-04 dark:hover:bg-t-secondary transition-all active:scale-95 shadow-xs shrink-0 flex items-center gap-1.5 cursor-pointer"
            >
              <RiFileListLine size={16} /> Manage DPPs
            </Link>
          </div>

          {/* DPPs Grid Wrapper (p-2 grey nested background container, matching top cards) */}
          <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 p-2 gap-4 w-full bg-b-surface1 dark:bg-b-surface1/60 border border-s-stroke2/40 dark:border-s-stroke2/40 rounded-lg">
            {mockDPPs.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 w-full text-center md:col-span-3">
                <p className="text-[14px] font-sans text-t-secondary">No DPP activity yet.</p>
              </div>
            ) : (
              mockDPPs.map(dpp => {
                const completion = Math.round((dpp.completedCount / dpp.totalStudents) * 100);
                const isComplete = dpp.status === "completed";
                const isUpcoming = dpp.status === "upcoming";
                
                return (
                  <div
                    key={dpp.id}
                    className="flex min-h-[10.5rem] flex-col justify-between p-5 bg-b-surface2 dark:bg-b-surface2 border border-s-border dark:border-s-stroke2/30 rounded-lg shadow-[0px_0px_36px_-8px_rgba(0,0,0,0.05),0px_6px_4px_-4px_rgba(8,8,8,0.05),0px_5px_1.5px_-4px_rgba(8,8,8,0.09)] transition-all hover:scale-[1.01]"
                  >
                    <div className="min-w-0 flex-1">
                      {/* Header Status Badge Row */}
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-[12px] font-sans font-semibold text-t-secondary uppercase tracking-wider">
                          {dpp.subject}
                        </span>
                        <span className="text-[12px] font-sans font-medium text-t-secondary">
                          {isComplete ? "Completed" : isUpcoming ? "Upcoming" : "Pending"}
                        </span>
                      </div>
                      
                      <div className="truncate font-sans font-semibold text-[16px] leading-[150%] tracking-[0.0015em] text-t-primary dark:text-t-primary">
                        {dpp.title}
                      </div>
                      <div className="text-[12px] font-sans text-t-secondary mt-1">
                        {dpp.batchName} · {dpp.completedCount}/{dpp.totalStudents} Submitted ({completion}%)
                      </div>
  
                      {/* Progress Bar in between */}
                      <div className="w-full h-1 bg-[rgba(123,123,123,0.15)] dark:bg-[rgba(229,229,229,0.08)] rounded-full overflow-hidden mt-3">
                        <div
                          className={`h-full rounded-full transition-all ${
                            isComplete 
                              ? "bg-primary-02" 
                              : isUpcoming 
                                ? "bg-t-secondary" 
                                : "bg-gradient-to-r from-[#EF9D0E] to-[#F1C40F]"
                          }`}
                          style={{ width: `${completion}%` }}
                        />
                      </div>
                    </div>
  
                    <div className="flex justify-between items-center mt-4 pt-3 border-t border-s-stroke2/30">
                      <span className="text-[12px] font-sans font-semibold text-t-secondary">
                        Due: {dpp.dueDate}
                      </span>
                      <button className="flex flex-row justify-center items-center h-8 px-5 bg-shade-02 hover:bg-shade-04 text-t-light dark:bg-t-primary dark:text-b-surface1 dark:hover:bg-t-primary/90 text-[12px] font-sans font-semibold rounded-lg transition-all active:scale-95 shadow-widget">
                        {isComplete ? "Reports" : isUpcoming ? "Edit" : "Stats"}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </main>
    </>
  );
}
