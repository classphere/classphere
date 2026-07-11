import React from "react";
import Link from "next/link";

interface PrimaryButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  href?: string;
  className?: string;
  children: React.ReactNode;
}

/**
 * PrimaryButton — VADL V2 premium black button.
 * Includes smooth scaling, the signature glare element, and smooth hover translations.
 */
export const PrimaryButton = React.forwardRef<HTMLButtonElement, PrimaryButtonProps>(
  ({ href, className = "", children, ...props }, ref) => {
    const baseClasses = `group relative flex items-center justify-center overflow-hidden rounded-[14px] border border-[#161616] bg-[linear-gradient(342.29deg,#070707_12.1%,#2F2E31_87.9%)] px-6 py-3.5 text-[14px] font-semibold text-white shadow-velora-dark transition-all duration-300 hover:-translate-y-0.5 hover:shadow-depth active:scale-95 cursor-pointer select-none ${className}`;

    const innerGlare = (
      <i className="absolute -right-3 top-0 h-3 w-32 rotate-[125deg] rounded-full bg-white/10 blur-[4px] transition-transform duration-700 ease-out group-hover:translate-x-[-120px]" />
    );

    if (href) {
      return (
        <Link href={href} className={baseClasses}>
          {innerGlare}
          <span className="relative z-10 flex items-center gap-2">{children}</span>
        </Link>
      );
    }

    return (
      <button ref={ref} className={baseClasses} {...props}>
        {innerGlare}
        <span className="relative z-10 flex items-center gap-2">{children}</span>
      </button>
    );
  }
);

PrimaryButton.displayName = "PrimaryButton";
