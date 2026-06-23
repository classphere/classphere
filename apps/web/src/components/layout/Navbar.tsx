"use client";

import { mockUser } from "@/lib/mock-data";
import {
  RiSearchLine,
  RiNotification3Line,
  RiMailLine,
  RiArrowDownSLine,
  RiVerifiedBadgeFill
} from "@remixicon/react";

export default function Navbar({
  title,
  subtitle,
  breadcrumbs
}: {
  title?: string;
  subtitle?: string;
  breadcrumbs?: string;
}) {
  return (
    <header className="sticky top-0 z-30 w-full bg-b-surface1/80 backdrop-blur-md border-b border-s-stroke2/40">
      <div className="mx-auto w-full max-w-screen-2xl px-4 py-3.5 md:px-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between lg:gap-6">
        
        {/* Title & Breadcrumbs */}
        <div className="min-w-0 flex-1">
          {breadcrumbs && (
            <div className="mb-1 flex items-center gap-1.5 text-caption font-semibold text-t-tertiary">
              <span>{breadcrumbs.split(" > ")[0]}</span>
              <span className="text-t-tertiary/40">›</span>
              <span className="text-t-secondary">{breadcrumbs.split(" > ").slice(1).join(" › ")}</span>
            </div>
          )}

          <h1 className="max-w-full text-h6 font-black leading-tight tracking-tight text-t-primary sm:text-h5">
            {title || `Good morning, ${mockUser.name.split(" ")[0]}`}
          </h1>

          {subtitle && (
            <p className="mt-0.5 max-w-2xl text-caption font-semibold text-t-secondary">
              {subtitle}
            </p>
          )}
        </div>

        {/* Right Actions */}
        <div className="flex w-full items-center justify-between gap-3 lg:w-auto lg:justify-end sm:gap-4">
          
          {/* Quick Action Icons */}
          <div className="flex items-center gap-2">
            <button className="flex size-9 items-center justify-center rounded-full border border-s-stroke2/50 bg-b-surface2 text-t-secondary transition-all hover:border-s-highlight hover:text-t-primary cursor-pointer active:scale-95">
              <RiSearchLine size={18} />
            </button>

            <button className="relative flex size-9 items-center justify-center rounded-full border border-s-stroke2/50 bg-b-surface2 text-t-secondary transition-all hover:border-s-highlight hover:text-t-primary cursor-pointer active:scale-95">
              <RiNotification3Line size={18} />
              <div className="absolute top-2 right-2 size-1.5 rounded-full bg-primary-01" />
            </button>

            <button className="relative flex size-9 items-center justify-center rounded-full border border-s-stroke2/50 bg-b-surface2 text-t-secondary transition-all hover:border-s-highlight hover:text-t-primary cursor-pointer active:scale-95">
              <RiMailLine size={18} />
              <div className="absolute top-2 right-2 size-1.5 rounded-full bg-primary-01" />
            </button>
          </div>

          {/* Divider */}
          <div className="hidden h-6 w-px bg-s-stroke2/60 lg:block" />

          {/* User Profile Info */}
          <div className="flex items-center gap-2.5 rounded-full border border-s-stroke2/40 bg-b-surface2/60 px-3 py-1.5 transition-all hover:border-s-stroke2 hover:bg-b-surface2 cursor-pointer active:scale-98">
            <div className="size-8 overflow-hidden rounded-full border border-s-stroke2 bg-b-surface2">
              <img
                src={`https://ui-avatars.com/api/?name=${encodeURIComponent(mockUser.name)}&background=2A85FF&color=fff&size=64`}
                alt="Avatar"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="hidden min-w-0 sm:block">
              <div className="flex items-center gap-1">
                <span className="text-caption font-bold text-t-primary leading-none">{mockUser.name}</span>
                <span className="text-t-blue flex items-center">
                  <RiVerifiedBadgeFill size={13} />
                </span>
              </div>
            </div>
            <span className="text-t-secondary flex items-center">
              <RiArrowDownSLine size={14} />
            </span>
          </div>
        </div>

      </div>
    </header>
  );
}
