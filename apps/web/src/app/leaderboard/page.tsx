"use client";

import { useState } from "react";
import Navbar from "@/components/layout/Navbar";
import { mockLeaderboard, mockInstituteLeaderboard, mockBatchLeaderboard, mockUser } from "@/lib/mock-data";
import {
  RiMedalFill,
  RiFireFill
} from "@remixicon/react";

const tabs = ["Global", "Institute", "Batch"] as const;
type Tab = typeof tabs[number];

export default function LeaderboardPage() {
  const [activeTab, setActiveTab] = useState<Tab>("Global");

  return (
    <>
      <Navbar title="Leaderboard" subtitle="See how you rank against students globally, in your institute, and in your batch." breadcrumbs="Dashboard > Leaderboard" />
      
      <main className="mx-auto w-full max-w-screen-2xl px-4 pb-10 pt-6 md:px-6 overflow-x-hidden">
        
        {/* Your rank card */}
        <div className="group relative flex flex-col md:flex-row items-start md:items-center p-6 md:p-8 rounded-[32px] bg-[#FDFDFD] dark:bg-b-surface2 shadow-[0px_5px_1.5px_-4px_rgba(8,8,8,0.09),0px_6px_4px_-4px_rgba(8,8,8,0.05)] border border-s-stroke2/40 select-none mb-8 hover:-translate-y-0.5 hover:shadow-[0px_10px_20px_-8px_rgba(0,0,0,0.06)] transition-all duration-200 gap-6">
          <div className="box-hover" />
          
          <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-b from-[#101010] to-[#303030] dark:from-t-primary dark:to-t-primary/70 text-[#FDFDFD] dark:text-b-surface1 text-[18px] font-sans font-semibold relative z-10">
            {mockUser.name.charAt(0)}
          </div>
          
          <div className="flex-1 min-w-0 relative z-10">
            <h3 className="font-sans font-semibold text-[20px] leading-[145%] tracking-[0.0015em] text-[#101010] dark:text-t-primary mb-2.5">
              You · {mockUser.name}
            </h3>
            <div className="flex flex-wrap gap-2 text-[12px] font-sans text-[#7B7B7B]">
              <span className="px-2 py-0.5 rounded-lg border border-s-stroke2/20 bg-[#F9F9F9] dark:bg-b-surface1/60 text-[#101010] dark:text-t-primary font-semibold">
                Global: #{mockUser.globalRank}
              </span>
              <span className="px-2 py-0.5 rounded-lg border border-s-stroke2/20 bg-[#F9F9F9] dark:bg-b-surface1/60 text-[#101010] dark:text-t-primary font-semibold">
                Institute: #{mockUser.instituteRank}
              </span>
              <span className="px-2 py-0.5 rounded-lg border border-s-stroke2/20 bg-[#F9F9F9] dark:bg-b-surface1/60 text-[#101010] dark:text-t-primary font-semibold">
                Batch: #{mockUser.batchRank}
              </span>
            </div>
          </div>
          
          <div className="text-left md:text-right shrink-0 relative z-10">
            <div className="font-sans text-[36px] font-medium tracking-[-0.005em] text-[#101010] dark:text-t-primary leading-none">
              {mockUser.percentile}%ile
            </div>
            <div className="text-[12px] font-sans text-[#7B7B7B] mt-1 font-medium">
              Global Percentile
            </div>
          </div>
        </div>

        {/* Tabs Segment Controller */}
        <div className="flex gap-1 rounded-[90px] border border-s-stroke2/30 bg-[#F9F9F9] dark:bg-b-surface1/60 p-1 w-fit select-none mb-6">
          {tabs.map((tab) => (
            <button
              key={tab}
              id={`tab-${tab.toLowerCase()}`}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-2 text-xs font-sans font-semibold rounded-[90px] transition-all cursor-pointer ${
                activeTab === tab
                  ? "bg-[#FDFDFD] dark:bg-b-surface2 text-[#101010] dark:text-t-primary shadow-widget"
                  : "bg-transparent text-[#7B7B7B] hover:text-[#101010]"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Table Container */}
        <div className="overflow-hidden rounded-[32px] bg-[#FDFDFD] dark:bg-b-surface2 shadow-[0px_5px_1.5px_-4px_rgba(8,8,8,0.09),0px_6px_4px_-4px_rgba(8,8,8,0.05)] border border-s-stroke2/40 select-none">
          <div className="overflow-x-auto">
            <div className="min-w-[760px]">
              
              {/* Table Header */}
              <div className="grid grid-cols-[100px_minmax(0,1fr)_120px_120px_100px] gap-4 border-b border-s-stroke2/20 bg-[#F9F9F9] dark:bg-b-surface1/60 p-4.5 text-center text-[11px] font-sans font-bold uppercase tracking-wider text-[#7B7B7B]">
                <div className="text-left pl-4">Rank</div>
                <div className="text-left">Student</div>
                <div>Avg Accuracy</div>
                <div>Tests Taken</div>
                <div>Streak</div>
              </div>

              {/* Table Body */}
              <div className="flex flex-col">
                {(activeTab === "Global" ? mockLeaderboard : activeTab === "Institute" ? mockInstituteLeaderboard : mockBatchLeaderboard).map((student) => {
                  const getMedal = () => {
                    if (student.rank === 1) return <span className="flex items-center gap-1 text-[#EF9D0E] font-bold"><RiMedalFill size={18} /> #1</span>;
                    if (student.rank === 2) return <span className="flex items-center gap-1 text-[#7B7B7B] font-bold"><RiMedalFill size={18} /> #2</span>;
                    if (student.rank === 3) return <span className="flex items-center gap-1 text-[#B45309] font-bold"><RiMedalFill size={18} /> #3</span>;
                    return <span className="text-[#7B7B7B] pl-1 font-semibold">#{student.rank}</span>;
                  };
                  
                  return (
                    <div
                      key={student.rank}
                      className={`grid grid-cols-[100px_minmax(0,1fr)_120px_120px_100px] gap-4 border-b border-s-stroke2/10 p-4.5 items-center text-center last:border-b-0 transition-colors hover:bg-[rgba(16,16,16,0.01)] dark:hover:bg-b-surface1/20 ${
                        student.isCurrentUser ? "bg-[rgba(16,16,16,0.02)] dark:bg-b-surface1/40" : ""
                      }`}
                    >
                      {/* Rank */}
                      <div className="text-left pl-4 font-sans text-[14px]">
                        {getMedal()}
                      </div>

                      {/* Student Profile Card */}
                      <div className="flex items-center gap-3 text-left min-w-0">
                        <div className={`flex size-9 shrink-0 items-center justify-center rounded-full text-[13px] font-sans font-bold ${
                          student.isCurrentUser
                            ? "bg-[#101010] text-[#FDFDFD] dark:bg-t-primary dark:text-b-surface1"
                            : "bg-[#F9F9F9] dark:bg-b-surface1 border border-s-stroke2/20 text-[#101010] dark:text-t-primary"
                        }`}>
                          {student.name.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <div className="font-sans font-semibold text-[15px] text-[#101010] dark:text-t-primary truncate flex items-center leading-none">
                            {student.name}
                            {student.isCurrentUser && (
                              <span className="px-1.5 py-0.5 rounded border border-[rgba(0,166,86,0.15)] bg-[rgba(0,166,86,0.05)] text-[#00A656] text-[10px] font-sans font-bold uppercase tracking-wider ml-2">
                                You
                              </span>
                            )}
                          </div>
                          <div className="text-[12px] font-sans text-[#7B7B7B] mt-1 leading-none">JEE Target 2026</div>
                        </div>
                      </div>

                      {/* Avg Score */}
                      <div className={`font-sans font-semibold text-[14px] ${
                        student.avgScore >= 70
                          ? "text-[#00A656]"
                          : student.avgScore >= 50
                            ? "text-[#EF9D0E]"
                            : "text-[#FF6A55]"
                      }`}>
                        {student.avgScore}%
                      </div>

                      {/* Tests */}
                      <div className="font-sans font-semibold text-[14px] text-[#101010] dark:text-t-primary">
                        {student.totalTests}
                      </div>

                      {/* Streak */}
                      <div className="font-sans text-[14px] text-[#EF9D0E] font-bold flex items-center justify-center gap-1">
                        <RiFireFill size={16} />
                        <span>{student.streak}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
