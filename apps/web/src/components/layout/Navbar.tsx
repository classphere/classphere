"use client";

import { mockUser } from "@/lib/mock-data";

export default function Navbar({
  title,
  subtitle,
  breadcrumbs,
  className
}: {
  title?: string;
  subtitle?: string;
  breadcrumbs?: string;
  className?: string;
}) {
  return (
    <header className={`w-full mx-auto px-4 md:px-6 pt-6 pb-2 bg-transparent select-none ${className || "max-w-screen-2xl"}`}>
      <div className="w-full flex flex-col justify-start">
        {breadcrumbs && (
          <div className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-[#7B7B7B] font-sans uppercase tracking-wider">
            <span>{breadcrumbs.split(" > ")[0]}</span>
            <span className="text-[#7B7B7B]/40">›</span>
            <span className="text-[#7B7B7B]">{breadcrumbs.split(" > ").slice(1).join(" › ")}</span>
          </div>
        )}
        <h1 className="font-sans font-semibold text-[32px] leading-tight tracking-[0.0025em] text-[#101010] dark:text-t-primary">
          {title || `Good morning, ${mockUser.name.split(" ")[0]}`}
        </h1>
        {subtitle && (
          <p className="text-sm font-sans text-[#7B7B7B] dark:text-t-secondary mt-1">
            {subtitle}
          </p>
        )}
      </div>
    </header>
  );
}
