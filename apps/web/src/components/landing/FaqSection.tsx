import { Eyebrow } from "./ui/Eyebrow";

export function FaqSection() {
  const faqs = [
    {
      q: "What types of exams do you support?",
      a: "We support competitive exams like JEE, NEET, and standard curriculums. You get full access to our question bank to curate mock tests instantly."
    },
    {
      q: "How fast is test evaluation?",
      a: "Test evaluation is fully automated and instantaneous. As soon as a student submits their test, they receive their score and detailed AI insights."
    },
    {
      q: "Do you offer custom analytics?",
      a: "Yes, our platform provides deep, topic-level insights for students, and aggregate batch-level analytics for teachers and institute administrators."
    },
    {
      q: "Is the platform white-labeled?",
      a: "Absolutely. You can run Classphere on your custom domain, featuring your institute's branding, logo, and color scheme."
    },
    {
      q: "Can you integrate with our existing CRM?",
      a: "Yes, we provide APIs and custom integration services to seamlessly connect with your existing student databases and CRM systems."
    },
    {
      q: "Do you provide technical support?",
      a: "We offer 24/7 dedicated email and chat support. Pro plan users also receive a dedicated success manager for priority assistance."
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
