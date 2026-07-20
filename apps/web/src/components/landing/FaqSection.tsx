import { Eyebrow } from "./ui/Eyebrow";

export function FaqSection() {
  const faqs = [
    {
      q: "What types of exams do you support?",
      a: "Classphere is built for competitive-exam preparation. An institute can enable the exam catalogues it needs, including JEE Main, JEE Advanced, and NEET-UG."
    },
    {
      q: "How fast is test evaluation?",
      a: "Objective questions are evaluated when a student submits. The result experience then highlights scores, accuracy, and areas that need revision."
    },
    {
      q: "Do you offer custom analytics?",
      a: "Yes. Students receive their own test analysis and revision tasks, while teachers and institutes can follow performance at the relevant batch level."
    },
    {
      q: "Is the platform white-labeled?",
      a: "Yes. Your institute identity, logo, and enabled exam catalogue can be configured so the student experience feels like your own platform."
    },
    {
      q: "Can students practise without a timer?",
      a: "Yes. A student can use practice mode for a question set or choose a timed attempt when they want exam-like conditions."
    },
    {
      q: "How does onboarding work?",
      a: "We begin with your institute structure and target exams, then help you set up batches, import students, and publish your first practice material."
    }
  ];

  return (
    <section id="faq" className="bg-[#edecec] px-5 py-24 sm:px-10 lg:px-20 lg:py-32">
      <div className="mx-auto max-w-[840px] text-center">
        <Eyebrow>FAQ</Eyebrow>
        <h2 className="mt-8 text-4xl font-semibold tracking-[-.04em] sm:text-5xl">
          Frequently Asked Questions
        </h2>
        <div className="mt-12 text-left">
          {faqs.map(({ q, a }, i) => (
            <details key={q} open={i === 0} className="border-b border-[#d8d8d8] py-5">
              <summary className="cursor-pointer list-none font-semibold">
                {q}<span className="float-right text-[#ff5936]">+</span>
              </summary>
              <p className="mt-4 max-w-2xl leading-relaxed text-[#7d7d7d]">
                {a}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
