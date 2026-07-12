"use client";

import { useState } from "react";
import {
  RiSearchLine,
  RiNotification3Line,
  RiMailLine,
  RiMore2Fill,
  RiTeamLine,
  RiStarFill,
  RiUser3Line
} from "@remixicon/react";

const mockStudents = [
  { id: "STU-001", name: "Rahul Sharma", batch: "Class 12 - JEE", score: 85, status: "Active" },
  { id: "STU-002", name: "Priya Singh", batch: "Class 12 - NEET", score: 92, status: "Active" },
  { id: "STU-003", name: "Amit Kumar", batch: "Droppers - JEE", score: 78, status: "Active" },
  { id: "STU-004", name: "Sneha Patel", batch: "Class 11 - JEE", score: 88, status: "Active" },
  { id: "STU-005", name: "Vikram Reddy", batch: "Class 12 - JEE", score: 65, status: "Inactive" },
];

export default function StudentsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | "Active" | "Inactive">("All");

  const filteredStudents = mockStudents.filter(student => {
    const matchesSearch = student.name.toLowerCase().includes(searchQuery.toLowerCase()) || student.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = statusFilter === "All" || student.status === statusFilter;
    return matchesSearch && matchesFilter;
  });

  return (
    <main className="mx-auto w-full max-w-[1560px] px-6 pb-12 pt-6 flex flex-col gap-6 select-none bg-transparent">

      {/* ── Top Navigation Row (Figma Style) ── */}
      <div className="flex flex-row justify-between items-center w-full h-12 gap-6">
        {/* Title */}
        <h1 className="font-sans font-semibold text-[32px] leading-[145%] tracking-[0.0025em] text-t-primary dark:text-t-primary">
          Students
        </h1>

        {/* Navigation Items (Right Side) */}
        <div className="flex flex-row items-center gap-3">
          {/* Search Box */}
          <div className="flex flex-row items-center bg-b-surface2 dark:bg-b-surface2 border border-s-stroke2 dark:border-s-stroke2/40 rounded-[10px] px-3 py-2 w-72 h-12 gap-2 shadow-xs">
            <RiSearchLine size={20} className="text-t-secondary dark:text-t-tertiary" />
            <input
              type="text"
              placeholder="Search students..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none outline-none text-sm text-t-primary dark:text-t-primary placeholder-t-secondary w-full"
            />
          </div>

          {/* Add Student Button (Gradient) */}
          <button className="flex flex-row justify-center items-center px-6 h-12 bg-gradient-to-b from-[#2C2C2C] to-[#282828] dark:from-t-primary dark:to-t-primary/90 text-t-light dark:text-b-surface1 text-sm font-sans font-semibold rounded-[10px] shadow-[inset_2px_0px_8px_2px_rgba(248,248,248,0.2)] active:scale-95 transition-all cursor-pointer">
            + Add Student
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
      <div className="flex justify-between items-end mt-6">
        <div className="flex flex-col gap-2">
          <h2 className="font-sans font-semibold text-[20px] leading-[145%] text-t-primary dark:text-t-primary">Student Directory</h2>
          <p className="text-xs text-t-secondary dark:text-t-tertiary">Monitor student enrollment, active batch distribution, and overall class performance standings.</p>
        </div>

        {/* Filter Controls */}
        <div className="flex gap-2">
          {["All", "Active", "Inactive"].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status as any)}
              className={`px-5 py-2.5 border rounded-[10px] text-xs font-semibold font-sans transition-all active:scale-95 shadow-xs cursor-pointer ${
                statusFilter === status
                  ? "bg-shade-02 text-t-light border-t-primary dark:bg-t-primary dark:text-b-surface1 dark:border-t-primary"
                  : "border-s-stroke2 dark:border-s-stroke2/40 bg-b-surface2 dark:bg-b-surface2 text-t-secondary dark:text-t-secondary hover:border-t-secondary"
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Vertical List of Rows */}
      <div className="flex flex-col gap-3 w-full mt-4">
        {filteredStudents.map(student => {
          const isInactive = student.status === "Inactive";
          const statusClass = isInactive
            ? "bg-t-secondary/5 border-t-secondary/15 text-t-secondary"
            : "bg-primary-02/5 border-primary-02/15 text-primary-02";

          const scoreColor = student.score >= 85
            ? "text-primary-02"
            : student.score >= 75
              ? "text-primary-05"
              : "text-primary-03";

          const performanceLevel = student.score >= 90
            ? "Elite"
            : student.score >= 80
              ? "Excellent"
              : student.score >= 70
                ? "Good"
                : "Needs Focus";

          const performanceColor = student.score >= 80
            ? "text-primary-02 bg-primary-02/5 border-primary-02/15"
            : student.score >= 70
              ? "text-primary-05 bg-primary-05/5 border-primary-05/15"
              : "text-primary-03 bg-primary-03/5 border-primary-03/15";

          const initials = student.name.split(" ").map(n => n[0]).join("");

          return (
            <div
              key={student.id}
              className="group/item relative flex flex-row items-center justify-between p-4 gap-8 bg-white dark:bg-white/[0.02] border border-s-stroke2/40 rounded-[24px] shadow-[0px_0px_36px_-8px_rgba(0,0,0,0.05),0px_6px_4px_-4px_rgba(8,8,8,0.05)] hover:scale-[1.005] transition-all h-[96px] cursor-pointer"
            >

              {/* Left: Avatar/Initials Box */}
              <div className="flex flex-row items-center gap-5 flex-1 min-w-0 overflow-hidden relative z-10">
                <div className="flex w-16 h-16 items-center justify-center rounded-[10px] bg-b-surface1 border border-s-stroke2/40 shrink-0 font-sans font-bold text-lg text-t-primary dark:text-t-primary">
                  {initials}
                </div>

                {/* Student Name, ID, and Batch */}
                <div className="min-w-0 flex-1 flex flex-col justify-center">
                  <span className="font-sans font-semibold text-[16px] leading-[150%] tracking-[0.0015em] text-t-primary dark:text-t-primary truncate">
                    {student.name}
                  </span>
                  <span className="text-xs text-t-secondary dark:text-t-tertiary mt-0.5 flex items-center gap-1.5 truncate">
                    <span className="font-semibold">{student.id}</span>
                    <span className="text-s-stroke2">·</span>
                    <span className="flex items-center gap-1 font-medium">
                      <RiTeamLine size={13} className="text-t-secondary/70" />
                      {student.batch}
                    </span>
                  </span>
                </div>
              </div>

              {/* Right: Metrics + Status Tag */}
              <div className="flex flex-row items-center gap-8 shrink-0 relative z-10">
                {/* Avg Score */}
                <div className="flex flex-col items-end justify-center min-w-[80px]">
                  <span className="text-[10px] font-sans font-bold text-t-secondary uppercase tracking-wider">
                    Avg Score
                  </span>
                  <span className={`text-[16px] font-sans font-bold mt-0.5 ${scoreColor}`}>
                    {student.score}%
                  </span>
                </div>

                {/* Standing */}
                <div className="flex flex-col items-end justify-center min-w-[90px]">
                  <span className="text-[10px] font-sans font-bold text-t-secondary uppercase tracking-wider flex items-center gap-0.5">
                    <RiStarFill size={10} className="text-[#F4A109]" /> Standing
                  </span>
                  <span className={`px-2 py-0.5 border rounded-md text-[10px] font-bold mt-0.5 leading-none ${performanceColor}`}>
                    {performanceLevel}
                  </span>
                </div>

                {/* Status tag */}
                <div className="min-w-[90px] flex justify-end">
                  <span className={`px-3 py-1.5 border rounded-[10px] text-[10px] font-bold uppercase tracking-wider ${statusClass}`}>
                    {student.status}
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
