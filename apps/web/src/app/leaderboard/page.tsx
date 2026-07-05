"use client";

import { useState } from "react";
import Navbar from "@/components/layout/Navbar";
import { useAuth } from "@/lib/auth-context";
import {
  RiMedalFill,
  RiFireFill
} from "@remixicon/react";

const tabs = ["Global", "Institute", "Batch"] as const;
type Tab = typeof tabs[number];

export default function LeaderboardPage() {
  const [activeTab, setActiveTab] = useState<Tab>("Global");
  const { user } = useAuth();
  const firstName = (user?.name ?? "User").split(" ")[0];
  
  const leaderboardData: any[] = [];

  return (
    <>
      <Navbar title="Leaderboard" subtitle="See how you rank against students globally, in your institute, and in your batch." breadcrumbs="Dashboard > Leaderboard" />
      
      <main className="mx-auto w-full max-w-screen-2xl px-4 pb-10 pt-6 md:px-6 overflow-x-hidden">
        
        {/* Your rank card */}
        <div className="group relative flex flex-col md:flex-row items-start md:items-center p-6 md:p-8 rounded-lg bg-b-surface2 dark:bg-b-surface2 shadow-[0px_5px_1.5px_-4px_rgba(8,8,8,0.09),0px_6px_4px_-4px_rgba(8,8,8,0.05)] border border-s-stroke2/40 select-none mb-8 hover:-translate-y-0.5 hover:shadow-[0px_10px_20px_-8px_rgba(0,0,0,0.06)] transition-all duration-200 gap-6">
          <div className="box-hover" />
          
          <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-b from-t-primary to-[#303030] dark:from-t-primary dark:to-t-primary/70 text-t-light dark:text-b-surface1 text-[18px] font-sans font-semibold relative z-10">
            {firstName.charAt(0)}
          </div>
          
          <div className="flex-1 min-w-0 relative z-10">
            <h3 className="font-sans font-semibold text-[20px] leading-[145%] tracking-[0.0015em] text-t-primary dark:text-t-primary mb-2.5">
              You · {user?.name ?? "User"}
            </h3>
            <div className="flex flex-wrap gap-2 text-[12px] font-sans text-t-secondary">
              <span className="px-2 py-0.5 rounded-lg border border-s-stroke2/20 bg-b-surface1 dark:bg-b-surface1/60 text-t-primary dark:text-t-primary font-semibold">
                Global: #--
              </span>
              <span className="px-2 py-0.5 rounded-lg border border-s-stroke2/20 bg-b-surface1 dark:bg-b-surface1/60 text-t-primary dark:text-t-primary font-semibold">
                Institute: #--
              </span>
              <span className="px-2 py-0.5 rounded-lg border border-s-stroke2/20 bg-b-surface1 dark:bg-b-surface1/60 text-t-primary dark:text-t-primary font-semibold">
                Batch: #--
              </span>
            </div>
          </div>
          
          <div className="text-left md:text-right shrink-0 relative z-10">
            <div className="font-sans text-[36px] font-medium tracking-[-0.005em] text-t-primary dark:text-t-primary leading-none">
              --%ile
            </div>
            <div className="text-[12px] font-sans text-t-secondary mt-1 font-medium">
              Global Percentile
            </div>
          </div>
        </div>

        {/* Tabs Segment Controller */}
        <div className="flex gap-1 rounded-lg border border-s-stroke2/30 bg-b-surface1 dark:bg-b-surface1/60 p-1 w-fit select-none mb-6">
          {tabs.map((tab) => (
            <button
              key={tab}
              id={`tab-${tab.toLowerCase()}`}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-2 text-xs font-sans font-semibold rounded-lg transition-all cursor-pointer ${
                activeTab === tab
                  ? "bg-b-surface2 dark:bg-b-surface2 text-t-primary dark:text-t-primary shadow-widget"
                  : "bg-transparent text-t-secondary hover:text-t-primary"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Table Container */}
        <div className="overflow-hidden rounded-lg bg-b-surface2 dark:bg-b-surface2 shadow-[0px_5px_1.5px_-4px_rgba(8,8,8,0.09),0px_6px_4px_-4px_rgba(8,8,8,0.05)] border border-s-stroke2/40 select-none">
          <div className="overflow-x-auto">
            <div className="min-w-[760px]">
              
              {/* Table Header */}
              <div className="grid grid-cols-[100px_minmax(0,1fr)_120px_120px_100px] gap-4 border-b border-s-stroke2/20 bg-b-surface1 dark:bg-b-surface1/60 p-4.5 text-center text-[11px] font-sans font-bold uppercase tracking-wider text-t-secondary">
                <div className="text-left pl-4">Rank</div>
                <div className="text-left">Student</div>
                <div>Avg Accuracy</div>
                <div>Tests Taken</div>
                <div>Streak</div>
              </div>

              {/* Table Body */}
              <div className="flex flex-col">
                {leaderboardData.length === 0 ? (
                  <div className="py-12 text-center text-[14px] font-sans text-t-secondary">
                    No leaderboard data available yet.
                  </div>
                ) : (
                  leaderboardData.map((student) => {
                  const getMedal = () => {
                    if (student.rank === 1) return <span className="flex items-center gap-1 text-primary-05 font-bold"><RiMedalFill size={18} /> #1</span>;
                    if (student.rank === 2) return <span className="flex items-center gap-1 text-t-secondary font-bold"><RiMedalFill size={18} /> #2</span>;
                    if (student.rank === 3) return <span className="flex items-center gap-1 text-[#B45309] font-bold"><RiMedalFill size={18} /> #3</span>;
                    return <span className="text-t-secondary pl-1 font-semibold">#{student.rank}</span>;
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
                            ? "bg-shade-02 text-t-light dark:bg-t-primary dark:text-b-surface1"
                            : "bg-b-surface1 dark:bg-b-surface1 border border-s-stroke2/20 text-t-primary dark:text-t-primary"
                        }`}>
                          {student.name.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <div className="font-sans font-semibold text-[15px] text-t-primary dark:text-t-primary truncate flex items-center leading-none">
                            {student.name}
                            {student.isCurrentUser && (
                              <span className="px-1.5 py-0.5 rounded border border-s-stroke2/40 bg-[rgba(0,166,86,0.05)] text-primary-02 text-[10px] font-sans font-bold uppercase tracking-wider ml-2">
                                You
                              </span>
                            )}
                          </div>
                          <div className="text-[12px] font-sans text-t-secondary mt-1 leading-none">JEE Target 2026</div>
                        </div>
                      </div>

                      {/* Avg Score */}
                      <div className={`font-sans font-semibold text-[14px] ${
                        student.avgScore >= 70
                          ? "text-primary-02"
                          : student.avgScore >= 50
                            ? "text-primary-05"
                            : "text-primary-03"
                      }`}>
                        {student.avgScore}%
                      </div>

                      {/* Tests */}
                      <div className="font-sans font-semibold text-[14px] text-t-primary dark:text-t-primary">
                        {student.totalTests}
                      </div>

                      {/* Streak */}
                      <div className="font-sans text-[14px] text-primary-05 font-bold flex items-center justify-center gap-1">
                        <RiFireFill size={16} />
                        <span>{student.streak}</span>
                      </div>
                    </div>
                  );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
