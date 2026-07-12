import React from "react";
import { Button } from "@/components/landing/ui/Button";

interface SecondaryButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  href?: string;
  className?: string;
  children: React.ReactNode;
}

/**
 * SecondaryButton
 * Wrapper around the global landing page Button component (variant: 'secondary').
 */
export function SecondaryButton({
  href,
  className = "",
  children,
  ...props
}: SecondaryButtonProps) {
  return (
    <Button 
      variant="secondary" 
      href={href} 
      className={`h-11 px-6 ${className}`} 
      {...props}
    >
      {children}
    </Button>
  );
}

export default SecondaryButton;
