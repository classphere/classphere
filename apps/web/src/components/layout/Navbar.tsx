"use client";

import { useAuth } from "@/lib/auth-context";

export default function Navbar({
  title,
  subtitle,
  breadcrumbs,
  className,
  children
}: {
  title?: string;
  subtitle?: string;
  breadcrumbs?: string;
  className?: string;
  children?: React.ReactNode;
}) {
  const { user } = useAuth();
  const firstName = (user?.name ?? "there").split(" ")[0];

  return (
    <header className={`w-full mx-auto px-4 md:px-6 pt-6 pb-2 bg-transparent select-none ${className || "max-w-screen-2xl"}`}>
      <div className="w-full flex flex-row justify-between items-start gap-4">
        <div className="flex flex-col justify-start">
          {breadcrumbs && (
            <div className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-t-secondary font-sans uppercase tracking-wider">
              <span>{breadcrumbs.split(" > ")[0]}</span>
              <span className="text-t-secondary/40">›</span>
              <span className="text-t-secondary">{breadcrumbs.split(" > ").slice(1).join(" › ")}</span>
            </div>
          )}
          <h1 className="font-sans font-semibold text-[32px] leading-tight tracking-[0.0025em] text-t-primary dark:text-t-primary">
            {title || `Good morning, ${firstName}`}
          </h1>
          {subtitle && (
            <p className="text-sm font-sans text-t-secondary dark:text-t-secondary mt-1">
              {subtitle}
            </p>
          )}
        </div>
        {children && (
          <div className="flex items-center gap-3 shrink-0 mt-2">
            {children}
          </div>
        )}
      </div>
    </header>
  );
}
