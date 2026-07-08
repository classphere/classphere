import { logoAsset, projects } from "./data";
import { Arrow } from "./ui/Arrow";
import { GalleryCard } from "./ui/GalleryCard";

export function HeroSection() {
  return (
    <section className="relative min-h-[900px] bg-[#edecec] px-5 pb-14 pt-8 sm:px-10 lg:min-h-[1096px] lg:px-20">
      <span className="pointer-events-none absolute left-1/2 top-1/2 -mt-[199px] -translate-x-1/2 -translate-y-1/2 select-none text-[280px] font-bold leading-none tracking-tight text-black/[0.02] sm:text-[300px]">
        VELORA
      </span>
      <nav className="mx-auto flex max-w-[1280px] items-center justify-between gap-5">
        <a href="#top" className="block h-12 w-[186px]"><img src={logoAsset} alt="VELORA" className="h-full w-full object-contain object-left" /></a>
        <div className="hidden items-center gap-10 text-base font-medium text-[#515151] md:flex"><a href="#about">About Us</a><a href="#work">Works</a><a href="#services">Services</a><a href="#pricing">Pricing</a></div>
        <a href="#contact" className="relative flex items-center justify-center overflow-hidden rounded-[10px] border border-[#161616] bg-[linear-gradient(342.29deg,#070707_12.1%,#2F2E31_87.9%)] px-6 py-3 text-[16px] font-medium leading-[24px] text-white shadow-velora-dark">
          <i className="absolute -right-3 top-0 z-0 h-3 w-28 rotate-[125deg] rounded-full bg-white/10 blur-[3px]" />
          <span className="relative z-10">Contact us</span>
        </a>
      </nav>
      <div id="top" className="mx-auto flex max-w-[1032px] flex-col items-center pt-24 text-center sm:pt-36">
        <h1 className="max-w-5xl text-5xl font-semibold leading-[.98] tracking-[-.06em] text-[#3a3a3a] sm:text-7xl lg:text-[84px]">Professional video editing that performs</h1>
        <p className="mt-7 max-w-2xl text-lg leading-relaxed tracking-tight text-[#5c5c5c] sm:text-xl">VELORA is a creative video agency delivering impactful visuals that elevate brands and engage audiences.</p>
        <div className="mt-12 flex flex-wrap justify-center gap-6"><a href="#contact" className="relative flex items-center gap-3 overflow-hidden rounded-[10px] bg-[#272727] py-1.5 pl-1.5 pr-6 font-medium text-white shadow-[0_2px_2px_rgba(0,0,0,.1),0_3px_3px_rgba(0,0,0,.12),0_22px_16px_rgba(0,0,0,.14),inset_0_1px_rgba(255,255,255,.18),inset_0_-2px_#191919]"><i className="absolute -right-3 top-0 h-3 w-28 rotate-[125deg] rounded-full bg-white/10 blur-[3px]" /><Arrow /> <span className="relative z-10">Book a Meeting</span></a><a href="#pricing" className="relative overflow-hidden rounded-[10px] bg-[#f9f9f9] px-6 py-3 font-medium text-[#525252] shadow-[0_4px_10px_rgba(0,0,0,.06),inset_0_1px_rgba(255,255,255,.48),inset_0_-2px_#edecec]"><i className="absolute left-6 top-0 h-3 w-28 -rotate-[125deg] rounded-full bg-[#eaeaea]/60 blur-[3px]" /><span className="relative">View Pricing</span></a></div>
      </div>
      <div className="relative left-1/2 mt-24 flex w-[max-content] -translate-x-1/2 gap-6 lg:mt-32">
        {projects.map((src, index) => <GalleryCard key={src} src={src} index={index} />)}
      </div>
      <div className="pointer-events-none absolute bottom-14 left-0 z-10 h-[300px] w-[120px] bg-gradient-to-r from-[#edecec] to-transparent sm:h-[420px]" />
      <div className="pointer-events-none absolute bottom-14 right-0 z-10 h-[300px] w-[120px] bg-gradient-to-l from-[#edecec] to-transparent sm:h-[420px]" />
    </section>
  );
}
