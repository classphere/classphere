export function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span className="relative inline-flex items-center gap-2 overflow-hidden rounded-[10px] bg-[#F5F4F4] px-4 py-3 text-[20px] font-[550] text-[#848484] shadow-velora-light">
      <i className="absolute -right-8 top-[-40px] z-0 h-3 w-[120px] rotate-[125deg] rounded-full bg-[#EAEAEA] blur-[3px]" />
      <i className="relative z-10 size-2 rounded-full bg-[#FF5936]" />
      <span className="relative z-10">{children}</span>
    </span>
  );
}
