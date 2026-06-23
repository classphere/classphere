"use client";

import { mockUser } from "@/lib/mock-data";
import {
  RiNotification3Line,
  RiMailLine,
  RiVerifiedBadgeFill
} from "@remixicon/react";
import Link from "next/link";

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
    <header className={`sticky top-0 z-30 w-full mx-auto px-4 md:px-6 pt-6 bg-transparent select-none ${className || "max-w-screen-2xl"}`}>
      
      {/* Floating Rounded Card Navbar */}
      <div className="w-full h-20 bg-[#FDFDFD] dark:bg-b-surface2 border border-s-stroke2/40 rounded-[32px] px-8 flex items-center justify-between shadow-[0px_5px_1.5px_-4px_rgba(8,8,8,0.09),0px_6px_4px_-4px_rgba(8,8,8,0.05)]">
        
        {/* Title & Breadcrumbs */}
        <div className="min-w-0 flex-1">
          {breadcrumbs && (
            <div className="mb-0.5 flex items-center gap-1.5 text-xs font-semibold text-[#7B7B7B] font-sans">
              <span>{breadcrumbs.split(" > ")[0]}</span>
              <span className="text-[#7B7B7B]/40">›</span>
              <span className="text-[#7B7B7B]">{breadcrumbs.split(" > ").slice(1).join(" › ")}</span>
            </div>
          )}

          <h4 className="font-sans font-semibold text-[26px] leading-tight tracking-[0.0025em] text-[#101010] dark:text-t-primary truncate">
            {title || `Good morning, ${mockUser.name.split(" ")[0]}`}
          </h4>
        </div>

        {/* Right Nav Items Container */}
        <div className="flex items-center gap-3 shrink-0">
          
          {/* Icon Button: Bell (48x48px) */}
          <button className="relative flex items-center justify-center size-12 rounded-full border border-s-stroke2/30 bg-[#FDFDFD] dark:bg-b-surface2 text-[#727272] hover:text-[#101010] dark:hover:text-t-primary hover:bg-[#F9F9F9] cursor-pointer active:scale-95 transition-all shadow-xs shrink-0">
            <RiNotification3Line size={20} />
            <div className="absolute top-3.5 right-3.5 size-1.5 rounded-full bg-[#FF6A55]" />
          </button>

          {/* Icon Button: Message (48x48px) */}
          <Link href="/doubts" className="relative flex items-center justify-center size-12 rounded-full border border-s-stroke2/30 bg-[#FDFDFD] dark:bg-b-surface2 text-[#727272] hover:text-[#101010] dark:hover:text-t-primary hover:bg-[#F9F9F9] cursor-pointer active:scale-95 transition-all shadow-xs shrink-0">
            <RiMailLine size={20} />
            <div className="absolute top-3.5 right-3.5 size-1.5 rounded-full bg-[#FF6A55]" />
          </Link>

          {/* Profile Avatar Card (48x48px, containing 40x40px avatar) */}
          <Link href="/profile" className="flex items-center justify-center size-12 bg-[#FDFDFD] dark:bg-b-surface2 border-[1.5px] border-[rgba(123,123,123,0.1)] rounded-full hover:border-[rgba(123,123,123,0.3)] transition-all cursor-pointer active:scale-95 shadow-xs shrink-0">
            <div className="size-10 rounded-full overflow-hidden">
              <img
                src={`https://ui-avatars.com/api/?name=${encodeURIComponent(mockUser.name)}&background=101010&color=fff&size=80`}
                alt="Avatar"
                className="w-full h-full object-cover"
              />
            </div>
          </Link>

        </div>
      </div>
    </header>
  );
}
