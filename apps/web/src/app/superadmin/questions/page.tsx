"use client";

import Navbar from "@/components/layout/Navbar";
import { PremiumSectionCard as SectionCard } from "@/components/premium-ui";
import { RiSearchLine, RiFilter3Line, RiAddLine, RiDeleteBinLine, RiEditLine, RiMore2Fill } from "@remixicon/react";

const mockQuestions = [
  { id: "Q-1001", subject: "Physics", topic: "Kinematics", difficulty: "Hard", status: "Active" },
  { id: "Q-1002", subject: "Chemistry", topic: "Organic Chemistry", difficulty: "Medium", status: "Active" },
  { id: "Q-1003", subject: "Mathematics", topic: "Calculus", difficulty: "Hard", status: "Draft" },
  { id: "Q-1004", subject: "Physics", topic: "Thermodynamics", difficulty: "Easy", status: "Active" },
  { id: "Q-1005", subject: "Biology", topic: "Genetics", difficulty: "Medium", status: "Active" },
];

export default function QuestionBankPage() {
  return (
    <>
      <Navbar title="Question Bank" subtitle="Central repository for all examination content." />
      <main className="mx-auto w-full max-w-[1560px] flex flex-col items-center pb-12 pt-6 gap-6 px-6 bg-transparent">
        
        {/* ── Questions List ── */}
        <SectionCard 
          title="Manage Questions"
          headerRight={
            <button className="flex items-center gap-2 px-5 py-2.5 rounded-[10px] relative overflow-hidden border border-[#161616] bg-[linear-gradient(342.29deg,#070707_12.1%,#2F2E31_87.9%)] text-white font-sans text-[14px] font-semibold shadow-[0px_6.8656px_6.8656px_-2.33333px_rgba(0,0,0,0.16),inset_0px_1px_0px_rgba(255,255,255,0.16),inset_0px_-2px_0px_#191919] transition-transform hover:scale-[1.01] active:scale-[0.99]">
              <RiAddLine size={18} /> 
              <span>Add New Question</span>
            </button>
          }
        >
          {/* ── Filters & Search ── */}
          <div className="flex flex-col md:flex-row justify-between items-center w-full gap-4 mt-4">
            <div className="relative flex-1 w-full max-w-[500px]">
              <RiSearchLine size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-t-secondary" />
              <input 
                type="text" 
                placeholder="Search questions by ID, subject, or topic..." 
                className="w-full h-11 pl-10 pr-4 bg-b-surface1 border border-s-stroke2/40 rounded-[10px] font-sans text-[14px] text-t-primary outline-none focus:border-t-primary transition-colors placeholder:text-t-secondary"
              />
            </div>
            
            <div className="flex flex-row flex-wrap items-center gap-3 w-full md:w-auto">
              <select className="h-11 px-4 bg-b-surface1 border border-s-stroke2/40 rounded-[10px] font-sans text-[14px] font-medium text-t-primary outline-none focus:border-t-primary transition-colors cursor-pointer appearance-none min-w-[140px]">
                <option value="">All Subjects</option>
                <option value="Physics">Physics</option>
                <option value="Chemistry">Chemistry</option>
                <option value="Mathematics">Mathematics</option>
                <option value="Biology">Biology</option>
              </select>
              
              <select className="h-11 px-4 bg-b-surface1 border border-s-stroke2/40 rounded-[10px] font-sans text-[14px] font-medium text-t-primary outline-none focus:border-t-primary transition-colors cursor-pointer appearance-none min-w-[140px]">
                <option value="">All Difficulties</option>
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
              </select>
              
              <button className="flex items-center gap-2 h-11 px-4 rounded-[10px] border border-s-stroke2/40 bg-b-surface1 hover:bg-s-stroke2/30 transition-colors font-sans text-[14px] font-semibold text-t-primary">
                <RiFilter3Line size={18} />
                <span>More Filters</span>
              </button>
            </div>
          </div>

          {/* ── Table / List ── */}
          <div className="flex flex-col gap-3 mt-6">
            
            {/* Header row (hidden on mobile, visible md+) */}
            <div className="hidden md:flex flex-row items-center w-full px-6 py-2 text-xs font-semibold uppercase tracking-wider text-t-secondary">
              <div className="w-[120px]">Question ID</div>
              <div className="w-[150px]">Subject</div>
              <div className="flex-1">Topic</div>
              <div className="w-[120px]">Difficulty</div>
              <div className="w-[100px]">Status</div>
              <div className="w-[120px] text-right">Actions</div>
            </div>

            {/* Data rows */}
            {mockQuestions.map((question) => (
              <div
                key={question.id}
                className="group/item relative flex flex-col md:flex-row md:items-center w-full p-4 md:px-6 gap-4 md:gap-0 bg-white dark:bg-white/[0.02] border border-s-stroke2/40 rounded-[24px] shadow-[0px_0px_36px_-8px_rgba(0,0,0,0.05),0px_6px_4px_-4px_rgba(8,8,8,0.05)] hover:scale-[1.005] transition-all cursor-pointer"
              >
                {/* ID */}
                <div className="w-full md:w-[120px] font-sans text-[15px] font-medium text-t-secondary group-hover/item:text-[#0A84FF] transition-colors">
                  {question.id}
                </div>
                
                {/* Subject */}
                <div className="w-full md:w-[150px] font-sans text-[15px] font-semibold text-t-primary">
                  {question.subject}
                </div>
                
                {/* Topic */}
                <div className="flex-1 font-sans text-[15px] font-medium text-t-primary truncate">
                  {question.topic}
                </div>
                
                {/* Difficulty */}
                <div className="w-full md:w-[120px]">
                  <span className={`inline-flex items-center px-3 py-1 rounded-[10px] text-[11px] font-bold uppercase tracking-wider border ${
                    question.difficulty === "Hard" ? "bg-[rgba(239,68,68,0.08)] border-[rgba(239,68,68,0.2)] text-primary-03" :
                    question.difficulty === "Medium" ? "bg-[rgba(255,159,10,0.08)] border-[rgba(255,159,10,0.2)] text-[#FF9F0A]" :
                    "bg-[rgba(0,166,86,0.08)] border-[rgba(0,166,86,0.2)] text-primary-02"
                  }`}>
                    {question.difficulty}
                  </span>
                </div>
                
                {/* Status */}
                <div className="w-full md:w-[100px]">
                  <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-[10px] border ${
                    question.status === "Active" ? "bg-[rgba(0,166,86,0.08)] border-[rgba(0,166,86,0.2)] text-primary-02" :
                    "bg-b-surface1 border-s-stroke2/40 text-t-secondary"
                  }`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${question.status === "Active" ? "bg-primary-02" : "bg-t-secondary"}`} />
                    <span className="font-sans text-[11px] font-bold uppercase tracking-wider">{question.status}</span>
                  </div>
                </div>
                
                {/* Actions */}
                <div className="w-full md:w-[120px] text-right flex md:justify-end items-center gap-1 opacity-100 md:opacity-0 md:group-hover/item:opacity-100 transition-opacity">
                  <button className="p-2 rounded-[10px] hover:bg-b-surface1 text-t-secondary hover:text-t-primary transition-colors">
                    <RiEditLine size={18} />
                  </button>
                  <button className="p-2 rounded-[10px] hover:bg-[rgba(239,68,68,0.1)] text-t-secondary hover:text-primary-03 transition-colors">
                    <RiDeleteBinLine size={18} />
                  </button>
                  <button className="p-2 rounded-[10px] hover:bg-b-surface1 text-t-secondary hover:text-t-primary transition-colors">
                    <RiMore2Fill size={18} />
                  </button>
                </div>
                
              </div>
            ))}
          </div>

          {/* Pagination Footer */}
          <div className="mt-4 pt-4 border-t border-s-stroke2/30 flex justify-between items-center text-sm font-medium text-t-secondary px-2">
            <div>
              Showing <span className="font-bold text-t-primary">1</span> to <span className="font-bold text-t-primary">5</span> of <span className="font-bold text-t-primary">1,245</span> entries
            </div>
            <div className="flex flex-row items-center gap-2">
              <button className="px-4 py-2 rounded-[10px] border border-s-stroke2/40 bg-b-surface1 text-t-secondary opacity-50 cursor-not-allowed font-sans text-[13px] font-semibold">
                Previous
              </button>
              <button className="px-4 py-2 rounded-[10px] border border-s-stroke2/40 bg-b-surface1 hover:bg-s-stroke2/30 transition-colors font-sans text-[13px] font-semibold text-t-primary">
                Next
              </button>
            </div>
          </div>

        </SectionCard>

      </main>
    </>
  );
}
