"use client";

import Navbar from "@/components/layout/Navbar";
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
        
        {/* ── Page Header ── */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center w-full gap-4">
          <div className="flex flex-col items-start gap-1">
            <h2 className="font-sans text-[24px] font-semibold text-[#101010] dark:text-t-primary m-0 tracking-[0.0015em]">
              Manage Questions
            </h2>
          </div>
          <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#101010] text-[#FDFDFD] hover:bg-[#202020] dark:bg-[#FDFDFD] dark:text-[#101010] dark:hover:bg-[#EAEAEA] transition-colors font-sans text-[14px] font-semibold shadow-sm">
            <RiAddLine size={18} /> 
            <span>Add New Question</span>
          </button>
        </div>

        {/* ── Filters & Search ── */}
        <div className="group relative card flex flex-col md:flex-row justify-between items-center w-full p-4 md:p-6 rounded-[24px] bg-[#FDFDFD] dark:bg-b-surface2 shadow-[0px_5px_1.5px_-4px_rgba(8,8,8,0.09),0px_6px_4px_-4px_rgba(8,8,8,0.05)] border border-s-stroke2/40 gap-4 select-none">
          <div className="box-hover" />
          
          <div className="relative z-10 flex-1 w-full max-w-[500px]">
            <RiSearchLine size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#7B7B7B]" />
            <input 
              type="text" 
              placeholder="Search questions by ID, subject, or topic..." 
              className="w-full pl-10 pr-4 py-2.5 bg-[#F9F9F9] dark:bg-b-surface1 border border-s-stroke2/40 rounded-xl font-sans text-[14px] text-[#101010] dark:text-t-primary outline-none focus:border-[#101010] dark:focus:border-[#FDFDFD] transition-colors placeholder:text-[#7B7B7B]"
            />
          </div>
          
          <div className="relative z-10 flex flex-row flex-wrap items-center gap-3 w-full md:w-auto">
            <select className="px-4 py-2.5 bg-[#F9F9F9] dark:bg-b-surface1 border border-s-stroke2/40 rounded-xl font-sans text-[14px] text-[#101010] dark:text-t-primary outline-none focus:border-[#101010] dark:focus:border-[#FDFDFD] transition-colors cursor-pointer appearance-none min-w-[140px]">
              <option value="">All Subjects</option>
              <option value="Physics">Physics</option>
              <option value="Chemistry">Chemistry</option>
              <option value="Mathematics">Mathematics</option>
              <option value="Biology">Biology</option>
            </select>
            
            <select className="px-4 py-2.5 bg-[#F9F9F9] dark:bg-b-surface1 border border-s-stroke2/40 rounded-xl font-sans text-[14px] text-[#101010] dark:text-t-primary outline-none focus:border-[#101010] dark:focus:border-[#FDFDFD] transition-colors cursor-pointer appearance-none min-w-[140px]">
              <option value="">All Difficulties</option>
              <option value="Easy">Easy</option>
              <option value="Medium">Medium</option>
              <option value="Hard">Hard</option>
            </select>
            
            <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-s-stroke2/40 bg-[#F9F9F9] dark:bg-b-surface1 hover:bg-[#EAEAEA] dark:hover:bg-s-stroke2/30 transition-colors font-sans text-[14px] font-semibold text-[#101010] dark:text-t-primary">
              <RiFilter3Line size={18} />
              <span>More Filters</span>
            </button>
          </div>
        </div>

        {/* ── Questions Table ── */}
        <div className="group relative card flex flex-col overflow-hidden rounded-[32px] bg-[#FDFDFD] dark:bg-b-surface2 shadow-[0px_5px_1.5px_-4px_rgba(8,8,8,0.09),0px_6px_4px_-4px_rgba(8,8,8,0.05)] border border-s-stroke2/40 w-full select-none">
          <div className="box-hover" />
          
          <div className="relative z-10 w-full overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-s-stroke2/40 bg-[#F9F9F9] dark:bg-b-surface1/60">
                  <th className="py-5 px-6 font-sans text-[13px] font-semibold text-[#7B7B7B] uppercase tracking-[0.02em]">Question ID</th>
                  <th className="py-5 px-6 font-sans text-[13px] font-semibold text-[#7B7B7B] uppercase tracking-[0.02em]">Subject</th>
                  <th className="py-5 px-6 font-sans text-[13px] font-semibold text-[#7B7B7B] uppercase tracking-[0.02em]">Topic</th>
                  <th className="py-5 px-6 font-sans text-[13px] font-semibold text-[#7B7B7B] uppercase tracking-[0.02em]">Difficulty</th>
                  <th className="py-5 px-6 font-sans text-[13px] font-semibold text-[#7B7B7B] uppercase tracking-[0.02em]">Status</th>
                  <th className="py-5 px-6 font-sans text-[13px] font-semibold text-[#7B7B7B] uppercase tracking-[0.02em] text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {mockQuestions.map((question) => (
                  <tr key={question.id} className="border-b border-s-stroke2/20 hover:bg-[#F9F9F9] dark:hover:bg-b-surface1/40 transition-colors">
                    <td className="py-4 px-6 font-sans text-[15px] font-medium text-[#7B7B7B]">{question.id}</td>
                    <td className="py-4 px-6 font-sans text-[15px] font-semibold text-[#101010] dark:text-t-primary">{question.subject}</td>
                    <td className="py-4 px-6 font-sans text-[15px] text-[#101010] dark:text-t-primary">{question.topic}</td>
                    <td className="py-4 px-6">
                      <div className={`inline-flex items-center px-2.5 py-1 rounded-md border ${
                        question.difficulty === "Hard" ? "bg-[rgba(239,68,68,0.05)] border-[rgba(239,68,68,0.2)] text-[#EF4444]" :
                        question.difficulty === "Medium" ? "bg-[rgba(255,159,10,0.05)] border-[rgba(255,159,10,0.2)] text-[#FF9F0A]" :
                        "bg-[rgba(0,166,86,0.05)] border-[rgba(0,166,86,0.2)] text-[#00A656]"
                      }`}>
                        <span className="font-sans text-[12px] font-semibold">{question.difficulty}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${
                        question.status === "Active" ? "bg-[rgba(0,166,86,0.05)] border-[rgba(0,166,86,0.2)] text-[#00A656]" :
                        "bg-[#F9F9F9] dark:bg-b-surface1 border-s-stroke2/40 text-[#7B7B7B]"
                      }`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${question.status === "Active" ? "bg-[#00A656]" : "bg-[#7B7B7B]"}`} />
                        <span className="font-sans text-[12px] font-semibold">{question.status}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex flex-row justify-end items-center gap-1">
                        <button className="p-2 rounded-lg hover:bg-[#F9F9F9] dark:hover:bg-b-surface1 text-[#7B7B7B] hover:text-[#101010] dark:hover:text-t-primary transition-colors">
                          <RiEditLine size={18} />
                        </button>
                        <button className="p-2 rounded-lg hover:bg-[rgba(239,68,68,0.1)] text-[#7B7B7B] hover:text-[#EF4444] transition-colors">
                          <RiDeleteBinLine size={18} />
                        </button>
                        <button className="p-2 rounded-lg hover:bg-[#F9F9F9] dark:hover:bg-b-surface1 text-[#7B7B7B] hover:text-[#101010] dark:hover:text-t-primary transition-colors">
                          <RiMore2Fill size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Pagination Footer */}
          <div className="relative z-10 flex flex-col sm:flex-row justify-between items-center p-6 border-t border-s-stroke2/40 w-full gap-4">
            <span className="font-sans text-[14px] text-[#7B7B7B]">
              Showing <span className="font-semibold text-[#101010] dark:text-t-primary">1</span> to <span className="font-semibold text-[#101010] dark:text-t-primary">5</span> of <span className="font-semibold text-[#101010] dark:text-t-primary">1,245</span> entries
            </span>
            <div className="flex flex-row items-center gap-2">
              <button className="px-4 py-2 rounded-xl border border-s-stroke2/40 bg-[#F9F9F9] dark:bg-b-surface1 text-[#7B7B7B] opacity-50 cursor-not-allowed font-sans text-[13px] font-semibold">
                Previous
              </button>
              <button className="px-4 py-2 rounded-xl border border-s-stroke2/40 bg-[#F9F9F9] dark:bg-b-surface1 hover:bg-[#EAEAEA] dark:hover:bg-s-stroke2/30 transition-colors font-sans text-[13px] font-semibold text-[#101010] dark:text-t-primary">
                Next
              </button>
            </div>
          </div>

        </div>

      </main>
    </>
  );
}
