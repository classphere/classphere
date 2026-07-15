import Link from "next/link";
import {
  RiArrowRightLine,
  RiRulerLine,
  RiTestTubeLine,
} from "@remixicon/react";

import { PremiumSectionCard } from "@/components/premium-ui";

interface RecentTestReportsProps {
  reports: any[];
}

export function RecentTestReports({ reports }: RecentTestReportsProps) {
  const headerRight = (
    <Link
      href="/institute/tests"
      className="flex flex-row justify-center items-center px-4.5 py-2.5 gap-2 border border-s-stroke2 dark:border-s-stroke2 rounded-[10px] bg-transparent text-t-secondary dark:text-t-secondary text-sm font-sans transition-all hover:border-t-secondary active:scale-98 no-underline"
    >
      <span>View All</span>
      <RiArrowRightLine size={16} />
    </Link>
  );

  return (
    <PremiumSectionCard title="Recent Test Reports" headerRight={headerRight} className="mt-4">
      <div className="relative z-10 flex flex-col gap-2 w-full min-w-0">
        {reports.map((report) => (
          <div
            key={report.id}
            className="group/item relative flex flex-row items-center p-3 sm:p-4 gap-3 sm:gap-6 bg-b-surface2 dark:bg-[#161616] border border-s-stroke2/40 rounded-[16px] hover:scale-[1.005] transition-all h-[76px] sm:h-[88px] cursor-pointer w-full overflow-hidden"
          >
            {/* Left: Avatar/Icon + Title & Batch details */}
            <div className="flex flex-row items-center gap-3 sm:gap-5 flex-1 min-w-0">
              <div className="flex size-10 sm:w-12 sm:h-12 items-center justify-center rounded-[12px] bg-b-surface1 dark:bg-b-surface1/50 border border-s-stroke2/40 shrink-0 text-t-secondary font-bold">
                {report.exam === "JEE" ? <RiRulerLine size={24} className="scale-75 sm:scale-100" /> : <RiTestTubeLine size={24} className="scale-75 sm:scale-100" />}
              </div>
              <div className="min-w-0 flex flex-col justify-center">
                <span className="font-sans font-semibold text-[13px] sm:text-[16px] text-t-primary truncate">
                  {report.title}
                </span>
                <span className="text-[11px] sm:text-xs text-t-secondary mt-0.5 truncate">
                  {report.batch} <span className="hidden sm:inline">· {report.date}</span>
                </span>
              </div>
            </div>

            {/* Right Info & Actions */}
            <div className="flex flex-row items-center gap-2 sm:gap-8 shrink-0">
              <div className="hidden sm:flex flex-col items-end justify-center">
                <span className="text-[10px] font-sans font-bold text-t-secondary uppercase tracking-wider">
                  Avg Accuracy
                </span>
                <span className="text-[16px] font-sans font-bold text-primary-02 mt-0.5">
                  {report.accuracy}%
                </span>
              </div>

              <div className="flex flex-col items-end justify-center">
                <span className="hidden sm:inline text-[10px] font-sans font-bold text-t-secondary uppercase tracking-wider">
                  High Score
                </span>
                <span className="text-[13px] sm:text-[16px] font-sans font-bold text-t-primary sm:mt-0.5">
                  {report.high}%
                </span>
              </div>

              <div className="shrink-0 flex justify-end pl-1 sm:pl-0">
                <button className="btn btn-outline h-8 sm:h-10 px-2 sm:px-4 text-[11px] sm:text-[13px] font-sans cursor-pointer whitespace-nowrap">
                  View <span className="hidden sm:inline">Report</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </PremiumSectionCard>
  );
}
