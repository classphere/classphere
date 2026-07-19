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
      <div className="relative z-10 flex flex-col gap-3 sm:gap-4">
        {/* Label Row */}
        <div className="flex min-w-0 items-center gap-2">
          {icon && (
            <span className="text-t-secondary">{icon}</span>
          )}
          <span className="min-w-0 text-[11px] leading-tight font-sans font-[600] text-t-secondary tracking-[0.03em] uppercase sm:text-[13px]">
            {label}
          </span>
        </div>

        {/* Value */}
        <div className="my-1 font-sans text-[32px] font-semibold leading-none tracking-[-0.04em] text-t-primary sm:text-[42px]">
          {value}
        </div>

        {/* Delta badge */}
        {(badge || badgeLabel) && (
          <div className="flex items-center gap-2 mt-1">
            {badge && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-[8px] bg-b-surface1 dark:bg-[#222] text-[12px] font-sans font-bold text-t-secondary shadow-sm">
                {badge}
              </span>
            )}
            {badgeLabel && (
            <span className="text-[11px] font-sans font-medium text-t-secondary sm:text-[12px]">{badgeLabel}</span>
            )}
          </div>
        )}
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
    <div className={`grid ${colClass} gap-3 sm:gap-6 mb-6 sm:mb-8 ${className}`}>
      {children}
    </div>
  );
}

export default PremiumMetricCard;
