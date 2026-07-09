import { SectionHeader } from "./ui/SectionHeader";
import { Button } from "./ui/Button";
import { Card } from "./ui/Card";

export function PricingSection() {
  const starterFeatures = [
    "One active editing request",
    "Smooth transitions & clean cuts",
    "Brand-consistent editing style",
    "Motion graphics & basic animations",
    "24–72 hour average turnaround",
    "Dedicated video editor",
    "Daily project updates",
    "Color correction & sound design"
  ];

  const proFeatures = [
    "One active editing request",
    "Unlimited revisions",
    "Color correction & sound design",
    "Motion graphics & basic animations",
    "24–72 hour average turnaround",
    "Dedicated video editor",
    "Visual consistency across videos",
    "Platform-optimized formats (YouTube, Reels, TikTok)"
  ];

  const CheckIcon = () => (
    <div className="relative flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-[1.5px] border-[#838383]">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#838383" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 13l4 4L19 7" />
      </svg>
    </div>
  );

  return (
    <section id="pricing" className="bg-[#edecec] px-5 py-24 sm:px-10 lg:px-20 lg:py-32">
      <div className="mx-auto max-w-[1280px]">
        <SectionHeader 
          eyebrow="Pricing Plans"
          title="Professional Editing. Simple Pricing."
          className="pb-14"
        />
        
        <div className="mx-auto flex flex-col gap-6 lg:flex-row lg:justify-center">
          
          {/* Starter Plan */}
          <Card variant="light" className="relative w-full max-w-[628px] p-[42px]">
            <h3 className="text-[32px] font-[550] leading-[34px] text-black">Starter</h3>
            <div className="mt-[42px] flex items-end gap-2">
              <span className="text-[48px] font-semibold leading-[54px] text-black">$399</span>
              <span className="mb-[6px] text-[26px] font-medium leading-[34px] text-black">/month</span>
            </div>
            <p className="mt-[18px] max-w-[410px] text-[20px] font-medium leading-[24px] text-[#838383]">
              Perfect for creators and small teams starting their video journey.
            </p>
            <Button href="#contact" variant="primary" className="mt-[42px] h-[60px] w-full text-[20px] font-[550]">
              Get Started
            </Button>
            
            <ul className="mt-[42px] flex flex-col gap-[18px]">
              {starterFeatures.map(feat => (
                <li key={feat} className="flex items-center gap-4 text-[20px] font-medium leading-[24px] text-[#838383]">
                  <CheckIcon />
                  {feat}
                </li>
              ))}
            </ul>
          </Card>

          {/* Pro Plan */}
          <Card variant="light" className="relative w-full max-w-[628px] p-[42px]">
            {/* Badge */}
            <div className="absolute right-8 top-8 hidden overflow-hidden rounded-[10px] bg-[#E5E5E5] px-[24px] py-[12px] sm:block">
              <i className="absolute right-[-78px] top-[-29px] z-0 h-3 w-[120px] rotate-[125deg] rounded-full bg-white/24 blur-[3px]" />
              <i className="absolute right-[12px] top-[-29px] z-0 h-3 w-[120px] rotate-[125deg] rounded-full bg-white/24 blur-[3px]" />
              <span className="relative z-10 text-[18px] font-[550] leading-[24px] text-[#827F7F]">Most Popular</span>
            </div>

            <h3 className="text-[32px] font-[550] leading-[34px] text-black">Pro</h3>
            <div className="mt-[42px] flex items-end gap-2">
              <span className="text-[48px] font-semibold leading-[54px] text-black">$999</span>
              <span className="mb-[6px] text-[26px] font-medium leading-[34px] text-black">/month</span>
            </div>
            <p className="mt-[18px] max-w-[410px] text-[20px] font-medium leading-[24px] text-[#838383]">
              Ideal for creators and small teams getting started with video.
            </p>
            <Button href="#contact" variant="primary" className="mt-[42px] h-[60px] w-full text-[20px] font-[550]">
              Get Started
            </Button>
            
            <ul className="mt-[42px] flex flex-col gap-[18px]">
              {proFeatures.map(feat => (
                <li key={feat} className="flex items-center gap-4 text-[20px] font-medium leading-[24px] text-[#838383]">
                  <CheckIcon />
                  {feat}
                </li>
              ))}
            </ul>
          </Card>

        </div>
      </div>
    </section>
  );
}
