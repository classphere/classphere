import React from "react";
import { RiErrorWarningFill } from "@remixicon/react";

interface PanicCascadeCardProps {
  panicCascade: any;
}

export function PanicCascadeCard({ panicCascade }: PanicCascadeCardProps) {
  if (!panicCascade?.detected) return null;

  return (
    <section className="flex flex-col p-6 md:p-7 bg-b-surface2 dark:bg-b-surface2 card border border-primary-03/40 select-none">
      <div className="flex items-start gap-4">
        <div className="flex size-16 items-center justify-center rounded-full bg-gradient-to-b from-[#FFD1D1] to-[#FFA3A3] shrink-0">
          <RiErrorWarningFill size={24} className="text-t-primary" />
        </div>
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-[16px] font-sans font-bold text-primary-03">⚡ Panic Cascade Detected</h2>
            <span className="flex flex-row justify-center items-center px-2 py-0.5 border border-s-stroke2/40 bg-[rgba(255,106,85,0.05)] text-primary-03 text-[12px] font-sans font-bold tracking-[0.004em] rounded-[10px]">Critical Pattern</span>
          </div>
          <p className="mt-2 text-[12px] font-sans leading-[160%] text-t-secondary dark:text-t-secondary">{panicCascade.description}</p>
          <div className="mt-4 rounded-[10px] border border-primary-03/20 bg-[rgba(255,106,85,0.02)] p-3 text-[12px] font-sans font-semibold text-t-primary dark:text-t-primary">
            <span className="text-primary-03">Action:</span> {panicCascade.tip}
          </div>
        </div>
      </div>
    </section>
  );
}
