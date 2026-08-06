import React from 'react';

export type PremiumCardVariant = 'light' | 'dark' | 'transparent';

export interface PremiumCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: PremiumCardVariant;
  padding?: 'none' | 'default' | 'large';
}

/**
 * PremiumCard — Clean, flat card matching the landing page aesthetic
 * No harsh shadows, blends perfectly with surface backgrounds.
 */
export function PremiumCard({ variant = 'light', padding = 'default', className = '', children, ...props }: PremiumCardProps) {
  const base = "rounded-[24px] overflow-hidden border border-s-stroke2/40 dark:shadow-[inset_0_0_0_1.5px_rgba(229,229,229,0.04)]";
  
  const variants = {
    light: "bg-b-surface2",
    dark: "bg-b-surface1",
    transparent: "bg-transparent"
  };
  
  const paddings = {
    none: "",
    default: "p-3.5 md:p-4",
    // Dashboard widgets, not marketing panels: 42px of padding pushed most
    // cards below the fold on a laptop.
    large: "p-4 md:p-5",
  };

  return (
    <div className={`${base} ${variants[variant]} ${paddings[padding]} ${className}`} {...props}>
      {children}
    </div>
  );
}

export default PremiumCard;
