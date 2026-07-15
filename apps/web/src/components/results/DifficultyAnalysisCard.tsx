import React from "react";
import { RiBarChartBoxLine } from "@remixicon/react";
import { SectionCard } from "@/components/ui/SectionCard";

interface DifficultyAnalysisCardProps {
  difficultyBreakdown: any[];
}

export function DifficultyAnalysisCard({ difficultyBreakdown }: DifficultyAnalysisCardProps) {
  if (!difficultyBreakdown || difficultyBreakdown.length === 0) return null;

  return (
    <SectionCard
      title={
        <div className="flex items-center gap-2">
          <RiBarChartBoxLine size={18} className="text-primary-05" />
          <span>Difficulty Analysis</span>
        </div>
      }
      subtitle="Performance breakdown by question difficulty, per subject."
      padding="large"
    >
      <div className="relative z-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2 mt-4">
        {difficultyBreakdown.map((row: any) => (
          <div key={row.subject} className="rounded-[10px] border border-s-stroke2/40 dark:border-s-stroke2/40 bg-b-surface1 dark:bg-b-surface1/60 p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-[14px] font-sans font-bold text-t-primary dark:text-t-primary">{row.subject}</h3>
            </div>
            <div className="space-y-3">
              {(["easy", "medium", "hard"] as const).map((diff) => {
                const d = row[diff];
                const attempted = d.correct + d.incorrect;
                const acc = attempted > 0 ? Math.round((d.correct / attempted) * 100) : 0;
                const barColor = diff === "easy" ? "bg-primary-02" : diff === "medium" ? "bg-primary-05" : "bg-primary-03";
                const labelColor = diff === "easy" ? "text-primary-02" : diff === "medium" ? "text-primary-05" : "text-primary-03";
                return (
                  <div key={diff}>
                    <div className="mb-1.5 flex items-center justify-between">
                      <span className={`text-[10px] font-sans font-bold uppercase tracking-[0.2em] ${labelColor}`}>{diff}</span>
                      <div className="flex items-center gap-3 text-[12px] font-sans text-t-secondary dark:text-t-secondary">
                        <span className="font-bold">{d.correct}✓</span>
                        <span className="font-bold">{d.incorrect}✗</span>
                        <span className="text-t-secondary dark:text-t-tertiary">{d.skipped} skip</span>
                        {attempted > 0 && <span className={`font-black ${acc >= 70 ? "text-primary-02" : acc >= 40 ? "text-primary-05" : "text-primary-03"}`}>{acc}%</span>}
                      </div>
                    </div>
                    <div className="h-2 w-full rounded-full bg-s-stroke2 overflow-hidden shadow-[inset_0px_1px_2px_rgba(0,0,0,0.1)] dark:shadow-[inset_0px_1px_3px_rgba(0,0,0,0.2)]">
                      <div className={`h-full rounded-full ${barColor}`} style={{ width: `${acc}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}
