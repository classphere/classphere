import React from "react";
import { Card } from "./Card";

interface SectionCardProps {
  title?: React.ReactNode | string;
  subtitle?: string;
  headerRight?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  padding?: "default" | "none" | "large";
}

/**
 * SectionCard — VADL V2 Wrapper
 * Enforces the luxurious embossed card system.
 */
export function SectionCard({
  title,
  subtitle,
  headerRight,
  children,
  className = "",
  padding = "large", // default to luxurious padding
}: SectionCardProps) {
  return (
    <Card padding={padding} className={`group relative flex flex-col overflow-hidden ${className}`}>

      {/* Header stacks on phones. Forcing title and headerRight onto one row
          squeezed a heading like "Detailed Performance Report" into a 3-line
          sliver beside its tab bar. Matches PremiumSectionCard (dashboard). */}
      {(title || headerRight) && (
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-3">
          {title && (
            <div className="min-w-0">
              <h3 className="font-sans text-[16px] font-semibold tracking-[-0.02em] text-t-primary leading-snug">
                {title}
              </h3>
              {subtitle && (
                <p className="text-[12px] font-sans text-t-secondary mt-0.5">{subtitle}</p>
              )}
            </div>
          )}
          {/* Full width when stacked so a tab bar can scroll edge-to-edge
              instead of being clipped mid-label. */}
          {headerRight && <div className="w-full min-w-0 sm:w-auto sm:shrink-0">{headerRight}</div>}
        </div>
      )}

      <div className="relative z-10 flex-1">
        {children}
      </div>
    </Card>
  );
}

export default SectionCard;
