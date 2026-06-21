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
      <Navbar title="Leaderboard" />
      
      <main className="mx-auto w-full max-w-screen-2xl px-6 pb-10 pt-6 md:px-8">
        
        {/* Your rank card */}
        <div className="card mb-8 flex flex-wrap items-center gap-6 border border-primary-01/30 bg-primary-01/5 p-6 shadow-depth">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary-01 text-body-1 font-bold text-t-light">
            {mockUser.name.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-body-1 font-bold text-t-primary mb-1">You — {mockUser.name}</h3>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-caption font-semibold text-t-secondary">
              <span>Global: <strong className="text-primary-01">#{mockUser.globalRank}</strong></span>
              <span>Institute: <strong className="text-primary-01">#{mockUser.instituteRank}</strong></span>
              <span>Batch: <strong className="text-primary-01">#{mockUser.batchRank}</strong></span>
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-h4 font-bold text-primary-01 tracking-tight">{mockUser.percentile}%ile</div>
            <div className="text-caption text-t-secondary font-semibold">Global Percentile</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex w-fit max-w-full gap-1 overflow-x-auto rounded-3xl border border-s-stroke2 bg-b-surface2 p-1">
          {tabs.map((tab) => (
            <button
              key={tab}
              id={`tab-${tab.toLowerCase()}`}
              onClick={() => setActiveTab(tab)}
              className={`shrink-0 rounded-2xl border-none px-5 py-1.5 text-caption font-semibold transition-all cursor-pointer ${
                activeTab === tab
                  ? "bg-b-surface1 text-t-primary shadow-widget font-bold"
                  : "bg-transparent text-t-secondary hover:text-t-primary"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="card border border-s-stroke2 bg-b-surface1 p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <div className="min-w-[760px]">
              {/* Table Header */}
              <div className="grid grid-cols-[80px_minmax(0,1fr)_100px_100px_100px] gap-4 border-b border-s-stroke2 bg-b-surface2 p-4 text-center text-caption font-bold text-t-secondary">
                <div className="text-left pl-2">Rank</div>
                <div className="text-left">Student</div>
                <div>Avg Score</div>
                <div>Tests</div>
                <div>Streak</div>
              </div>

              <div className="flex flex-col">
            {(activeTab === "Global" ? mockLeaderboard : activeTab === "Institute" ? mockInstituteLeaderboard : mockBatchLeaderboard).map((student) => {
              const getMedal = () => {
                if (student.rank === 1) return <RiMedalFill className="text-[#EF9D0E]" size={20} />;
                if (student.rank === 2) return <RiMedalFill className="text-[#94A3B8]" size={20} />;
                if (student.rank === 3) return <RiMedalFill className="text-[#B45309]" size={20} />;
                return null;
              };
              const medal = getMedal();
              return (
                <div
                  key={student.rank}
                  className={`grid grid-cols-[80px_minmax(0,1fr)_100px_100px_100px] gap-4 border-b border-s-stroke2 p-4 items-center text-center last:border-b-0 ${
                    student.isCurrentUser ? "bg-primary-01/5" : ""
                  }`}
                >
                  {/* Rank */}
                  <div className="text-left pl-2 flex items-center font-bold text-body-2 text-t-secondary">
                    {medal || `#${student.rank}`}
                  </div>

                  {/* Name */}
                  <div className="flex items-center gap-3 text-left min-w-0">
                    <div className={`flex size-8 shrink-0 items-center justify-center rounded-full text-caption font-bold ${
                      student.isCurrentUser
                        ? "bg-primary-01 text-white"
                        : "bg-b-surface2 border border-s-stroke2 text-t-primary"
                    }`}>
                      {student.name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <div className="text-body-2 font-bold text-t-primary truncate flex items-center">
                        {student.name}
                        {student.isCurrentUser && <span className="label label-green ml-2">You</span>}
                      </div>
                      <div className="text-caption text-t-secondary">JEE 2026</div>
                    </div>
                  </div>

                  {/* Avg Score */}
                  <div className={`text-body-2 font-bold ${
                    student.avgScore >= 70
                      ? "text-[#00A656]"
                      : student.avgScore >= 50
                        ? "text-[#EF9D0E]"
                        : "text-[#FF6A55]"
                  }`}>
                    {student.avgScore}%
                  </div>

                  {/* Tests */}
                  <div className="text-caption text-t-secondary font-semibold">
                    {student.totalTests}
                  </div>

                  {/* Streak */}
                  <div className="text-caption text-[#EF9D0E] font-bold flex items-center justify-center gap-0.5">
                    <RiFireFill size={16} /> {student.streak}
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
