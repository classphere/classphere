import React from "react";
import { RiPulseLine } from "@remixicon/react";
import { SectionCard } from "@/components/ui/SectionCard";

interface FatigueCurveCardProps {
  timeIntervals: any[];
  fatigueSummary?: string;
}

export function FatigueCurveCard({ timeIntervals, fatigueSummary }: FatigueCurveCardProps) {
  if (!timeIntervals || timeIntervals.length === 0) return null;

  return (
    <SectionCard
      title={
        <div className="flex items-center gap-2">
          <RiPulseLine size={18} className="text-primary-01" />
          <span>Attempts Over 3 Hours</span>
        </div>
      }
      subtitle="How your performance changed across the exam duration."
      padding="large"
    >
      <div className="relative z-10 mt-2 space-y-5">
        {/* Fatigue summary narrative */}
        {fatigueSummary && (
          <div className="rounded-[10px] border border-s-stroke2/40 dark:border-s-stroke2/40 bg-b-surface2 dark:bg-b-surface2 p-4 text-[12px] font-sans leading-[160%] text-t-secondary dark:text-t-secondary shadow-sm">
            <span className="font-bold text-t-primary dark:text-t-primary">Analysis: </span>{fatigueSummary}
          </div>
        )}

        {/* Interval table */}
        <div className="overflow-x-auto rounded-[10px] border border-s-stroke2">
          <table className="rayum-table">
            <thead>
              <tr>
                <th>Interval</th>
                <th className="text-center">Total</th>
                <th className="text-center text-primary-02">Correct</th>
                <th className="text-center text-primary-03">Wrong</th>
                <th className="text-center">Skipped</th>
                <th className="text-right">Accuracy</th>
              </tr>
            </thead>
            <tbody>
              {timeIntervals.map((interval: any, i: number) => {
                const accColor = interval.accuracy >= 70 ? "text-primary-02" : interval.accuracy >= 40 ? "text-primary-05" : "text-primary-03";
                const label = i === 0 ? "First 30 mins" : `${(i * 30) + 1}–${(i + 1) * 30} mins`;
                return (
                  <tr key={i}>
                    <td className="font-semibold">{label}</td>
                    <td className="text-center">{interval.total}</td>
                    <td className="text-center font-bold text-primary-02">{interval.correct}</td>
                    <td className="text-center font-bold text-primary-03">{interval.incorrect}</td>
                    <td className="text-center">{interval.skipped}</td>
                    <td className="text-right font-black">
                      <span className={accColor}>{interval.accuracy}%</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Visual bar chart */}
        <div className="space-y-2">
          {timeIntervals.map((interval: any, i: number) => {
            const label = i === 0 ? "First 30 mins" : `${(i * 30) + 1}–${(i + 1) * 30} mins`;
            const barColor = interval.accuracy >= 70 ? "bg-primary-02" : interval.accuracy >= 40 ? "bg-primary-05" : "bg-primary-03";
            return (
              <div key={i} className="flex items-center gap-3">
                <span className="w-28 shrink-0 text-[10px] font-sans font-bold text-t-secondary uppercase tracking-[0.05em]">{label}</span>
                <div className="flex-1 h-2.5 rounded-full bg-s-stroke2 overflow-hidden shadow-[inset_0px_1px_2px_rgba(0,0,0,0.1)] dark:shadow-[inset_0px_1px_3px_rgba(0,0,0,0.2)]">
                  <div className={`h-full rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${interval.accuracy}%` }} />
                </div>
                <span className="w-8 text-right text-[10px] font-sans font-bold text-t-secondary dark:text-t-secondary">{interval.accuracy}%</span>
              </div>
            );
          })}
        </div>
      </div>
    </SectionCard>
  );
}
