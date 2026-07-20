import Image from "next/image";
import { RiArrowRightLine, RiCalendarScheduleLine, RiShieldCheckLine } from "@remixicon/react";
import { Button } from "@/components/landing/ui/Button";

export function HeroSection() {
  return (
    <section id="top" className="overflow-hidden bg-[#edecec] px-5 pb-16 pt-8 sm:px-10 lg:px-20 lg:pb-24">
      <nav className="mx-auto flex max-w-[1280px] items-center justify-between gap-5">
        <a href="#top" className="flex items-center gap-3 text-xl font-extrabold tracking-tight text-[#1d1d1d]">
          <Image src="/logo.png" alt="" width={40} height={40} className="rounded-xl" priority />
          Classphere
        </a>
        <div className="hidden items-center gap-8 text-sm font-semibold text-[#5b5b5b] md:flex">
          <a href="#modules">Platform</a>
          <a href="#workflow">How it works</a>
          <a href="#pricing">Pricing</a>
        </div>
        <Button href="#contact" variant="primary">Talk to us</Button>
      </nav>

      <div className="mx-auto grid max-w-[1280px] items-center gap-12 pb-4 pt-16 lg:grid-cols-[1fr_0.88fr] lg:pt-24">
        <div className="max-w-[680px]">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#ff5936]/20 bg-white/60 px-4 py-2 text-sm font-semibold text-[#714234]">
            <RiShieldCheckLine size={16} className="text-[#ff5936]" />
            Built for serious exam preparation
          </div>
          <h1 className="mt-7 text-5xl font-bold leading-[1.02] tracking-[-.055em] text-[#171717] sm:text-6xl lg:text-[76px]">
            Make every test lead to a <span className="text-[#ff5936]">better next attempt.</span>
          </h1>
          <p className="mt-7 max-w-2xl text-lg leading-relaxed text-[#5c5c5c] sm:text-xl">
            Classphere gives coaching institutes a branded test platform and gives students a clearer path from practice to improvement.
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            <Button href="#contact" variant="dark" className="!h-[54px] !gap-3 !px-5">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#ff5936] text-white">
                <RiCalendarScheduleLine size={19} />
              </span>
              Book a demo
            </Button>
            <Button href="#pricing" variant="secondary" className="!h-[54px] !text-base">See pricing <RiArrowRightLine size={18} /></Button>
          </div>
          <div className="mt-10 flex flex-wrap gap-x-6 gap-y-3 text-sm font-medium text-[#626262]">
            <span>JEE and NEET ready</span>
            <span>White-label friendly</span>
            <span>Practice and timed attempts</span>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-[500px]">
          <div className="absolute -inset-6 rounded-[34px] bg-[#ff5936]/10 blur-3xl" />
          <div className="relative overflow-hidden rounded-[28px] border border-white/80 bg-[#ddd8d4] p-3 shadow-[0_24px_70px_rgba(53,38,27,0.16)]">
            <Image src="/landing-student-test.png" alt="Student preparing for an online practice test" width={1024} height={1536} className="aspect-[4/5] w-full rounded-[20px] object-cover" priority />
            <div className="absolute bottom-7 left-7 right-7 rounded-2xl border border-white/70 bg-white/90 p-4 shadow-lg backdrop-blur">
              <p className="text-sm font-bold text-[#202020]">Practice with intent</p>
              <p className="mt-1 text-sm leading-5 text-[#666]">Timed tests, targeted revision, and a clearer next step after every paper.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
