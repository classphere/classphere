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
    <header className="sticky top-4 z-30 mx-4 flex w-[calc(100%-2rem)] flex-col gap-4 rounded-4xl border border-s-stroke2/70 bg-b-surface1 px-5 py-4 shadow-widget md:mx-6 md:w-[calc(100%-3rem)] md:px-6 lg:flex-row lg:items-center lg:justify-between lg:gap-6 lg:px-8">
      {/* Title & Breadcrumbs */}
      <div className="min-w-0 flex-1">
        {breadcrumbs && (
          <div className="mb-1 flex items-center gap-1.5 text-caption text-t-secondary">
            <span className="font-semibold text-t-secondary">{breadcrumbs.split(" > ")[0]}</span>
            <span>›</span>
            <span>{breadcrumbs.split(" > ").slice(1).join(" › ")}</span>
          </div>
        )}

        <h1 className="max-w-full text-h6 font-semibold leading-tight tracking-tight text-t-primary sm:text-h5">
          {title || `Good morning, ${mockUser.name.split(" ")[0]}`}
        </h1>

        <p className="mt-1 max-w-2xl text-body-2 text-t-secondary">
          {subtitle || "Here's your daily briefing. You are 12% ahead of target this week."}
        </p>
      </div>

      {/* Right Actions */}
      <div className="flex w-full items-center justify-between gap-3 lg:w-auto lg:justify-end sm:gap-5">
        {/* Quick Action Icons */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          <button className="flex size-9 items-center justify-center rounded-full border border-transparent bg-b-surface2 text-t-secondary transition-colors hover:border-s-stroke2 hover:text-t-primary cursor-pointer sm:size-10">
            <RiSearchLine size={20} />
          </button>

          <button className="relative flex size-9 items-center justify-center rounded-full border border-transparent bg-b-surface2 text-t-secondary transition-colors hover:border-s-stroke2 hover:text-t-primary cursor-pointer sm:size-10">
            <RiNotification3Line size={20} />
            <div className="absolute top-2 right-2 size-2 rounded-full bg-primary-01" />
          </button>

          <button className="relative flex size-9 items-center justify-center rounded-full border border-transparent bg-b-surface2 text-t-secondary transition-colors hover:border-s-stroke2 hover:text-t-primary cursor-pointer sm:size-10">
            <RiMailLine size={20} />
            <div className="absolute top-2 right-2 size-2 rounded-full bg-primary-01" />
          </button>
        </div>

        {/* Vertical Divider */}
        <div className="hidden h-8 w-px bg-s-stroke2/70 lg:block" />

        {/* User Profile Card */}
        <div className="flex items-center gap-3 rounded-full border border-transparent px-2 py-1.5 transition-colors hover:border-s-stroke2 hover:bg-b-surface2/70 cursor-pointer">
          <div className="size-10 overflow-hidden rounded-full border-[1.5px] border-s-stroke2 bg-b-surface2">
            <img
              src={`https://ui-avatars.com/api/?name=${encodeURIComponent(mockUser.name)}&background=3765F6&color=fff&size=88`}
              alt="Avatar"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="hidden min-w-0 sm:block">
            <div className="flex items-center gap-1">
              <span className="text-body-2 font-bold text-t-primary leading-none">{mockUser.name}</span>
              <span className="text-t-blue flex items-center">
                <RiVerifiedBadgeFill size={14} />
              </span>
            </div>
            <div className="text-caption text-t-secondary mt-0.5">@{mockUser.name.split(" ")[0].toLowerCase()}</div>
          </div>
          <span className="text-t-secondary flex items-center">
            <RiArrowDownSLine size={16} />
          </span>
        </div>
      </div>
    </header>
  );
}
