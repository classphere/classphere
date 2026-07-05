"use client";

import Link from "next/link";
import { useState } from "react";
import Navbar from "@/components/layout/Navbar";
import { StatCard, StatCardGrid } from "@/components/shared/StatCard";
import { Modal } from "@/components/shared/Modal";
import {
  RiTeamLine,
  RiGroupLine,
  RiBankCardLine,
  RiArrowRightUpLine,
  RiMore2Fill,
  RiAddLine,
  RiArrowDownSLine,
  RiArrowRightLine,
  RiStarFill,
  RiCloseLine
} from "@remixicon/react";
import { useAuth } from "@/lib/auth-context";

// Exam mapping based on institute type
const EXAM_OPTIONS = {
  "jee-neet": [
    { id: "jee-main", label: "JEE Main" },
    { id: "jee-adv", label: "JEE Advanced" },
    { id: "neet", label: "NEET UG" },
  ],
  "ssc": [
    { id: "ssc-cgl", label: "SSC CGL" },
    { id: "ssc-chsl", label: "SSC CHSL" },
    { id: "ssc-mts", label: "SSC MTS" },
  ],
  "hybrid": [
    { id: "jee-main", label: "JEE Main" },
    { id: "neet", label: "NEET UG" },
    { id: "ssc-cgl", label: "SSC CGL" },
    { id: "ssc-chsl", label: "SSC CHSL" },
  ],
};

