import { SectionHeader } from "./ui/SectionHeader";
import { Button } from "./ui/Button";
import { Card } from "./ui/Card";

export function ToolsSection() {
  return (
    <section id="tools" className="bg-[#edecec] px-5 py-24 sm:px-10 lg:px-20 lg:py-32">
      <div className="mx-auto grid max-w-[1280px] items-center gap-12 lg:grid-cols-2">
        <div className="flex flex-col items-start text-left">
          <SectionHeader 
            eyebrow="Tools"
            title="We work with powerful AI tools"
            description="We combine creativity with the world's best editing software to deliver polished, high-performing videos for creators, brands, and businesses."
            align="left"
          />
          <Button href="#contact" variant="primary" className="mt-8 h-[52px] w-[200px]">
            Get Started
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-4 text-center text-4xl text-[#3a3a3a]">
          {["Ae", "Pr", "DaV", "AI"].map(tool => (
            <Card key={tool} variant="light" className="p-10 shadow-[0_2px_0_rgba(223,222,222,.64),inset_0_2px_rgba(255,255,255,.64)]">
              {tool}
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
