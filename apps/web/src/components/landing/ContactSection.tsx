"use client";

import { RiCalendarScheduleLine, RiMailLine } from "@remixicon/react";
import { Field } from "./ui/Field";
import { SectionHeader } from "./ui/SectionHeader";
import { Card } from "./ui/Card";
import { Button } from "./ui/Button";

export function ContactSection() {
  const submitForm = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "");
    const email = String(form.get("email") ?? "");
    const interest = String(form.get("interest") ?? "");
    const message = String(form.get("message") ?? "");
    const subject = encodeURIComponent(`Classphere demo request from ${name}`);
    const body = encodeURIComponent(`Name: ${name}\nEmail: ${email}\nInterest: ${interest}\n\nInstitute details:\n${message}`);
    window.location.href = `mailto:support@classphere.com?subject=${subject}&body=${body}`;
  };

  return (
    <section id="contact" className="bg-[#edecec] px-5 py-24 sm:px-10 lg:px-20 lg:py-32">
      <div className="mx-auto grid w-full max-w-[1280px] gap-12 rounded-[28px] bg-[#171717] p-7 sm:p-10 lg:grid-cols-[0.8fr_1.2fr] lg:p-12">
        <div className="flex flex-col justify-between">
          <div>
            <SectionHeader eyebrow="Talk to Classphere" title="See how this fits your institute." description="Tell us about your students, exams, and current workflow. We will help you plan a clean rollout." dark align="left" className="gap-0" />
            <div className="mt-12 grid gap-4">
              <div className="flex items-center gap-4 text-sm text-white/70">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-[#ff8068]"><RiCalendarScheduleLine size={20} /></span>
                Product walkthrough and rollout planning
              </div>
              <div className="flex items-center gap-4 text-sm text-white/70">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-[#ff8068]"><RiMailLine size={20} /></span>
                Support through your institute onboarding
              </div>
            </div>
          </div>
        </div>

        <Card variant="light" className="p-6 sm:p-8">
          <form onSubmit={submitForm} className="flex flex-col gap-6">
              <Field name="name" label="Full name" placeholder="Enter your full name" required />
              <Field name="email" label="Work email" placeholder="Enter your email" type="email" required />
              <label className="flex flex-col gap-3 text-[16px] font-medium leading-[19px] text-[#272727]">
                What do you want to explore?
                <select name="interest" required defaultValue="" className="h-[54px] w-full rounded-[12px] border-0 bg-[#edecec] px-4 text-[14px] font-medium text-[#575757] outline-none ring-[#ff5936] focus:ring-2">
                  <option value="" disabled>Select an option</option>
                  <option>Launch a branded institute portal</option>
                  <option>Run tests and student analysis</option>
                  <option>Manage DPPs and revision workflows</option>
                  <option>Discuss pricing and rollout</option>
                </select>
              </label>
              <label className="flex flex-col gap-3 text-[16px] font-medium leading-[19px] text-[#272727]">
                Tell us about your institute
                <textarea name="message" required className="h-[110px] w-full resize-none rounded-[12px] border-0 bg-[#edecec] p-4 text-[14px] font-medium text-[#272727] outline-none ring-[#ff5936] focus:ring-2" />
              </label>
              <Button type="submit" variant="dark" className="mt-1 h-[56px] w-full text-[18px]">Request a demo</Button>
          </form>
        </Card>
      </div>
    </section>
  );
}
