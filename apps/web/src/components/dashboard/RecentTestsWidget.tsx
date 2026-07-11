import React from "react";
import { PremiumSectionCard as SectionCard } from "@/components/premium-ui";
import { Button } from "@/components/landing/ui/Button";
import { RiTestTubeLine } from "@remixicon/react";

export function RecentTestsWidget() {
  return (
    <SectionCard title="Recent Tests" subtitle="Your last attempts">
      <div className="flex flex-col items-center justify-center w-full min-w-0 py-16 text-center bg-black/[0.02] dark:bg-white/[0.02] rounded-[16px] mb-6">
        <RiTestTubeLine size={32} className="text-[#838383] mb-3" />
        <p className="text-[14px] font-sans font-medium text-[#838383]">No tests taken yet.</p>
        <p className="text-[13px] font-sans text-[#838383]/60 mt-1">Complete a test to see it here.</p>
      </div>
      <Button variant="primary" href="/history" className="w-full h-12 text-[14px]">
        View All Tests
      </Button>
    </SectionCard>
  );
}
