"use client";

import Link from "next/link";
import Navbar from "@/components/layout/Navbar";

import {
  RiFileListLine,
  RiTimeLine,
  RiCheckLine,
  RiAlertLine,
  RiArrowRightLine,
} from "@remixicon/react";

export default function AssignmentsPage() {
  const pending: any[] = [];
  const late: any[] = [];
  const completed: any[] = [];

  return (
    <>
      <Navbar title="My DPPs" subtitle="Daily practice problems assigned by your teacher." breadcrumbs="My DPPs" />
      
      <main className="mx-auto w-full max-w-screen-2xl px-4 pb-10 pt-6 md:px-6 overflow-x-hidden">
        {/* Stats Row Wrapper */}
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 p-2 gap-4 w-full bg-b-surface1 dark:bg-b-surface1/60 border border-s-stroke2/40 dark:border-s-stroke2/40 rounded-lg mb-8 select-none">
          
          {/* Metric 1: Pending */}
          <div className="flex flex-col items-start p-6 gap-2 bg-b-surface2 dark:bg-b-surface2 border border-s-border dark:border-s-stroke2/30 rounded-lg shadow-[0px_0px_36px_-8px_rgba(0,0,0,0.05),0px_6px_4px_-4px_rgba(8,8,8,0.05),0px_5px_1.5px_-4px_rgba(8,8,8,0.09)]">
            <div className="flex flex-row items-center gap-3 w-full mb-1">
              <span className="text-t-primary dark:text-t-primary"><RiTimeLine size={20} /></span>
              <span className="font-sans font-semibold text-[16px] leading-[150%] tracking-[0.0015em] text-t-primary dark:text-t-primary">
                Pending DPPs
              </span>
            </div>
            <div className="flex flex-row items-center gap-4 w-full mt-1">
              <div className="font-sans text-4xl font-medium tracking-[-0.005em] text-t-primary dark:text-t-primary leading-none">
                {pending.length}
              </div>
              <div className="flex flex-col items-start gap-0.5">
                <div className="flex flex-row justify-center items-center px-1.5 py-0.5 gap-1 border border-s-stroke2/20 bg-transparent rounded-lg">
                  <span className="text-t-secondary text-[12px] font-semibold leading-none">Active</span>
                </div>
                <span className="text-[12px] font-sans text-t-secondary">
                  assigned
                </span>
              </div>
            </div>
          </div>

          {/* Metric 2: Overdue */}
          <div className="flex flex-col items-start p-6 gap-2 bg-b-surface2 dark:bg-b-surface2 border border-s-border dark:border-s-stroke2/30 rounded-lg shadow-[0px_0px_36px_-8px_rgba(0,0,0,0.05),0px_6px_4px_-4px_rgba(8,8,8,0.05),0px_5px_1.5px_-4px_rgba(8,8,8,0.09)]">
            <div className="flex flex-row items-center gap-3 w-full mb-1">
              <span className="text-t-primary dark:text-t-primary"><RiAlertLine size={20} /></span>
              <span className="font-sans font-semibold text-[16px] leading-[150%] tracking-[0.0015em] text-t-primary dark:text-t-primary">
                Overdue DPPs
              </span>
            </div>
            <div className="flex flex-row items-center gap-4 w-full mt-1">
              <div className="font-sans text-4xl font-medium tracking-[-0.005em] text-t-primary dark:text-t-primary leading-none">
                {late.length}
              </div>
              <div className="flex flex-col items-start gap-0.5">
                <div className="flex flex-row justify-center items-center px-1.5 py-0.5 gap-1 border border-s-stroke2/20 bg-transparent rounded-lg">
                  <span className="text-t-secondary text-[12px] font-semibold leading-none">Late</span>
                </div>
                <span className="text-[12px] font-sans text-t-secondary">
                  needs action
                </span>
              </div>
            </div>
          </div>

          {/* Metric 3: Completed */}
          <div className="flex flex-col items-start p-6 gap-2 bg-b-surface2 dark:bg-b-surface2 border border-s-border dark:border-s-stroke2/30 rounded-lg shadow-[0px_0px_36px_-8px_rgba(0,0,0,0.05),0px_6px_4px_-4px_rgba(8,8,8,0.05),0px_5px_1.5px_-4px_rgba(8,8,8,0.09)]">
            <div className="flex flex-row items-center gap-3 w-full mb-1">
              <span className="text-t-primary dark:text-t-primary"><RiCheckLine size={20} /></span>
              <span className="font-sans font-semibold text-[16px] leading-[150%] tracking-[0.0015em] text-t-primary dark:text-t-primary">
                Completed DPPs
              </span>
            </div>
            <div className="flex flex-row items-center gap-4 w-full mt-1">
              <div className="font-sans text-4xl font-medium tracking-[-0.005em] text-t-primary dark:text-t-primary leading-none">
                {completed.length}
              </div>
              <div className="flex flex-col items-start gap-0.5">
                <div className="flex flex-row justify-center items-center px-1.5 py-0.5 gap-1 border border-s-stroke2/20 bg-transparent rounded-lg">
                  <span className="text-t-secondary text-[12px] font-semibold leading-none">Done</span>
                </div>
                <span className="text-[12px] font-sans text-t-secondary">
                  submitted
                </span>
              </div>
            </div>
          </div>

        </div>

        {/* Overdue - show first, most urgent */}
        {late.length > 0 && (
          <div className="group relative card flex flex-col overflow-hidden p-6 md:p-8 rounded-lg bg-b-surface2 dark:bg-b-surface2 shadow-[0px_5px_1.5px_-4px_rgba(8,8,8,0.09),0px_6px_4px_-4px_rgba(8,8,8,0.05)] border border-s-stroke2/40 select-none mb-8">
            <div className="box-hover" />
            <div className="relative z-10 flex flex-row justify-between items-center w-full mb-6">
              <div>
                <h3 className="font-sans text-[20px] font-semibold tracking-[0.0015em] leading-[145%] text-t-primary dark:text-t-primary">
                  Overdue DPPs
                </h3>
                <p className="text-[12px] font-sans text-t-secondary mt-0.5">
                  These practice papers have passed their deadline
                </p>
              </div>
              <span className="flex flex-row justify-center items-center px-2.5 py-1 rounded-lg border border-s-stroke2/20 bg-transparent text-t-secondary text-[12px] font-sans font-semibold tracking-[0.004em] shrink-0">
                Requires Attention
              </span>
            </div>
            
            <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 p-2 gap-4 w-full bg-b-surface1 dark:bg-b-surface1/60 border border-s-stroke2/40 dark:border-s-stroke2/40 rounded-lg">
              {late.map(dpp => (
                <DPPCard key={dpp.id} dpp={dpp} />
              ))}
            </div>
          </div>
        )}

        {/* Pending */}
        {pending.length > 0 && (
          <div className="group relative card flex flex-col overflow-hidden p-6 md:p-8 rounded-lg bg-b-surface2 dark:bg-b-surface2 shadow-[0px_5px_1.5px_-4px_rgba(8,8,8,0.09),0px_6px_4px_-4px_rgba(8,8,8,0.05)] border border-s-stroke2/40 select-none mb-8">
            <div className="box-hover" />
            <div className="relative z-10 flex flex-row justify-between items-center w-full mb-6">
              <div>
                <h3 className="font-sans text-[20px] font-semibold tracking-[0.0015em] leading-[145%] text-t-primary dark:text-t-primary">
                  Pending DPPs
                </h3>
                <p className="text-[12px] font-sans text-t-secondary mt-0.5">
                  Active practice assignments assigned to you
                </p>
              </div>
              <span className="flex flex-row justify-center items-center px-2.5 py-1 rounded-lg border border-s-stroke2/20 bg-transparent text-t-secondary text-[12px] font-sans font-semibold tracking-[0.004em] shrink-0">
                In Progress
              </span>
            </div>
            
            <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 p-2 gap-4 w-full bg-b-surface1 dark:bg-b-surface1/60 border border-s-stroke2/40 dark:border-s-stroke2/40 rounded-lg">
              {pending.map(dpp => (
                <DPPCard key={dpp.id} dpp={dpp} />
              ))}
            </div>
          </div>
        )}

        {/* Completed */}
        {completed.length > 0 && (
          <div className="group relative card flex flex-col overflow-hidden p-6 md:p-8 rounded-lg bg-b-surface2 dark:bg-b-surface2 shadow-[0px_5px_1.5px_-4px_rgba(8,8,8,0.09),0px_6px_4px_-4px_rgba(8,8,8,0.05)] border border-s-stroke2/40 select-none">
            <div className="box-hover" />
            <div className="relative z-10 flex flex-row justify-between items-center w-full mb-6">
              <div>
                <h3 className="font-sans text-[20px] font-semibold tracking-[0.0015em] leading-[145%] text-t-primary dark:text-t-primary">
                  Completed DPPs
                </h3>
                <p className="text-[12px] font-sans text-t-secondary mt-0.5">
                  Successfully finished practice papers and reports
                </p>
              </div>
              <span className="flex flex-row justify-center items-center px-2.5 py-1 rounded-lg border border-s-stroke2/20 bg-transparent text-t-secondary text-[12px] font-sans font-semibold tracking-[0.004em] shrink-0">
                Completed
              </span>
            </div>
            
            <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 p-2 gap-4 w-full bg-b-surface1 dark:bg-b-surface1/60 border border-s-stroke2/40 dark:border-s-stroke2/40 rounded-lg">
              {completed.map(dpp => (
                <DPPCard key={dpp.id} dpp={dpp} />
              ))}
            </div>
          </div>
        )}

        {pending.length === 0 && late.length === 0 && completed.length === 0 && (
          <div className="group relative card text-center py-20 text-t-secondary rounded-lg bg-b-surface2 dark:bg-b-surface2 shadow-[0px_5px_1.5px_-4px_rgba(8,8,8,0.09),0px_6px_4px_-4px_rgba(8,8,8,0.05)] border border-s-stroke2/40">
            <div className="box-hover" />
            <RiFileListLine size={48} className="mx-auto mb-4 text-t-tertiary relative z-10" />
            <p className="font-semibold text-body-2 relative z-10">No DPPs assigned yet.</p>
          </div>
        )}
      </main>
    </>
  );
}

