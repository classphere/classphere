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
      className={`flex flex-col items-start p-5 gap-2 bg-b-surface2 border border-b-surface2 dark:border-s-stroke2/30 rounded-lg shadow-widget ${className}`}
    >
      {/* Header row: icon + title */}
      <div className="flex flex-row items-center gap-2 w-full mb-1">
        {icon && (
          <span className="text-t-primary shrink-0">{icon}</span>
        )}
        <span className="t-sub-s text-t-primary">{title}</span>
      </div>

      {/* Value + badge row */}
      <div className="flex flex-row items-center gap-3 w-full mt-1">
        {/* Big number */}
        <div className="font-sans text-4xl font-semibold tracking-tight text-t-primary leading-none">
          {loading ? (
            <span className="inline-block w-16 h-8 bg-b-surface1 rounded-lg animate-pulse" />
          ) : (
            value
          )}
        </div>

        {/* Badge + subtext column */}
        {(badge !== undefined || subtext) && (
          <div className="flex flex-col gap-0.5 min-w-0">
            {badge !== undefined && (
              <span className={`${BADGE_CLASSES[badgeVariant]} h-6 px-1.5 text-[11px]`}>
                {badge}
              </span>
            )}
            {subtext && (
              <span className="text-caption text-t-tertiary truncate">{subtext}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default StatCard;
