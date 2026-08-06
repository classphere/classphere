import React from "react";
import { RiPieChartLine } from "@remixicon/react";
import { SectionCard } from "@/components/ui/SectionCard";

interface AttemptClassificationCardProps {
  attemptClassification: any[];
}

export function AttemptClassificationCard({ attemptClassification }: AttemptClassificationCardProps) {
  if (!attemptClassification || attemptClassification.length === 0) return null;

  return (
    <SectionCard
      title={
        <span className="inline-flex items-center gap-2">
          <RiPieChartLine size={18} className="text-primary-01" />
          Attempt Classification
        </span>
      }
      subtitle="Quality of every attempt: Perfect, Overtime, Wasted, or Confused."
      padding="large"
    >
      {/* Columns only when there is more than one subject — a lone "Overall"
          block was rendering at half width with dead space beside it. */}
      <div className={`relative z-10 grid gap-4 mt-4 ${attemptClassification.length > 1 ? "sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2" : ""}`}>
        {attemptClassification.map((row: any) => {
          const cats = [
            { label: "Perfect", value: row.perfect, color: "bg-primary-02", textColor: "text-primary-02", desc: "Correct & efficient" },
            { label: "Overtime", value: row.overtime, color: "bg-primary-01", textColor: "text-primary-01", desc: "Correct but too slow" },
            { label: "Wasted", value: row.wasted, color: "bg-primary-03", textColor: "text-primary-03", desc: "Wrong & over-invested" },
            { label: "Confused", value: row.confused, color: "bg-primary-05", textColor: "text-primary-05", desc: "Skipped after pondering" },
          ];
          return (
            <div key={row.subject} className="rounded-[10px] border border-s-stroke2/40 dark:border-s-stroke2/40 bg-b-surface1 dark:bg-b-surface1/60 p-5">
              <h3 className="mb-4 text-[14px] font-sans font-bold text-t-primary dark:text-t-primary">{row.subject} <span className="text-t-secondary font-normal">({row.total} attempts)</span></h3>
              <div className="grid grid-cols-2 gap-3">
                {cats.map(cat => (
                  <div key={cat.label} className="rounded-[10px] border border-s-stroke2 bg-b-surface2 p-3">
                    <div className={`text-[20px] font-sans font-semibold ${cat.textColor}`}>{cat.value}</div>
                    <div className="mt-0.5 text-[10px] font-sans font-bold uppercase tracking-[0.18em] text-t-secondary">{cat.label}</div>
                    <div className="mt-1 text-[10px] font-sans text-t-secondary dark:text-t-secondary">{cat.desc}</div>
                    {/* Mini donut bar */}
                    <div className="mt-2 h-1.5 w-full rounded-full bg-s-stroke2 overflow-hidden">
                      <div className={`h-full rounded-full ${cat.color}`} style={{ width: row.total > 0 ? `${Math.round((cat.value / row.total) * 100)}%` : "0%" }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </SectionCard>
  );
}
