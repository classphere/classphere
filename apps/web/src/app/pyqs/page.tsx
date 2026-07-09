"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import { API_V1_URL } from "@/lib/api.client";
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

  // Fetch paper list from backend
  useEffect(() => {
    setLoading(true);
    fetch(`${API_BASE}/pyqs`)
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
  }, []);

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

      <main className="mx-auto w-full max-w-screen-2xl px-4 pb-10 pt-6 md:px-6 overflow-x-hidden">

        {/* Stats Row Wrapper */}
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 p-2 gap-4 w-full bg-b-surface1 dark:bg-b-surface1/60 border border-s-stroke2/40 dark:border-s-stroke2/40 rounded-lg mb-8 select-none">

          {/* Metric 1: Total Papers */}
          <div className="flex flex-col items-start p-6 gap-2 bg-b-surface2 dark:bg-b-surface2 border border-s-border dark:border-s-stroke2/30 rounded-lg shadow-[0px_0px_36px_-8px_rgba(0,0,0,0.05),0px_6px_4px_-4px_rgba(8,8,8,0.05),0px_5px_1.5px_-4px_rgba(8,8,8,0.09)]">
            <div className="flex flex-row items-center gap-3 w-full mb-1">
              <span className="text-t-primary dark:text-t-primary"><RiBarChartBoxLine size={20} /></span>
              <span className="font-sans font-semibold text-[16px] leading-[150%] tracking-[0.0015em] text-t-primary dark:text-t-primary">
                Total Papers
              </span>
            </div>
            <div className="flex flex-row items-center gap-4 w-full mt-1">
              <div className="font-sans text-4xl font-medium tracking-[-0.005em] text-t-primary dark:text-t-primary leading-none">
                {papers.length}
              </div>
              <div className="flex flex-col items-start gap-0.5">
                <div className="flex flex-row justify-center items-center px-1.5 py-0.5 gap-1 border border-s-stroke2/20 bg-transparent rounded-lg">
                  <span className="text-t-secondary text-[12px] font-semibold leading-none">Available</span>
                </div>
                <span className="text-[12px] font-sans text-t-secondary">
                  in database
                </span>
              </div>
            </div>
          </div>

          {/* Metric 2: Attempted */}
          <div className="flex flex-col items-start p-6 gap-2 bg-b-surface2 dark:bg-b-surface2 border border-s-border dark:border-s-stroke2/30 rounded-lg shadow-[0px_0px_36px_-8px_rgba(0,0,0,0.05),0px_6px_4px_-4px_rgba(8,8,8,0.05),0px_5px_1.5px_-4px_rgba(8,8,8,0.09)]">
            <div className="flex flex-row items-center gap-3 w-full mb-1">
              <span className="text-t-primary dark:text-t-primary"><RiCheckboxCircleLine size={20} /></span>
              <span className="font-sans font-semibold text-[16px] leading-[150%] tracking-[0.0015em] text-t-primary dark:text-t-primary">
                Attempted
              </span>
            </div>
            <div className="flex flex-row items-center gap-4 w-full mt-1">
              <div className="font-sans text-4xl font-medium tracking-[-0.005em] text-t-primary dark:text-t-primary leading-none">
                {attemptedCount}
              </div>
              <div className="flex flex-col items-start gap-0.5">
                <div className="flex flex-row justify-center items-center px-1.5 py-0.5 gap-1 border border-s-stroke2/20 bg-transparent rounded-lg">
                  <span className="text-t-secondary text-[12px] font-semibold leading-none">Done</span>
                </div>
                <span className="text-[12px] font-sans text-t-secondary">
                  completed
                </span>
              </div>
            </div>
          </div>

          {/* Metric 3: Saved */}
          <div className="flex flex-col items-start p-6 gap-2 bg-b-surface2 dark:bg-b-surface2 border border-s-border dark:border-s-stroke2/30 rounded-lg shadow-[0px_0px_36px_-8px_rgba(0,0,0,0.05),0px_6px_4px_-4px_rgba(8,8,8,0.05),0px_5px_1.5px_-4px_rgba(8,8,8,0.09)]">
            <div className="flex flex-row items-center gap-3 w-full mb-1">
              <span className="text-t-primary dark:text-t-primary"><RiBookmarkFill size={20} /></span>
              <span className="font-sans font-semibold text-[16px] leading-[150%] tracking-[0.0015em] text-t-primary dark:text-t-primary">
                Bookmarked
              </span>
            </div>
            <div className="flex flex-row items-center gap-4 w-full mt-1">
              <div className="font-sans text-4xl font-medium tracking-[-0.005em] text-t-primary dark:text-t-primary leading-none">
                {bookmarkedCount}
              </div>
              <div className="flex flex-col items-start gap-0.5">
                <div className="flex flex-row justify-center items-center px-1.5 py-0.5 gap-1 border border-s-stroke2/20 bg-transparent rounded-lg">
                  <span className="text-t-secondary text-[12px] font-semibold leading-none">Saved</span>
                </div>
                <span className="text-[12px] font-sans text-t-secondary">
                  for practice
                </span>
              </div>
            </div>
          </div>

        </div>

        {/* Filters Row */}
        <div className="flex flex-col lg:flex-row flex-wrap items-stretch lg:items-center gap-6 p-6 rounded-lg bg-b-surface2 dark:bg-b-surface2 shadow-[0px_5px_1.5px_-4px_rgba(8,8,8,0.09),0px_6px_4px_-4px_rgba(8,8,8,0.05)] border border-s-stroke2/40 select-none mb-8">

          {/* Search Box */}
          <div className="relative flex-1 min-w-[240px]">
            <RiSearchLine size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-t-secondary dark:text-t-secondary" />
            <input
              id="pyq-search"
              type="text"
              placeholder="Search by exam, year, shift…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-11 pl-11 pr-4 border border-s-stroke2 dark:border-s-stroke2 rounded-lg bg-transparent text-sm font-sans tracking-[0.0125em] text-t-primary dark:text-t-primary placeholder-t-secondary focus:border-t-secondary outline-none transition-all"
            />
          </div>

          <div className="flex flex-row flex-wrap items-center gap-6">
            <FilterGroup label="Exam" options={EXAMS} active={activeExam} onChange={setActiveExam} />
            <FilterGroup label="Year" options={YEARS} active={activeYear} onChange={setActiveYear} />
            <FilterGroup label="Difficulty" options={DIFFICULTIES} active={activeDiff} onChange={setActiveDiff} />

            {/* Saved Toggle Button */}
            <button
              id="pyq-bookmarks-toggle"
              onClick={() => setShowBookmarked((v) => !v)}
              className={`flex flex-row items-center gap-1.5 px-4.5 h-11 rounded-lg border text-sm font-sans font-semibold transition-all active:scale-95 cursor-pointer ${showBookmarked
                  ? "border-t-primary bg-shade-02 text-t-light dark:border-t-primary dark:bg-t-primary dark:text-b-surface1"
                  : "border-s-stroke2 dark:border-s-stroke2 bg-transparent text-t-secondary hover:border-t-secondary hover:text-t-primary"
                }`}
            >
              {showBookmarked ? <RiBookmarkFill size={15} /> : <RiBookmarkLine size={15} />}
              <span>Saved Only</span>
            </button>
          </div>

        </div>

        {/* Results Metadata Info */}
        <div className="flex justify-between items-center mb-6 px-1 select-none">
          <span className="text-xs font-sans text-t-secondary uppercase tracking-wider">
            Showing <strong className="text-t-primary dark:text-t-primary">{filtered.length}</strong> papers
          </span>
          <span className="text-xs font-sans text-t-secondary uppercase tracking-wider">
            +4/−1 marking · NTA pattern
          </span>
        </div>

        {/* Grid and States */}
        {loading ? (
          <div className="group relative card text-center py-20 text-t-secondary rounded-lg bg-b-surface2 dark:bg-b-surface2 shadow-[0px_5px_1.5px_-4px_rgba(8,8,8,0.09),0px_6px_4px_-4px_rgba(8,8,8,0.05)] border border-s-stroke2/40">
            <div className="box-hover" />
            <RiLoader4Line size={40} className="animate-spin mx-auto mb-4 text-t-secondary relative z-10" />
            <p className="font-semibold text-body-2 relative z-10">Loading papers from database…</p>
          </div>
        ) : error ? (
          <div className="group relative card text-center py-20 text-primary-03 rounded-lg bg-b-surface2 dark:bg-b-surface2 shadow-[0px_5px_1.5px_-4px_rgba(8,8,8,0.09),0px_6px_4px_-4px_rgba(8,8,8,0.05)] border border-s-stroke2/40">
            <div className="box-hover" />
            <div className="text-4xl mb-4 relative z-10">⚠️</div>
            <p className="font-semibold text-body-2 relative z-10">{error}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="group relative card text-center py-20 text-t-secondary rounded-lg bg-b-surface2 dark:bg-b-surface2 shadow-[0px_5px_1.5px_-4px_rgba(8,8,8,0.09),0px_6px_4px_-4px_rgba(8,8,8,0.05)] border border-s-stroke2/40">
            <div className="box-hover" />
            <div className="text-4xl mb-4 relative z-10">📋</div>
            <h3 className="font-semibold text-body-2 text-t-primary mb-1 relative z-10">No papers found</h3>
            <p className="text-caption text-t-secondary relative z-10">Try adjusting your filters or search term.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
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

      </main>
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
      <span className="text-xs font-sans font-semibold uppercase tracking-wider text-t-secondary mr-1">{label}:</span>
      <div className="flex flex-row items-center gap-1.5">
        {options.map((opt) => (
          <button
            key={opt}
            onClick={() => onChange(opt)}
            className={`px-3.5 h-8 rounded-lg border text-[11px] font-sans font-semibold transition-all active:scale-95 cursor-pointer uppercase tracking-wider ${active === opt
                ? "border-t-primary bg-shade-02 text-t-light dark:border-t-primary dark:bg-t-primary dark:text-b-surface1"
                : "border-s-stroke2 dark:border-s-stroke2 bg-transparent text-t-secondary hover:border-t-secondary hover:text-t-primary"
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
    <div
      className="flex min-h-[14rem] flex-col justify-between p-6 bg-b-surface2 dark:bg-b-surface2 border border-s-border dark:border-s-stroke2/30 rounded-lg shadow-[0px_0px_36px_-8px_rgba(0,0,0,0.05),0px_6px_4px_-4px_rgba(8,8,8,0.05),0px_5px_1.5px_-4px_rgba(8,8,8,0.09)] select-none hover:-translate-y-0.5 hover:shadow-[0px_10px_20px_-8px_rgba(0,0,0,0.08)] transition-all duration-200"
    >
      <div>
        {/* Header Subject/Exam Row */}
        <div className="flex justify-between items-start mb-3">
          <div className="min-w-0 flex-1">
            <div className="truncate font-sans font-semibold text-[16px] leading-[150%] tracking-[0.0015em] text-t-primary dark:text-t-primary">
              {paper.exam}
            </div>
            <div className="text-[12px] font-sans text-t-secondary mt-0.5">
              {paper.year} · {paper.shift}
            </div>
          </div>
          <button
            id={`bookmark-${paper.id}`}
            onClick={(e) => onBookmark(paper.id, e)}
            className={`transition-colors cursor-pointer p-1 -mr-1 ${isBookmarked ? "text-primary-03" : "text-t-secondary hover:text-primary-03"
              }`}
            title={isBookmarked ? "Remove bookmark" : "Bookmark"}
          >
            {isBookmarked ? <RiBookmarkFill size={18} /> : <RiBookmarkLine size={18} />}
          </button>
        </div>

        {/* Subjects list as simple gray badges */}
        <div className="flex flex-wrap gap-1.5 mt-3">
          {paper.subjects.map((s) => (
            <span
              key={s}
              className="text-[10px] font-sans font-semibold px-2 py-0.5 border border-s-stroke2/20 bg-b-surface1 dark:bg-b-surface1/60 text-t-secondary rounded-lg uppercase tracking-wider"
            >
              {s}
            </span>
          ))}
        </div>

        {/* Meta specs row */}
        <div className="flex flex-row flex-wrap items-center gap-4 mt-5 text-[12px] font-sans text-t-secondary">
          <span className="flex items-center gap-1.5">
            <RiQuestionLine size={14} />
            <span>{paper.questions} Questions</span>
          </span>
          <span className="flex items-center gap-1.5">
            <RiTimeLine size={14} />
            <span>{paper.duration} Min</span>
          </span>
          <span className="flex items-center gap-1.5">
            <RiBarChartBoxLine size={14} />
            <span>{paper.marks} Marks</span>
          </span>
        </div>
      </div>

      {/* Footer row with simple difficulty badge and action button */}
      <div className="flex justify-between items-center mt-5 pt-4 border-t border-s-stroke2/30">
        <span className="px-2 py-0.5 rounded-lg border border-s-stroke2/20 bg-transparent text-t-secondary text-[10px] font-semibold uppercase tracking-wider">
          {paper.difficulty}
        </span>
        <button
          onClick={onStart}
          className="flex flex-row justify-center items-center h-8 px-4 bg-shade-02 hover:bg-shade-04 text-t-light dark:bg-t-primary dark:text-b-surface1 dark:hover:bg-t-primary/90 text-[12px] font-sans font-semibold rounded-lg transition-all active:scale-95 shadow-widget cursor-pointer"
        >
          Start Paper
        </button>
      </div>
    </div>
  );
}
