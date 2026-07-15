"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import {
  RiAddLine,
  RiFileListLine,
  RiTeamLine,
  RiCalendarLine,
  RiCheckLine,
  RiTimeLine,
  RiCloseLine,
  RiBookOpenLine,
  RiCheckboxCircleFill,
  RiAlertFill,
  RiFileList3Line,
  RiCalendarEventLine
} from "@remixicon/react";
import { PremiumMetricCard as MetricCard, PremiumMetricGrid as MetricGrid, PremiumSectionCard as SectionCard } from "@/components/premium-ui";
import { useAuth } from "@/lib/auth-context";
import { apiClient } from "@/lib/api.client";
type MockDPP = any;

const SUBJECTS = ["Physics", "Chemistry", "Mathematics", "Biology"];
const CHAPTERS: Record<string, string[]> = {
  Physics: ["Laws of Motion", "Thermodynamics", "Electrostatics", "Optics", "Modern Physics", "Waves"],
  Chemistry: ["Some Basic Concepts", "Atomic Structure", "Chemical Bonding", "Equilibrium", "Organic Chemistry"],
  Mathematics: ["Calculus", "Algebra", "Coordinate Geometry", "Trigonometry", "Probability"],
  Biology: ["Cell Biology", "Genetics", "Ecology", "Human Physiology", "Plant Physiology"],
};

const statusMeta: Record<string, { label: string; badgeClass: string; icon: React.ReactNode; iconContainerClass: string }> = {
  completed: { 
    label: "Completed", 
    badgeClass: "label-green", 
    icon: <RiCheckboxCircleFill size={20} />, 
    iconContainerClass: "bg-primary-02/10 border border-primary-02/20 text-primary-02" 
  },
  upcoming:  { 
    label: "Upcoming",  
    badgeClass: "label-gray",  
    icon: <RiCalendarEventLine size={20} />, 
    iconContainerClass: "bg-[rgba(123,123,123,0.1)] border border-s-stroke2/40 text-t-secondary" 
  },
  late:      { 
    label: "Late",      
    badgeClass: "label-red",   
    icon: <RiAlertFill size={20} />, 
    iconContainerClass: "bg-primary-03/10 border border-primary-03/20 text-primary-03" 
  },
  pending:   { 
    label: "Active",    
    badgeClass: "label-yellow", 
    icon: <RiFileList3Line size={20} />, 
    iconContainerClass: "bg-primary-05/10 border border-primary-05/20 text-primary-05" 
  },
};

type FilterStatus = "all" | "pending" | "completed" | "upcoming";

