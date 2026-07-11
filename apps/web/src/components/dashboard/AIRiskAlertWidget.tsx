import React from "react";
import { PremiumSectionCard as SectionCard } from "@/components/premium-ui";
import { Button } from "@/components/landing/ui/Button";
import { RiAlertFill } from "@remixicon/react";

export function AIRiskAlertWidget() {
  return (
    <SectionCard 
      title="AI Risk Alert" 
      headerRight={<span className="inline-flex items-center h-[26px] px-3 rounded-[8px] bg-primary-05/10 text-primary-05 text-[11px] font-bold uppercase tracking-wider">Warning</span>}
    >
      <div className="flex flex-row items-start gap-4 w-full mb-6 mt-2">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-b from-[#FFD5BD] to-[#FFC1B1] shadow-[inset_0px_2px_4px_rgba(255,255,255,0.4)]">
          <RiAlertFill size={20} className="text-[#b84c00]" />
        </div>
        <p className="font-sans text-[14px] leading-relaxed text-[#838383] flex-1">
          Accuracy in <span className="font-semibold text-t-primary">Laws of Motion</span> dropped <span className="font-bold text-primary-03">-15%</span> this week. Est. impact: <span className="font-bold text-primary-03">-12 marks</span>.
        </p>
      </div>
      <Button variant="secondary" className="w-full h-12 text-[14px]">
        Take Booster Test
      </Button>
    </SectionCard>
  );
}
