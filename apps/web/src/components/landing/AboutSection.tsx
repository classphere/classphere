import { Eyebrow } from "./ui/Eyebrow";

export function AboutSection() {
  return (
    <section id="about" className="bg-[#edecec] px-5 py-24 text-center sm:px-10 lg:py-32">
      <div className="mx-auto max-w-[1080px]">
        <Eyebrow>Explore VELORA</Eyebrow>
        <p className="mt-10 text-3xl font-medium leading-tight tracking-[-.04em] text-[#727272] sm:text-5xl">
          At VELORA, we craft powerful video experiences by transforming raw footage with creative storytelling and refined editing techniques.
        </p>
      </div>
    </section>
  );
}
