import { SectionHeader } from "./ui/SectionHeader";
import { Card } from "./ui/Card";
import { services } from "./data";

export function ServicesSection() {
  return (
    <section id="services" className="bg-[#edecec] px-5 py-24 sm:px-10 lg:px-20 lg:py-32">
      <div className="mx-auto max-w-[1280px]">
        <SectionHeader 
          eyebrow="Our services"
          title="Performance-Driven Video Solutions"
        />
        <div className="mt-14 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {services.map(([icon, title, description]) => (
            <Card key={title} variant="light" className="relative min-h-[312px] p-8 shadow-[0_2px_0_rgba(223,222,222,.64),inset_0_2px_rgba(255,255,255,.64)]">
              <span className="text-6xl text-black/70">{icon}</span>
              <div className="absolute bottom-8 pr-8">
                <h3 className="text-2xl font-semibold text-black">{title}</h3>
                <p className="mt-3 text-lg leading-6 text-[#7d7d7d]">{description}</p>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
