import React from "react";
import { PremiumSectionCard as SectionCard } from "@/components/premium-ui";
import { Button } from "@/components/landing/ui/Button";
import { RiArrowRightLine } from "@remixicon/react";
import Link from "next/link";

export function PendingDPPsWidget() {
  return (
    <SectionCard
      title="Pending DPPs"
      subtitle="No assignments yet"
      headerRight={
        <Button variant="secondary" href="/assignments" className="!h-9 !px-4 text-[12px]">
          View All
          <RiArrowRightLine size={14} className="relative ml-1" />
        </Button>
      }
    >
      <div className="relative z-10 flex flex-col items-center justify-center py-16 w-full text-center bg-black/[0.02] dark:bg-white/[0.02] rounded-[16px]">
        <p className="text-[14px] font-sans font-medium text-[#838383]">No DPPs assigned yet.</p>
        <p className="text-[13px] font-sans text-t-secondary/60 mt-1">Your teacher will assign practice papers here.</p>
      </div>
    </SectionCard>
  );
}
