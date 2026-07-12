export function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span className="relative inline-flex flex-row items-center justify-center overflow-hidden px-4 py-3 gap-[10px] rounded-[10px] bg-[#F5F4F4] shadow-[0px_3px_3px_rgba(0,0,0,0.08),0px_22px_16px_rgba(0,0,0,0.06),0px_12px_10px_rgba(0,0,0,0.06),0px_6px_5px_rgba(0,0,0,0.06),inset_0px_1px_0px_rgba(255,255,255,0.48),inset_0px_-2px_0px_#EDECEC] font-urbanist font-[550] text-[20px] leading-[24px] text-[#848484]">
      <i className="absolute -right-[15px] top-1/2 z-0 h-[12px] w-[120px] -translate-y-1/2 rotate-[125deg] rounded-full bg-[#EAEAEA] blur-[3px]" />
      <i className="relative z-10 size-2 rounded-full bg-[#FF5936]" />
      <span className="relative z-10">{children}</span>
    </span>
  );
}
