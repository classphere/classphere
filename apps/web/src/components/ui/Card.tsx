import React from "react";

type CardVariant = "default" | "light" | "transparent";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  padding?: "none" | "default" | "large";
}

/**
 * Premium VADL V2 Card Component
 * Uses the exact landing page design tokens:
 * - 24px border radius
 * - No flat borders
 * - Subtle embossed dual-shadow for depth
 */
export function Card({
  variant = "default",
  padding = "default",
  className = "",
  children,
  ...props
}: CardProps) {
  // Matches PremiumCard, the card the dashboard uses: flat, borderless-feeling,
  // blending into the surface. The previous shadow-widget + drop shadow made
  // these sit visibly "above" the page and read as a different design system.
  const base = "rounded-[24px] overflow-hidden border border-s-stroke2/40 dark:shadow-[inset_0_0_0_1.5px_rgba(229,229,229,0.04)]";
  
  const variants = {
    default: "bg-b-surface2", // Main theme background
    light: "bg-b-pop", 
    transparent: "bg-transparent shadow-none border-transparent",
  };

  const paddings = {
    none: "",
    default: "p-4 sm:p-6",
    // Ramps up from a phone-friendly base. "large" previously started at p-8,
    // which spent 64px of a 375px screen on padding alone and left tables and
    // stat tiles badly cramped. Mirrors PremiumCard so results cards match the
    // dashboard's spacing.
    large: "p-5 md:p-8 lg:p-[42px]",
  };

  return (
    <div 
      className={`${base} ${variants[variant]} ${paddings[padding]} ${className}`} 
      {...props}
    >
      {children}
    </div>
  );
}

export default Card;
