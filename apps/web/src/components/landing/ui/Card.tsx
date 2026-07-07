import React from 'react';

type CardVariant = 'light' | 'dark' | 'transparent';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
}

export function Card({ variant = 'light', className = '', children, ...props }: CardProps) {
  const base = "rounded-[24px]";
  
  const variants = {
    light: "bg-[#FAFAFA]",
    dark: "bg-[#090909]",
    transparent: "bg-[#DBD0D0]"
  };

  return (
    <div className={`${base} ${variants[variant]} ${className}`} {...props}>
      {children}
    </div>
  );
}
