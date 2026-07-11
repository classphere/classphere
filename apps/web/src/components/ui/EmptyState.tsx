import React from "react";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

/**
 * EmptyState — consistent empty state for all views.
 * Replaces generic "No X found" text with a purposeful, alive message.
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className = "",
}: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-16 text-center select-none ${className}`}>
      {icon && (
        <div className="mb-4 text-t-secondary/25">{icon}</div>
      )}
      <h3 className="font-sans font-semibold text-[15px] text-t-primary leading-snug">
        {title}
      </h3>
      {description && (
        <p className="mt-1.5 text-[12px] font-sans text-t-secondary max-w-[280px] leading-relaxed">
          {description}
        </p>
      )}
      {action && (
        <div className="mt-5">{action}</div>
      )}
    </div>
  );
}

export default EmptyState;
