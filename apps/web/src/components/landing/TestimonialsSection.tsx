import { RiCheckboxCircleLine, RiLightbulbFlashLine, RiTimeLine } from "@remixicon/react";
import { SectionHeader } from "./ui/SectionHeader";

const reasons = [
  {
    icon: RiTimeLine,
    title: "A familiar test day",
    body: "Students can switch between practice and timed attempts without learning a new exam pattern.",
  },
  {
    icon: RiLightbulbFlashLine,
    title: "A useful next step",
    body: "Every test can lead into revision tasks, mistakes, and the chapters that need more work.",
  },
  {
    icon: RiCheckboxCircleLine,
    title: "Less admin overhead",
    body: "Institute teams can organise batches, students, tests, and DPPs from the same place.",
  },
];

export function TestimonialsSection() {
  return (
    <section id="why-classphere" className="bg-[#171717] px-5 py-24 text-white sm:px-10 lg:px-20 lg:py-32">
      <div className="mx-auto grid max-w-[1280px] gap-12 lg:grid-cols-[0.8fr_1.2fr]">
        <SectionHeader
          eyebrow="Why Classphere"
          title="Built around the learning loop, not a long feature checklist."
          description="The platform stays focused on the decisions that help a student prepare better and an institute run with confidence."
          dark
          align="left"
        />
        <div className="grid gap-3">
          {reasons.map(({ icon: Icon, title, body }) => (
            <article key={title} className="grid gap-5 rounded-[20px] border border-white/10 bg-white/[0.045] p-6 sm:grid-cols-[52px_1fr]">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#ff5936]/15 text-[#ff8268]"><Icon size={24} /></span>
              <div>
                <h3 className="text-xl font-semibold">{title}</h3>
                <p className="mt-2 max-w-xl text-base leading-6 text-white/60">{body}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
