"use client";

import Navbar from "@/components/layout/Navbar";
import { 
  RiQuestionLine, 
  RiMailSendLine, 
  RiBookOpenLine,
  RiArrowRightUpLine,
  RiSearchLine,
  RiCustomerService2Fill,
  RiTeamLine,
  RiServerLine
} from "@remixicon/react";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

function HelpContent() {
  const searchParams = useSearchParams();
  const role = searchParams.get("role") || "student";
  const [searchQuery, setSearchQuery] = useState("");

  const faqs = {
    student: [
      { q: "How does the Deterministic Analysis Engine work?", a: "After every mock test, the 9-stage analysis engine evaluates your pacing, identifies panic cascades, and generates a personalized fatigue curve to show you exactly where you lost focus." },
      { q: "Can I review my past test answers?", a: "Yes, navigate to the Test History page and click on 'View Analysis' to see detailed explanations and your mistake classification." },
      { q: "How do I ask a doubt in the Community Forum?", a: "Go to the Doubts page, click 'New Doubt', and tag the relevant subject. If your doubt is urgent, mark it as high-priority so it escalates to your teacher." }
    ],
    teacher: [
      { q: "How do I view the Daily Batch Summary?", a: "The summary is automatically generated and available on your Teacher Dashboard every morning, highlighting key performance shifts and pending doubts." },
      { q: "How do I endorse a student's answer in the forum?", a: "In the Doubts section, you can click the 'Verify' badge on any student's reply. This awards them reputation points and marks the thread as resolved." },
      { q: "Can I override the deterministic analysis?", a: "No, the 9-stage analysis is fully rule-based to ensure pedagogical consistency across the institute. You can, however, add manual teacher notes to the final report." }
    ],
    institute_admin: [
      { q: "How do I set up my Custom Domain?", a: "Navigate to Settings > White-Labeling. Enter your desired domain (e.g., portal.academy.com). SSL provisioning happens automatically within 24 hours." },
      { q: "How do I upgrade my B2B Enterprise tier?", a: "Go to Settings > B2B Billing. Click 'Manage Payment Methods' or contact your dedicated Super Admin account manager for volume discounts." },
      { q: "Are SSC pacing locks mandatory?", a: "Yes, for SSC exams, the 15-minute intra-section locks are enforced platform-wide to simulate real-world testing conditions. This cannot be disabled per-institute." }
    ],
    super_admin: [
      { q: "How do I pause OMR ingestion during a spike?", a: "Go to the Global Configuration page and toggle 'System Maintenance Mode'. This will halt async ingestion queues." },
      { q: "Where can I monitor API rate limits?", a: "The Configuration page shows active limits (currently set to 250k Max Users). Check the infrastructure logs for real-time WebSocket connection counts." },
      { q: "How do I provision a new Institute?", a: "Navigate to the Institutes CRM and click 'New'. You must have the future institute admin's email ready; they must have already created a base account on the platform." }
    ]
  };

  const currentFaqs = faqs[role as keyof typeof faqs] || faqs.student;
  const filteredFaqs = currentFaqs.filter(faq => 
    faq.q.toLowerCase().includes(searchQuery.toLowerCase()) || 
    faq.a.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      <Navbar title="Help & Support" subtitle="Documentation, FAQs, and contact pathways." />
      <main className="mx-auto flex w-full max-w-[1000px] flex-col gap-10 px-6 pb-16 pt-6">

        {/* Search Bar */}
        <div className="relative w-full max-w-[600px] mx-auto mb-4">
          <RiSearchLine size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-t-secondary" />
          <input 
            type="text" 
            placeholder="Search for articles, features, or guides..." 
            className="w-full h-14 pl-12 pr-4 bg-b-surface2 dark:bg-b-surface2 border border-[#e5e5e5]/40 dark:border-[#272727]/40 rounded-[12px] text-[15px] text-t-primary dark:text-t-primary placeholder:text-t-secondary focus:border-t-primary dark:focus:border-t-primary outline-none transition-colors shadow-velora-light dark:shadow-velora-dark"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Support Blocks */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          <div className="group relative card flex flex-col p-8 card overflow-hidden cursor-pointer hover:border-t-primary dark:hover:border-t-primary transition-colors">
            
            <div className="relative z-10 flex flex-col items-center text-center gap-4">
              <div className="w-14 h-14 rounded-[10px] bg-[rgba(10,132,255,0.08)] flex items-center justify-center text-[#0A84FF]">
                <RiBookOpenLine size={28} />
              </div>
              <div>
                <h3 className="text-[18px] font-bold text-t-primary dark:text-t-primary tracking-tight">Platform Documentation</h3>
                <p className="text-[14px] text-t-secondary mt-2">Comprehensive guides for using the 9-stage analysis engine and platform tools.</p>
              </div>
              <button className="mt-2 flex items-center gap-2 text-[#0A84FF] text-[14px] font-bold hover:underline">
                Browse Docs <RiArrowRightUpLine size={16} />
              </button>
            </div>
          </div>

          <div className="group relative card flex flex-col p-8 card overflow-hidden cursor-pointer hover:border-t-primary dark:hover:border-t-primary transition-colors">
            
            <div className="relative z-10 flex flex-col items-center text-center gap-4">
              <div className="w-14 h-14 rounded-[10px] bg-[rgba(0,166,86,0.08)] flex items-center justify-center text-primary-02">
                {role === "student" ? <RiTeamLine size={28} /> : role === "super_admin" ? <RiServerLine size={28} /> : <RiCustomerService2Fill size={28} />}
              </div>
              <div>
                <h3 className="text-[18px] font-bold text-t-primary dark:text-t-primary tracking-tight">
                  {role === "student" ? "Contact Batch Faculty" : 
                   role === "teacher" ? "Contact Institute Admin" : 
                   role === "institute_admin" ? "Contact Platform Support" : 
                   "Internal Engineering Ops"}
                </h3>
                <p className="text-[14px] text-t-secondary mt-2">
                  {role === "student" ? "Escalate doubts directly to your assigned teacher." : 
                   role === "teacher" ? "Report scheduling or batch assignment issues." : 
                   role === "institute_admin" ? "Open an enterprise support ticket with the Super Admin." : 
                   "Access PagerDuty and internal infrastructure logs."}
                </p>
              </div>
              <button className="mt-2 flex items-center gap-2 text-primary-02 text-[14px] font-bold hover:underline">
                {role === "super_admin" ? "Open Logs" : "Create Ticket"} <RiArrowRightUpLine size={16} />
              </button>
            </div>
          </div>

        </div>

        {/* FAQs */}
        <div className="mt-4">
          <h2 className="text-[20px] font-bold text-t-primary dark:text-t-primary tracking-tight mb-6">Frequently Asked Questions</h2>
          
          <div className="flex flex-col gap-4">
            {filteredFaqs.length > 0 ? (
              filteredFaqs.map((faq, i) => (
                <div key={i} className="card flex flex-col p-6 shadow-sm transition-all hover:shadow-md">
                  <div className="flex gap-4 items-start">
                    <div className="mt-0.5 text-t-primary dark:text-t-primary">
                      <RiQuestionLine size={20} />
                    </div>
                    <div>
                      <h4 className="text-[15px] font-bold text-t-primary dark:text-t-primary mb-2">{faq.q}</h4>
                      <p className="text-[14px] text-t-secondary leading-relaxed">{faq.a}</p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12 px-6 bg-b-surface1 dark:bg-b-surface1 border border-s-stroke2/40 rounded-[10px]">
                <p className="text-[15px] font-medium text-t-secondary">No FAQs found matching "{searchQuery}"</p>
              </div>
            )}
          </div>
        </div>

      </main>
    </>
  );
}

export default function HelpPage() {
  return (
    <Suspense fallback={<div className="h-screen w-full flex items-center justify-center text-t-secondary">Loading help...</div>}>
      <HelpContent />
    </Suspense>
  );
}
