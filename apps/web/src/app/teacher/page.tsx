"use client";

import { useState } from "react";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import {
  RiTeamLine,
  RiFileChartLine,
  RiCalendarEventLine,
  RiArrowRightUpLine,
  RiSettings4Line,
  RiFileListLine
} from "@remixicon/react";
import { mockTeacher, mockBatches, mockDPPs } from "../../lib/mock-data";

export default function TeacherDashboardPage() {
  const pendingDPPs = mockDPPs.filter(d => d.status === "pending" || d.status === "upcoming");
  const completedDPPs = mockDPPs.filter(d => d.status === "completed");

  return (
    <>
      <Navbar title={`Welcome back, ${mockTeacher.name}`} subtitle={`Here's the latest from your assigned batches at ${mockTeacher.instituteName}.`} breadcrumbs="Dashboard" />
      
      <main className="mx-auto w-full max-w-screen-2xl px-6 pb-10 md:px-8">
        {/* KPI Cards */}
        <div className="mb-8 grid gap-6 md:grid-cols-3">
          
          {/* KPI 1 */}
          <div className="group relative card flex flex-col p-5 overflow-hidden hover:border-transparent transition-all border border-s-stroke2 bg-b-surface1">
            <div className="box-hover" />
            <div className="relative z-10 flex items-center gap-3 mb-4">
              <div className="p-2 bg-b-surface2 rounded-xl text-t-secondary border border-s-stroke2">
                <RiTeamLine size={20} />
              </div>
              <h3 className="text-body-2 font-bold text-t-secondary">Total Students</h3>
            </div>
            <div className="relative z-10 text-h4 font-bold text-t-primary mb-2 tracking-tight">465</div>
            <p className="relative z-10 text-caption text-t-secondary">Across 3 active batches</p>
          </div>

          {/* KPI 2 */}
          <div className="group relative card flex flex-col p-5 overflow-hidden hover:border-transparent transition-all border border-s-stroke2 bg-b-surface1">
            <div className="box-hover" />
            <div className="relative z-10 flex items-center gap-3 mb-4">
              <div className="p-2 bg-b-surface2 rounded-xl text-t-secondary border border-s-stroke2">
                <RiFileChartLine size={20} />
              </div>
              <h3 className="text-body-2 font-bold text-t-secondary">Avg Batch Score</h3>
            </div>
            <div className="relative z-10 flex items-baseline gap-3">
              <div className="text-h4 font-bold text-t-primary mb-2 tracking-tight">67.4%</div>
              <span className="label label-green"><RiArrowRightUpLine size={12} className="mr-0.5" /> +2.1%</span>
            </div>
            <p className="relative z-10 text-caption text-t-secondary">Compared to last week</p>
          </div>

          {/* KPI 3 */}
          <div className="group relative card flex flex-col p-5 overflow-hidden hover:border-transparent transition-all border border-s-stroke2 bg-b-surface1">
            <div className="box-hover" />
            <div className="relative z-10 flex items-center gap-3 mb-4">
              <div className="p-2 bg-b-surface2 rounded-xl text-t-secondary border border-s-stroke2">
                <RiCalendarEventLine size={20} />
              </div>
              <h3 className="text-body-2 font-bold text-t-secondary">Upcoming Tests</h3>
            </div>
            <div className="relative z-10 text-h4 font-bold text-t-primary mb-2 tracking-tight">2</div>
            <p className="relative z-10 text-caption text-t-secondary">Scheduled for this week</p>
          </div>

        </div>

        {/* Main Content Grid — Batches (left) + AI Flags (right) */}
        <div className="mb-8 grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">

          {/* Batches Table Card */}
          <div className="group relative card flex min-w-0 flex-col overflow-hidden border border-s-stroke2 bg-b-surface1 p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-sub-title-1 font-bold text-t-primary">Your Active Batches</h2>
              <button className="btn btn-sm btn-outline">View All</button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-s-stroke2 text-caption font-bold text-t-secondary">
                    <th className="pb-3 pr-4">Batch Name</th>
                    <th className="pb-3 px-4">Exam</th>
                    <th className="pb-3 px-4">Students</th>
                    <th className="pb-3 px-4">Avg Score</th>
                    <th className="pb-3 pl-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {mockBatches.map(batch => (
                    <tr key={batch.id} className="border-b border-s-stroke2 last:border-b-0">
                      <td className="py-4 pr-4 text-body-2 font-bold text-t-primary">{batch.name}</td>
                      <td className="py-4 px-4 text-caption text-t-secondary">{batch.exam}</td>
                      <td className="py-4 px-4 text-caption font-bold text-t-primary">{batch.studentsCount}</td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <span className="text-caption font-bold text-t-primary">{batch.avgScore}%</span>
                          <div className="flex-1 h-1.5 bg-s-stroke2 rounded-full overflow-hidden min-w-[60px]">
                            <div
                              className="h-full rounded-full bg-linear-to-r from-primary-01 to-primary-02"
                              style={{ width: `${batch.avgScore}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="py-4 pl-4 text-right">
                        <Link href={`/teacher/batch/${batch.id}`} className="btn btn-sm btn-outline">
                          Analysis
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* AI Attention Flags Card */}
          <div className="card flex min-w-0 flex-col border border-s-stroke2 bg-b-surface1 p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-sub-title-1 font-bold text-t-primary">AI Attention Flags</h2>
              <button className="flex items-center justify-center size-8 rounded-full text-t-secondary hover:text-t-primary hover:bg-b-surface2 border-0 bg-transparent transition-colors cursor-pointer">
                <RiSettings4Line size={18} />
              </button>
            </div>

            <div className="flex flex-col gap-4 flex-1">
              {[
                { name: "Rohan Gupta", batch: "JEE 2026 Morning", issue: "Score dropped 30% since last week's Physics test. Recommending a 1-on-1 session." },
                { name: "Carnot Cycle Failure", batch: "Concept revision", issue: "73% of NEET 2026 Droppers failed Carnot Cycle efficiency problems. Needs revision class." },
                { name: "Sneha Reddy", batch: "NEET 2026 Droppers", issue: "Missed 3 consecutive batch tests." }
              ].map((flag, idx) => (
                <div key={idx} className="p-4 bg-b-surface2 border border-s-stroke2 rounded-2xl">
                  <h4 className="text-body-2 font-bold text-t-primary mb-1">{flag.name}</h4>
                  <div className="text-caption text-t-secondary font-semibold mb-2">{flag.batch}</div>
                  <p className="text-caption text-t-secondary leading-relaxed">{flag.issue}</p>
                </div>
              ))}
            </div>

            <button className="btn btn-outline w-full mt-6">
              View All Flags
            </button>
          </div>

        </div>

        {/* DPP Activity — full width row below the main grid */}
        <div className="group relative card flex flex-col border border-s-stroke2 bg-b-surface1 p-6">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-b-surface2 rounded-xl text-t-secondary border border-s-stroke2">
                <RiFileListLine size={20} />
              </div>
              <div>
                <h2 className="text-sub-title-1 font-bold text-t-primary">DPP Activity</h2>
                <p className="text-caption text-t-secondary mt-0.5">{pendingDPPs.length} active · {completedDPPs.length} completed across all batches</p>
              </div>
            </div>
            <Link href="/teacher/dpps" className="btn btn-sm btn-primary flex items-center gap-1.5">
              <RiFileListLine size={16} /> Manage DPPs
            </Link>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {mockDPPs.map(dpp => {
              const completion = Math.round((dpp.completedCount / dpp.totalStudents) * 100);
              const isComplete = dpp.status === "completed";
              const isUpcoming = dpp.status === "upcoming";
              return (
                <div
                  key={dpp.id}
                  className={`group relative flex min-h-[11rem] flex-col gap-3 overflow-hidden rounded-3xl border p-5 transition-all hover:border-transparent ${
                    isComplete
                      ? "border-[#00A656]/20 bg-[#00A656]/5"
                      : isUpcoming
                        ? "border-s-stroke2 bg-b-surface2"
                        : "border-[#EF9D0E]/20 bg-[#EF9D0E]/5"
                  }`}
                >
                  <div className="box-hover" />
                  
                  <div className="relative z-10 flex justify-between items-start">
                    <div className="mr-3 truncate font-bold text-body-2 text-t-primary">{dpp.title}</div>
                    <span className={`label ${isComplete ? "label-green" : isUpcoming ? "label-gray" : "label-yellow"} shrink-0`}>
                      {isComplete ? "Done" : isUpcoming ? "Upcoming" : "Active"}
                    </span>
                  </div>
                  
                  <div className="relative z-10 mb-2 text-caption text-t-secondary">
                    {dpp.batchName} · {dpp.subject} · Due {dpp.dueDate}
                  </div>
                  
                  <div className="relative z-10 flex justify-between items-center gap-3 mt-auto pt-2">
                    <div className="flex-1 h-1.5 bg-s-stroke2 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${isComplete ? "bg-[#00A656]" : "bg-linear-to-r from-primary-01 to-primary-02"}`}
                        style={{ width: `${completion}%` }}
                      />
                    </div>
                    <span className="text-caption font-bold text-t-primary shrink-0">{dpp.completedCount}/{dpp.totalStudents}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </main>
    </>
  );
}
