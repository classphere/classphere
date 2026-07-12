import { SectionHeader } from "./ui/SectionHeader";
import { ProjectCard } from "./ui/ProjectCard";
import { projects } from "./data";

export function WorksSection() {
  const titles = [
    "AI Performance Analytics",
    "Automated DPP Generator",
    "White-labeled Portal",
    "Teacher Dashboard",
    "Batch & CRM Management",
    "Secure Mock Test Engine"
  ];

  return (
    <section id="work" className="bg-[#edecec] px-5 py-24 sm:px-10 lg:px-20 lg:py-32">
      <div className="mx-auto max-w-[1280px]">
        <SectionHeader 
          eyebrow="Platform Modules"
          title="Everything You Need to Scale"
        />
        <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {titles.map((title, index) => (
            <ProjectCard
              key={title}
              image={projects[index % projects.length]}
              title={title}
              type="Module"
            />
          ))}
        </div>
      </div>
    </section>
  );
}
