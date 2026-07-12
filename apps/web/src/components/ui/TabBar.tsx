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
      className={`flex items-center gap-2 p-1.5 bg-[#FAFAFA] dark:bg-[#161616] shadow-[0_2px_0_rgba(223,222,222,.64),inset_0_2px_rgba(255,255,255,.64)] dark:shadow-[0_2px_0_rgba(0,0,0,.5),inset_0_2px_rgba(255,255,255,.05)] border border-transparent rounded-[24px] w-fit select-none ${className}`}
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
                ? "bg-[linear-gradient(342.29deg,#070707_12.1%,#2F2E31_87.9%)] text-white shadow-velora-dark border border-[#161616]"
                : "bg-transparent text-[#838383] hover:text-t-primary"
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
