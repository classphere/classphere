import Link from "next/link";
import {
  RiArrowRightLine,
  RiStarFill,
} from "@remixicon/react";

import { PremiumSectionCard } from "@/components/premium-ui";

interface TopPerformingStudentsProps {
  topStudents: any[];
}

export function TopPerformingStudents({ topStudents }: TopPerformingStudentsProps) {
  const headerRight = (
    <Link
      href="/institute/students"
      className="flex flex-row justify-center items-center px-4.5 py-2.5 gap-2 border border-s-stroke2 dark:border-s-stroke2 rounded-[10px] bg-transparent text-t-secondary dark:text-t-secondary text-sm font-sans transition-all hover:border-t-secondary active:scale-98 no-underline"
    >
      <span>View Directory</span>
      <RiArrowRightLine size={16} />
    </Link>
  );

  return (
    <PremiumSectionCard title="Top Performing Students List" headerRight={headerRight} className="mt-4">
      <div className="relative z-10 flex flex-col gap-2 w-full min-w-0">
        {(topStudents || []).map((student: any, index: number) => {
          const initials = student.name ? student.name.split(" ").map((n: string) => n[0]).join("") : "?";
          const scoreColor = student.accuracy >= 85 ? "text-primary-02" : "text-primary-05";
          const performanceLevel = student.accuracy >= 90 ? "Elite" : "Excellent";
          const performanceBadgeClass = student.accuracy >= 90
            ? "bg-primary-02/5 border-primary-02/15 text-primary-02"
            : "bg-primary-05/5 border-primary-05/15 text-primary-05";

          return (
            <div
              key={index}
              className="group/item relative flex flex-row items-center p-3 sm:p-4 gap-3 sm:gap-6 bg-b-surface2 border border-s-stroke2/40 rounded-[16px] hover:scale-[1.005] transition-all h-[76px] sm:h-[88px] cursor-pointer w-full overflow-hidden"
            >
              <div className="flex flex-row items-center gap-3 sm:gap-5 flex-1 min-w-0">
                <div className="flex size-10 sm:w-12 sm:h-12 items-center justify-center rounded-[12px] bg-b-surface1 border border-s-stroke2/40 shrink-0 text-t-secondary font-bold sm:text-lg">
                  {initials}
                </div>
                <div className="min-w-0 flex flex-col justify-center">
                  <span className="font-sans font-semibold text-[13px] sm:text-[16px] text-t-primary dark:text-t-primary truncate">
                    {student.name || "Student"}
                  </span>
                  <span className="text-[11px] sm:text-xs text-t-secondary mt-0.5 truncate">
                    {student.tests} tests taken
                  </span>
                </div>
              </div>

              <div className="flex flex-row items-center gap-2 sm:gap-8 shrink-0">
                <div className="hidden sm:flex flex-col items-end justify-center">
                  <span className="text-[10px] font-sans font-bold text-t-secondary uppercase tracking-wider">
                    Avg Score
                  </span>
                  <span className={`text-[16px] font-sans font-bold mt-0.5 ${scoreColor}`}>
                    {student.accuracy}%
                  </span>
                </div>

                <div className="flex flex-col items-end justify-center">
                  <span className="hidden sm:flex text-[10px] font-sans font-bold text-t-secondary uppercase tracking-wider items-center gap-0.5">
                    <RiStarFill size={10} className="text-[#F4A109]" /> Standing
                  </span>
                  <span className={`px-2 py-0.5 border rounded-md text-[9px] sm:text-[10px] font-bold sm:mt-0.5 leading-none ${performanceBadgeClass}`}>
                    {performanceLevel}
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
