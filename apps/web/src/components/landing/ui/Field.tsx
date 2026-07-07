export function Field({ label, placeholder, type = "text" }: { label: string; placeholder: string; type?: string }) {
  return (
    <label className="flex flex-col gap-3 text-[16px] font-medium leading-[19px] text-[#272727]">
      {label}
      <input type={type} placeholder={placeholder} className="h-[54px] w-full rounded-[12px] bg-[#EDECEC] px-4 text-[14px] font-medium text-[#272727] placeholder-[#939393] outline-none" />
    </label>
  );
}
