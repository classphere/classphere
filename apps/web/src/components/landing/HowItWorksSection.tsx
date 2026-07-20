import { SectionHeader } from "./ui/SectionHeader";
import { Card } from "./ui/Card";

export function HowItWorksSection() {
  const steps = [
    ["1. Set up your institute", "Configure your brand, exam catalogue, batches, faculty, and student import flow."],
    ["2. Publish purposeful practice", "Schedule tests and DPPs for the right batches, with clear availability and attempt rules."],
    ["3. Turn attempts into progress", "Students review results, revisit mistakes, complete revision tasks, and return better prepared."]
  ];

  return (
    <section id="workflow" className="bg-[#edecec] px-5 py-24 sm:px-10 lg:px-20 lg:py-32">
      <div className="mx-auto max-w-[1280px]">
        <SectionHeader 
          eyebrow="How It Works"
          title="A clear workflow from setup to progress."
          description="Keep institute operations simple while giving every student a useful next step after practice."
        />
        <ol className="mt-14 grid gap-6 md:grid-cols-3">
          {steps.map(([title, text], index) => (
            <Card key={title} variant="light" className="p-8">
              <span className="text-[#ff5936]">Step 0{index + 1}</span>
              <h3 className="mt-12 text-2xl font-semibold text-black">{title}</h3>
              <p className="mt-4 leading-relaxed text-[#7d7d7d]">{text}</p>
            </Card>
          ))}
        </ol>
      </div>
    </section>
  );
}
