"use client";

export { StatCardGrid } from "./StatCardGrid";

import React from "react";

export type BadgeVariant = "green" | "red" | "yellow" | "gray" | "blue";

interface StatCardProps {
  /** Icon displayed in the header row */
  icon?: React.ReactNode;
  /** Card title / metric label */
  title: string;
  /** The large numeric / text value */
  value: React.ReactNode;
  /** Text inside the pill badge */
  badge?: string;
  /** Colour variant of the pill badge */
  badgeVariant?: BadgeVariant;
  /** Small helper text below the badge */
  subtext?: string;
  /** Show a skeleton pulse while loading */
  loading?: boolean;
  /** Optional className override on the outer wrapper */
  className?: string;
}

const BADGE_CLASSES: Record<BadgeVariant, string> = {
  green: "label label-green",
  red:   "label label-red",
  yellow:"label label-yellow",
  gray:  "label label-gray",
  blue:  "label border border-primary-01/15 bg-primary-01/5 text-primary-01",
};

/**
 * StatCard
 *
 * The standard metric card used across every dashboard on the platform.
 * Drop into a <StatCardGrid> for the correct grid layout.
 *
 * @example
 * <StatCard
 *   icon={<RiBuilding4Line size={20} />}
 *   title="Total Institutes"
 *   value={stats.totalInstitutes}
 *   badge="+2"
 *   subtext="this week"
 *   loading={isLoading}
 * />
 */
export function StatCard({
  icon,
  title,
  value,
  badge,
  badgeVariant = "green",
  subtext,
  loading = false,
  className = "",
}: StatCardProps) {
  return (
    <div
      className={`flex flex-col items-start px-6 py-5 gap-3 ${className}`}
    >
      {/* Header row: icon + title */}
      <div className="flex flex-row items-center gap-2">
        {icon && (
          <span className="text-t-secondary shrink-0">{icon}</span>
        )}
        <span className="text-[13px] font-sans font-semibold text-t-secondary tracking-wide">{title}</span>
      </div>

      {/* Value + badge row */}
      <div className="flex flex-row items-end gap-3 w-full">
        {/* Big number */}
        <div className="font-sans text-[40px] font-semibold tracking-[-0.03em] text-t-primary leading-none">
          {loading ? (
            <span className="inline-block w-20 h-9 bg-b-surface1 rounded-[10px] animate-pulse" />
          ) : (
            value
          )}
        </div>

        {/* Badge + subtext column */}
        {(badge !== undefined || subtext) && (
          <div className="flex flex-col gap-0.5 min-w-0 pb-1">
            {badge !== undefined && (
              <span className={`${BADGE_CLASSES[badgeVariant]} h-[22px] px-2 text-[11px] font-semibold`}>
                {badge}
              </span>
            )}
            {subtext && (
              <span className="text-[11px] font-sans text-t-tertiary truncate mt-0.5">{subtext}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default StatCard;
