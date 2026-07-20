import { RiCheckLine, RiInformationLine, RiSchoolLine } from "@remixicon/react";
import { SectionHeader } from "./ui/SectionHeader";
import { Button } from "./ui/Button";

const planFeatures = [
  "Branded institute, student, and faculty portals",
  "NTA-style test engine with practice and timed attempts",
  "Tests, DPPs, batches, student import, and faculty workflows",
  "Test analysis, mistake diary, revision tasks, and private batch comparison",
  "White-label setup and institute-specific exam catalogue",
];

export function PricingSection() {
  return (
    <section id="pricing" className="bg-[#edecec] px-5 py-24 sm:px-10 lg:px-20 lg:py-32">
      <div className="mx-auto max-w-[1120px]">
        <SectionHeader eyebrow="Simple institute pricing" title="One platform. Clear per-student pricing." className="pb-12" />
        <article className="overflow-hidden rounded-[28px] border border-white/80 bg-[#f7f6f5] shadow-[0_18px_50px_rgba(67,52,39,0.07)]">
          <div className="grid lg:grid-cols-[0.85fr_1.15fr]">
            <div className="bg-[#1b1b1b] p-8 text-white sm:p-10">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#ff5936]">
                <RiSchoolLine size={25} />
              </span>
              <p className="mt-12 text-sm font-semibold uppercase tracking-[0.14em] text-[#ff9a85]">Classphere institute plan</p>
              <div className="mt-4 flex items-end gap-2">
                <span className="text-5xl font-semibold tracking-tight">₹500</span>
                <span className="pb-1 text-base text-white/65">per student / year</span>
              </div>
              <p className="mt-5 max-w-sm text-base leading-7 text-white/65">
                Start with a guided trial, then grow on one clear annual price as more students join.
              </p>
              <Button href="#contact" variant="secondary" className="mt-9 !h-[54px] !bg-white !text-[#202020]">Book a pricing call</Button>
            </div>
            <div className="p-8 sm:p-10">
              <h3 className="text-2xl font-semibold tracking-tight text-[#1d1d1d]">Everything your learners need to prepare better.</h3>
              <ul className="mt-7 grid gap-4">
                {planFeatures.map((feature) => (
                  <li key={feature} className="flex gap-3 text-base leading-6 text-[#5f5f5f]">
                    <RiCheckLine size={20} className="mt-0.5 shrink-0 text-[#e44828]" />
                    {feature}
                  </li>
                ))}
              </ul>
              <div className="mt-8 flex items-start gap-2 rounded-xl bg-[#ece9e6] p-4 text-sm leading-5 text-[#686868]">
                <RiInformationLine size={18} className="mt-0.5 shrink-0 text-[#9e4b38]" />
                Final onboarding scope and any custom work are agreed before activation.
              </div>
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}
