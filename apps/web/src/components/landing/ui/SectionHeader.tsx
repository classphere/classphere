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
        <span className="relative inline-flex w-[max-content] items-center gap-2 overflow-hidden rounded-[10px] border border-[#161616] bg-[linear-gradient(342.29deg,#070707_12.1%,#2F2E31_87.9%)] px-4 py-3 text-[20px] font-[550] text-white shadow-velora-dark">
          <i className="absolute -right-3 top-0 z-0 h-3 w-28 rotate-[125deg] rounded-full bg-white/10 blur-[3px]" />
          <i className="relative z-10 size-2 rounded-full bg-[#FF5936]" />
          <span className="relative z-10">{eyebrow}</span>
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
