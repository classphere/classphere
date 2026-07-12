import { ctaArrowAsset } from "../data";

export function Arrow() {
  return (
    <span aria-hidden className="relative z-10 grid size-9 place-items-center rounded-[10px] bg-[#ff5936] shadow-[0_1px_3px_rgba(0,0,0,.25)]">
      <img src={ctaArrowAsset} alt="" className="size-5" />
    </span>
  );
}
