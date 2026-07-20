import { RiBarChartBoxLine, RiFileList3Line, RiFocus3Line, RiTeamLine } from "@remixicon/react";
import { SectionHeader } from "./ui/SectionHeader";
import { Button } from "./ui/Button";

const outcomes = [
  { icon: RiFileList3Line, title: "Reliable delivery", body: "Publish tests and DPPs to the right batch, at the right time." },
  { icon: RiBarChartBoxLine, title: "Useful analysis", body: "Surface accuracy, weak chapters, and patterns that need attention." },
  { icon: RiFocus3Line, title: "Focused practice", body: "Let students choose a no-timer practice flow or a timed test attempt." },
  { icon: RiTeamLine, title: "Private comparison", body: "Keep cohort performance relevant by comparing only students on the same paper." },
];

export function ToolsSection() {
  return (
    <section id="tools" className="bg-[#171717] px-5 py-24 text-white sm:px-10 lg:px-20 lg:py-32">
      <div className="mx-auto grid max-w-[1280px] items-end gap-12 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <SectionHeader
            eyebrow="Built for real learning operations"
            title="Strong where your institute and students need it."
            description="A focused platform for the day-to-day loop: assign, attempt, understand, revise, and improve."
            align="left"
            dark
          />
          <Button href="#contact" variant="secondary" className="mt-8 !h-[52px] !bg-white !text-[#252525]">Plan your rollout</Button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {outcomes.map(({ icon: Icon, title, body }) => (
            <article key={title} className="rounded-[20px] border border-white/10 bg-white/[0.045] p-6">
              <Icon size={25} className="text-[#ff7559]" />
              <h3 className="mt-10 text-xl font-semibold">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-white/60">{body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
