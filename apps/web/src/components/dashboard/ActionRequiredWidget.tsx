import React from "react";
import { PremiumSectionCard as SectionCard } from "@/components/premium-ui";
import { Button } from "@/components/landing/ui/Button";
import { RiShieldCrossFill } from "@remixicon/react";

export function ActionRequiredWidget() {
  return (
    <SectionCard 
      title="Action Required"
      headerRight={<span className="inline-flex items-center h-[26px] px-3 rounded-[8px] bg-primary-03/10 text-primary-03 text-[11px] font-bold uppercase tracking-wider">High Risk</span>}
    >
      <div className="flex flex-row items-start gap-4 w-full mb-6 mt-2">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-b from-[#FFD1D1] to-[#FFA3A3] shadow-[inset_0px_2px_4px_rgba(255,255,255,0.4)]">
          <RiShieldCrossFill size={20} className="text-[#b80000]" />
        </div>
        <div className="flex flex-col gap-1 flex-1 min-w-0 pt-1">
          <div className="font-sans font-bold text-[15px] leading-none text-t-primary">
            Critical Boosters Ready
          </div>
          <div className="font-sans text-[13px] text-[#838383]">
            4 topics degrading below target accuracy
          </div>
        </div>
      </div>
      <Button variant="primary" className="w-full h-12 text-[14px]">
        Start Booster Queue
      </Button>
    </SectionCard>
  );
}
