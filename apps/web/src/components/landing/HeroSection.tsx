import { logoAsset, projects } from "./data";
import { Button } from "@/components/landing/ui/Button";
import { Arrow } from "./ui/Arrow";
import { GalleryCard } from "./ui/GalleryCard";

export function HeroSection() {
  return (
    <section className="relative min-h-[900px] bg-[#edecec] px-5 pb-14 pt-8 sm:px-10 lg:min-h-[1096px] lg:px-20">
      <span className="pointer-events-none absolute left-1/2 top-1/2 -mt-[199px] -translate-x-1/2 -translate-y-1/2 select-none text-[280px] font-bold leading-none tracking-tight text-black/[0.02] sm:text-[300px]">
        CLASSPHERE
      </span>
      <nav className="mx-auto flex max-w-[1280px] items-center justify-between gap-5">
        <a href="#top" className="block text-2xl font-extrabold tracking-tight text-[#3a3a3a] flex items-center h-12">CLASSPHERE</a>
        <div className="hidden items-center gap-10 text-base font-medium text-[#515151] md:flex"><a href="#about">About Us</a><a href="#work">Modules</a><a href="#services">Services</a><a href="#pricing">Pricing</a></div>
        <Button href="#contact" variant="primary">
          Contact us
        </Button>
      </nav>
      <div id="top" className="mx-auto flex max-w-[1032px] flex-col items-center pt-24 text-center sm:pt-36">
        <div className="mb-6 rounded-full border border-black/10 px-4 py-1.5 text-sm font-medium text-[#5c5c5c] shadow-sm">
          Introducing the ultimate EdTech OS for Institutes
        </div>
        <h1 className="max-w-5xl text-5xl font-bold leading-[1.05] tracking-[-.05em] text-[#1a1a1a] sm:text-7xl lg:text-[80px]">
          Scale your institute with <br />
          <span className="bg-gradient-to-r from-[#FF5936] to-[#ff8c73] bg-clip-text text-transparent">AI-powered</span> learning.
        </h1>
        <p className="mt-8 max-w-2xl text-lg leading-relaxed tracking-tight text-[#5c5c5c] sm:text-xl">
          Launch your own white-labeled app. Automate mock tests, deliver personalized Daily Practice Problems, and track student performance with deep analytics.
        </p>
        <div className="mt-12 flex flex-wrap justify-center gap-6"><Button href="#contact" variant="dark" className="!py-[6px] !pl-[6px] !pr-[24px]"><div className="flex h-[36px] w-[36px] items-center justify-center rounded-[8px] bg-[#FF5936] shadow-[0px_1px_6px_rgba(0,0,0,0.25)]"><Arrow /></div><span>Book a Demo</span></Button><Button href="#pricing" variant="secondary">View Pricing</Button></div>
      </div>
      <div className="relative left-1/2 mt-24 flex w-[max-content] -translate-x-1/2 gap-6 lg:mt-32">
        {projects.map((src, index) => <GalleryCard key={src} src={src} index={index} />)}
      </div>
      <div className="pointer-events-none absolute bottom-14 left-0 z-10 h-[300px] w-[120px] bg-gradient-to-r from-[#edecec] to-transparent sm:h-[420px]" />
      <div className="pointer-events-none absolute bottom-14 right-0 z-10 h-[300px] w-[120px] bg-gradient-to-l from-[#edecec] to-transparent sm:h-[420px]" />
    </section>
  );
}
