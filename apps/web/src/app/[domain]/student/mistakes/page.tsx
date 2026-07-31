"use client";

import { useState, useEffect } from "react";
import Navbar from "@/components/layout/Navbar";
import { useAuth } from "@/lib/auth-context";
import { apiClient } from "@/lib/api.client";
import {
  PageWrapper,
  SectionCard,
  EmptyState,
  TabBar,
  SecondaryButton,
} from "@/components/ui";

import {
  RiCheckLine,
  RiAlertFill,
  RiLightbulbFlashLine,
  RiArrowDownSLine,
  RiLoader4Line,
} from "@remixicon/react";

type Mistake = {
  topic: string;
  count: number;
  errorType: string;
  subject: string;
  chapter: string;
  lastSeen: string | null;
  resolved: boolean;
  tip: string | null;
};

const SUBJECT_OPTIONS = ["All", "Physics", "Chemistry", "Mathematics", "Biology", "Botany", "Zoology"];

const ERROR_TYPE_LABELS: Record<string, string> = {
  sign_error: "Sign Error",
  calculation: "Calculation Error",
  partial_solve: "Partial Solve",
  unit_error: "Unit Error",
  conceptual: "Conceptual Gap",
  common_mistake: "Common Mistake",
  unknown: "Wrong Answer",
};

type TabID = "unresolved" | "resolved";

