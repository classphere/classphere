"use client";

import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import {
  SectionCard,
  MetricCard,
  MetricGrid,
  EmptyState,
  PageWrapper,
  Card,
} from "@/components/ui";

import {
  RiFileListLine,
  RiTimeLine,
  RiCheckLine,
  RiAlertLine,
} from "@remixicon/react";

export default function AssignmentsPage() {
  // In a real app, these would come from an API
  const pending: any[] = [];
  const late: any[] = [];
  const completed: any[] = [];

  return (
    <>
      <Navbar title="My DPPs" subtitle="Daily practice problems assigned by your teacher." breadcrumbs="My DPPs" />
      
      <PageWrapper>
        {/* Stats Row */}
        <MetricGrid cols={3}>
          <MetricCard
            icon={<RiTimeLine size={18} />}
            label="Pending DPPs"
            value={pending.length}
            badge="Active"
            badgeLabel="assigned"
          />
          <MetricCard
            icon={<RiAlertLine size={18} />}
            label="Overdue DPPs"
            value={late.length}
            badge="Late"
            badgeLabel="needs action"
          />
          <MetricCard
            icon={<RiCheckLine size={18} />}
            label="Completed DPPs"
            value={completed.length}
            badge="Done"
            badgeLabel="submitted"
          />
        </MetricGrid>

        {/* Overdue */}
        {late.length > 0 && (
          <SectionCard
            title="Overdue DPPs"
            subtitle="These practice papers have passed their deadline"
            className="mb-6"
            headerRight={
              <span className="flex flex-row justify-center items-center px-2.5 py-1 rounded-[10px] border border-s-stroke2/20 bg-transparent text-t-secondary text-[12px] font-sans font-semibold tracking-[0.004em]">
                Requires Attention
              </span>
            }
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {late.map((dpp) => (
                <DPPCard key={dpp.id} dpp={dpp} />
              ))}
            </div>
          </SectionCard>
        )}

        {/* Pending */}
        {pending.length > 0 && (
          <SectionCard
            title="Pending DPPs"
            subtitle="Active practice assignments assigned to you"
            className="mb-6"
            headerRight={
              <span className="flex flex-row justify-center items-center px-2.5 py-1 rounded-[10px] border border-s-stroke2/20 bg-transparent text-t-secondary text-[12px] font-sans font-semibold tracking-[0.004em]">
                In Progress
              </span>
            }
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pending.map((dpp) => (
                <DPPCard key={dpp.id} dpp={dpp} />
              ))}
            </div>
          </SectionCard>
        )}

        {/* Completed */}
        {completed.length > 0 && (
          <SectionCard
            title="Completed DPPs"
            subtitle="Successfully finished practice papers and reports"
            className="mb-6"
            headerRight={
              <span className="flex flex-row justify-center items-center px-2.5 py-1 rounded-[10px] border border-s-stroke2/20 bg-transparent text-t-secondary text-[12px] font-sans font-semibold tracking-[0.004em]">
                Completed
              </span>
            }
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {completed.map((dpp) => (
                <DPPCard key={dpp.id} dpp={dpp} />
              ))}
            </div>
          </SectionCard>
        )}

        {pending.length === 0 && late.length === 0 && completed.length === 0 && (
          <SectionCard padding="none">
            <EmptyState
              icon={<RiFileListLine size={48} />}
              title="No DPPs assigned yet."
              description="Your teachers haven't assigned any daily practice problems at the moment. You're all caught up!"
            />
          </SectionCard>
        )}
      </PageWrapper>
    </>
  );
}

function DPPCard({ dpp }: { dpp: any }) {
  const isCompleted = dpp.status === "completed";
  const isLate = dpp.status === "late";

  return (
    <Card 
      variant="default"
      padding="default"
      className="flex min-h-[10.5rem] flex-col justify-between hover:-translate-y-1 hover:shadow-depth transition-all duration-300"
    >
      <div className="min-w-0 flex-1">
        {/* Header Status Badge Row */}
        <div className="flex justify-between items-center mb-3">
          <span className="text-[11px] font-sans font-bold text-t-secondary uppercase tracking-widest">
            {dpp.subject}
          </span>
          {isLate ? (
            <div className="flex flex-row justify-center items-center px-1.5 py-0.5 border border-red-500/20 bg-red-500/5 rounded-[6px]">
              <span className="text-red-500 text-[10px] font-bold leading-none uppercase tracking-wider">Overdue</span>
            </div>
          ) : isCompleted ? (
            <div className="flex flex-row justify-center items-center px-1.5 py-0.5 border border-green-500/20 bg-green-500/5 rounded-[6px]">
              <span className="text-green-500 text-[10px] font-bold leading-none uppercase tracking-wider">Completed</span>
            </div>
          ) : (
            <div className="flex flex-row justify-center items-center px-1.5 py-0.5 border border-black/5 dark:border-white/5 bg-b-surface1 dark:bg-b-surface1/40 rounded-[6px]">
              <span className="text-t-secondary text-[10px] font-bold leading-none uppercase tracking-wider">Pending</span>
            </div>
          )}
        </div>
        
        <div className="truncate font-sans font-semibold text-[15px] leading-snug text-t-primary">
          {dpp.title}
        </div>
        <div className="text-[12px] font-sans text-t-secondary mt-1">
          {dpp.totalQuestions} Questions · {dpp.chapter}
        </div>
      </div>

      <div className="flex justify-between items-center mt-4 pt-3 border-t border-[#ebebeb] dark:border-[#282828]">
        <span className="text-[12px] font-sans font-medium text-t-secondary">
          Due: {dpp.dueDate}
        </span>
        {isCompleted ? (
          <div className="flex flex-col items-end">
            <span className="text-[13px] font-sans font-bold text-t-primary">{dpp.score}/{dpp.maxScore} marks</span>
            <span className="text-[10px] font-sans text-t-secondary">{dpp.timeTakenMin} mins</span>
          </div>
        ) : (
          <Link 
            href={`/assignments/${dpp.id}`} 
            className="relative flex flex-row justify-center items-center h-8 px-4 overflow-hidden rounded-[10px] border border-[#161616] bg-[linear-gradient(342.29deg,#070707_12.1%,#2F2E31_87.9%)] text-white text-[12px] font-sans font-semibold shadow-[0px_6.8656px_6.8656px_-2.33333px_rgba(0,0,0,0.16),inset_0px_1px_0px_rgba(255,255,255,0.16),inset_0px_-2px_0px_#191919] transition-transform hover:scale-[1.02] active:scale-[0.98]"
          >
            <i className="absolute -right-3 top-0 h-3 w-16 rotate-[125deg] rounded-full bg-white/10 blur-[3px]" />
            <span className="relative">{isLate ? "Submit Late" : "Start"}</span>
          </Link>
        )}
      </div>
    </Card>
  );
}
