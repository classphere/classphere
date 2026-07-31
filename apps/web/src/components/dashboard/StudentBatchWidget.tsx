import React from "react";
import { PremiumCard } from "@/components/premium-ui";
import {
  RiTeamLine,
  RiCalendarEventLine,
  RiTimeLine,
  RiSparklingLine,
  RiErrorWarningLine,
} from "@remixicon/react";

interface BatchInfo {
  id: string;
  name: string;
  exam: string;
  ends_at: string;
  is_active: boolean;
}

interface StudentBatchWidgetProps {
  batch: BatchInfo | null;
}

const EXAM_LABELS: Record<string, string> = {
  "jee-main": "JEE Main",
  "jee-advanced": "JEE Advanced",
  "jee-main-advanced": "JEE Main + Advanced",
  "neet-ug": "NEET-UG",
};

export function StudentBatchWidget({ batch }: StudentBatchWidgetProps) {
  if (!batch) {
    return (
      <PremiumCard className="group relative select-none">
        <div className="flex items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-[12px] border border-s-stroke2/40 bg-b-surface1 text-t-secondary">
            <RiTeamLine size={20} />
          </div>
          <div className="min-w-0">
            <h3 className="text-[14px] font-sans font-semibold text-t-primary">No Active Batch</h3>
            <p className="mt-0.5 text-[12px] font-sans text-t-secondary">You are not currently enrolled in any batch.</p>
          </div>
        </div>
      </PremiumCard>
    );
  }

  const endsAtDate = new Date(batch.ends_at);
  const now = new Date();
  const timeDiff = endsAtDate.getTime() - now.getTime();
  const daysRemaining = Math.max(0, Math.ceil(timeDiff / (1000 * 3600 * 24)));
  const isExpired = !batch.is_active || timeDiff <= 0;

  return (
    <PremiumCard className="group relative select-none">
      <div className="relative z-10 space-y-4">
        {/* Header line */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-[10px] bg-primary-01/10 text-primary-01 border border-primary-01/20 shrink-0">
              <RiTeamLine size={16} />
            </span>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-t-secondary">
              My Active Batch
            </span>
          </div>

          {/* Status Badge */}
          {isExpired ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-red-500/10 text-red-500 font-semibold text-[10px] uppercase tracking-wider border border-red-500/20">
              <RiErrorWarningLine size={11} /> Expired
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 font-semibold text-[10px] uppercase tracking-wider border border-emerald-500/20">
              <span className="size-1.5 rounded-full bg-emerald-500 inline-block" /> Active
            </span>
          )}
        </div>

        {/* Batch details */}
        <div>
          <h3 className="text-[17px] font-semibold text-t-primary leading-[1.3] tracking-tight group-hover:text-primary-01 transition-colors">
            {batch.name}
          </h3>
          <p className="text-xs text-t-secondary mt-1 flex items-center gap-1 font-semibold uppercase tracking-wider">
            <RiSparklingLine size={12} className="text-primary-02" />
            {EXAM_LABELS[batch.exam] || batch.exam} Target
          </p>
        </div>

        {/* Countdown Indicator */}
        <div className="pt-2 border-t border-s-stroke2/50 grid grid-cols-2 gap-3 text-xs">
          <div className="space-y-0.5">
            <span className="text-t-secondary font-medium flex items-center gap-1">
              <RiCalendarEventLine size={12} /> Expiry Date
            </span>
            <span className="text-t-primary font-semibold">
              {endsAtDate.toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </span>
          </div>

          <div className="space-y-0.5 text-right">
            <span className="text-t-secondary font-medium flex items-center gap-1 justify-end">
              <RiTimeLine size={12} /> Time Left
            </span>
            {isExpired ? (
              <span className="text-red-500 font-semibold">Batch Completed</span>
            ) : daysRemaining <= 30 ? (
              <span className="text-amber-500 font-semibold">
                {daysRemaining} {daysRemaining === 1 ? "day" : "days"} left!
              </span>
            ) : (
              <span className="text-primary-02 font-semibold">
                {daysRemaining} days remaining
              </span>
            )}
          </div>
        </div>

        {/* Access info */}
        {isExpired && (
          <div className="p-2.5 rounded-[12px] bg-red-500/5 border border-red-500/10 text-[11px] font-semibold text-red-400 flex items-center gap-1.5">
            <RiErrorWarningLine size={14} className="shrink-0 text-red-500" />
            <span>Accessing course materials in Read-only Mode.</span>
          </div>
        )}
      </div>
    </PremiumCard>
  );
}
