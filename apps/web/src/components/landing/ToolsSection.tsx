import { SectionHeader } from "./ui/SectionHeader";
import { Button } from "./ui/Button";
import { Card } from "./ui/Card";

export function ToolsSection() {
  return (
    <section id="tools" className="bg-[#edecec] px-5 py-24 sm:px-10 lg:px-20 lg:py-32">
      <div className="mx-auto grid max-w-[1280px] items-center gap-12 lg:grid-cols-2">
        <div className="flex flex-col items-start text-left">
          <SectionHeader 
            eyebrow="Reliability & Scale"
            title="Built for High-Performance"
            description="Classphere combines cutting-edge AI for question generation with a robust, cloud-native infrastructure to deliver a seamless learning experience for thousands of concurrent students."
            align="left"
          />
          <Button href="#contact" variant="dark" className="mt-8 h-[52px] w-[200px]">
            Get Started
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-4 text-center text-4xl text-[#3a3a3a]">
          {["AI", "DPP", "CRM", "LMS"].map(tool => (
            <Card key={tool} variant="light" className="p-10 shadow-[0_2px_0_rgba(223,222,222,.64),inset_0_2px_rgba(255,255,255,.64)]">
              {tool}
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
