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
            <h2 className="font-sans text-[24px] font-semibold text-t-primary dark:text-t-primary m-0 tracking-[0.0015em]">
              Manage Questions
            </h2>
          </div>
          <button className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-shade-02 text-t-light hover:bg-shade-04 dark:bg-b-surface2 dark:text-t-primary dark:hover:bg-s-stroke2 transition-colors font-sans text-[14px] font-semibold shadow-sm">
            <RiAddLine size={18} /> 
            <span>Add New Question</span>
          </button>
        </div>

        {/* ── Filters & Search ── */}
        <div className="group relative card flex flex-col md:flex-row justify-between items-center w-full p-4 md:p-6 rounded-lg bg-b-surface2 dark:bg-b-surface2 shadow-[0px_5px_1.5px_-4px_rgba(8,8,8,0.09),0px_6px_4px_-4px_rgba(8,8,8,0.05)] border border-s-stroke2/40 gap-4 select-none">
          <div className="box-hover" />
          
          <div className="relative z-10 flex-1 w-full max-w-[500px]">
            <RiSearchLine size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-t-secondary" />
            <input 
              type="text" 
              placeholder="Search questions by ID, subject, or topic..." 
              className="w-full pl-10 pr-4 py-2.5 bg-b-surface1 dark:bg-b-surface1 border border-s-stroke2/40 rounded-lg font-sans text-[14px] text-t-primary dark:text-t-primary outline-none focus:border-t-primary dark:focus:border-s-border transition-colors placeholder:text-t-secondary"
            />
          </div>
          
          <div className="relative z-10 flex flex-row flex-wrap items-center gap-3 w-full md:w-auto">
            <select className="px-4 py-2.5 bg-b-surface1 dark:bg-b-surface1 border border-s-stroke2/40 rounded-lg font-sans text-[14px] text-t-primary dark:text-t-primary outline-none focus:border-t-primary dark:focus:border-s-border transition-colors cursor-pointer appearance-none min-w-[140px]">
              <option value="">All Subjects</option>
              <option value="Physics">Physics</option>
              <option value="Chemistry">Chemistry</option>
              <option value="Mathematics">Mathematics</option>
              <option value="Biology">Biology</option>
            </select>
            
            <select className="px-4 py-2.5 bg-b-surface1 dark:bg-b-surface1 border border-s-stroke2/40 rounded-lg font-sans text-[14px] text-t-primary dark:text-t-primary outline-none focus:border-t-primary dark:focus:border-s-border transition-colors cursor-pointer appearance-none min-w-[140px]">
              <option value="">All Difficulties</option>
              <option value="Easy">Easy</option>
              <option value="Medium">Medium</option>
              <option value="Hard">Hard</option>
            </select>
            
            <button className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-s-stroke2/40 bg-b-surface1 dark:bg-b-surface1 hover:bg-s-stroke2 dark:hover:bg-s-stroke2/30 transition-colors font-sans text-[14px] font-semibold text-t-primary dark:text-t-primary">
              <RiFilter3Line size={18} />
              <span>More Filters</span>
            </button>
          </div>
        </div>

        {/* ── Questions Table ── */}
        <div className="group relative card flex flex-col overflow-hidden rounded-lg bg-b-surface2 dark:bg-b-surface2 shadow-[0px_5px_1.5px_-4px_rgba(8,8,8,0.09),0px_6px_4px_-4px_rgba(8,8,8,0.05)] border border-s-stroke2/40 w-full select-none">
          <div className="box-hover" />
          
          <div className="relative z-10 w-full overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-s-stroke2/40 bg-b-surface1 dark:bg-b-surface1/60">
                  <th className="py-5 px-6 font-sans text-[13px] font-semibold text-t-secondary uppercase tracking-[0.02em]">Question ID</th>
                  <th className="py-5 px-6 font-sans text-[13px] font-semibold text-t-secondary uppercase tracking-[0.02em]">Subject</th>
                  <th className="py-5 px-6 font-sans text-[13px] font-semibold text-t-secondary uppercase tracking-[0.02em]">Topic</th>
                  <th className="py-5 px-6 font-sans text-[13px] font-semibold text-t-secondary uppercase tracking-[0.02em]">Difficulty</th>
                  <th className="py-5 px-6 font-sans text-[13px] font-semibold text-t-secondary uppercase tracking-[0.02em]">Status</th>
                  <th className="py-5 px-6 font-sans text-[13px] font-semibold text-t-secondary uppercase tracking-[0.02em] text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {mockQuestions.map((question) => (
                  <tr key={question.id} className="border-b border-s-stroke2/20 hover:bg-b-surface1 dark:hover:bg-b-surface1/40 transition-colors">
                    <td className="py-4 px-6 font-sans text-[15px] font-medium text-t-secondary">{question.id}</td>
                    <td className="py-4 px-6 font-sans text-[15px] font-semibold text-t-primary dark:text-t-primary">{question.subject}</td>
                    <td className="py-4 px-6 font-sans text-[15px] text-t-primary dark:text-t-primary">{question.topic}</td>
                    <td className="py-4 px-6">
                      <div className={`inline-flex items-center px-2.5 py-1 rounded-md border ${
                        question.difficulty === "Hard" ? "bg-[rgba(239,68,68,0.05)] border-s-stroke2/40 text-primary-03" :
                        question.difficulty === "Medium" ? "bg-[rgba(255,159,10,0.05)] border-s-stroke2/40 text-[#FF9F0A]" :
                        "bg-[rgba(0,166,86,0.05)] border-s-stroke2/40 text-primary-02"
                      }`}>
                        <span className="font-sans text-[12px] font-semibold">{question.difficulty}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border ${
                        question.status === "Active" ? "bg-[rgba(0,166,86,0.05)] border-s-stroke2/40 text-primary-02" :
                        "bg-b-surface1 dark:bg-b-surface1 border-s-stroke2/40 text-t-secondary"
                      }`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${question.status === "Active" ? "bg-primary-02" : "bg-t-secondary"}`} />
                        <span className="font-sans text-[12px] font-semibold">{question.status}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex flex-row justify-end items-center gap-1">
                        <button className="p-2 rounded-lg hover:bg-b-surface1 dark:hover:bg-b-surface1 text-t-secondary hover:text-t-primary dark:hover:text-t-primary transition-colors">
                          <RiEditLine size={18} />
                        </button>
                        <button className="p-2 rounded-lg hover:bg-[rgba(239,68,68,0.1)] text-t-secondary hover:text-primary-03 transition-colors">
                          <RiDeleteBinLine size={18} />
                        </button>
                        <button className="p-2 rounded-lg hover:bg-b-surface1 dark:hover:bg-b-surface1 text-t-secondary hover:text-t-primary dark:hover:text-t-primary transition-colors">
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
            <span className="font-sans text-[14px] text-t-secondary">
              Showing <span className="font-semibold text-t-primary dark:text-t-primary">1</span> to <span className="font-semibold text-t-primary dark:text-t-primary">5</span> of <span className="font-semibold text-t-primary dark:text-t-primary">1,245</span> entries
            </span>
            <div className="flex flex-row items-center gap-2">
              <button className="px-4 py-2 rounded-lg border border-s-stroke2/40 bg-b-surface1 dark:bg-b-surface1 text-t-secondary opacity-50 cursor-not-allowed font-sans text-[13px] font-semibold">
                Previous
              </button>
              <button className="px-4 py-2 rounded-lg border border-s-stroke2/40 bg-b-surface1 dark:bg-b-surface1 hover:bg-s-stroke2 dark:hover:bg-s-stroke2/30 transition-colors font-sans text-[13px] font-semibold text-t-primary dark:text-t-primary">
                Next
              </button>
            </div>
          </div>

        </div>

      </main>
    </>
  );
}
