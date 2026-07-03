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
        <h1 className="font-sans font-semibold text-[32px] leading-[145%] tracking-[0.0025em] text-[#101010] dark:text-t-primary">
          Students
        </h1>

        {/* Navigation Items (Right Side) */}
        <div className="flex flex-row items-center gap-3">
          {/* Search Box */}
          <div className="flex flex-row items-center bg-[#FDFDFD] dark:bg-b-surface2 border border-[#E2E2E2] dark:border-s-stroke2/40 rounded-lg px-3 py-2 w-72 h-12 gap-2 shadow-xs">
            <RiSearchLine size={20} className="text-[#727272] dark:text-t-tertiary" />
            <input
              type="text"
              placeholder="Search students..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none outline-none text-sm text-[#101010] dark:text-t-primary placeholder-[#727272] w-full"
            />
          </div>

          {/* Add Student Button (Gradient) */}
          <button className="flex flex-row justify-center items-center px-6 h-12 bg-gradient-to-b from-[#2C2C2C] to-[#282828] dark:from-t-primary dark:to-t-primary/90 text-[#FDFDFD] dark:text-b-surface1 text-sm font-sans font-semibold rounded-lg shadow-[inset_2px_0px_8px_2px_rgba(248,248,248,0.2)] active:scale-95 transition-all cursor-pointer">
            + Add Student
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
      <div className="flex justify-between items-end mt-6">
        <div className="flex flex-col gap-2">
          <h2 className="font-sans font-semibold text-[20px] leading-[145%] text-[#101010] dark:text-t-primary">Student Directory</h2>
          <p className="text-xs text-[#7B7B7B] dark:text-t-tertiary">Monitor student enrollment, active batch distribution, and overall class performance standings.</p>
        </div>

        {/* Filter Controls */}
        <div className="flex gap-2">
          {["All", "Active", "Inactive"].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status as any)}
              className={`px-5 py-2.5 border rounded-lg text-xs font-semibold font-sans transition-all active:scale-95 shadow-xs cursor-pointer ${
                statusFilter === status
                  ? "bg-[#101010] text-[#FDFDFD] border-[#101010] dark:bg-t-primary dark:text-b-surface1 dark:border-t-primary"
                  : "border-[#E2E2E2] dark:border-s-stroke2/40 bg-[#FDFDFD] dark:bg-b-surface2 text-[#727272] dark:text-t-secondary hover:border-[#727272]"
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
            ? "bg-[#727272]/5 border-[#727272]/15 text-[#727272]"
            : "bg-[#00A656]/5 border-[#00A656]/15 text-[#00A656]";

          const scoreColor = student.score >= 85
            ? "text-[#00A656]"
            : student.score >= 75
              ? "text-[#EF9D0E]"
              : "text-[#FF6A55]";

          const performanceLevel = student.score >= 90
            ? "Elite"
            : student.score >= 80
              ? "Excellent"
              : student.score >= 70
                ? "Good"
                : "Needs Focus";

          const performanceColor = student.score >= 80
            ? "text-[#00A656] bg-[#00A656]/5 border-[#00A656]/15"
            : student.score >= 70
              ? "text-[#EF9D0E] bg-[#EF9D0E]/5 border-[#EF9D0E]/15"
              : "text-[#FF6A55] bg-[#FF6A55]/5 border-[#FF6A55]/15";

          const initials = student.name.split(" ").map(n => n[0]).join("");

          return (
            <div
              key={student.id}
              className="group relative flex flex-row items-center justify-between p-3 gap-8 bg-[#FDFDFD] dark:bg-b-surface2 border border-s-stroke2/40 rounded-lg shadow-xs hover:scale-[1.005] hover:bg-[#F9F9F9] dark:hover:bg-b-surface1/30 transition-all h-[88px] cursor-pointer"
            >
              <div className="box-hover" />

              {/* Left: Avatar/Initials Box */}
              <div className="flex flex-row items-center gap-5 flex-1 min-w-0 overflow-hidden relative z-10">
                <div className="flex w-16 h-16 items-center justify-center rounded-lg bg-b-surface1 border border-s-stroke2/40 shrink-0 font-sans font-bold text-lg text-[#101010] dark:text-t-primary">
                  {initials}
                </div>

                {/* Student Name, ID, and Batch */}
                <div className="min-w-0 flex-1 flex flex-col justify-center">
                  <span className="font-sans font-semibold text-[16px] leading-[150%] tracking-[0.0015em] text-[#101010] dark:text-t-primary truncate">
                    {student.name}
                  </span>
                  <span className="text-xs text-[#7B7B7B] dark:text-t-tertiary mt-0.5 flex items-center gap-1.5 truncate">
                    <span className="font-semibold">{student.id}</span>
                    <span className="text-[#D4D4D4]">·</span>
                    <span className="flex items-center gap-1 font-medium">
                      <RiTeamLine size={13} className="text-[#7B7B7B]/70" />
                      {student.batch}
                    </span>
                  </span>
                </div>
              </div>

              {/* Right: Metrics + Status Tag */}
              <div className="flex flex-row items-center gap-8 shrink-0 relative z-10">
                {/* Avg Score */}
                <div className="flex flex-col items-end justify-center min-w-[80px]">
                  <span className="text-[10px] font-sans font-bold text-[#7B7B7B] uppercase tracking-wider">
                    Avg Score
                  </span>
                  <span className={`text-[16px] font-sans font-bold mt-0.5 ${scoreColor}`}>
                    {student.score}%
                  </span>
                </div>

                {/* Standing */}
                <div className="flex flex-col items-end justify-center min-w-[90px]">
                  <span className="text-[10px] font-sans font-bold text-[#7B7B7B] uppercase tracking-wider flex items-center gap-0.5">
                    <RiStarFill size={10} className="text-[#F4A109]" /> Standing
                  </span>
                  <span className={`px-2 py-0.5 border rounded-md text-[10px] font-bold mt-0.5 leading-none ${performanceColor}`}>
                    {performanceLevel}
                  </span>
                </div>

                {/* Status tag */}
                <div className="min-w-[90px] flex justify-end">
                  <span className={`px-3 py-1.5 border rounded-lg text-[10px] font-bold uppercase tracking-wider ${statusClass}`}>
                    {student.status}
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
