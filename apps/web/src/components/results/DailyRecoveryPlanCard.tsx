import React, { useState } from "react";
import { RiArrowUpSLine, RiArrowDownSLine } from "@remixicon/react";
import { SectionCard } from "@/components/ui/SectionCard";

interface DailyRecoveryPlanCardProps {
  studyPlan: any[];
}

export function DailyRecoveryPlanCard({ studyPlan }: DailyRecoveryPlanCardProps) {
  const [expandedDay, setExpandedDay] = useState<number | null>(null);

  if (!studyPlan || studyPlan.length === 0) return null;

  return (
    <SectionCard
      title="7-Day Study Plan"
      subtitle="Small, daily work beats one long reset."
      padding="large"
      headerRight={
        <span className="flex flex-row justify-center items-center px-2 py-1 border border-s-stroke2 dark:border-s-stroke2 rounded-[10px] bg-b-surface1 text-t-secondary dark:text-t-secondary text-[12px] font-sans font-semibold tracking-[0.004em]">Next 7 days</span>
      }
    >
      <div className="relative z-10 space-y-3 mt-4">
        {studyPlan.map((day: any) => (
          <button
            key={day.day}
            className={`w-full rounded-[10px] border p-4 text-left transition-colors ${
              expandedDay === day.day ? "border-primary-01/40 bg-[rgba(55,101,246,0.05)] shadow-widget" : "border-s-stroke2 bg-b-surface1 hover:border-s-highlight shadow-sm"
            }`}
            onClick={() => setExpandedDay(expandedDay === day.day ? null : day.day)}
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-[10px] bg-b-surface2 text-[14px] font-sans font-black text-primary-01 border border-s-stroke2">D{day.day}</div>
                <div>
                  <div className="text-[14px] font-sans font-bold text-t-primary dark:text-t-primary">{day.topic}</div>
                  <div className="mt-0.5 text-[12px] font-sans text-t-secondary dark:text-t-secondary">{day.durationMinutes} min</div>
                </div>
              </div>
              <span className="text-t-secondary dark:text-t-secondary">
                {expandedDay === day.day ? <RiArrowUpSLine size={20} /> : <RiArrowDownSLine size={20} />}
              </span>
            </div>
            {expandedDay === day.day && (
              <div className="mt-4 border-t border-s-stroke2 pt-4 text-[12px] font-sans leading-[160%] text-t-secondary dark:text-t-secondary">
                <div><strong className="text-t-primary dark:text-t-primary">Activity:</strong> {day.activity}</div>
                <div className="mt-2"><strong className="text-t-primary dark:text-t-primary">Focus:</strong> Targeting {day.focusErrorType} errors.</div>
              </div>
            )}
          </button>
        ))}
      </div>
    </SectionCard>
  );
}