export default function TeacherDPPsPage() {
  const { session } = useAuth();
  const [dpps, setDpps] = useState<MockDPP[]>([]);
  const [loadingDPPs, setLoadingDPPs] = useState(true);
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // ── Fetch real DPPs and batches ──────────────────────────────────────────────
  useEffect(() => {
    if (!session?.access_token) return;
    const load = async () => {
      setLoadingDPPs(true);
      try {
        const [dppsRes] = await Promise.all([
          apiClient.get("/api/v1/dpps/teacher", session.access_token),
        ]);
        if (dppsRes.success) setDpps(dppsRes.data.dpps ?? []);
      } catch (e) { console.error("[TeacherDPPs]", e); }
      finally { setLoadingDPPs(false); }
    };
    load();
  }, [session?.access_token]);

  const filtered = dpps.filter(d => {
    const matchesStatus = filter === "all" ? true : d.status === filter;
    const matchesSearch = d.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          d.chapter.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          d.subject.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  // Stats
  const total     = dpps.length;
  const active    = dpps.filter(d => d.status === "pending").length;
  const completed = dpps.filter(d => d.status === "completed").length;
  const avgCompletion = dpps.length
    ? Math.round(dpps.reduce((s, d) => s + (d.submittedCount / (d.totalAssigned || 1)) * 100, 0) / dpps.length)
    : 0;

  return (
    <>
      <Navbar
        title="DPP Management"
        subtitle="Create and track Daily Practice Problems across all your batches."
        breadcrumbs="Dashboard > DPPs"
      />
      
      <main className="mx-auto w-full max-w-screen-2xl px-6 pb-10 md:px-8">
        {/* KPI Row */}
        <MetricGrid cols={4}>
          {[
            { label: "Total DPPs",  value: total,         icon: <RiFileListLine size={20} />, statusClass: "text-t-primary dark:text-t-primary", bgClass: "bg-b-surface2 border border-s-stroke2 text-t-primary" },
            { label: "Active",      value: active,        icon: <RiFileList3Line size={20} />,     statusClass: "text-primary-05", bgClass: "bg-primary-05/10 border border-primary-05/20 text-primary-05" },
            { label: "Completed",   value: completed,     icon: <RiCheckboxCircleFill size={20} />,    statusClass: "text-primary-02", bgClass: "bg-primary-02/10 border border-primary-02/20 text-primary-02" },
            { label: "Avg Completion", value: `${avgCompletion}%`, icon: <RiTeamLine size={20} />, statusClass: "text-primary-01", bgClass: "bg-primary-01/10 border border-primary-01/20 text-primary-01" },
          ].map((s, idx) => (
            <MetricCard
              key={idx}
              icon={s.icon}
              label={s.label}
              value={<span className={s.statusClass}>{s.value}</span>}
            />
          ))}
        </MetricGrid>

        {/* Toolbar */}
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          {/* Filter tabs */}
          <div className="flex max-w-full gap-1 overflow-x-auto rounded-[10px] border border-s-stroke2 bg-b-surface2 p-1">
            {(["all", "pending", "completed", "upcoming"] as FilterStatus[]).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`shrink-0 rounded-[10px] border-none px-4 py-1.5 text-caption font-semibold capitalize transition-all cursor-pointer ${
                  filter === f
                    ? "bg-b-surface1 text-t-primary shadow-widget"
                    : "bg-transparent text-t-secondary hover:text-t-primary"
                }`}
              >
                {f === "all" ? `All (${total})` : f === "pending" ? `Active (${active})` : f === "completed" ? `Done (${completed})` : "Upcoming"}
              </button>
            ))}
          </div>

          {/* Search & Create Section */}
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
            {/* Search Input (Figma Spec: rounded 90px pill) */}
            <div className="relative w-full sm:w-[315px] h-12 flex items-center bg-b-surface2 dark:bg-b-surface2 border border-s-stroke2 dark:border-s-stroke2/30 rounded-[10px] px-4">
              <input
                type="text"
                placeholder="Search DPPs..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full h-full bg-transparent border-none text-[14px] font-sans font-normal text-t-primary dark:text-t-primary placeholder-t-secondary focus:outline-none"
              />
            </div>

            {/* Create DPP Button (Figma Spec: gradient background, rounded 32px pill, inset shadow) */}
            <Link 
              href="/teacher/dpps/create"
              className="flex flex-row justify-center items-center h-12 px-6 bg-gradient-to-b from-[#2C2C2C] to-[#282828] hover:from-[#3c3c3c] hover:to-[#383838] text-t-light dark:from-t-primary dark:to-t-primary/90 dark:text-b-surface1 text-[14px] font-sans font-semibold rounded-[10px] transition-all active:scale-95 shadow-[inset_2px_0px_8px_2px_rgba(248,248,248,0.2)] cursor-pointer no-underline"
            >
              <RiAddLine size={18} className="mr-1" /> Create DPP
            </Link>
          </div>
        </div>

        {/* DPP List */}
        <div className="relative z-10 flex flex-col gap-6 w-full mb-8">
          {filtered.length === 0 && (
            <div className="bg-b-surface2 dark:bg-[#161616] border border-s-stroke2/40 rounded-[16px] text-center py-20 text-t-secondary">
              <RiFileListLine size={48} className="mx-auto mb-4 text-t-secondary/50" />
              <p className="font-semibold text-body-2">No DPPs in this category yet.</p>
            </div>
          )}
          
          {filtered.map(dpp => {
            const meta = statusMeta[dpp.status];
            const pct = Math.round((dpp.submittedCount / (dpp.totalAssigned || 1)) * 100);
            return (
              <div 
                key={dpp.id} 
                onClick={() => window.location.href = `/teacher/dpps/${dpp.id}`}
                className="group relative flex flex-col md:flex-row min-w-0 md:items-center justify-between gap-5 overflow-hidden bg-white dark:bg-white/[0.02] border border-s-stroke2/40 p-[22px] rounded-[24px] transition-all hover:scale-[1.005] cursor-pointer"
              >

                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className={`relative z-10 size-11 rounded-[10px] flex items-center justify-center shrink-0 ${meta.iconContainerClass}`}>
                    {meta.icon}
                  </div>

                  <div className="relative z-10 flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-body-2 font-bold text-t-primary dark:text-t-primary truncate">{dpp.title}</span>
                      <span className={`label ${meta.badgeClass}`}>{meta.label}</span>
                    </div>
                    <div className="flex items-center gap-2 text-caption text-t-secondary flex-wrap mt-1">
                      <span className="flex items-center gap-1">
                        <RiBookOpenLine size={14} className="text-t-secondary shrink-0" />
                        <span>{dpp.subject} · {dpp.chapter}</span>
                      </span>
                      <span>·</span>
                      <span>{dpp.totalQuestions} questions</span>
                      <span>·</span>
                      <span>{dpp.batchName}</span>
                      <span>·</span>
                      <span>Due: {dpp.dueDate}</span>
                    </div>
                  </div>
                </div>

                <div className="relative z-10 flex items-center justify-between md:justify-end gap-6 shrink-0 mt-4 md:mt-0">
                  <div className="text-left md:text-right sm:w-40">
                    <div className="text-caption font-bold text-t-primary dark:text-t-primary mb-2">
                      {dpp.submittedCount}/{dpp.totalAssigned} submitted
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-1.5 bg-s-stroke2 rounded-full overflow-hidden min-w-[80px]">
                        <div
                          className={`h-full rounded-full ${dpp.status === "completed" ? "bg-primary-02" : "bg-gradient-to-r from-[#EF9D0E] to-[#F1C40F]"}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-caption font-semibold text-t-secondary">{pct}%</span>
                    </div>
                  </div>

                  <button className="btn btn-sm btn-dark">
                    {dpp.status === "completed" ? "Reports" : dpp.status === "upcoming" ? "Edit" : "Stats"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </>
  );
}