export default function InstituteDashboardPage() {
  const [isOverviewDropdownOpen, setIsOverviewDropdownOpen] = useState(false);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [newBatchData, setNewBatchData] = useState({
    name: "",
    examCode: "",
  });

  const { user } = useAuth();
  const mockInstituteAdmin = {
    instituteName: "Institute",
    name: user?.name ?? "Admin",
    instituteType: "hybrid",
    studentsCount: 0,
    batchesCount: 0,
    plan: "Free",
  };
  const mockBatches: any[] = [];
  const mockInstituteStudents: any[] = [];

  const availableExams = EXAM_OPTIONS[mockInstituteAdmin.instituteType as keyof typeof EXAM_OPTIONS] || EXAM_OPTIONS["hybrid"];

  return (
    <>
      <Navbar
        title={`${mockInstituteAdmin.instituteName} Dashboard`}
        subtitle={`Welcome back, ${mockInstituteAdmin.name}. Here is your institute overview.`}
        breadcrumbs="Dashboard"
      >
        {/* Create New Batch */}
        <button onClick={() => setIsBatchModalOpen(true)} className="flex flex-row justify-center items-center px-6 h-12 border border-s-stroke2 dark:border-s-stroke2/40 bg-b-surface2 dark:bg-b-surface2 text-t-secondary dark:text-t-secondary hover:text-t-primary dark:hover:text-t-primary text-sm font-sans font-semibold rounded-lg shadow-xs active:scale-95 transition-all cursor-pointer">
          <RiAddLine size={18} className="mr-1.5" /> Create New Batch
        </button>

        {/* Schedule Batch Test (Gradient) */}
        <Link
          href="/institute/tests/create"
          className="flex flex-row justify-center items-center px-6 h-12 bg-gradient-to-b from-[#2C2C2C] to-[#282828] dark:from-t-primary dark:to-t-primary/90 text-t-light dark:text-b-surface1 text-sm font-sans font-semibold rounded-lg shadow-[inset_2px_0px_8px_2px_rgba(248,248,248,0.2)] active:scale-95 transition-all cursor-pointer no-underline"
        >
          <RiAddLine size={18} className="mr-1.5" /> Schedule Batch Test
        </Link>
      </Navbar>
      
      <main className="mx-auto w-full max-w-[1560px] px-6 pb-12 pt-6 flex flex-col gap-6 select-none bg-transparent">

        {/* ── Figma-Inspired Dashboard Overview Wrapper ── */}
        <div className="group relative flex flex-col overflow-hidden p-6 md:p-8 rounded-lg bg-b-surface2 dark:bg-b-surface2 shadow-[0px_5px_1.5px_-4px_rgba(8,8,8,0.09),0px_6px_4px_-4px_rgba(8,8,8,0.05)] border border-s-stroke2/40 select-none">
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

          {/* Stats Section Wrapper (Row of 3 active highlighted boxes) */}
          <StatCardGrid cols={3} className="relative z-10">
            <StatCard
              icon={<RiGroupLine size={20} />}
              title="Total Students"
              value={mockInstituteAdmin.studentsCount}
              badge="+12"
              subtext="this month"
            />
            <StatCard
              icon={<RiTeamLine size={20} />}
              title="Active Batches"
              value={mockInstituteAdmin.batchesCount}
              badge="+2"
              subtext="completing soon"
            />
            <StatCard
              icon={<RiBankCardLine size={20} />}
              title="Subscription"
              value={mockInstituteAdmin.plan}
              badge="Active"
              subtext="Renews Aug 15"
            />
          </StatCardGrid>

        </div>

        {/* ── Main Content Grid (Recent Batches + Top Students) ── */}
        <div className="grid gap-6 lg:grid-cols-2 items-start w-full">

          {/* Recent Batches Section */}
          <div className="flex flex-col p-3 pb-6 gap-6 rounded-lg bg-b-surface2 dark:bg-b-surface2 shadow-[0px_5px_1.5px_-4px_rgba(8,8,8,0.09),0px_6px_4px_-4px_rgba(8,8,8,0.05)] border border-s-stroke2/40 w-full min-h-[580px] min-w-0 overflow-hidden select-none">
            
            {/* Header */}
            <div className="flex flex-row items-center justify-between py-2.5 px-3 w-full h-12 gap-2">
              <h4 className="font-sans font-semibold text-[20px] leading-[145%] tracking-[0.0015em] text-t-primary dark:text-t-primary">
                Recent Batches
              </h4>
              <Link 
                href="/institute/batches" 
                className="flex flex-row justify-center items-center px-4.5 py-2.5 gap-2 border border-s-stroke2 dark:border-s-stroke2 rounded-lg bg-transparent text-t-secondary dark:text-t-secondary text-sm font-sans transition-all hover:border-t-secondary active:scale-98 no-underline"
              >
                <span>View All</span>
                <RiArrowRightLine size={16} />
              </Link>
            </div>

            {/* List Rows */}
            <div className="flex flex-col gap-2 w-full min-w-0">
              {mockBatches.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <p className="text-[14px] font-sans text-t-secondary">No recent batches.</p>
                </div>
              ) : (
                mockBatches.map((batch, index) => {
                  const isHoverItem = index === 1; // Highlight second item for premium design flavor
                  
                  return (
                    <div 
                      key={batch.id}
                      className={`flex flex-row items-center justify-between p-3 gap-8 rounded-lg transition-all w-full h-[88px] min-w-0 overflow-hidden ${
                        isHoverItem 
                          ? "bg-b-surface1 dark:bg-b-surface1/40 shadow-[inset_0px_0px_0px_3px_#FFFFFF] dark:shadow-none border border-s-stroke2/20" 
                          : "bg-transparent hover:bg-b-surface1 dark:hover:bg-b-surface1/30"
                      }`}
                    >
                      {/* Left: Avatar/Icon + Title */}
                      <div className="flex flex-row items-center gap-5 flex-1 min-w-0 overflow-hidden">
                        <div className="flex w-16 h-16 items-center justify-center rounded-lg bg-b-surface1 border border-s-stroke2/40 shrink-0 text-t-secondary font-bold">
                          <RiTeamLine size={24} className="text-t-secondary" />
                        </div>
                        <div className="min-w-0 flex-1 flex flex-col">
                          <span className="font-sans font-semibold text-[16px] leading-[150%] tracking-[0.0015em] text-t-primary dark:text-t-primary truncate">
                            {batch.name}
                          </span>
                          <span className="text-xs text-t-secondary mt-0.5">
                            {batch.exam} · {batch.studentsCount} Students
                          </span>
                        </div>
                      </div>
  
                      {/* Right: Metrics + Status */}
                      <div className="flex flex-col justify-center items-end gap-1 shrink-0 min-w-[80px]">
                        <div className="font-sans font-semibold text-[16px] leading-[150%] tracking-[0.0015em] text-primary-02 text-right w-full">
                          {batch.avgScore}%
                        </div>
                        <div className="label label-green h-6 px-2 text-[10px] tracking-[0.004em] uppercase">
                          Active
                        </div>
                      </div>
  
                    </div>
                  );
                })
              )}
            </div>

          </div>

          {/* Top Students Section */}
          <div className="flex flex-col p-3 pb-6 gap-6 rounded-lg bg-b-surface2 dark:bg-b-surface2 shadow-[0px_5px_1.5px_-4px_rgba(8,8,8,0.09),0px_6px_4px_-4px_rgba(8,8,8,0.05)] border border-s-stroke2/40 w-full min-h-[580px] min-w-0 overflow-hidden select-none">
            
            {/* Header */}
            <div className="flex flex-row items-center justify-between py-2.5 px-3 w-full h-12 gap-2">
              <h4 className="font-sans font-semibold text-[20px] leading-[145%] tracking-[0.0015em] text-t-primary dark:text-t-primary">
                Top Performing Students
              </h4>
              <Link 
                href="/institute/students" 
                className="flex flex-row justify-center items-center px-4.5 py-2.5 gap-2 border border-s-stroke2 dark:border-s-stroke2 rounded-lg bg-transparent text-t-secondary dark:text-t-secondary text-sm font-sans transition-all hover:border-t-secondary active:scale-98 no-underline"
              >
                <span>View Directory</span>
                <RiArrowRightLine size={16} />
              </Link>
            </div>

            {/* List Rows */}
            <div className="flex flex-col gap-2 w-full min-w-0">
              {mockInstituteStudents.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <p className="text-[14px] font-sans text-t-secondary">No students yet.</p>
                </div>
              ) : (
                mockInstituteStudents.slice(0, 5).map((student, index) => {
                  const isHoverItem = index === 0; // Highlight first item for premium flavor
                  const scoreColor = student.avgScore >= 85 ? "text-primary-02" : "text-primary-05";
                  const performanceLevel = student.avgScore >= 90 ? "Elite" : "Excellent";
                  const performanceBadgeClass = student.avgScore >= 90
                    ? "label-green"
                    : "label-yellow";
  
                  return (
                    <div 
                      key={student.id}
                      className={`flex flex-row items-center justify-between p-3 gap-8 rounded-lg transition-all w-full h-[88px] min-w-0 overflow-hidden ${
                        isHoverItem 
                          ? "bg-b-surface1 dark:bg-b-surface1/40 shadow-[inset_0px_0px_0px_3px_#FFFFFF] dark:shadow-none border border-s-stroke2/20" 
                          : "bg-transparent hover:bg-b-surface1 dark:hover:bg-b-surface1/30"
                      }`}
                    >
                      {/* Left: Rank box + Title */}
                      <div className="flex flex-row items-center gap-5 flex-1 min-w-0 overflow-hidden">
                        <div className="flex w-16 h-16 items-center justify-center rounded-lg bg-b-surface1 border border-s-stroke2/40 shrink-0 text-t-secondary font-bold text-lg">
                          #{index + 1}
                        </div>
                        <div className="min-w-0 flex-1 flex flex-col">
                          <span className="font-sans font-semibold text-[16px] leading-[150%] tracking-[0.0015em] text-t-primary dark:text-t-primary truncate">
                            {student.name}
                          </span>
                          <span className="text-xs text-t-secondary mt-0.5">
                            {student.batch}
                          </span>
                        </div>
                      </div>
  
                      {/* Right: Metrics + Performance tag */}
                      <div className="flex flex-col justify-center items-end gap-1 shrink-0 min-w-[80px]">
                        <div className={`font-sans font-semibold text-[16px] leading-[150%] tracking-[0.0015em] ${scoreColor} text-right w-full`}>
                          {student.avgScore}%
                        </div>
                        <div className={`label h-6 px-2 text-[10px] tracking-[0.004em] uppercase ${performanceBadgeClass}`}>
                          {performanceLevel}
                        </div>
                      </div>
  
                    </div>
                  );
                })
              )}
            </div>

          </div>

        </div>

      </main>

      {/* Create Batch Modal */}
      <Modal
        open={isBatchModalOpen}
        onClose={() => setIsBatchModalOpen(false)}
        title="Create New Batch"
        subtitle={`Institute Type: ${mockInstituteAdmin.instituteType.toUpperCase()}`}
      >
        <div className="flex flex-col gap-5">
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-t-secondary">Batch Name</label>
            <input type="text" className="input-field w-full" placeholder="e.g., Target 2026 Morning" value={newBatchData.name} onChange={(e) => setNewBatchData({ ...newBatchData, name: e.target.value })} />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold text-t-secondary">Target Exam</label>
            <div className="relative">
              <select className="input-field w-full appearance-none pr-10" value={newBatchData.examCode} onChange={(e) => setNewBatchData({ ...newBatchData, examCode: e.target.value })}>
                <option value="" disabled>Select Exam...</option>
                {availableExams.map(exam => (
                  <option key={exam.id} value={exam.id}>{exam.label}</option>
                ))}
              </select>
              <RiArrowDownSLine size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-t-secondary pointer-events-none" />
            </div>
            <p className="text-xs text-t-secondary mt-2">
              Showing exams based on your institute type ({mockInstituteAdmin.instituteType}).
            </p>
          </div>

          <div className="mt-4 flex items-center justify-end gap-3 pt-4 border-t border-s-stroke2/50">
            <button onClick={() => setIsBatchModalOpen(false)} className="btn btn-ghost px-5">Cancel</button>
            <button className="btn btn-primary px-6 shadow-md" onClick={() => {
              console.log("Creating batch:", newBatchData);
              setIsBatchModalOpen(false);
            }} disabled={!newBatchData.name || !newBatchData.examCode}>
              Create Batch
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
