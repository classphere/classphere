"use client";

import { useState, useMemo, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import {
  RiSearchLine,
  RiTimeLine,
  RiQuestionLine,
  RiBarChartBoxLine,
  RiLoader4Line,
  RiDeleteBinLine,
} from "@remixicon/react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Paper {
  id: string;
  title: string;
  test_type: "chapter-wise" | "mock-test" | "pyq";
  subject?: string;
  chapter?: string;
  year?: number;
  shift?: string;
  total_questions: number;
  total_marks: number;
  duration_min: number;
  difficulty: "easy" | "medium" | "hard";
  exams?: { code: string; full_name: string };
}

// ─── Config ───────────────────────────────────────────────────────────────────
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api/v1";

const EXAM_LABELS: Record<string, string> = {
  "jee-main":     "JEE Main",
  "jee-advanced": "JEE Advanced",
  "neet-ug":      "NEET-UG",
  "ssc-cgl":      "SSC CGL",
};

const TYPES = [
  { id: "chapter-wise", label: "Chapter-wise" },
  { id: "mock-test",    label: "Mock Tests" },
  { id: "pyq",          label: "PYQs" },
];

// Derive exam code from user auth token later; using URL param for now
const DEFAULT_EXAM = "neet-ug"; // will be replaced by auth context

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function TestsHubPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[400px]">
        <RiLoader4Line size={40} className="animate-spin text-[#7B7B7B]" />
      </div>
    }>
      <TestsHubContent />
    </Suspense>
  );
}

function TestsHubContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const role = searchParams.get("role") || "student";
  const isAdmin = role === "super_admin" || role === "institute_admin";

  const [papers, setPapers] = useState<Paper[]>([]);

  const handleDelete = async (paperId: string, title: string) => {
    const confirmDelete = window.confirm(`Are you sure you want to delete "${title}"?`);
    if (!confirmDelete) return;

    try {
      const token = localStorage.getItem("auth_token") ?? "";
      const apiKey = process.env.NEXT_PUBLIC_INTERNAL_API_KEY ?? "";

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      } else if (apiKey) {
        headers["x-api-key"] = apiKey;
      }

      const res = await fetch(`${API_BASE}/tests/${paperId}`, {
        method: "DELETE",
        headers,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to delete test.");
      }

      setPapers(prev => prev.filter(p => p.id !== paperId));
    } catch (err: any) {
      alert(err.message || "An error occurred during deletion.");
    }
  };
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const [activeExam, setActiveExam]         = useState("jee-main");
  const EXAM_OPTIONS = ["jee-main", "jee-advanced", "neet-ug", "ssc-cgl"];

  const [activeType, setActiveType]         = useState("chapter-wise");
  const [activeCategory, setActiveCategory] = useState("All");
  const [search, setSearch]                 = useState("");

  // Fetch papers from backend
  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`${API_BASE}/questions/tests?exam=${activeExam}&type=${activeType}`)
      .then(r => {
        if (!r.ok) throw new Error("API error");
        return r.json();
      })
      .then(res => {
        if (res.success) setPapers(res.data.papers);
        else throw new Error(res.message || "Failed to load tests");
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [activeType, activeExam]);

  // Derive categories from fetched papers (subject for chapter-wise, year for pyqs)
  const categories = useMemo(() => {
    const cats = new Set(papers.map(p =>
      activeType === "chapter-wise" ? (p.subject || "General") :
      activeType === "pyq"          ? String(p.year || "All") :
      "All"
    ));
    return ["All", ...Array.from(cats).filter(c => c !== "All")];
  }, [papers, activeType]);

  const handleTypeChange = (typeId: string) => {
    setActiveType(typeId);
    setActiveCategory("All");
    setSearch("");
  };

  const filtered = useMemo(() => {
    return papers.filter(p => {
      const cat = activeType === "chapter-wise" ? (p.subject || "General") :
                  activeType === "pyq"          ? String(p.year || "") : "All";
      if (activeCategory !== "All" && cat !== activeCategory) return false;
      if (search) {
        const q = search.toLowerCase();
        return p.title.toLowerCase().includes(q) || (p.subject || "").toLowerCase().includes(q);
      }
      return true;
    });
  }, [papers, activeCategory, activeType, search]);

  return (
    <>
      <Navbar
        title="Tests Hub"
        subtitle="All your chapter-wise tests, mock tests, and PYQs in one place."
        breadcrumbs="Dashboard > Tests Hub"
      />

      <main className="mx-auto w-full max-w-screen-2xl px-4 pb-10 pt-6 md:px-6 overflow-x-hidden">

        {/* Top Type Tabs */}
        <div className="flex flex-row items-center gap-2 mb-6 p-1 bg-[#F9F9F9] dark:bg-b-surface1/60 border border-[rgba(123,123,123,0.1)] dark:border-s-stroke2/40 rounded-2xl w-fit select-none">
          {TYPES.map(type => {
            const isActive = activeType === type.id;
            return (
              <button
                key={type.id}
                onClick={() => handleTypeChange(type.id)}
                className={`px-5 py-2.5 rounded-xl text-sm font-sans font-semibold transition-all cursor-pointer ${
                  isActive
                    ? "bg-[#FDFDFD] dark:bg-b-surface2 text-[#101010] dark:text-t-primary shadow-[0px_4px_4px_-4px_rgba(8,8,8,0.05),0px_3px_1px_-4px_rgba(8,8,8,0.09)] border border-s-stroke2/30"
                    : "bg-transparent text-[#7B7B7B] dark:text-t-secondary hover:text-[#101010] dark:hover:text-t-primary"
                }`}
              >
                {type.label}
              </button>
            );
          })}
        </div>

        {/* Filters Row */}
        <div className="flex flex-col lg:flex-row flex-wrap items-stretch lg:items-center gap-6 p-6 rounded-[32px] bg-[#FDFDFD] dark:bg-b-surface2 shadow-[0px_5px_1.5px_-4px_rgba(8,8,8,0.09),0px_6px_4px_-4px_rgba(8,8,8,0.05)] border border-s-stroke2/40 select-none mb-8">
          <div className="relative flex-1 min-w-[240px]">
            <RiSearchLine size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#727272]" />
            <input
              type="text"
              placeholder={`Search in ${TYPES.find(t => t.id === activeType)?.label}...`}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full h-11 pl-11 pr-4 border border-[#E2E2E2] dark:border-s-stroke2 rounded-[90px] bg-transparent text-sm font-sans text-[#101010] dark:text-t-primary placeholder-[#7B7B7B] focus:border-[#727272] outline-none transition-all"
            />
          </div>

          <div className="flex flex-row flex-wrap items-center gap-6">
            <FilterGroup
              label="Exam"
              options={EXAM_OPTIONS}
              active={activeExam}
              onChange={setActiveExam}
              displayMap={EXAM_LABELS}
            />

            {categories.length > 1 && (
              <FilterGroup
                label={activeType === "pyq" ? "Year" : "Subject"}
                options={categories}
                active={activeCategory}
                onChange={setActiveCategory}
              />
            )}
          </div>
        </div>

        {/* Results count */}
        <div className="flex justify-between items-center mb-6 px-1 select-none">
          <span className="text-xs font-sans text-[#7B7B7B] uppercase tracking-wider">
            Showing <strong className="text-[#101010] dark:text-t-primary">{filtered.length}</strong> tests
          </span>
        </div>

        {/* States */}
        {loading ? (
          <div className="text-center py-20 rounded-[32px] bg-[#FDFDFD] dark:bg-b-surface2 border border-s-stroke2/40">
            <RiLoader4Line size={40} className="animate-spin mx-auto mb-4 text-[#7B7B7B]" />
            <p className="font-semibold text-sm text-[#7B7B7B]">Loading from database…</p>
          </div>
        ) : error ? (
          <div className="text-center py-20 rounded-[32px] bg-[#FDFDFD] dark:bg-b-surface2 border border-s-stroke2/40">
            <div className="text-4xl mb-4">⚠️</div>
            <p className="font-semibold text-sm text-[#FF6A55]">{error}</p>
            <p className="text-xs text-[#7B7B7B] mt-2">Make sure the API server is running on port 3001.</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 rounded-[32px] bg-[#FDFDFD] dark:bg-b-surface2 border border-s-stroke2/40">
            <div className="text-4xl mb-4">📋</div>
            <h3 className="font-semibold text-sm text-[#101010] dark:text-t-primary mb-1">No tests found</h3>
            <p className="text-xs text-[#7B7B7B]">Seed the database first using the seed script.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map(paper => (
              <TestCard
                key={paper.id}
                paper={paper}
                isAdmin={isAdmin}
                onDelete={() => handleDelete(paper.id, paper.title)}
                onStart={() => router.push(`/test/${paper.id}`)}
              />
            ))}
          </div>
        )}

      </main>
    </>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function FilterGroup({
  label, options, active, onChange, displayMap,
}: {
  label: string;
  options: string[];
  active: string;
  onChange: (v: string) => void;
  displayMap?: Record<string, string>;
}) {
  return (
    <div className="flex flex-row items-center gap-2 flex-wrap">
      <span className="text-xs font-sans font-semibold uppercase tracking-wider text-[#7B7B7B] mr-1">{label}:</span>
      {options.map(opt => (
        <button
          key={opt}
          onClick={() => onChange(opt)}
          className={`px-3.5 h-8 rounded-full border text-[11px] font-sans font-semibold transition-all active:scale-95 cursor-pointer uppercase tracking-wider ${
            active === opt
              ? "border-[#101010] bg-[#101010] text-[#FDFDFD] dark:border-t-primary dark:bg-t-primary dark:text-b-surface1"
              : "border-[#E2E2E2] dark:border-s-stroke2 bg-transparent text-[#727272] hover:border-[#727272] hover:text-[#101010]"
          }`}
        >
          {displayMap ? (displayMap[opt] ?? opt) : opt}
        </button>
      ))}
    </div>
  );
}

function TestCard({
  paper,
  isAdmin,
  onDelete,
  onStart,
}: {
  paper: Paper;
  isAdmin?: boolean;
  onDelete?: () => void;
  onStart: () => void;
}) {
  const subtitle = paper.test_type === "pyq"
    ? `${paper.year}${paper.shift ? ` · ${paper.shift}` : ""}`
    : paper.subject
    ? `${paper.subject}${paper.chapter ? ` · ${paper.chapter}` : ""}`
    : paper.exams?.full_name || "";

  return (
    <div className="flex min-h-[14rem] flex-col justify-between p-6 bg-[#FDFDFD] dark:bg-b-surface2 border border-[#FDFDFD] dark:border-s-stroke2/30 rounded-[28px] shadow-[0px_0px_36px_-8px_rgba(0,0,0,0.05),0px_6px_4px_-4px_rgba(8,8,8,0.05),0px_5px_1.5px_-4px_rgba(8,8,8,0.09)] select-none hover:-translate-y-0.5 hover:shadow-[0px_10px_20px_-8px_rgba(0,0,0,0.08)] transition-all duration-200">
      <div>
        <div className="font-sans font-semibold text-[16px] leading-[150%] text-[#101010] dark:text-t-primary mb-1">
          {paper.title}
        </div>
        {subtitle && (
          <div className="text-[12px] font-sans text-[#7B7B7B]">{subtitle}</div>
        )}

        <div className="flex flex-row flex-wrap items-center gap-4 mt-5 text-[12px] font-sans text-[#7B7B7B]">
          <span className="flex items-center gap-1.5">
            <RiQuestionLine size={14} /><span>{paper.total_questions} Qs</span>
          </span>
          <span className="flex items-center gap-1.5">
            <RiTimeLine size={14} /><span>{paper.duration_min} Min</span>
          </span>
          <span className="flex items-center gap-1.5">
            <RiBarChartBoxLine size={14} /><span>{paper.total_marks} Marks</span>
          </span>
        </div>
      </div>

      <div className="flex justify-between items-center mt-5 pt-4 border-t border-s-stroke2/30">
        <span className={`px-2 py-0.5 rounded-lg border text-[10px] font-semibold uppercase tracking-wider ${
          paper.difficulty === "hard"   ? "border-red-200 bg-red-50 text-red-600 dark:border-red-900/30 dark:bg-red-900/10 dark:text-red-400" :
          paper.difficulty === "medium" ? "border-amber-200 bg-amber-50 text-amber-600 dark:border-amber-900/30 dark:bg-amber-900/10 dark:text-amber-400" :
          "border-green-200 bg-green-50 text-green-600 dark:border-green-900/30 dark:bg-green-900/10 dark:text-green-400"
        }`}>
          {paper.difficulty}
        </span>
        <div className="flex items-center gap-2">
          {isAdmin && onDelete && (
            <button
              onClick={onDelete}
              className="flex justify-center items-center h-8 w-8 text-[#FF6A55] hover:bg-red-50 dark:hover:bg-red-900/15 rounded-xl border border-red-200 dark:border-red-900/30 transition-all active:scale-95 cursor-pointer"
              title="Delete Test"
            >
              <RiDeleteBinLine size={16} />
            </button>
          )}
          <button
            onClick={onStart}
            className="flex flex-row justify-center items-center h-8 px-4 bg-[#101010] hover:bg-[#202020] text-[#FDFDFD] text-[12px] font-sans font-semibold rounded-xl transition-all active:scale-95 cursor-pointer"
          >
            Start Test
          </button>
        </div>
      </div>
    </div>
  );
}
