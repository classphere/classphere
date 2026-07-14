import React from "react";
import { PremiumSectionCard as SectionCard } from "@/components/premium-ui";
import { Button } from "@/components/landing/ui/Button";
import { RiTestTubeLine, RiArrowRightLine } from "@remixicon/react";
import Link from "next/link";

export function RecentTestsWidget({ history = [] }: { history?: any[] }) {
  const recent = history.slice(0, 3);

  return (
    <SectionCard title="Recent Tests" subtitle="Your last attempts">
      {recent.length === 0 ? (
        <div className="flex flex-col items-center justify-center w-full min-w-0 py-16 text-center bg-black/[0.02] dark:bg-white/[0.02] rounded-[16px] mb-6">
          <RiTestTubeLine size={32} className="text-[#838383] mb-3" />
          <p className="text-[14px] font-sans font-medium text-[#838383]">No tests taken yet.</p>
          <p className="text-[13px] font-sans text-[#838383]/60 mt-1">Complete a test to see it here.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3 mb-6">
          {recent.map((test, idx) => (
            <Link key={test.id || idx} href={`/results/${test.id}`} className="group relative flex flex-row items-center justify-between p-3.5 gap-4 bg-white dark:bg-white/[0.02] border border-s-stroke2/40 rounded-[16px] hover:scale-[1.01] transition-all cursor-pointer">
              <div className="flex flex-col min-w-0">
                <span className="font-sans font-semibold text-[14px] text-t-primary truncate">{test.title}</span>
                <span className="text-[11px] text-t-secondary">{new Date(test.submitted_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} · {test.percentage}% Score</span>
              </div>
              <div className="shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-black/5 dark:bg-white/5 text-t-secondary group-hover:bg-primary-01 group-hover:text-white transition-colors">
                <RiArrowRightLine size={16} />
              </div>
            </Link>
          ))}
        </div>
      )}
      <Button variant="primary" href="/history" className="w-full h-12 text-[14px]">
        View All Tests
      </Button>
    </SectionCard>
  );
}
