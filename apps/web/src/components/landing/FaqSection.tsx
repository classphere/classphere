import { Eyebrow } from "./ui/Eyebrow";

export function FaqSection() {
  const faqs = [
    "What types of videos do you edit?",
    "How fast is your turnaround time?",
    "Do you offer revisions?",
    "What file formats will I receive?",
    "Can you match our brand style?",
    "Do you work with long-term clients?"
  ];

  return (
    <section id="faq" className="bg-[#edecec] px-5 py-24 sm:px-10 lg:px-20 lg:py-32">
      <div className="mx-auto max-w-[840px] text-center">
        <Eyebrow>FAQ</Eyebrow>
        <h2 className="mt-8 text-4xl font-semibold tracking-[-.04em] sm:text-5xl">
          Frequently Asked Questions
        </h2>
        <div className="mt-12 text-left">
          {faqs.map((q, i) => (
            <details key={q} open={i === 0} className="border-b border-[#d8d8d8] py-5">
              <summary className="cursor-pointer list-none font-semibold">
                {q}<span className="float-right text-[#ff5936]">+</span>
              </summary>
              {i === 0 && (
                <p className="mt-4 max-w-2xl leading-relaxed text-[#7d7d7d]">
                  We edit commercials, social media videos, YouTube content, corporate films, podcasts, product videos, and more. No long-term contracts. Pause or cancel anytime.
                </p>
              )}
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
