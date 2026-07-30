import React from "react";
import { SectionCard } from "@/components/ui/SectionCard";

interface ErrorPatternsCardProps {
  errorPatterns: any[];
}

export function ErrorPatternsCard({ errorPatterns }: ErrorPatternsCardProps) {
  if (!errorPatterns || errorPatterns.length === 0) return null;

  return (
    <SectionCard
      title="Error Patterns"
      subtitle="These are the mistakes that cost you the most."
      padding="large"
      headerRight={
        <span className="flex flex-row justify-center items-center px-2 py-0.5 border border-s-stroke2/40 bg-[rgba(255,106,85,0.05)] text-primary-03 text-[12px] font-sans font-bold tracking-[0.004em] rounded-[10px]">Watch closely</span>
      }
    >
      <div className="relative z-10 grid gap-4 md:grid-cols-2 mt-4">
        {errorPatterns.map((ep: any) => (
          <div key={ep.id} className="rounded-[10px] border border-s-stroke2/40 dark:border-s-stroke2/40 bg-b-surface2 dark:bg-b-surface2 p-5">
            <h3 className="text-[14px] font-sans font-bold text-primary-03">{ep.name}</h3>
            <p className="mt-2 text-caption leading-relaxed text-t-secondary">{ep.description}</p>
            <div className="mt-4">
              <span className="label label-red font-bold">{ep.questionsAffected.length} questions affected</span>
            </div>
            <div className="mt-4 rounded-[10px] border border-s-stroke2 bg-b-surface2 p-3 text-caption font-semibold text-t-primary">
              <span className="text-primary-01">Tip:</span> {ep.tip}
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}
