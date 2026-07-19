"use client";

import React from "react";

interface Tab<T extends string> {
  id: T;
  label: string;
}

interface TabBarProps<T extends string> {
  tabs: Tab<T>[];
  active: T;
  onChange: (tab: T) => void;
  className?: string;
}

/**
 * TabBar — Premium VADL V2 segmented tab control.
 * Uses the luxurious rounded-[24px] dual-shadow container.
 */
export function TabBar<T extends string>({
  tabs,
  active,
  onChange,
  className = "",
}: TabBarProps<T>) {
  return (
    <div
      className={`flex items-center gap-2 p-1.5 bg-b-surface2 shadow-widget dark:shadow-[inset_0_0_0_1.5px_rgba(229,229,229,0.04),0px_5px_1.5px_-4px_rgba(8,8,8,0.5)] border border-s-stroke2/40 rounded-[24px] w-fit select-none ${className}`}
    >
      {tabs.map((tab) => {
        const isActive = active === tab.id;
        return (
          <button
            key={tab.id}
            id={`tab-${tab.id}`}
            onClick={() => onChange(tab.id)}
            className={`relative px-6 py-3 rounded-[16px] text-[14px] font-sans font-[550] transition-all overflow-hidden cursor-pointer ${
              isActive
                ? "bg-[linear-gradient(342.29deg,#070707_12.1%,#2F2E31_87.9%)] text-white shadow-velora-dark border border-[#161616] dark:border-[#3e3e3b] dark:bg-linear-to-b dark:from-[#343432] dark:to-[#252523]"
                : "bg-transparent text-t-secondary hover:text-t-primary"
            }`}
          >
            {isActive && (
              <i className="absolute -right-3 top-0 h-3 w-20 rotate-[125deg] rounded-full bg-white/10 blur-[3px] pointer-events-none" />
            )}
            <span className="relative">{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export default TabBar;
