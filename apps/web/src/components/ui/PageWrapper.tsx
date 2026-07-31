import React from "react";

interface PageWrapperProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * PageWrapper — universal main container for all dashboard pages.
 * Enforces consistent max-width, horizontal padding, and bottom padding.
 */
export function PageWrapper({ children, className = "" }: PageWrapperProps) {
  return (
    <main className={`mx-auto w-full max-w-screen-2xl px-4 pb-12 pt-4 md:px-8 overflow-x-hidden space-y-3 ${className}`}>
      {children}
    </main>
  );
}

export default PageWrapper;
