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
  const base = "rounded-[24px] border border-s-stroke2/40 shadow-widget dark:shadow-[inset_0_0_0_1.5px_rgba(229,229,229,0.04),0px_5px_1.5px_-4px_rgba(8,8,8,0.5)] transition-all duration-200";
  
  const variants = {
    default: "bg-b-surface2", // Main theme background
    light: "bg-b-pop", 
    transparent: "bg-transparent shadow-none border-transparent",
  };

  const paddings = {
    none: "",
    default: "p-4 sm:p-6",
    large: "p-8 md:p-[42px]",
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
