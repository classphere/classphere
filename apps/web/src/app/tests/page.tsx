"use client";

import { useState, useMemo, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import { API_V1_URL } from "@/lib/api.client";
import { useAuth } from "@/lib/auth-context";
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
const API_BASE = API_V1_URL;

const EXAM_LABELS: Record<string, string> = {
  "jee-main": "JEE Main",
  "jee-advanced": "JEE Advanced",
  "neet-ug": "NEET-UG",
  "ssc-cgl": "SSC CGL",
};

const TYPES = [
  { id: "chapter-wise", label: "Chapter-wise" },
  { id: "mock-test", label: "Mock Tests" },
  { id: "pyq", label: "PYQs" },
];

// Derive exam code from user auth token later; using URL param for now
const DEFAULT_EXAM = "neet-ug"; // will be replaced by auth context

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function TestsHubPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[400px]">
        <RiLoader4Line size={40} className="animate-spin text-t-secondary" />
      </div>
    }>
      <TestsHubContent />
    </Suspense>
  );
}

function TestsHubContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { session, user } = useAuth();
  const role = user?.role ?? searchParams.get("role") ?? "student";
  const isAdmin = role === "super_admin" || role === "institute_admin";

  const [papers, setPapers] = useState<Paper[]>([]);

  const handleDelete = async (paperId: string, title: string) => {
    const confirmDelete = window.confirm(`Are you sure you want to delete "${title}"?`);
    if (!confirmDelete) return;

    try {
      const token = session?.access_token ?? "";
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
  const [error, setError] = useState<string | null>(null);

  const [activeExam, setActiveExam] = useState("jee-main");
  const EXAM_OPTIONS = ["jee-main", "jee-advanced", "neet-ug", "ssc-cgl"];

  const [activeType, setActiveType] = useState("chapter-wise");
  const [activeCategory, setActiveCategory] = useState("All");
  const [search, setSearch] = useState("");

  // Fetch papers from backend
  useEffect(() => {
    setLoading(true);
    setError(null);
    const token = session?.access_token ?? "";
    fetch(`${API_BASE}/questions/tests?exam=${activeExam}&type=${activeType}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
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
  }, [activeType, activeExam, session]);

  // Derive categories from fetched papers (subject for chapter-wise, year for pyqs)
  const categories = useMemo(() => {
    const cats = new Set(papers.map(p =>
      activeType === "chapter-wise" ? (p.subject || "General") :
        activeType === "pyq" ? String(p.year || "All") :
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
        activeType === "pyq" ? String(p.year || "") : "All";
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

      <main className="mx-auto w-full max-w-screen-2xl px-4 pb-12 pt-4 md:px-8 overflow-x-hidden">

        {/* Type Tabs */}
        <div className="flex flex-row items-center gap-1.5 mb-5 p-1 bg-b-surface2 shadow-[0_2px_0_rgba(223,222,222,.64),inset_0_2px_rgba(255,255,255,.64)] dark:shadow-[0_2px_0_rgba(0,0,0,.5),inset_0_2px_rgba(255,255,255,.05)] dark:bg-[#161616] border border-transparent rounded-[14px] w-fit select-none">
          {TYPES.map(type => {
            const isActive = activeType === type.id;
            return (
              <button
                key={type.id}
                onClick={() => handleTypeChange(type.id)}
                className={`relative px-5 py-2.5 rounded-[10px] text-[13px] font-sans font-semibold transition-all overflow-hidden cursor-pointer ${
                  isActive
                    ? 'bg-[linear-gradient(342.29deg,#070707_12.1%,#2F2E31_87.9%)] text-white border border-[#161616] shadow-[0px_6.8656px_6.8656px_-2.33333px_rgba(0,0,0,0.16),inset_0px_1px_0px_rgba(255,255,255,0.16),inset_0px_-2px_0px_#191919]'
                    : 'bg-transparent text-t-secondary hover:text-t-primary'
                }`}
              >
                {isActive && <i className="absolute -right-3 top-0 h-3 w-20 rotate-[125deg] rounded-full bg-white/10 blur-[3px]" />}
                <span className="relative">{type.label}</span>
              </button>
            );
          })}
        </div>

        {/* Filters Row */}
        <div className="flex flex-col lg:flex-row flex-wrap items-stretch lg:items-center gap-4 mb-6 bg-white shadow-velora-light dark:bg-[#161616] p-5 rounded-[24px] select-none">
          <div className="relative flex-1 min-w-[240px]">
            <RiSearchLine size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-t-secondary" />
            <input
              type="text"
              placeholder={`Search in ${TYPES.find(t => t.id === activeType)?.label}...`}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full h-10 pl-10 pr-4 border border-s-stroke2 dark:border-s-stroke2 rounded-[10px] bg-b-surface1 dark:bg-b-surface1/60 text-[13px] font-sans text-t-primary placeholder-t-secondary focus:border-t-secondary outline-none transition-all"
            />
          </div>

          <div className="flex flex-row flex-wrap items-center gap-4">
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
        <div className="flex justify-between items-center mb-4 px-1 select-none">
          <span className="text-[11px] font-sans text-t-secondary uppercase tracking-widest">
            Showing <strong className="text-t-primary">{filtered.length}</strong> tests
          </span>
        </div>

        {/* States */}
        {loading ? (
          <div className="card text-center py-20">
            <RiLoader4Line size={36} className="animate-spin mx-auto mb-4 text-t-secondary" />
            <p className="font-semibold text-[13px] text-t-secondary">Loading from database…</p>
          </div>
        ) : error ? (
          <div className="card text-center py-20">
            <div className="text-4xl mb-4">⚠️</div>
            <p className="font-semibold text-[13px] text-primary-03">{error}</p>
            <p className="text-[12px] text-t-secondary mt-2">Make sure the API server is running on port 3001.</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="card text-center py-20">
            <div className="text-4xl mb-4">📋</div>
            <h3 className="font-semibold text-[14px] text-t-primary mb-1">No tests found</h3>
            <p className="text-[12px] text-t-secondary">Seed the database first using the seed script.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
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
      <span className="text-xs font-sans font-semibold uppercase tracking-wider text-t-secondary mr-1">{label}:</span>
      {options.map(opt => (
        <button
          key={opt}
          onClick={() => onChange(opt)}
          className={`px-3.5 h-8 rounded-[10px] border text-[11px] font-sans font-semibold transition-all active:scale-95 cursor-pointer uppercase tracking-wider ${active === opt
              ? "border-t-primary bg-shade-02 text-t-light dark:border-t-primary dark:bg-t-primary dark:text-b-surface1"
              : "border-s-stroke2 dark:border-s-stroke2 bg-transparent text-t-secondary hover:border-t-secondary hover:text-t-primary"
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
    ? `${paper.year || ""}${paper.shift ? ` · ${paper.shift}` : ""}`.trim() || paper.exams?.full_name || ""
    : paper.subject
      ? `${paper.subject}${paper.chapter ? ` · ${paper.chapter}` : ""}`
      : paper.exams?.full_name || "";

  return (
    <div className="group relative flex flex-col justify-between bg-white shadow-velora-light dark:bg-[#161616] p-[22px] rounded-[24px] cursor-pointer hover:shadow-[0_8px_24px_rgba(0,0,0,0.08),inset_0_2px_rgba(255,255,255,.64)] transition-all duration-300 select-none overflow-hidden">
      
      {/* Premium Glass Hover Effect */}

      <div className="relative z-10">
        <h3 className="font-sans font-bold text-[17px] leading-[1.3] text-t-primary mb-1.5 tracking-[-0.01em]">
          {paper.title}
        </h3>
        {subtitle && subtitle !== "null" && (
          <p className="text-[13px] font-sans font-medium text-t-secondary">{subtitle}</p>
        )}

        <div className="flex flex-row flex-wrap items-center gap-x-4 gap-y-2 mt-5 mb-1 text-[12.5px] font-sans font-medium text-t-secondary">
          <span className="flex items-center gap-1.5">
            <RiQuestionLine size={14} className="opacity-70" /><span>{paper.total_questions} Qs</span>
          </span>
          <span className="flex items-center gap-1.5">
            <RiTimeLine size={14} className="opacity-70" /><span>{paper.duration_min} Min</span>
          </span>
          <span className="flex items-center gap-1.5">
            <RiBarChartBoxLine size={14} className="opacity-70" /><span>{paper.total_marks} Marks</span>
          </span>
        </div>
      </div>

      <div className="relative z-10 flex justify-end items-center mt-5 pt-5 border-t border-s-stroke2">
        <div className="flex items-center gap-2">
          {isAdmin && onDelete && (
            <button
              onClick={onDelete}
              className="flex justify-center items-center h-8 w-8 text-primary-03 hover:bg-red-50 dark:hover:bg-red-900/15 rounded-[10px] border border-red-200 dark:border-red-900/30 transition-all active:scale-95"
              title="Delete Test"
            >
              <RiDeleteBinLine size={15} />
            </button>
          )}
          <button
            onClick={onStart}
            className="btn btn-sm btn-dark"
          >
            Start
          </button>
        </div>
      </div>
    </div>
  );
}
