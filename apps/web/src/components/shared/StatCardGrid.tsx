import React from "react";

interface StatCardGridProps {
  /** Number of columns at large breakpoint. Default: 4 */
  cols?: 2 | 3 | 4;
  children: React.ReactNode;
  className?: string;
}

const COL_CLASSES: Record<2 | 3 | 4, string> = {
  2: "grid-cols-1 sm:grid-cols-2",
  3: "grid-cols-1 md:grid-cols-3",
  4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
};

/**
 * StatCardGrid
 *
 * The recessed grey wrapper that holds a row of StatCards.
 * Handles the background, border, padding and gap consistently.
 *
 * @example
 * <StatCardGrid cols={4}>
 *   <StatCard ... />
 *   <StatCard ... />
 * </StatCardGrid>
 */
export function StatCardGrid({ cols = 4, children, className = "" }: StatCardGridProps) {
  return (
    <div
      className={`grid ${COL_CLASSES[cols]} p-2 gap-4 w-full bg-b-surface1 dark:bg-b-surface1/60 border border-s-stroke2/30 dark:border-s-stroke2/40 rounded-xl ${className}`}
    >
      {children}
    </div>
  );
}

export default StatCardGrid;
