import React from "react";
import { RiLightbulbFlashLine } from "@remixicon/react";
import { SectionCard } from "@/components/ui/SectionCard";

interface ResultSummaryHeaderProps {
  analysis: any;
  totalQuestions: number;
  /** null when the batch has too few submissions to average — hides the comparison. */
  batchAvgScore: number | null;
  batchAvgSampleSize?: number;
}

export function ResultSummaryHeader({ analysis: a, totalQuestions, batchAvgScore, batchAvgSampleSize }: ResultSummaryHeaderProps) {
  const pct = Math.round(a.scoring.percentage);
  const pctColorClass = pct >= 70 ? "text-primary-02" : pct >= 50 ? "text-primary-05" : "text-primary-03";
  const pctBorderColor = pct >= 70 ? "border-primary-02" : pct >= 50 ? "border-primary-05" : "border-primary-03";
  const pctBgClass = pct >= 70 ? "bg-primary-02/5" : pct >= 50 ? "bg-primary-05/5" : "bg-primary-03/5";

  return (
    <SectionCard className="select-none">
      <div className="grid gap-3 min-w-0 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-3">
          <div>
            <p className="text-[12px] font-sans font-bold uppercase tracking-[0.24em] text-t-secondary">Test Results</p>
            {/* Scaled to the app's heading size. At 32px/black it dwarfed every
                other heading and duplicated the Navbar title directly above it. */}
            <h1 className="mt-2 text-[20px] md:text-[24px] font-sans font-semibold tracking-[-0.02em] text-t-primary dark:text-t-primary leading-tight">Test Results &amp; Analysis</h1>
            <p className="mt-2 text-[14px] font-sans font-medium text-t-secondary dark:text-t-secondary">{a.topicStats[0]?.subject ?? "Practice set"} · JEE · {totalQuestions} questions</p>
          </div>

          {a.narrative && (
            <div className="rounded-[10px] border border-s-border dark:border-s-stroke2/30 bg-b-surface2 dark:bg-b-surface2 p-5 md:p-6">
              <div className="mb-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-[16px] font-sans font-bold text-t-primary dark:text-t-primary tracking-[0.0015em]">
                  <RiLightbulbFlashLine size={20} className="text-primary-05" /> Performance summary
                </div>
                {a.narrative.examCountdown && <span className="flex flex-row justify-center items-center px-2 py-0.5 border border-s-stroke2 dark:border-s-stroke2 rounded-[10px] bg-b-surface1 text-t-secondary dark:text-t-secondary text-[10px] font-sans font-bold tracking-[0.004em]">{a.narrative.examCountdown.urgencyLabel}</span>}
              </div>
              <p className="text-[14px] font-sans font-semibold leading-[150%] text-t-primary dark:text-t-primary">{a.narrative.headline}</p>
              <p className="mt-3 max-w-3xl text-[12px] font-sans leading-[160%] text-t-secondary dark:text-t-secondary">{a.narrative.overview}</p>
              <div className="mt-4 rounded-[10px] border border-s-stroke2/40 dark:border-s-stroke2/40 bg-b-surface1 dark:bg-b-surface1/60 p-4">
                <div className="text-[10px] font-sans font-bold uppercase tracking-[0.24em] text-t-secondary">Best next move</div>
                <div className="mt-1 text-[14px] font-sans font-semibold text-t-primary dark:text-t-primary">{a.narrative.biggestWin}</div>
              </div>
            </div>
          )}
        </div>

        <div className="rounded-[10px] border border-s-border dark:border-s-stroke2/30 bg-b-surface2 dark:bg-b-surface2 p-5">
          <div className={`flex items-center justify-between rounded-[10px] border border-opacity-30 ${pctBorderColor} ${pctBgClass} p-4`}>
            <div>
              <div className={`text-[32px] font-sans font-semibold tracking-tight leading-none ${pctColorClass}`}>{a.scoring.score} <span className="text-[14px] font-medium text-t-secondary dark:text-t-secondary">/ {a.scoring.maxScore}</span></div>
              <div className="text-[12px] font-sans font-bold text-t-secondary dark:text-t-secondary mt-1">Marks Obtained</div>
            </div>
            {a.freeMarks?.projectedScore > a.scoring.score && (
              <div className="text-right">
                <div className="text-[10px] font-sans font-bold uppercase tracking-[0.22em] text-primary-02">Potential</div>
                <div className="text-[16px] font-sans font-semibold text-primary-02">{a.freeMarks.projectedScore} <span className="text-[10px] font-normal text-t-secondary dark:text-t-secondary">/ {a.scoring.maxScore}</span></div>
              </div>
            )}
          </div>

          <div className="mt-4 h-2.5 w-full rounded-full bg-s-stroke2 overflow-hidden">
            <div className={`h-full rounded-full transition-all ${pct >= 70 ? "bg-primary-02" : pct >= 50 ? "bg-primary-05" : "bg-primary-03"}`} style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} />
          </div>

          <div className="mt-4 grid grid-cols-3 gap-3">
            {[
              { label: "Correct", value: a.scoring.correctCount, color: "text-primary-02" },
              { label: "Wrong", value: a.scoring.incorrectCount, color: "text-primary-03" },
              { label: "Skipped", value: a.scoring.skippedCount, color: "text-t-secondary dark:text-t-secondary" },
            ].map((stat) => (
              <div key={stat.label} className="rounded-[10px] border border-s-stroke2/40 dark:border-s-stroke2/40 bg-b-surface1 dark:bg-b-surface1/60 p-3 text-center flex flex-col justify-center items-center">
                <div className={`text-[20px] font-sans font-semibold leading-none ${stat.color}`}>{stat.value}</div>
                <div className="mt-1.5 text-[10px] font-sans font-bold uppercase tracking-[0.22em] text-t-secondary">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Only rendered when the batch genuinely has enough submissions to
              average. Showing a placeholder here would tell a student they are
              above or below a peer group that was never measured. */}
          {batchAvgScore !== null && (
            <div className="mt-4 rounded-[10px] border border-s-stroke2/40 dark:border-s-stroke2/40 bg-b-surface1 dark:bg-b-surface1/60 p-4">
              <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                <div className="min-w-0">
                  <div className="text-[10px] font-sans font-bold uppercase tracking-[0.22em] text-t-secondary">
                    Batch average{batchAvgSampleSize ? ` · ${batchAvgSampleSize} students` : ""}
                  </div>
                  <div className="mt-1 text-[16px] font-sans font-semibold text-t-primary dark:text-t-primary leading-none">{batchAvgScore} <span className="text-[10px] font-normal text-t-secondary dark:text-t-secondary">/ {a.scoring.maxScore}</span></div>
                </div>
                <div className={`flex flex-row justify-center items-center px-1.5 py-0.5 rounded-[10px] border text-[12px] font-sans font-semibold tracking-[0.004em] shrink-0 ${a.scoring.score >= batchAvgScore ? "border-s-stroke2/40 bg-[rgba(0,166,86,0.05)] text-primary-02" : "border-s-stroke2/40 bg-[rgba(255,106,85,0.05)] text-primary-03"}`}>
                  {a.scoring.score >= batchAvgScore ? `+${a.scoring.score - batchAvgScore} Marks` : `-${batchAvgScore - a.scoring.score} Marks`}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </SectionCard>
  );
}
