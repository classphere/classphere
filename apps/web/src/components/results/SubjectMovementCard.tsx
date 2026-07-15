import React from "react";
import { RiExchangeLine, RiArrowRightLine } from "@remixicon/react";
import { SectionCard } from "@/components/ui/SectionCard";

interface SubjectMovementCardProps {
  subjectMovement: any[];
}

export function SubjectMovementCard({ subjectMovement }: SubjectMovementCardProps) {
  if (!subjectMovement || subjectMovement.length === 0) return null;

  return (
    <SectionCard
      title={
        <div className="flex items-center gap-2">
          <RiExchangeLine size={18} className="text-t-secondary dark:text-t-secondary" />
          <span>Subject Movement</span>
        </div>
      }
      subtitle="How you navigated between subjects during the test."
      padding="large"
    >
      <div className="relative z-10 flex flex-wrap items-center gap-2 mt-4">
        {subjectMovement.map((block: any, i: number) => {
          const subjectColors: Record<string, string> = {
            Physics: "border-primary-01/30 bg-primary-01/5 text-primary-01",
            Chemistry: "border-primary-02/30 bg-primary-02/5 text-primary-02",
            Mathematics: "border-primary-05/30 bg-primary-05/5 text-primary-05",
            Biology: "border-primary-04/30 bg-primary-04/5 text-primary-04",
          };
          const colorClass = subjectColors[block.subject] ?? "border-s-stroke2 bg-b-surface2 text-t-secondary";
          const durationMin = Math.round(block.durationSec / 60);
          return (
            <div key={i} className="flex items-center gap-2">
              <div className={`rounded-[10px] border px-4 py-2.5 text-center ${colorClass}`}>
                <div className="text-[12px] font-sans font-bold">{block.subject}</div>
                <div className="text-[10px] font-sans text-current/60">{durationMin > 0 ? `${durationMin} min` : "<1 min"}</div>
              </div>
              {i < subjectMovement.length - 1 && (
                <span className="text-t-secondary dark:text-t-tertiary">
                  <RiArrowRightLine size={14} />
                </span>
              )}
            </div>
          );
        })}
      </div>
      {subjectMovement.length === 1 && (
        <p className="relative z-10 mt-4 text-[12px] font-sans text-t-secondary dark:text-t-secondary">You stayed in one subject the entire test — linear approach.</p>
      )}
      {subjectMovement.length > 4 && (
        <p className="relative z-10 mt-4 rounded-[10px] border border-s-stroke2/40 bg-[rgba(239,157,14,0.05)] p-3 text-[12px] font-sans text-primary-05">
          ⚠️ You switched subjects {subjectMovement.length - 1} times — frequent switching can fragment your focus and waste 2–3 minutes per switch.
        </p>
      )}
    </SectionCard>
  );
}
