import React from "react";
import { SectionCard } from "@/components/ui/SectionCard";

interface AttemptStrategyCardProps {
  strategy: any;
  strategySubjects: string[];
}

export function AttemptStrategyCard({ strategy, strategySubjects }: AttemptStrategyCardProps) {
  if (!strategy || strategy.pattern === "mixed") return null;

  return (
    <SectionCard
      title="Attempt Strategy"
      subtitle="Use this to improve pacing and accuracy."
      padding="large"
      headerRight={
        <div className="flex flex-row justify-center items-center px-3 py-1 border border-s-stroke2 dark:border-s-stroke2 rounded-[10px] bg-b-surface2 text-t-secondary dark:text-t-secondary text-[12px] font-sans font-bold tracking-[0.004em]">
          {strategy.strategyScore}/100
        </div>
      }
    >
      <div className="relative z-10 rounded-[10px] border border-s-stroke2/40 dark:border-s-stroke2/40 bg-b-surface1 dark:bg-b-surface1/60 p-4 mt-2">
        <div className="grid gap-3 sm:grid-cols-3">
          {strategySubjects.map((subject: string) => {
            const deviation = strategy.timeDeviationPct?.[subject];
            const budget = strategy.optimalTimeSec?.[subject];
            const spent = strategy.timePerSubjectSec?.[subject];
            return (
              <div key={subject} className="rounded-[10px] border border-s-stroke2/40 dark:border-s-stroke2/40 bg-b-surface2 dark:bg-b-surface2 p-4">
                <div className="text-[10px] font-sans font-bold uppercase tracking-[0.22em] text-t-secondary">{subject}</div>
                <div className={`mt-2 text-[20px] font-sans font-semibold ${deviation >= 0 ? "text-primary-02" : "text-primary-03"}`}>
                  {deviation != null ? `${deviation > 0 ? "+" : ""}${Math.round(deviation)}%` : "—"}
                </div>
                <div className="mt-1 text-[12px] font-sans text-t-secondary">
                  {spent != null && budget != null ? `${Math.round(spent)}s spent · ${Math.round(budget)}s ideal` : "Timing data unavailable"}
                </div>
              </div>
            );
          })}
        </div>
        <p className="mt-4 text-[12px] font-sans leading-[160%] text-t-secondary dark:text-t-secondary">
          <strong className="text-t-primary dark:text-t-primary">Recommendation:</strong> {strategy.recommendation}
        </p>
      </div>
    </SectionCard>
  );
}
