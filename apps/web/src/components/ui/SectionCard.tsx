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

      {(title || headerRight) && (
        <div className="relative z-10 flex items-start justify-between gap-4 mb-6">
          {title && (
            <div>
              <h3 className="font-sans text-[20px] font-semibold tracking-[-0.02em] text-t-primary leading-snug">
                {title}
              </h3>
              {subtitle && (
                <p className="text-[13px] font-sans text-t-secondary mt-0.5">{subtitle}</p>
              )}
            </div>
          )}
          {headerRight && <div className="shrink-0">{headerRight}</div>}
        </div>
      )}

      <div className="relative z-10 flex-1">
        {children}
      </div>
    </Card>
  );
}

export default SectionCard;
