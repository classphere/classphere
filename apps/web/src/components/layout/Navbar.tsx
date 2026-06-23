"use client";

import { mockUser } from "@/lib/mock-data";
import {
  RiSearchLine,
  RiNotification3Line,
  RiMailLine,
  RiArrowDownSLine,
  RiVerifiedBadgeFill
} from "@remixicon/react";
import Link from "next/link";
import { useState } from "react";

export default function Navbar({
  title,
  subtitle,
  breadcrumbs
}: {
  title?: string;
  subtitle?: string;
  breadcrumbs?: string;
}) {
  const [searchVal, setSearchVal] = useState("");

  return (
    <header className="sticky top-0 z-30 w-full bg-[#FDFDFD]/80 dark:bg-b-surface2/80 backdrop-blur-md border-b border-s-stroke2/40 select-none">
      <div className="mx-auto w-full max-w-screen-2xl px-4 py-3.5 md:px-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between lg:gap-6">
        
        {/* Title & Breadcrumbs */}
        <div className="min-w-0 flex-1">
          {breadcrumbs && (
            <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-[#7B7B7B] font-sans">
              <span>{breadcrumbs.split(" > ")[0]}</span>
              <span className="text-[#7B7B7B]/40">›</span>
              <span className="text-[#7B7B7B]">{breadcrumbs.split(" > ").slice(1).join(" › ")}</span>
            </div>
          )}

          <h4 className="font-sans font-semibold text-[32px] leading-[145%] tracking-[0.0025em] text-[#101010] dark:text-t-primary truncate">
            {title || `Good morning, ${mockUser.name.split(" ")[0]}`}
          </h4>

          {subtitle && (
            <p className="mt-0.5 max-w-2xl text-[13px] font-sans font-semibold text-[#7B7B7B]">
              {subtitle}
            </p>
          )}
        </div>

        {/* Right Nav Items Container */}
        <div className="flex items-center gap-3 shrink-0 lg:w-auto w-full lg:justify-end justify-between">
          
          {/* Search Pill Input (width: 315px, height: 48px) */}
          <div className="flex flex-row items-center px-4 py-3 gap-2 w-[315px] h-12 bg-[#FDFDFD] dark:bg-b-surface2 border border-s-stroke2/30 rounded-[90px] shadow-xs">
            <RiSearchLine size={20} className="text-[#727272] shrink-0" />
            <input
              type="text"
              placeholder="Search anything..."
              value={searchVal}
              onChange={(e) => setSearchVal(e.target.value)}
              className="bg-transparent font-sans text-[14px] font-normal leading-[150%] tracking-[0.0025em] text-[#101010] dark:text-t-primary placeholder-[#727272] focus:outline-none w-full"
            />
          </div>

          {/* Charcoal Gradient Button (width: 100px, height: 48px) */}
          <button className="flex flex-row justify-center items-center py-4 px-7 gap-2.5 w-[100px] h-12 bg-gradient-to-b from-[#2C2C2C] to-[#282828] text-[#FDFDFD] dark:from-t-primary dark:to-t-primary/80 dark:text-b-surface1 border-none shadow-[inset_2px_0px_8px_2px_rgba(248,248,248,0.2)] rounded-[32px] cursor-pointer hover:scale-105 active:scale-95 transition-all font-sans font-semibold text-[14px] leading-none tracking-[0.0125em]">
            Create
          </button>

          {/* Icon Button: Bell (48x48px) */}
          <button className="relative flex items-center justify-center size-12 rounded-full border border-s-stroke2/30 bg-[#FDFDFD] dark:bg-b-surface2 text-[#727272] hover:text-[#101010] dark:hover:text-t-primary cursor-pointer active:scale-95 transition-all shadow-xs shrink-0">
            <RiNotification3Line size={20} />
            <div className="absolute top-3.5 right-3.5 size-1.5 rounded-full bg-[#FF6A55]" />
          </button>

          {/* Icon Button: Message (48x48px) */}
          <Link href="/doubts" className="relative flex items-center justify-center size-12 rounded-full border border-s-stroke2/30 bg-[#FDFDFD] dark:bg-b-surface2 text-[#727272] hover:text-[#101010] dark:hover:text-t-primary cursor-pointer active:scale-95 transition-all shadow-xs shrink-0">
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