export default function MistakeDiary() {
  const { session } = useAuth();
  const [mistakes, setMistakes] = useState<Mistake[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabID>("unresolved");
  const [filterSubject, setFilterSubject] = useState<string>("All");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  useEffect(() => {
    if (!session?.access_token) return;

    const fetchMistakes = async () => {
      setLoading(true);
      try {
        const res = await apiClient.get("/api/v1/dashboard/student/mistakes", session.access_token);
        if (res.success) {
          setMistakes(res.data.mistakes ?? []);
        }
      } catch (e) {
        console.error("[MistakeDiary] fetch error", e);
      } finally {
        setLoading(false);
      }
    };

    fetchMistakes();
  }, [session?.access_token]);

  const toggleResolved = async (topic: string) => {
    if (!session?.access_token) return;
    setResolving(topic);
    try {
      const res = await apiClient.patch(
        `/api/v1/dashboard/student/mistakes/${encodeURIComponent(topic)}/resolve`,
        {},
        session.access_token
      );
      if (res.success) {
        setMistakes((prev) =>
          prev.map((m) => (m.topic === topic ? { ...m, resolved: res.data.resolved } : m))
        );
      }
    } catch (e) {
      console.error("[MistakeDiary] resolve error", e);
    } finally {
      setResolving(null);
    }
  };

  const filteredMistakes = mistakes.filter((m) => {
    if (activeTab === "unresolved" && m.resolved) return false;
    if (activeTab === "resolved" && !m.resolved) return false;
    if (filterSubject !== "All" && m.subject !== filterSubject) return false;
    return true;
  });

  const tabs = [
    { id: "unresolved" as const, label: `Needs Review (${mistakes.filter((m) => !m.resolved).length})` },
    { id: "resolved" as const, label: `Resolved (${mistakes.filter((m) => m.resolved).length})` },
  ];

  return (
    <>
      <Navbar title="Mistake Diary" subtitle="Review your past errors so you never make them again." breadcrumbs="Dashboard > Mistake Diary" />

      <PageWrapper>
        {/* Filters Row */}
        <div className="flex flex-col md:flex-row flex-wrap items-stretch md:items-center justify-between gap-4 mb-4 select-none">
          <TabBar tabs={tabs} active={activeTab} onChange={setActiveTab} />

          {/* Subject Filter Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-2 h-10 px-4 rounded-[10px] border border-s-stroke2 bg-b-surface2 text-[13px] font-sans font-semibold text-t-primary hover:bg-b-surface1 transition-colors"
            >
              {filterSubject}
              <RiArrowDownSLine size={16} className="text-t-secondary" />
            </button>
            {isDropdownOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsDropdownOpen(false)} />
                <ul className="absolute right-0 top-12 z-50 w-44 rounded-[12px] border border-black/5 dark:border-white/5 bg-b-surface1 p-1 shadow-depth">
                  {SUBJECT_OPTIONS.map((subj) => (
                    <li key={subj}>
                      <button
                        onClick={() => { setFilterSubject(subj); setIsDropdownOpen(false); }}
                        className={`w-full text-left px-3 py-2 rounded-[8px] text-[13px] font-sans font-semibold transition-colors ${
                          filterSubject === subj
                            ? "bg-black/5 dark:bg-white/5 text-t-primary"
                            : "text-t-secondary hover:text-t-primary hover:bg-black/5 dark:hover:bg-white/5"
                        }`}
                      >
                        {subj}
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <SectionCard padding="none">
            <div className="flex items-center justify-center gap-3 py-10 text-t-secondary">
              <RiLoader4Line size={22} className="animate-spin text-primary-01" />
              <span className="font-sans font-semibold text-[14px]">Loading your mistake diary...</span>
            </div>
          </SectionCard>
        ) : filteredMistakes.length === 0 ? (
          <SectionCard padding="none">
            <EmptyState
              icon={<RiCheckLine size={48} />}
              title={activeTab === "resolved" ? "No resolved mistakes yet" : "No mistakes found"}
              description={
                activeTab === "resolved"
                  ? "Mark mistakes as resolved once you've mastered the concept."
                  : "Complete a test first — your errors will be automatically tracked and analysed here."
              }
            />
          </SectionCard>
        ) : (
          <div className="flex flex-col gap-4">
            {filteredMistakes.map((m) => (
              <div
                key={m.topic}
                className="group relative card p-5 md:p-6 hover:-translate-y-0.5 hover:shadow-depth transition-all duration-200 select-none"
              >
                <div className="flex flex-col md:flex-row md:items-start gap-4">
                  {/* Left: Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      {m.subject && (
                        <span className="text-[10px] font-sans font-bold px-2 py-0.5 border border-black/5 dark:border-white/5 bg-b-surface1 text-t-secondary rounded-[6px] uppercase tracking-wider">
                          {m.subject}
                        </span>
                      )}
                      {m.chapter && (
                        <span className="text-[10px] font-sans font-bold px-2 py-0.5 border border-black/5 dark:border-white/5 bg-b-surface1 text-t-secondary rounded-[6px] uppercase tracking-wider">
                          {m.chapter}
                        </span>
                      )}
                      <span className="text-[10px] font-sans font-bold px-2 py-0.5 border border-primary-03/20 bg-primary-03/10 text-primary-03 rounded-[6px] uppercase tracking-wider">
                        {ERROR_TYPE_LABELS[m.errorType] ?? m.errorType}
                      </span>
                      {m.count > 1 && (
                        <span className="text-[10px] font-sans font-semibold text-t-secondary">
                          ×{m.count} occurrences
                        </span>
                      )}
                    </div>

                    <h3 className="font-sans font-semibold text-[16px] tracking-[-0.01em] text-t-primary leading-snug">
                      {m.topic}
                    </h3>

                    {m.lastSeen && (
                      <p className="text-[12px] font-sans text-t-secondary mt-1">
                        Last seen: {new Date(m.lastSeen).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      </p>
                    )}

                    {m.tip && (
                      <div className="mt-4 flex gap-2 p-3 rounded-[10px] border border-primary-05/20 bg-primary-05/5">
                        <RiLightbulbFlashLine size={16} className="text-primary-05 shrink-0 mt-0.5" />
                        <p className="text-[13px] font-sans text-t-secondary leading-relaxed">{m.tip}</p>
                      </div>
                    )}
                  </div>

                  {/* Right: Action */}
                  <div className="shrink-0">
                    <button
                      onClick={() => toggleResolved(m.topic)}
                      disabled={resolving === m.topic}
                      className={`flex items-center gap-2 px-4 py-2 rounded-[10px] text-[13px] font-sans font-semibold transition-colors border cursor-pointer ${
                        m.resolved
                          ? "border-primary-02/20 bg-primary-02/10 text-primary-02 hover:bg-primary-02/20"
                          : "border-s-stroke2 bg-b-surface1 text-t-secondary hover:text-t-primary hover:bg-b-surface2"
                      }`}
                    >
                      {resolving === m.topic ? (
                        <RiLoader4Line size={14} className="animate-spin" />
                      ) : (
                        <RiCheckLine size={14} />
                      )}
                      {m.resolved ? "Resolved" : "Mark Resolved"}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </PageWrapper>
    </>
  );
}
