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
      className={`group relative flex flex-col overflow-hidden transition-all duration-300 select-none ${className}`}
    >
      <div className="relative z-10 flex flex-col gap-4">
        {/* Label Row */}
        <div className="flex items-center gap-2.5">
          {icon && (
            <span className="text-t-secondary">{icon}</span>
          )}
          <span className="text-[13px] font-sans font-[600] text-t-secondary tracking-[0.03em] uppercase">
            {label}
          </span>
        </div>

        {/* Value */}
        <div className="font-sans text-[42px] font-semibold tracking-[-0.04em] text-t-primary leading-none my-1">
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
              <span className="text-[12px] font-sans font-medium text-t-secondary">{badgeLabel}</span>
            )}
          </div>
        )}
      </div>
    </PremiumCard>
  );
}

export function PremiumMetricGrid({ children, cols = 4, className = "" }: { children: React.ReactNode, cols?: 2 | 3 | 4, className?: string }) {
  const colClass = {
    2: "grid-cols-1 md:grid-cols-2",
    3: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 md:grid-cols-2 lg:grid-cols-4",
  }[cols];

  return (
    <div className={`grid ${colClass} gap-6 mb-8 ${className}`}>
      {children}
    </div>
  );
}

export default PremiumMetricCard;
