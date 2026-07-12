import { SectionHeader } from "./ui/SectionHeader";
import { Card } from "./ui/Card";

export function HowItWorksSection() {
  const steps = [
    ["1. Onboard Institute", "Register your institute, customize your domain, and bulk-invite teachers and students with a single click."],
    ["2. Conduct & Analyze", "Schedule secure online tests, auto-evaluate submissions, and get AI-powered insights on student weaknesses."],
    ["3. Improve with DPPs", "Generate targeted Daily Practice Problems to bridge knowledge gaps and elevate batch performance."]
  ];

  return (
    <section id="how-it-works" className="bg-[#edecec] px-5 py-24 sm:px-10 lg:px-20 lg:py-32">
      <div className="mx-auto max-w-[1280px]">
        <SectionHeader 
          eyebrow="How It Works"
          title="From Onboarding to Excellence"
          description="A refined workflow that transforms traditional education into a data-driven powerhouse."
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
