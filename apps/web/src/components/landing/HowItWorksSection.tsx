import { SectionHeader } from "./ui/SectionHeader";
import { Card } from "./ui/Card";

export function HowItWorksSection() {
  const steps = [
    ["Share your vision", "Tell us about your project, goals, style preferences, and references. Upload your footage and brand assets to get started."],
    ["We edit & create", "Our expert editors craft your video with clean cuts, motion graphics, color grading, and sound design"],
    ["Review & deliver", "Receive your first draft, request revisions, and get the final high-quality video ready to publish."]
  ];

  return (
    <section id="how-it-works" className="bg-[#edecec] px-5 py-24 sm:px-10 lg:px-20 lg:py-32">
      <div className="mx-auto max-w-[1280px]">
        <SectionHeader 
          eyebrow="How It Works"
          title="From Vision to Visual Masterpiece"
          description="A refined workflow that transforms your vision into cinematic content—fast, seamless, and uncompromising in quality."
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
