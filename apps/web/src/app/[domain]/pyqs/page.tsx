"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import { API_V1_URL } from "@/lib/api.client";
import {
  PageWrapper,
  SectionCard,
  MetricGrid,
  MetricCard,
  EmptyState,
  SecondaryButton,
} from "@/components/ui";

import {
  RiSearchLine,
  RiBookmarkLine,
  RiBookmarkFill,
  RiTimeLine,
  RiQuestionLine,
  RiBarChartBoxLine,
  RiLoader4Line,
  RiCheckboxCircleLine,
} from "@remixicon/react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface PYQPaper {
  id: string;
  exam: string;
  year: number;
  shift: string;
  subjects: string[];
  questions: number;
  marks: number;
  duration: number;
  difficulty: "easy" | "medium" | "hard";
}

// ─── Constants ────────────────────────────────────────────────────────────────

const API_BASE = API_V1_URL;

const EXAMS = ["All", "JEE Main", "JEE Advanced", "NEET-UG"];
const YEARS = ["All", "2024", "2023", "2022", "2021", "2020"];
const DIFFICULTIES = ["All", "easy", "medium", "hard"];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PYQsPage() {
  const router = useRouter();

  const [papers, setPapers] = useState<PYQPaper[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [activeExam, setActiveExam] = useState("All");
  const [activeYear, setActiveYear] = useState("All");
  const [activeDiff, setActiveDiff] = useState("All");
  const [bookmarks, setBookmarks] = useState<Set<string>>(new Set());
  const [showBookmarked, setShowBookmarked] = useState(false);
  // Past-year *questions* are chapter practice; a past-year *paper* is sat end
  // to end against a clock. One listing showed only the first.
  const [kind, setKind] = useState<"questions" | "paper">("questions");

  // Fetch paper list from backend
  useEffect(() => {
    setLoading(true);
    fetch(`${API_BASE}/pyqs${kind === "paper" ? "?kind=paper" : ""}`)
      .then((r) => {
        if (!r.ok) throw new Error("API error");
        const contentType = r.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) throw new Error("Invalid response format");
        return r.json();
      })
      .then((res) => {
        if (res.success) {
          setPapers(res.data.papers);
        } else {
          setError("Failed to load papers.");
        }
      })
      .catch(() => setError("Cannot connect to backend. Make sure the API is running on port 3001."))
      .finally(() => setLoading(false));
  }, [kind]);

  const toggleBookmark = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setBookmarks((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const filtered = useMemo(() => {
    return papers.filter((p) => {
      if (activeExam !== "All" && p.exam !== activeExam) return false;
      if (activeYear !== "All" && String(p.year) !== activeYear) return false;
      if (activeDiff !== "All" && p.difficulty !== activeDiff) return false;
      if (showBookmarked && !bookmarks.has(p.id)) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          p.exam.toLowerCase().includes(q) ||
          String(p.year).includes(q) ||
          p.shift.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [papers, activeExam, activeYear, activeDiff, showBookmarked, search, bookmarks]);

  const bookmarkedCount = bookmarks.size;
  const attemptedCount = 0; // will come from user attempt history later

  return (
    <>
      <Navbar
        title="Previous Year Papers"
        subtitle="Practice with real exam papers. Attempt full papers or pick a specific year."
        breadcrumbs="Dashboard > PYQs"
      />

      <PageWrapper>

        {/* Two different things under one name. Past-year questions are filed by
            chapter and practised untimed; a past-year paper is the real thing,
            sat end to end against the clock it was written for. */}
        <div className="mb-4 flex items-center gap-1 rounded-[10px] border border-s-stroke2/50 bg-b-surface2 p-1 w-fit">
          {[
            { value: "questions" as const, label: "By chapter" },
            { value: "paper" as const, label: "Full papers" },
          ].map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setKind(tab.value)}
              className={`rounded-[8px] px-4 py-2 text-[13px] font-semibold transition ${
                kind === tab.value ? "bg-b-surface1 text-t-primary shadow-xs" : "text-t-secondary hover:text-t-primary"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Stats Row Wrapper */}
        <MetricGrid cols={3}>
          <MetricCard
            icon={<RiBarChartBoxLine size={18} />}
            label="Total Papers"
            value={papers.length}
            badge="Available"
            badgeLabel="in database"
          />
          <MetricCard
            icon={<RiCheckboxCircleLine size={18} />}
            label="Attempted"
            value={attemptedCount}
            badge="Done"
            badgeLabel="completed"
          />
          <MetricCard
            icon={<RiBookmarkFill size={18} />}
            label="Bookmarked"
            value={bookmarkedCount}
            badge="Saved"
            badgeLabel="for practice"
          />
        </MetricGrid>

        {/* Filters Row */}
        <div className="flex flex-col lg:flex-row flex-wrap items-stretch lg:items-center gap-3 p-6 md:p-8 rounded-[24px] bg-b-surface2 dark:bg-[#1C1C1C] border border-black/5 dark:border-white/5 select-none mb-3 shadow-depth">

          {/* Search Box */}
          <div className="relative flex-1 min-w-[240px]">
            <RiSearchLine size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-t-secondary" />
            <input
              id="pyq-search"
              type="text"
              placeholder="Search by exam, year, shift…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-11 pl-11 pr-4 border border-black/5 dark:border-white/5 rounded-[10px] bg-b-surface1 dark:bg-b-surface1/40 text-[13px] font-sans font-medium text-t-primary placeholder-t-secondary focus:border-t-secondary outline-none transition-all"
            />
          </div>

          <div className="flex flex-row flex-wrap items-center gap-3">
            <FilterGroup label="Exam" options={EXAMS} active={activeExam} onChange={setActiveExam} />
            <FilterGroup label="Year" options={YEARS} active={activeYear} onChange={setActiveYear} />
            <FilterGroup label="Difficulty" options={DIFFICULTIES} active={activeDiff} onChange={setActiveDiff} />

            {/* Saved Toggle Button */}
            <SecondaryButton
              id="pyq-bookmarks-toggle"
              onClick={() => setShowBookmarked((v) => !v)}
              className={showBookmarked ? "!bg-[#161616] !text-white !shadow-none" : ""}
            >
              {showBookmarked ? <RiBookmarkFill size={15} /> : <RiBookmarkLine size={15} />}
              <span>Saved Only</span>
            </SecondaryButton>
          </div>
        </div>

        {/* Results Metadata Info */}
        <div className="flex justify-between items-center mb-3 px-2 select-none border-b border-[#ebebeb] dark:border-[#282828] pb-4">
          <span className="text-[12px] font-sans text-t-secondary font-semibold uppercase tracking-wider">
            Showing <strong className="text-t-primary">{filtered.length}</strong> papers
          </span>
          <span className="text-[12px] font-sans text-t-secondary font-semibold uppercase tracking-wider">
            +4/−1 marking · NTA pattern
          </span>
        </div>

        {/* Grid and States */}
        {loading ? (
          <SectionCard padding="none">
            <EmptyState
              icon={<RiLoader4Line size={40} className="animate-spin" />}
              title="Loading papers from database…"
            />
          </SectionCard>
        ) : error ? (
          <SectionCard padding="none">
            <EmptyState
              icon={<div className="text-4xl mb-2">⚠️</div>}
              title={error}
            />
          </SectionCard>
        ) : filtered.length === 0 ? (
          <SectionCard padding="none">
            <EmptyState
              icon={<div className="text-4xl mb-2">📋</div>}
              title="No papers found"
              description="Try adjusting your filters or search term."
            />
          </SectionCard>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map((paper) => (
              <PaperCard
                key={paper.id}
                paper={paper}
                isBookmarked={bookmarks.has(paper.id)}
                onBookmark={toggleBookmark}
                onStart={() => router.push(`/test/pyq-${paper.id}`)}
              />
            ))}
          </div>
        )}

      </PageWrapper>
    </>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

function FilterGroup({
  label, options, active, onChange,
}: {
  label: string; options: string[]; active: string; onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-row items-center gap-2 select-none">
      <span className="text-[11px] font-sans font-bold uppercase tracking-widest text-t-secondary mr-1">{label}:</span>
      <div className="flex flex-row items-center gap-1.5">
        {options.map((opt) => (
          <button
            key={opt}
            onClick={() => onChange(opt)}
            className={`px-3.5 h-[34px] rounded-[10px] text-[11px] font-sans font-bold transition-all cursor-pointer uppercase tracking-wider ${
              active === opt
                ? "bg-[#161616] text-white shadow-widget"
                : "bg-transparent text-t-secondary border border-transparent hover:border-[#ebebeb] dark:hover:border-[#282828] hover:text-t-primary"
            }`}
          >
            {opt === "All" ? "All" : opt}
          </button>
        ))}
      </div>
    </div>
  );
}

function PaperCard({
  paper, isBookmarked, onBookmark, onStart,
}: {
  paper: PYQPaper;
  isBookmarked: boolean;
  onBookmark: (id: string, e: React.MouseEvent) => void;
  onStart: () => void;
}) {
  return (
    <div className="flex min-h-[14rem] flex-col justify-between p-6 bg-b-surface2 dark:bg-[#1C1C1C] border border-black/5 dark:border-white/5 rounded-[14px] hover:-translate-y-0.5 hover:shadow-depth transition-all duration-200 select-none cursor-default">
      <div>
        {/* Header Subject/Exam Row */}
        <div className="flex justify-between items-start mb-4">
          <div className="min-w-0 flex-1">
            <div className="truncate font-sans font-semibold text-[17px] leading-snug tracking-[-0.02em] text-t-primary">
              {paper.exam}
            </div>
            <div className="text-[13px] font-sans font-medium text-t-secondary mt-0.5">
              {paper.year} · {paper.shift}
            </div>
          </div>
          <button
            id={`bookmark-${paper.id}`}
            onClick={(e) => onBookmark(paper.id, e)}
            className={`transition-colors cursor-pointer p-1.5 -mr-1.5 rounded-full ${isBookmarked ? "text-primary-03 bg-primary-03/10" : "text-t-secondary hover:text-primary-03 hover:bg-primary-03/10"}`}
            title={isBookmarked ? "Remove bookmark" : "Bookmark"}
          >
            {isBookmarked ? <RiBookmarkFill size={18} /> : <RiBookmarkLine size={18} />}
          </button>
        </div>

        {/* Subjects list as simple gray badges */}
        <div className="flex flex-wrap gap-1.5 mt-3">
          {paper.subjects?.map((s) => (
            <span
              key={s}
              className="text-[10px] font-sans font-bold px-2 py-0.5 border border-black/5 dark:border-white/5 bg-b-surface1 dark:bg-b-surface1/40 text-t-secondary rounded-[6px] uppercase tracking-wider"
            >
              {s}
            </span>
          ))}
        </div>

        {/* Meta specs row */}
        <div className="flex flex-row flex-wrap items-center gap-4 mt-3 text-[12px] font-sans font-semibold text-t-secondary">
          <span className="flex items-center gap-1.5">
            <RiQuestionLine size={16} />
            <span>{paper.questions} Questions</span>
          </span>
          <span className="flex items-center gap-1.5">
            <RiTimeLine size={16} />
            <span>{paper.duration} Min</span>
          </span>
          <span className="flex items-center gap-1.5">
            <RiBarChartBoxLine size={16} />
            <span>{paper.marks} Marks</span>
          </span>
        </div>
      </div>

      {/* Footer row with simple difficulty badge and action button */}
      <div className="flex justify-between items-center mt-3 pt-4 border-t border-[#ebebeb] dark:border-[#282828]">
        <span className="px-2.5 py-1 rounded-[6px] border border-black/5 dark:border-white/5 bg-b-surface1 dark:bg-b-surface1/40 text-t-secondary text-[10px] font-bold uppercase tracking-wider">
          {paper.difficulty}
        </span>
        <button
          onClick={onStart}
          className="relative flex flex-row justify-center items-center h-[38px] px-5 overflow-hidden rounded-[10px] bg-[#161616] text-white text-[13px] font-sans font-semibold shadow-[0px_6.8656px_6.8656px_-2.33333px_rgba(0,0,0,0.16),inset_0px_1px_0px_rgba(255,255,255,0.16),inset_0px_-2px_0px_#191919] transition-transform hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
        >
          <i className="absolute -left-3 top-0 h-3 w-20 -rotate-[125deg] rounded-full bg-white/10 blur-[3px]" />
          <span className="relative">Start Paper</span>
        </button>
      </div>
    </div>
  );
}
