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
  const base = "rounded-[24px] border border-transparent shadow-[0_2px_0_rgba(223,222,222,.64),inset_0_2px_rgba(255,255,255,.64)] dark:shadow-[0_2px_0_rgba(0,0,0,.5),inset_0_2px_rgba(255,255,255,.05)] transition-all duration-200";
  
  const variants = {
    default: "bg-b-surface2 dark:bg-[#161616]", // Main theme background
    light: "bg-[#FAFAFA] dark:bg-black", 
    transparent: "bg-transparent shadow-none border-transparent",
  };

  const paddings = {
    none: "",
    default: "p-6",
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
