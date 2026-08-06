import React from "react";
import { PremiumCard } from "./PremiumCard";

interface PremiumSectionCardProps {
  title?: string;
  subtitle?: string;
  headerRight?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  padding?: "default" | "none" | "large";
}

export function PremiumSectionCard({
  title,
  subtitle,
  headerRight,
  children,
  className = "",
  padding = "large",
}: PremiumSectionCardProps) {
  return (
    <PremiumCard padding={padding} className={`group relative flex flex-col overflow-hidden w-full ${className}`}>
      {(title || headerRight) && (
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-3">
          {title && (
            <div>
              <h3 className="font-sans text-[16px] font-semibold tracking-[-0.02em] text-t-primary leading-snug">
                {title}
              </h3>
              {subtitle && (
                <p className="text-[12px] font-sans text-t-secondary mt-0.5">{subtitle}</p>
              )}
            </div>
          )}
          {headerRight && <div className="shrink-0">{headerRight}</div>}
        </div>
      )}
      <div className="relative z-10 flex-1">
        {children}
      </div>
    </PremiumCard>
  );
}

export default PremiumSectionCard;
