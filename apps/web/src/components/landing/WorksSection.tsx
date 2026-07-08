import { SectionHeader } from "./ui/SectionHeader";
import { ProjectCard } from "./ui/ProjectCard";
import { projects } from "./data";

export function WorksSection() {
  const titles = [
    "Cozy Kitten Duo",
    "California Cool Dog",
    "Sleeping Tabby Cat",
    "Mountain Road Escape",
    "Cool Cat in Sunglasses",
    "Golden Dog in the City"
  ];

  return (
    <section id="work" className="bg-[#edecec] px-5 py-24 sm:px-10 lg:px-20 lg:py-32">
      <div className="mx-auto max-w-[1280px]">
        <SectionHeader 
          eyebrow="Our Works"
          title="Exceptional Work, Real Impact"
        />
        <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {titles.map((title, index) => (
            <ProjectCard
              key={title}
              image={projects[index % projects.length]}
              title={title}
              type={index === 0 ? "2025" : "2026"}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
