"use client";

import { useState } from "react";
import {
  RiSearchLine,
  RiNotification3Line,
  RiMailLine,
  RiAddLine,
  RiMore2Fill,
  RiStarFill,
  RiGraduationCapLine,
  RiBookOpenLine
} from "@remixicon/react";

const mockFaculty = [
  { id: "FAC-001", name: "Aman Sir", subject: "Physics", role: "Senior Faculty", batches: 4, rating: 4.8 },
  { id: "FAC-002", name: "Priya Madam", subject: "Chemistry", role: "Faculty", batches: 3, rating: 4.5 },
  { id: "FAC-003", name: "Rajesh Sir", subject: "Mathematics", role: "HOD", batches: 2, rating: 4.9 },
  { id: "FAC-004", name: "Sneha Miss", subject: "Biology", role: "Junior Faculty", batches: 5, rating: 4.2 }
];

export default function InstituteFacultyPage() {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredFaculty = mockFaculty.filter(fac =>
    fac.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    fac.subject.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <main className="mx-auto w-full max-w-[1560px] px-6 pb-12 pt-6 flex flex-col gap-6 select-none bg-transparent">

      {/* ── Top Navigation Row (Figma Style) ── */}
      <div className="flex flex-row justify-between items-center w-full h-12 gap-6">
        {/* Title */}
        <h1 className="font-sans font-semibold text-[32px] leading-[145%] tracking-[0.0025em] text-t-primary dark:text-t-primary">
          Faculty
        </h1>

        {/* Navigation Items (Right Side) */}
        <div className="flex flex-row items-center gap-3">
          {/* Search Box */}
          <div className="flex flex-row items-center bg-b-surface2 dark:bg-b-surface2 border border-s-stroke2 dark:border-s-stroke2/40 rounded-lg px-3 py-2 w-72 h-12 gap-2 shadow-xs">
            <RiSearchLine size={20} className="text-t-secondary dark:text-t-tertiary" />
            <input
              type="text"
              placeholder="Search faculty..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none outline-none text-sm text-t-primary dark:text-t-primary placeholder-t-secondary w-full"
            />
          </div>

          {/* Add Faculty Button (Gradient) */}
          <button className="flex flex-row justify-center items-center px-6 h-12 bg-gradient-to-b from-[#2C2C2C] to-[#282828] dark:from-t-primary dark:to-t-primary/90 text-t-light dark:text-b-surface1 text-sm font-sans font-semibold rounded-lg shadow-[inset_2px_0px_8px_2px_rgba(248,248,248,0.2)] active:scale-95 transition-all cursor-pointer">
            + Add Faculty
          </button>

          {/* Bell Button */}
          <button className="relative flex size-12 items-center justify-center rounded-full bg-b-surface2 dark:bg-b-surface2 border border-s-stroke2 dark:border-s-stroke2/40 text-t-secondary dark:text-t-secondary hover:text-t-primary dark:hover:text-t-primary transition-all active:scale-95 shadow-xs cursor-pointer shrink-0">
            <RiNotification3Line size={20} />
            <div className="absolute top-3.5 right-3.5 size-1.5 rounded-full bg-primary-03" />
          </button>

          {/* Mail Button */}
          <button className="flex size-12 items-center justify-center rounded-full bg-b-surface2 dark:bg-b-surface2 border border-s-stroke2 dark:border-s-stroke2/40 text-t-secondary dark:text-t-secondary hover:text-t-primary dark:hover:text-t-primary transition-all active:scale-95 shadow-xs cursor-pointer shrink-0">
            <RiMailLine size={20} />
          </button>

          {/* Avatar Profile */}
          <div className="flex items-center justify-center size-12 rounded-full border border-s-stroke2/40 dark:border-s-stroke2/40 bg-b-surface2 dark:bg-b-surface2 shrink-0 cursor-pointer shadow-xs">
            <div className="size-9 rounded-full bg-shade-02 dark:bg-t-primary flex items-center justify-center text-xs font-bold text-t-light dark:text-b-surface1">
              AA
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-col gap-2 mt-6">
        <h2 className="font-sans font-semibold text-[20px] leading-[145%] text-t-primary dark:text-t-primary">Faculty Directory</h2>
        <p className="text-xs text-t-secondary dark:text-t-tertiary">Manage department heads, lecturing teachers, credentials, and student feedback performance ratings.</p>
      </div>

      {/* Vertical List of Rows */}
      <div className="flex flex-col gap-3 w-full mt-4">
        {filteredFaculty.map(faculty => {
          const subjectColorMap = {
            Physics: {
              badge: "bg-primary-01/5 border-primary-01/15 text-primary-01",
              initials: "bg-primary-01/10 text-primary-01"
            },
            Chemistry: {
              badge: "bg-primary-05/5 border-primary-05/15 text-primary-05",
              initials: "bg-primary-05/10 text-primary-05"
            },
            Mathematics: {
              badge: "bg-[#8F3FFF]/5 border-[#8F3FFF]/15 text-[#8F3FFF]",
              initials: "bg-[#8F3FFF]/10 text-[#8F3FFF]"
            },
            Biology: {
              badge: "bg-primary-02/5 border-primary-02/15 text-primary-02",
              initials: "bg-primary-02/10 text-primary-02"
            }
          }[faculty.subject] || {
            badge: "bg-t-secondary/5 border-t-secondary/15 text-t-secondary",
            initials: "bg-t-secondary/10 text-t-secondary"
          };

          // Initials for avatar
          const initials = faculty.name.split(" ").map(n => n[0]).join("");

          return (
            <div
              key={faculty.id}
              className="group relative flex flex-row items-center justify-between p-3 gap-8 bg-b-surface2 dark:bg-b-surface2 border border-s-stroke2/40 rounded-lg shadow-xs hover:scale-[1.005] hover:bg-b-surface1 dark:hover:bg-b-surface1/30 transition-all h-[88px] cursor-pointer"
            >
              <div className="box-hover" />

              {/* Left: Avatar/Initials Box */}
              <div className="flex flex-row items-center gap-5 flex-1 min-w-0 overflow-hidden relative z-10">
                <div className={`flex w-16 h-16 items-center justify-center rounded-lg border border-s-stroke2/40 shrink-0 font-sans font-bold text-lg ${subjectColorMap.initials}`}>
                  {initials}
                </div>

                {/* Faculty Name & Role Info */}
                <div className="min-w-0 flex-1 flex flex-col justify-center">
                  <span className="font-sans font-semibold text-[16px] leading-[150%] tracking-[0.0015em] text-t-primary dark:text-t-primary truncate">
                    {faculty.name}
                  </span>
                  <span className="text-xs text-t-secondary dark:text-t-tertiary mt-0.5 flex items-center gap-1">
                    <RiGraduationCapLine size={14} className="text-t-secondary/70" />
                    {faculty.role}
                  </span>
                </div>
              </div>

              {/* Right: Metrics + Subject Tag */}
              <div className="flex flex-row items-center gap-8 shrink-0 relative z-10">
                {/* Batches count */}
                <div className="flex flex-col items-end justify-center min-w-[70px]">
                  <span className="text-[10px] font-sans font-bold text-t-secondary uppercase tracking-wider">
                    Batches
                  </span>
                  <span className="text-[16px] font-sans font-bold text-t-primary dark:text-t-primary mt-0.5">
                    {faculty.batches}
                  </span>
                </div>

                {/* Rating score */}
                <div className="flex flex-col items-end justify-center min-w-[70px]">
                  <span className="text-[10px] font-sans font-bold text-t-secondary uppercase tracking-wider flex items-center gap-0.5">
                    <RiStarFill size={10} className="text-[#F4A109]" /> Rating
                  </span>
                  <span className="text-[16px] font-sans font-bold text-primary-02 mt-0.5">
                    {faculty.rating}
                  </span>
                </div>

                {/* Subject badge */}
                <div className="min-w-[110px] flex justify-end">
                  <span className={`px-3 py-1.5 border rounded-lg text-[10px] font-bold uppercase tracking-wider ${subjectColorMap.badge}`}>
                    {faculty.subject}
                  </span>
                </div>

                {/* Actions button */}
                <button className="flex items-center justify-center size-8 rounded-full text-t-secondary hover:text-t-primary dark:hover:text-t-primary hover:bg-b-surface1 dark:hover:bg-b-surface3 border border-s-stroke2/30 bg-b-surface2 dark:bg-b-surface2 transition-all active:scale-95 shadow-xs shrink-0">
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
