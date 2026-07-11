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
  const base = "rounded-[24px] overflow-hidden";
  
  const variants = {
    light: "bg-[#FAFAFA] dark:bg-[#161616]",
    dark: "bg-[#090909] dark:bg-black",
    transparent: "bg-transparent"
  };
  
  const paddings = {
    none: "",
    default: "p-6",
    large: "p-8 md:p-[42px]",
  };

  return (
    <div className={`${base} ${variants[variant]} ${paddings[padding]} ${className}`} {...props}>
      {children}
    </div>
  );
}

export default PremiumCard;
