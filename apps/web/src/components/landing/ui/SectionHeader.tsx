import React from 'react';
import { Eyebrow } from "./Eyebrow";

interface SectionHeaderProps {
  eyebrow: string;
  title: string;
  description?: string;
  align?: 'left' | 'center';
  className?: string;
  dark?: boolean;
}

export function SectionHeader({ eyebrow, title, description, align = 'center', className = '', dark = false }: SectionHeaderProps) {
  return (
    <div className={`flex flex-col ${align === 'center' ? 'items-center text-center mx-auto max-w-2xl' : 'items-start text-left'} ${className}`}>
      {dark ? (
        <span className="inline-flex flex-row items-center justify-center px-6 py-3 gap-[10px] w-[max-content] rounded-[8px] bg-[#070707] bg-[linear-gradient(342.29deg,#070707_12.1%,#2F2E31_87.9%)] shadow-[0px_0px_0px_0.8px_#161616,0px_6.8656px_6.8656px_-2.33333px_rgba(0,0,0,0.16),0px_13.6468px_13.6468px_-2.91667px_rgba(0,0,0,0.16),0px_30px_30px_-3.5px_rgba(0,0,0,0.08),inset_0px_0.8px_0px_rgba(255,255,255,0.16)] font-urbanist font-medium text-[16px] leading-[24px] text-white">
          <i className="size-2 rounded-full bg-[#FF5936]" />
          <span>{eyebrow}</span>
        </span>
      ) : (
        <Eyebrow>{eyebrow}</Eyebrow>
      )}
      
      <h2 className={`mt-8 ${dark ? 'text-white' : 'text-[#3a3a3a]'} ${align === 'center' ? 'text-4xl sm:text-5xl tracking-[-.04em] font-semibold' : 'text-[48px] font-[550] leading-[56px] tracking-[-1px]'}`}>
        {title}
      </h2>
      
      {description && (
        <p className={`mt-5 text-lg leading-relaxed ${dark ? 'text-[#B3B3B3]' : 'text-[#7d7d7d]'}`}>
          {description}
        </p>
      )}
    </div>
  );
}
