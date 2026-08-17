import React from "react";
import { PremiumCard } from "./PremiumCard";

interface PremiumMetricCardProps {
  icon?: React.ReactNode;
  label: string;
  value: React.ReactNode;
  badge?: React.ReactNode;
  badgeLabel?: string;
  className?: string;
}

export function PremiumMetricCard({ icon, label, value, badge, badgeLabel, className = "" }: PremiumMetricCardProps) {
  return (
    <PremiumCard 
      padding="default"
      className={`group relative flex min-w-0 flex-col overflow-hidden transition-all duration-300 select-none ${className}`}
    >
      {/* Deliberately compact. At text-[42px] with gap-4 stacking these cards ran
          ~150px tall each, so a four-card row consumed a third of the viewport
          before any actual content. */}
      <div className="relative z-10 flex flex-col gap-1.5">
        {/* Label Row */}
        <div className="flex min-w-0 items-center gap-1.5">
          {icon && (
            <span className="text-t-secondary [&>svg]:size-4">{icon}</span>
          )}
          <span className="min-w-0 truncate text-[10px] leading-tight font-sans font-[600] text-t-secondary tracking-[0.03em] uppercase sm:text-[11px]">
            {label}
          </span>
        </div>

        {/* Value */}
        <div className="font-sans text-[22px] font-semibold leading-none tracking-[-0.03em] text-t-primary sm:text-[26px]">
          {value}
        </div>

        {/* Delta badge — always rendered, empty when there's nothing to show.
            A row of these cards used to grow whichever one happened to get a
            badge (e.g. "Pending DPPs" only when count > 0) while its siblings
            stayed short, since nothing reserved the row's height when the
            content wasn't there. min-h-[22px] matches the badge pill's own
            rendered height, so every card in a row is the same height
            regardless of which ones have something to say here. */}
        <div className="flex min-h-[22px] min-w-0 items-center gap-1.5">
          {badge && (
            <span className="inline-flex shrink-0 items-center rounded-[6px] bg-b-surface1 px-1.5 py-0.5 text-[11px] font-sans font-semibold text-t-secondary">
              {badge}
            </span>
          )}
          {badgeLabel && (
            <span className="truncate text-[11px] font-sans font-medium text-t-secondary">{badgeLabel}</span>
          )}
        </div>
      </div>
    </PremiumCard>
  );
}

export function PremiumMetricGrid({ children, cols = 4, className = "" }: { children: React.ReactNode, cols?: 2 | 3 | 4, className?: string }) {
  const colClass = {
    2: "grid-cols-2",
    3: "grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-2 lg:grid-cols-4",
  }[cols];

  return (
    <div className={`grid ${colClass} gap-2.5 sm:gap-3 ${className}`}>
      {children}
    </div>
  );
}

export default PremiumMetricCard;
