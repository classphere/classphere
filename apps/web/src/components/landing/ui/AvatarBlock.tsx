import React from 'react';

interface AvatarBlockProps {
  name: string;
  role: string;
  icon?: React.ReactNode;
  dark?: boolean;
}

export function AvatarBlock({ name, role, icon, dark = false }: AvatarBlockProps) {
  if (icon) {
    // Used in Contact Section
    return (
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-[8px] bg-[#FAFAFA] shadow-[0_1px_6px_#000000,inset_0_1px_0_#FFFFFF]">
          {icon}
        </div>
        <div className="flex flex-col gap-1">
          <span className={`text-[18px] font-[550] leading-[20px] ${dark ? 'text-white' : 'text-black'}`}>{name}</span>
          <span className="text-[12px] font-medium leading-[14px] text-[#888888]">{role}</span>
        </div>
      </div>
    );
  }

  // Used in Testimonial Section
  return (
    <div className="flex items-center gap-[12px]">
      <span className={`text-[20px] font-medium leading-[22px] ${dark ? 'text-white' : 'text-black'}`}>{name}</span>
      <span className="h-[18px] w-[1px] bg-[#888888]"></span>
      <span className="text-[16px] font-medium leading-[18px] text-[#888888]">{role}</span>
    </div>
  );
}
