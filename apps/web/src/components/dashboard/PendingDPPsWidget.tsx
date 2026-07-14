import React from "react";
import { PremiumSectionCard as SectionCard } from "@/components/premium-ui";
import { Button } from "@/components/landing/ui/Button";
import { RiArrowRightLine } from "@remixicon/react";
import Link from "next/link";

export function PendingDPPsWidget({ dpps = [] }: { dpps?: any[] }) {
  const pending = dpps.slice(0, 3);

  return (
    <SectionCard
      title="Pending DPPs"
      subtitle={pending.length > 0 ? "Daily Practice Problems" : "No assignments yet"}
      headerRight={
        <Button variant="secondary" href="/dpps" className="!h-9 !px-4 text-[12px]">
          View All
          <RiArrowRightLine size={14} className="relative ml-1" />
        </Button>
      }
    >
      {pending.length === 0 ? (
        <div className="relative z-10 flex flex-col items-center justify-center py-16 w-full text-center bg-black/[0.02] dark:bg-white/[0.02] rounded-[16px]">
          <p className="text-[14px] font-sans font-medium text-[#838383]">No DPPs assigned yet.</p>
          <p className="text-[13px] font-sans text-t-secondary/60 mt-1">Your teacher will assign practice papers here.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {pending.map((dpp, idx) => (
            <Link key={dpp.dppId || idx} href={`/dpps/take/${dpp.dppId}`} className="group relative flex flex-row items-center justify-between p-3.5 gap-4 bg-white dark:bg-white/[0.02] border border-s-stroke2/40 rounded-[16px] hover:scale-[1.01] transition-all cursor-pointer">
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-sans font-semibold text-[14px] text-t-primary truncate">{dpp.title}</span>
                  {dpp.status === "late" && (
                    <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-[4px] bg-red-500/10 text-red-500 border border-red-500/20">
                      LATE
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-t-secondary mt-0.5">
                  {dpp.subject && `${dpp.subject} • `}{dpp.totalQuestions} Questions {dpp.dueDate && `• Due ${new Date(dpp.dueDate).toLocaleDateString()}`}
                </span>
              </div>
              <div className="shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-black/5 dark:bg-white/5 text-t-secondary group-hover:bg-primary-01 group-hover:text-white transition-colors">
                <RiArrowRightLine size={16} />
              </div>
            </Link>
          ))}
        </div>
      )}
    </SectionCard>
  );
}
