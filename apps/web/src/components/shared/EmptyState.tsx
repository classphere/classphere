import React from "react";

interface EmptyStateProps {
  /** Optional icon element displayed above the message */
  icon?: React.ReactNode;
  /** Primary message text */
  message: string;
  /** Optional lighter sub-message */
  subtext?: string;
  /** Optional CTA button */
  action?: React.ReactNode;
  /** Vertical padding class — default "py-12" */
  padding?: string;
}

/**
 * EmptyState
 *
 * Consistent empty state displayed when a list or data section has no content.
 *
 * @example
 * <EmptyState
 *   icon={<RiTestTubeLine size={36} className="text-t-tertiary/40" />}
 *   message="No tests taken yet."
 *   subtext="Complete a test to see it here."
 * />
 */
export function EmptyState({
  icon,
  message,
  subtext,
  action,
  padding = "py-12",
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center w-full text-center ${padding} gap-3`}
    >
      {icon && <span className="mb-1">{icon}</span>}
      <p className="t-body-base text-t-secondary">{message}</p>
      {subtext && (
        <p className="text-caption text-t-tertiary/70">{subtext}</p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export default EmptyState;
