"use client";

import { useState } from "react";
import {
  RiSearchLine,
  RiNotification3Line,
  RiMailLine,
  RiTeamLine,
  RiMore2Fill,
  RiGraduationCapLine,
  RiGroupLine
} from "@remixicon/react";

const mockBatches = [
  { id: 1, name: "Class 11 - JEE Advanced", students: 45, teachers: 3, status: "Active" },
  { id: 2, name: "Class 12 - NEET", students: 60, teachers: 4, status: "Active" },
  { id: 3, name: "Droppers - JEE Mains", students: 120, teachers: 5, status: "Active" },
  { id: 4, name: "Class 10 - Foundation", students: 30, teachers: 2, status: "Upcoming" },
];

export default function BatchesPage() {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredBatches = mockBatches.filter(batch =>
    batch.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <main className="mx-auto w-full max-w-[1560px] px-6 pb-12 pt-6 flex flex-col gap-6 select-none bg-transparent">

      {/* ── Top Navigation Row (Figma Style) ── */}
      <div className="flex flex-row justify-between items-center w-full h-12 gap-6">
        {/* Title */}
        <h1 className="font-sans font-semibold text-[32px] leading-[145%] tracking-[0.0025em] text-[#101010] dark:text-t-primary">
          Batches
        </h1>

        {/* Navigation Items (Right Side) */}
        <div className="flex flex-row items-center gap-3">
          {/* Search Box */}
          <div className="flex flex-row items-center bg-[#FDFDFD] dark:bg-b-surface2 border border-[#E2E2E2] dark:border-s-stroke2/40 rounded-lg px-3 py-2 w-72 h-12 gap-2 shadow-xs">
            <RiSearchLine size={20} className="text-[#727272] dark:text-t-tertiary" />
            <input
              type="text"
              placeholder="Search batches..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none outline-none text-sm text-[#101010] dark:text-t-primary placeholder-[#727272] w-full"
            />
          </div>

          {/* Create Button (Gradient) */}
          <button className="flex flex-row justify-center items-center px-6 h-12 bg-gradient-to-b from-[#2C2C2C] to-[#282828] dark:from-t-primary dark:to-t-primary/90 text-[#FDFDFD] dark:text-b-surface1 text-sm font-sans font-semibold rounded-lg shadow-[inset_2px_0px_8px_2px_rgba(248,248,248,0.2)] active:scale-95 transition-all cursor-pointer">
            + Create Batch
          </button>

          {/* Bell Button */}
          <button className="relative flex size-12 items-center justify-center rounded-full bg-[#FDFDFD] dark:bg-b-surface2 border border-[#E2E2E2] dark:border-s-stroke2/40 text-[#727272] dark:text-t-secondary hover:text-[#101010] dark:hover:text-t-primary transition-all active:scale-95 shadow-xs cursor-pointer shrink-0">
            <RiNotification3Line size={20} />
            <div className="absolute top-3.5 right-3.5 size-1.5 rounded-full bg-[#FF6A55]" />
          </button>

          {/* Mail Button */}
          <button className="flex size-12 items-center justify-center rounded-full bg-[#FDFDFD] dark:bg-b-surface2 border border-[#E2E2E2] dark:border-s-stroke2/40 text-[#727272] dark:text-t-secondary hover:text-[#101010] dark:hover:text-t-primary transition-all active:scale-95 shadow-xs cursor-pointer shrink-0">
            <RiMailLine size={20} />
          </button>

          {/* Avatar Profile */}
          <div className="flex items-center justify-center size-12 rounded-full border border-[rgba(123,123,123,0.1)] dark:border-s-stroke2/40 bg-[#FDFDFD] dark:bg-b-surface2 shrink-0 cursor-pointer shadow-xs">
            <div className="size-9 rounded-full bg-[#101010] dark:bg-t-primary flex items-center justify-center text-xs font-bold text-[#FDFDFD] dark:text-b-surface1">
              AA
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-col gap-2 mt-6">
        <h2 className="font-sans font-semibold text-[20px] leading-[145%] text-[#101010] dark:text-t-primary">All Batches</h2>
        <p className="text-xs text-[#7B7B7B] dark:text-t-tertiary">Configure class cohorts, monitor student enrollment sizes, and assign lecturing faculty.</p>
      </div>

      {/* Vertical List of Rows */}
      <div className="flex flex-col gap-3 w-full mt-4">
        {filteredBatches.map(batch => {
          const colors = [
            { bg: "bg-[#2A85FF]/10 text-[#2A85FF] border-[#2A85FF]/20" },
            { bg: "bg-[#00A656]/10 text-[#00A656] border-[#00A656]/20" },
            { bg: "bg-[#EF9D0E]/10 text-[#EF9D0E] border-[#EF9D0E]/20" },
            { bg: "bg-[#FF6A55]/10 text-[#FF6A55] border-[#FF6A55]/20" }
          ][(batch.id - 1) % 4];

          const isUpcoming = batch.status === "Upcoming";
          const badgeClass = isUpcoming
            ? "bg-[#EF9D0E]/5 border-[#EF9D0E]/15 text-[#EF9D0E]"
            : "bg-[#00A656]/5 border-[#00A656]/15 text-[#00A656]";

          return (
            <div
              key={batch.id}
              className="group relative flex flex-row items-center justify-between p-3 gap-8 bg-[#FDFDFD] dark:bg-b-surface2 border border-s-stroke2/40 rounded-lg shadow-xs hover:scale-[1.005] hover:bg-[#F9F9F9] dark:hover:bg-b-surface1/30 transition-all h-[88px] cursor-pointer"
            >
              <div className="box-hover" />

              {/* Left: Team Icon Box */}
              <div className="flex flex-row items-center gap-5 flex-1 min-w-0 overflow-hidden relative z-10">
                <div className={`flex w-16 h-16 items-center justify-center rounded-lg border shrink-0 ${colors.bg}`}>
                  <RiTeamLine size={24} />
                </div>

                {/* Batch Name & Subtitle */}
                <div className="min-w-0 flex-1 flex flex-col justify-center">
                  <span className="font-sans font-semibold text-[16px] leading-[150%] tracking-[0.0015em] text-[#101010] dark:text-t-primary truncate">
                    {batch.name}
                  </span>
                  <span className="text-xs text-[#7B7B7B] dark:text-t-tertiary mt-0.5">
                    Batch Code: BATCH-00{batch.id}
                  </span>
                </div>
              </div>

              {/* Right: Metrics + Status Tag */}
              <div className="flex flex-row items-center gap-8 shrink-0 relative z-10">
                {/* Students Count */}
                <div className="flex flex-col items-end justify-center min-w-[80px]">
                  <span className="text-[10px] font-sans font-bold text-[#7B7B7B] uppercase tracking-wider flex items-center gap-0.5">
                    <RiGroupLine size={10} /> Students
                  </span>
                  <span className="text-[16px] font-sans font-bold text-[#101010] dark:text-t-primary mt-0.5">
                    {batch.students}
                  </span>
                </div>

                {/* Teachers Count */}
                <div className="flex flex-col items-end justify-center min-w-[80px]">
                  <span className="text-[10px] font-sans font-bold text-[#7B7B7B] uppercase tracking-wider flex items-center gap-0.5">
                    <RiGraduationCapLine size={10} /> Faculty
                  </span>
                  <span className="text-[16px] font-sans font-bold text-[#101010] dark:text-t-primary mt-0.5">
                    {batch.teachers}
                  </span>
                </div>

                {/* Status tag */}
                <div className="min-w-[100px] flex justify-end">
                  <span className={`px-3 py-1.5 border rounded-lg text-[10px] font-bold uppercase tracking-wider ${badgeClass}`}>
                    {batch.status}
                  </span>
                </div>

                {/* Actions button */}
                <button className="flex items-center justify-center size-8 rounded-full text-[#7B7B7B] hover:text-[#101010] dark:hover:text-t-primary hover:bg-[#F9F9F9] dark:hover:bg-b-surface3 border border-s-stroke2/30 bg-[#FDFDFD] dark:bg-b-surface2 transition-all active:scale-95 shadow-xs shrink-0">
                  <RiMore2Fill size={18} />
                </button>
              </div>

            </div>
          );
        })}
      </div>

    </main>
  );
}
