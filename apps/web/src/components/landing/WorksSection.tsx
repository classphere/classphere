import {
  RiBarChartBoxLine,
  RiBookmarkLine,
  RiBuilding4Line,
  RiFileList3Line,
  RiGroupLine,
  RiPaletteLine,
} from "@remixicon/react";
import { SectionHeader } from "./ui/SectionHeader";
import { platformModules } from "./data";

const moduleIcons = {
  test: RiFileList3Line,
  analysis: RiBarChartBoxLine,
  revision: RiBookmarkLine,
  institute: RiBuilding4Line,
  cohort: RiGroupLine,
  brand: RiPaletteLine,
};

export function WorksSection() {
  return (
    <section id="modules" className="bg-[#edecec] px-5 py-24 sm:px-10 lg:px-20 lg:py-32">
      <div className="mx-auto max-w-[1280px]">
        <SectionHeader eyebrow="One connected platform" title="The work that matters, without the clutter." />
        <div className="mt-14 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {platformModules.map((module) => {
            const Icon = moduleIcons[module.icon as keyof typeof moduleIcons];
            return (
              <article key={module.title} className="rounded-[22px] border border-white/80 bg-[#f6f5f4] p-7 shadow-[0_12px_28px_rgba(74,61,50,0.05)]">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#ff5936]/10 text-[#e44828]">
                  <Icon size={24} />
                </span>
                <h3 className="mt-8 text-2xl font-semibold tracking-tight text-[#1d1d1d]">{module.title}</h3>
                <p className="mt-3 max-w-sm text-base leading-6 text-[#686868]">{module.description}</p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
