import { Eyebrow } from "./ui/Eyebrow";

export function AboutSection() {
  return (
    <section id="about" className="bg-[#edecec] px-5 py-24 text-center sm:px-10 lg:py-32">
      <div className="mx-auto max-w-[1080px]">
        <Eyebrow>Explore CLASSPHERE</Eyebrow>
        <p className="mt-10 text-3xl font-medium leading-tight tracking-[-.04em] text-[#727272] sm:text-5xl">
          At CLASSPHERE, we empower institutes with advanced analytics and an AI-driven learning management system to elevate student performance.
        </p>
      </div>
    </section>
  );
}
