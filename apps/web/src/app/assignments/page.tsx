"use client";

import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import { mockStudentDPPs } from "@/lib/mock-data";
import {
  RiFileListLine,
  RiTimeLine,
  RiCheckLine,
  RiAlertLine,
  RiArrowRightLine,
} from "@remixicon/react";

export default function AssignmentsPage() {
  const pending   = mockStudentDPPs.filter(d => d.status === "pending");
  const late      = mockStudentDPPs.filter(d => d.status === "late");
  const completed = mockStudentDPPs.filter(d => d.status === "completed");

  return (
    <>
      <Navbar title="My DPPs" subtitle="Daily practice problems assigned by your teacher." breadcrumbs="My DPPs" />
      
      <main className="mx-auto w-full max-w-screen-2xl px-4 pb-10 pt-6 md:px-6 overflow-x-hidden">
        {/* Stats Row Wrapper */}
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 p-2 gap-4 w-full bg-[#F9F9F9] dark:bg-b-surface1/60 border border-[rgba(123,123,123,0.1)] dark:border-s-stroke2/40 rounded-[32px] mb-8 select-none">
          
          {/* Metric 1: Pending */}
          <div className="flex flex-col items-start p-6 gap-2 bg-[#FDFDFD] dark:bg-b-surface2 border border-[#FDFDFD] dark:border-s-stroke2/30 rounded-[24px] shadow-[0px_0px_36px_-8px_rgba(0,0,0,0.05),0px_6px_4px_-4px_rgba(8,8,8,0.05),0px_5px_1.5px_-4px_rgba(8,8,8,0.09)]">
            <div className="flex flex-row items-center gap-3 w-full mb-1">
              <span className="text-[#101010] dark:text-t-primary"><RiTimeLine size={20} /></span>
              <span className="font-sans font-semibold text-[16px] leading-[150%] tracking-[0.0015em] text-[#101010] dark:text-t-primary">
                Pending DPPs
              </span>
            </div>
            <div className="flex flex-row items-center gap-4 w-full mt-1">
              <div className="font-sans text-[54px] font-medium tracking-[-0.005em] text-[#101010] dark:text-t-primary leading-none">
                {pending.length}
              </div>
              <div className="flex flex-col items-start gap-0.5">
                <div className="flex flex-row justify-center items-center px-1.5 py-0.5 gap-1 border border-s-stroke2/20 bg-transparent rounded-lg">
                  <span className="text-[#7B7B7B] text-[12px] font-semibold leading-none">Active</span>
                </div>
                <span className="text-[12px] font-sans text-[#7B7B7B]">
                  assigned
                </span>
              </div>
            </div>
          </div>

          {/* Metric 2: Overdue */}
          <div className="flex flex-col items-start p-6 gap-2 bg-[#FDFDFD] dark:bg-b-surface2 border border-[#FDFDFD] dark:border-s-stroke2/30 rounded-[24px] shadow-[0px_0px_36px_-8px_rgba(0,0,0,0.05),0px_6px_4px_-4px_rgba(8,8,8,0.05),0px_5px_1.5px_-4px_rgba(8,8,8,0.09)]">
            <div className="flex flex-row items-center gap-3 w-full mb-1">
              <span className="text-[#101010] dark:text-t-primary"><RiAlertLine size={20} /></span>
              <span className="font-sans font-semibold text-[16px] leading-[150%] tracking-[0.0015em] text-[#101010] dark:text-t-primary">
                Overdue DPPs
              </span>
            </div>
            <div className="flex flex-row items-center gap-4 w-full mt-1">
              <div className="font-sans text-[54px] font-medium tracking-[-0.005em] text-[#101010] dark:text-t-primary leading-none">
                {late.length}
              </div>
              <div className="flex flex-col items-start gap-0.5">
                <div className="flex flex-row justify-center items-center px-1.5 py-0.5 gap-1 border border-s-stroke2/20 bg-transparent rounded-lg">
                  <span className="text-[#7B7B7B] text-[12px] font-semibold leading-none">Late</span>
                </div>
                <span className="text-[12px] font-sans text-[#7B7B7B]">
                  needs action
                </span>
              </div>
            </div>
          </div>

          {/* Metric 3: Completed */}
          <div className="flex flex-col items-start p-6 gap-2 bg-[#FDFDFD] dark:bg-b-surface2 border border-[#FDFDFD] dark:border-s-stroke2/30 rounded-[24px] shadow-[0px_0px_36px_-8px_rgba(0,0,0,0.05),0px_6px_4px_-4px_rgba(8,8,8,0.05),0px_5px_1.5px_-4px_rgba(8,8,8,0.09)]">
            <div className="flex flex-row items-center gap-3 w-full mb-1">
              <span className="text-[#101010] dark:text-t-primary"><RiCheckLine size={20} /></span>
              <span className="font-sans font-semibold text-[16px] leading-[150%] tracking-[0.0015em] text-[#101010] dark:text-t-primary">
                Completed DPPs
              </span>
            </div>
            <div className="flex flex-row items-center gap-4 w-full mt-1">
              <div className="font-sans text-[54px] font-medium tracking-[-0.005em] text-[#101010] dark:text-t-primary leading-none">
                {completed.length}
              </div>
              <div className="flex flex-col items-start gap-0.5">
                <div className="flex flex-row justify-center items-center px-1.5 py-0.5 gap-1 border border-s-stroke2/20 bg-transparent rounded-lg">
                  <span className="text-[#7B7B7B] text-[12px] font-semibold leading-none">Done</span>
                </div>
                <span className="text-[12px] font-sans text-[#7B7B7B]">
                  submitted
                </span>
              </div>
            </div>
          </div>

        </div>

        {/* Overdue - show first, most urgent */}
        {late.length > 0 && (
          <div className="group relative card flex flex-col overflow-hidden p-6 md:p-8 rounded-[32px] bg-[#FDFDFD] dark:bg-b-surface2 shadow-[0px_5px_1.5px_-4px_rgba(8,8,8,0.09),0px_6px_4px_-4px_rgba(8,8,8,0.05)] border border-s-stroke2/40 select-none mb-8">
            <div className="box-hover" />
            <div className="relative z-10 flex flex-row justify-between items-center w-full mb-6">
              <div>
                <h3 className="font-sans text-[20px] font-semibold tracking-[0.0015em] leading-[145%] text-[#101010] dark:text-t-primary">
                  Overdue DPPs
                </h3>
                <p className="text-[12px] font-sans text-[#7B7B7B] mt-0.5">
                  These practice papers have passed their deadline
                </p>
              </div>
              <span className="flex flex-row justify-center items-center px-2.5 py-1 rounded-lg border border-s-stroke2/20 bg-transparent text-[#7B7B7B] text-[12px] font-sans font-semibold tracking-[0.004em] shrink-0">
                Requires Attention
              </span>
            </div>
            
            <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 p-2 gap-4 w-full bg-[#F9F9F9] dark:bg-b-surface1/60 border border-[rgba(123,123,123,0.1)] dark:border-s-stroke2/40 rounded-[32px]">
              {late.map(dpp => (
                <DPPCard key={dpp.id} dpp={dpp} />
              ))}
            </div>
          </div>
        )}

        {/* Pending */}
        {pending.length > 0 && (
          <div className="group relative card flex flex-col overflow-hidden p-6 md:p-8 rounded-[32px] bg-[#FDFDFD] dark:bg-b-surface2 shadow-[0px_5px_1.5px_-4px_rgba(8,8,8,0.09),0px_6px_4px_-4px_rgba(8,8,8,0.05)] border border-s-stroke2/40 select-none mb-8">
            <div className="box-hover" />
            <div className="relative z-10 flex flex-row justify-between items-center w-full mb-6">
              <div>
                <h3 className="font-sans text-[20px] font-semibold tracking-[0.0015em] leading-[145%] text-[#101010] dark:text-t-primary">
                  Pending DPPs
                </h3>
                <p className="text-[12px] font-sans text-[#7B7B7B] mt-0.5">
                  Active practice assignments assigned to you
                </p>
              </div>
              <span className="flex flex-row justify-center items-center px-2.5 py-1 rounded-lg border border-s-stroke2/20 bg-transparent text-[#7B7B7B] text-[12px] font-sans font-semibold tracking-[0.004em] shrink-0">
                In Progress
              </span>
            </div>
            
            <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 p-2 gap-4 w-full bg-[#F9F9F9] dark:bg-b-surface1/60 border border-[rgba(123,123,123,0.1)] dark:border-s-stroke2/40 rounded-[32px]">
              {pending.map(dpp => (
                <DPPCard key={dpp.id} dpp={dpp} />
              ))}
            </div>
          </div>
        )}

        {/* Completed */}
        {completed.length > 0 && (
          <div className="group relative card flex flex-col overflow-hidden p-6 md:p-8 rounded-[32px] bg-[#FDFDFD] dark:bg-b-surface2 shadow-[0px_5px_1.5px_-4px_rgba(8,8,8,0.09),0px_6px_4px_-4px_rgba(8,8,8,0.05)] border border-s-stroke2/40 select-none">
            <div className="box-hover" />
            <div className="relative z-10 flex flex-row justify-between items-center w-full mb-6">
              <div>
                <h3 className="font-sans text-[20px] font-semibold tracking-[0.0015em] leading-[145%] text-[#101010] dark:text-t-primary">
                  Completed DPPs
                </h3>
                <p className="text-[12px] font-sans text-[#7B7B7B] mt-0.5">
                  Successfully finished practice papers and reports
                </p>
              </div>
              <span className="flex flex-row justify-center items-center px-2.5 py-1 rounded-lg border border-s-stroke2/20 bg-transparent text-[#7B7B7B] text-[12px] font-sans font-semibold tracking-[0.004em] shrink-0">
                Completed
              </span>
            </div>
            
            <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 p-2 gap-4 w-full bg-[#F9F9F9] dark:bg-b-surface1/60 border border-[rgba(123,123,123,0.1)] dark:border-s-stroke2/40 rounded-[32px]">
              {completed.map(dpp => (
                <DPPCard key={dpp.id} dpp={dpp} />
              ))}
            </div>
          </div>
        )}

        {mockStudentDPPs.length === 0 && (
          <div className="group relative card text-center py-20 text-t-secondary rounded-[32px] bg-[#FDFDFD] dark:bg-b-surface2 shadow-[0px_5px_1.5px_-4px_rgba(8,8,8,0.09),0px_6px_4px_-4px_rgba(8,8,8,0.05)] border border-s-stroke2/40">
            <div className="box-hover" />
            <RiFileListLine size={48} className="mx-auto mb-4 text-t-tertiary relative z-10" />
            <p className="font-semibold text-body-2 relative z-10">No DPPs assigned yet.</p>
          </div>
        )}
      </main>
    </>
  );
}

function DPPCard({ dpp }: { dpp: typeof mockStudentDPPs[0] }) {
  const isCompleted = dpp.status === "completed";
  const isLate = dpp.status === "late";

  return (
    <div 
      className="flex min-h-[10.5rem] flex-col justify-between p-5 bg-[#FDFDFD] dark:bg-b-surface2 border border-[#E2E2E2] dark:border-s-stroke2/30 rounded-[24px] shadow-[0px_6px_4px_-4px_rgba(8,8,8,0.05),0px_5px_1.5px_-4px_rgba(8,8,8,0.09)]"
    >
      <div className="min-w-0 flex-1">
        {/* Header Status Badge Row */}
        <div className="flex justify-between items-center mb-3">
          <span className="text-[12px] font-sans font-semibold text-[#7B7B7B] uppercase tracking-wider">
            {dpp.subject}
          </span>
          {isLate ? (
            <div className="flex flex-row justify-center items-center px-1.5 py-0.5 border border-s-stroke2/20 bg-transparent rounded-lg">
              <span className="text-[#7B7B7B] text-[10px] font-bold leading-none">Overdue</span>
            </div>
          ) : isCompleted ? (
            <div className="flex flex-row justify-center items-center px-1.5 py-0.5 border border-s-stroke2/20 bg-transparent rounded-lg">
              <span className="text-[#7B7B7B] text-[10px] font-bold leading-none">Completed</span>
            </div>
          ) : (
            <div className="flex flex-row justify-center items-center px-1.5 py-0.5 border border-s-stroke2/20 bg-transparent rounded-lg">
              <span className="text-[#7B7B7B] text-[10px] font-bold leading-none">Pending</span>
            </div>
          )}
        </div>
        
        <div className="truncate font-sans font-semibold text-[16px] leading-[150%] tracking-[0.0015em] text-[#101010] dark:text-t-primary">
          {dpp.title}
        </div>
        <div className="text-[12px] font-sans text-[#7B7B7B] mt-1">
          {dpp.totalQuestions} Questions · {dpp.chapter}
        </div>
      </div>

      <div className="flex justify-between items-center mt-4 pt-3 border-t border-s-stroke2/30">
        <span className="text-[12px] font-sans font-semibold text-[#7B7B7B]">
          Due: {dpp.dueDate}
        </span>
        {isCompleted ? (
          <div className="flex flex-col items-end">
            <span className="text-sm font-sans font-bold text-[#101010] dark:text-t-primary">{dpp.score}/{dpp.maxScore} marks</span>
            <span className="text-[10px] font-sans text-[#7B7B7B]">{dpp.timeTakenMin} mins</span>
          </div>
        ) : (
          <Link 
            href={`/assignments/${dpp.id}`} 
            className="flex flex-row justify-center items-center h-8 px-5 bg-[#101010] hover:bg-[#202020] text-[#FDFDFD] dark:bg-t-primary dark:text-b-surface1 dark:hover:bg-t-primary/90 text-[12px] font-sans font-semibold rounded-full transition-all active:scale-95 shadow-widget"
          >
            {isLate ? "Submit Late" : "Start"}
          </Link>
        )}
      </div>
    </div>
  );
}
