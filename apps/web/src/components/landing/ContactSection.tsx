"use client";

import { Field } from "./ui/Field";
import { SectionHeader } from "./ui/SectionHeader";
import { AvatarBlock } from "./ui/AvatarBlock";
import { Card } from "./ui/Card";
import { Button } from "./ui/Button";

export function ContactSection() {
  const submitForm = (e: React.FormEvent) => {
    e.preventDefault();
    alert("Thanks for your interest!");
  };

  return (
    <section id="contact" className="bg-[#edecec] px-5 py-24 sm:px-10 lg:px-20 lg:py-32">
      <div className="mx-auto flex w-full max-w-[1280px] flex-col justify-between gap-12 rounded-[24px] bg-[#090909] p-12 lg:flex-row lg:items-center lg:p-12">
        
        {/* Left Side Info */}
        <div className="flex flex-col">
          <SectionHeader 
            eyebrow="Contact Us"
            title="Let's Build Intelligent Things"
            dark={true}
            align="left"
            className="max-w-[400px] gap-0"
          />

          {/* Contact Blocks */}
          <div className="mt-16 flex flex-col gap-6">
            <AvatarBlock 
              name="James Carter" 
              role="Content Creator" 
              dark={true} 
              icon={
                <svg className="h-6 w-6 text-black" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              }
            />
            
            <AvatarBlock 
              name="Phone number" 
              role="+1 (648) 562 6206" 
              dark={true} 
              icon={
                <svg className="h-6 w-6 text-black" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              }
            />
          </div>
        </div>

        {/* Right Side Form */}
        <div className="w-full lg:w-[620px]">
          <Card variant="light" className="p-6 sm:p-8 lg:p-[32px]">
            <form onSubmit={submitForm} className="flex flex-col gap-6">
              <Field label="Full name" placeholder="Enter your full name" />
              <Field label="Email" placeholder="Enter your email" type="email" />
              <label className="flex flex-col gap-3 text-[16px] font-medium leading-[19px] text-[#272727]">
                You are interested in
                <div className="relative">
                  <select className="h-[54px] w-full appearance-none rounded-[12px] bg-[#EDECEC] px-4 text-[14px] font-medium text-[#939393] outline-none">
                    <option>Select...</option>
                    <option>LMS Integration</option>
                    <option>Test Engine Setup</option>
                    <option>AI Analytics</option>
                  </select>
                  <svg className="pointer-events-none absolute right-4 top-1/2 h-6 w-6 -translate-y-1/2 text-[#939393]" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </div>
              </label>
              <label className="flex flex-col gap-3 text-[16px] font-medium leading-[19px] text-[#272727]">
                About your project
                <textarea className="h-[120px] w-full resize-none rounded-[12px] bg-[#EDECEC] p-4 text-[14px] font-medium text-[#272727] outline-none" />
              </label>
              <Button variant="dark" className="mt-2 h-[56px] w-full text-[18px]">
                Submit
              </Button>
            </form>
          </Card>
        </div>
      </div>
    </section>
  );
}
