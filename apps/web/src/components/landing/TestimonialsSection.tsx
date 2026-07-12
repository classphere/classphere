import { projects } from "./data";
import { SectionHeader } from "./ui/SectionHeader";
import { StarRating } from "./ui/StarRating";
import { AvatarBlock } from "./ui/AvatarBlock";
import { Button } from "./ui/Button";
export function TestimonialsSection() {
  return (
    <section id="testimonials" className="bg-[#090909] px-5 py-24 sm:px-10 lg:px-[80px] lg:py-[48px]">
      <div className="mx-auto flex w-full max-w-[1280px] flex-col justify-between gap-16 lg:flex-row lg:items-start">
        
        {/* Left Side: Testimonial Text */}
        <div className="flex w-full max-w-[518px] flex-col">
          {/* Eyebrow & Headline */}
          <SectionHeader 
            eyebrow="Testimonial"
            title="What Our Clients Says"
            dark={true}
            align="left"
            className="gap-0"
          />

          {/* Testimonial Content */}
          <div className="mt-[80px] flex flex-col gap-[42px]">
            <div className="flex flex-col gap-[24px]">
              <StarRating rating={5} />
              <p className="text-[24px] font-medium leading-[32px] text-[#B3B3B3]">
                "Our batch accuracy improved noticeably after using their AI insights. Fast automated evaluation and incredible analytics. It completely transformed how we prepare students for JEE and NEET."
              </p>
            </div>

            <div className="flex flex-col gap-[24px]">
              <AvatarBlock name="Rajesh Sharma" role="Director of Academics" dark={true} />
              <div className="h-[1px] w-full bg-[#888888] opacity-30"></div>
              
              {/* Nav Arrows */}
              <div className="flex gap-[16px]">
                <Button variant="nav">
                  <svg className="h-6 w-6 text-black" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M15 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </Button>
                <Button variant="nav">
                  <svg className="h-6 w-6 text-black" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Image */}
        <div className="h-auto w-full max-w-[528px] overflow-hidden rounded-[24px] bg-[#DBD0D0] lg:h-[528px]">
          <img src={projects[0]} alt="Testimonial author" className="h-full w-full object-cover" />
        </div>

      </div>
    </section>
  );
}
