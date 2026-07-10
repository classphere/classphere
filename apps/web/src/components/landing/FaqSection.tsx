import { Eyebrow } from "./ui/Eyebrow";

export function FaqSection() {
  const faqs = [
    "What types of exams do you support?",
    "How fast is test evaluation?",
    "Do you offer custom analytics?",
    "Is the platform white-labeled?",
    "Can you integrate with our CRM?",
    "Do you provide student support?"
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
                  We support JEE, NEET, and standard curriculum mock tests. You get full access to our question bank. No long-term contracts. Pause or cancel anytime.
                </p>
              )}
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