function DPPCard({ dpp }: { dpp: any }) {
  const isCompleted = dpp.status === "completed";
  const isLate = dpp.status === "late";

  return (
    <div 
      className="flex min-h-[10.5rem] flex-col justify-between p-5 bg-b-surface2 dark:bg-b-surface2 border border-s-stroke2 dark:border-s-stroke2/30 rounded-lg shadow-[0px_6px_4px_-4px_rgba(8,8,8,0.05),0px_5px_1.5px_-4px_rgba(8,8,8,0.09)]"
    >
      <div className="min-w-0 flex-1">
        {/* Header Status Badge Row */}
        <div className="flex justify-between items-center mb-3">
          <span className="text-[12px] font-sans font-semibold text-t-secondary uppercase tracking-wider">
            {dpp.subject}
          </span>
          {isLate ? (
            <div className="flex flex-row justify-center items-center px-1.5 py-0.5 border border-s-stroke2/20 bg-transparent rounded-lg">
              <span className="text-t-secondary text-[10px] font-bold leading-none">Overdue</span>
            </div>
          ) : isCompleted ? (
            <div className="flex flex-row justify-center items-center px-1.5 py-0.5 border border-s-stroke2/20 bg-transparent rounded-lg">
              <span className="text-t-secondary text-[10px] font-bold leading-none">Completed</span>
            </div>
          ) : (
            <div className="flex flex-row justify-center items-center px-1.5 py-0.5 border border-s-stroke2/20 bg-transparent rounded-lg">
              <span className="text-t-secondary text-[10px] font-bold leading-none">Pending</span>
            </div>
          )}
        </div>
        
        <div className="truncate font-sans font-semibold text-[16px] leading-[150%] tracking-[0.0015em] text-t-primary dark:text-t-primary">
          {dpp.title}
        </div>
        <div className="text-[12px] font-sans text-t-secondary mt-1">
          {dpp.totalQuestions} Questions · {dpp.chapter}
        </div>
      </div>

      <div className="flex justify-between items-center mt-4 pt-3 border-t border-s-stroke2/30">
        <span className="text-[12px] font-sans font-semibold text-t-secondary">
          Due: {dpp.dueDate}
        </span>
        {isCompleted ? (
          <div className="flex flex-col items-end">
            <span className="text-sm font-sans font-bold text-t-primary dark:text-t-primary">{dpp.score}/{dpp.maxScore} marks</span>
            <span className="text-[10px] font-sans text-t-secondary">{dpp.timeTakenMin} mins</span>
          </div>
        ) : (
          <Link 
            href={`/assignments/${dpp.id}`} 
            className="flex flex-row justify-center items-center h-8 px-5 bg-shade-02 hover:bg-shade-04 text-t-light dark:bg-t-primary dark:text-b-surface1 dark:hover:bg-t-primary/90 text-[12px] font-sans font-semibold rounded-lg transition-all active:scale-95 shadow-widget"
          >
            {isLate ? "Submit Late" : "Start"}
          </Link>
        )}
      </div>
    </div>
  );
}
