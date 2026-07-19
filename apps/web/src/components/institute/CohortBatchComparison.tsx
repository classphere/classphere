import Link from "next/link";
import {
  RiArrowRightLine,
  RiTeamLine,
} from "@remixicon/react";

import { PremiumSectionCard } from "@/components/premium-ui";

interface CohortBatchComparisonProps {
  batchLeaderboard: any[];
}

export function CohortBatchComparison({ batchLeaderboard }: CohortBatchComparisonProps) {
  const headerRight = (
    <Link
      href="/institute/batches"
      className="flex flex-row justify-center items-center px-4.5 py-2.5 gap-2 border border-s-stroke2 dark:border-s-stroke2 rounded-[10px] bg-transparent text-t-secondary dark:text-t-secondary text-sm font-sans transition-all hover:border-t-secondary active:scale-98 no-underline"
    >
      <span>View All</span>
      <RiArrowRightLine size={16} />
    </Link>
  );

  return (
    <PremiumSectionCard title="Cohort Batch Comparison" headerRight={headerRight} className="mt-4">
      <div className="relative z-10 flex flex-col gap-2 w-full min-w-0">
        {(batchLeaderboard || []).map((batch: any, index: number) => {
          const colors = [
            { bg: "bg-primary-01/10 text-primary-01 border-primary-01/20" },
            { bg: "bg-primary-02/10 text-primary-02 border-primary-02/20" },
            { bg: "bg-primary-05/10 text-primary-05 border-primary-05/20" },
            { bg: "bg-primary-03/10 text-primary-03 border-primary-03/20" }
          ][index % 4];

          return (
            <div
              key={batch.id}
              className="group/item relative flex flex-row items-center p-3 sm:p-4 gap-3 sm:gap-6 bg-b-surface2 border border-s-stroke2/40 rounded-[16px] hover:scale-[1.005] transition-all h-[76px] sm:h-[88px] cursor-pointer w-full overflow-hidden"
            >
              <div className="flex flex-row items-center gap-3 sm:gap-5 flex-1 min-w-0">
                <div className={`flex size-10 sm:w-12 sm:h-12 items-center justify-center rounded-[12px] border shrink-0 font-bold ${colors.bg}`}>
                  <RiTeamLine size={24} className="scale-75 sm:scale-100" />
                </div>
                <div className="min-w-0 flex flex-col justify-center">
                  <span className="font-sans font-semibold text-[13px] sm:text-[16px] text-t-primary dark:text-t-primary truncate">
                    #{index + 1} {batch.name}
                  </span>
                  <span className="text-[11px] sm:text-xs text-t-secondary mt-0.5 truncate">
                    {batch.exam} <span className="hidden sm:inline">· {batch.testsCount} tests submitted</span>
                  </span>
                </div>
              </div>

              <div className="flex flex-row items-center gap-2 sm:gap-8 shrink-0">
                <div className="flex flex-col items-end justify-center">
                  <span className="hidden sm:inline text-[10px] font-sans font-bold text-t-secondary uppercase tracking-wider">
                    Avg Accuracy
                  </span>
                  <span className="text-[13px] sm:text-[16px] font-sans font-bold text-primary-02 sm:mt-0.5">
                    {batch.avgScore ?? 0}%
                  </span>
                </div>

                <div className="shrink-0 flex justify-end">
                  <span className="px-2 py-0.5 sm:px-3 sm:py-1.5 border rounded-[10px] text-[9px] sm:text-[10px] font-bold uppercase tracking-wider bg-[rgba(0,166,86,0.05)] border-s-stroke2/40 text-primary-02">
                    Active
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </PremiumSectionCard>
  );
}
