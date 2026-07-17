import React from "react";
import { SectionCard } from "@/components/ui/SectionCard";

interface SyllabusGapsCardProps {
  unattemptedChapters: any[];
}

export function SyllabusGapsCard({ unattemptedChapters }: SyllabusGapsCardProps) {
  if (!unattemptedChapters || unattemptedChapters.length === 0) return null;

  return (
    <SectionCard
      title="Syllabus Gaps (Unattempted)"
      subtitle="Chapters with zero attempts in this mock test. Revise these to ensure full syllabus coverage."
      padding="large"
    >
      <div className="relative z-10 flex flex-wrap gap-2.5 pt-4">
        {unattemptedChapters.map((chapter: any) => (
          <div key={chapter.chapter} className="flex flex-row justify-center items-center px-4 py-2 border border-s-stroke2 dark:border-s-stroke2 rounded-[10px] bg-b-surface2 dark:bg-b-surface2 text-t-secondary dark:text-t-secondary text-[12px] font-sans font-bold tracking-[0.004em] gap-2">
            <span className="h-2 w-2 rounded-full bg-t-secondary dark:bg-t-tertiary" />
            <span>{chapter.chapter}</span>
            <span className="text-[10px] font-normal text-t-secondary dark:text-t-tertiary">({chapter.subject})</span>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}
