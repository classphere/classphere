"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import {
  RiSearchLine,
  RiFilterLine,
  RiBookmarkLine,
  RiBookmarkFill,
  RiTimeLine,
  RiQuestionLine,
  RiArrowRightLine,
  RiCheckboxCircleLine,
  RiFlashlightFill,
  RiMicroscopeLine,
  RiFlaskLine,
  RiFireLine,
  RiBarChartBoxLine,
  RiLoader4Line,
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

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api/v1";

const EXAMS = ["All", "JEE Main", "JEE Advanced", "NEET-UG"];
const YEARS = ["All", "2024", "2023", "2022", "2021", "2020"];
const DIFFICULTIES = ["All", "easy", "medium", "hard"];

const difficultyMeta: Record<string, { label: string; color: string; bg: string }> = {
  easy:   { label: "Easy",   color: "var(--success-60)", bg: "var(--success-10)" },
  medium: { label: "Medium", color: "var(--warning-60)", bg: "var(--warning-10)" },
  hard:   { label: "Hard",   color: "var(--danger-50)",  bg: "var(--danger-10)"  },
};

const examIcons: Record<string, React.ReactNode> = {
  "JEE Main":     <RiFlaskLine size={20} />,
  "JEE Advanced": <RiFlashlightFill size={20} />,
  "NEET-UG":      <RiMicroscopeLine size={20} />,
};

const examColors: Record<string, string> = {
  "JEE Main":     "var(--p-50)",
  "JEE Advanced": "var(--s-50)",
  "NEET-UG":      "#10b981",
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PYQsPage() {
  const router = useRouter();

  const [papers, setPapers]               = useState<PYQPaper[]>([]);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState<string | null>(null);
  const [search, setSearch]               = useState("");
  const [activeExam, setActiveExam]       = useState("All");
  const [activeYear, setActiveYear]       = useState("All");
  const [activeDiff, setActiveDiff]       = useState("All");
  const [bookmarks, setBookmarks]         = useState<Set<string>>(new Set());
  const [showBookmarked, setShowBookmarked] = useState(false);

  // ── Fetch paper list from backend ──
  useEffect(() => {
    setLoading(true);
    fetch(`${API_BASE}/pyqs`)
      .then((r) => r.json())
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
  const attemptedCount  = 0; // will come from user attempt history later

  return (
    <>
      <Navbar
        title="Previous Year Papers"
        subtitle="Practice with real exam papers. Attempt full papers or pick a specific year."
        breadcrumbs="Dashboard > PYQs"
      />

      <main style={{ padding: "0 32px 40px 32px", maxWidth: 1400, margin: "0 auto", width: "100%" }}>

        {/* ── Stats Strip ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 28 }}>
          {[
            { label: "Total Papers", value: papers.length,    icon: <RiBarChartBoxLine size={18} />, color: "var(--p-50)" },
            { label: "Attempted",    value: attemptedCount,   icon: <RiCheckboxCircleLine size={18} />, color: "var(--s-50)" },
            { label: "Bookmarked",   value: bookmarkedCount,  icon: <RiBookmarkFill size={18} />, color: "var(--warning-50)" },
          ].map((stat) => (
            <div key={stat.label} className="rayum-card" style={{ padding: "20px 24px", display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ width: 44, height: 44, borderRadius: "var(--r-md)", background: `${stat.color}18`, display: "flex", alignItems: "center", justifyContent: "center", color: stat.color, flexShrink: 0 }}>
                {stat.icon}
              </div>
              <div>
                <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.02em", color: "var(--fg-default)", lineHeight: 1 }}>{stat.value}</div>
                <div className="t-body-sm" style={{ marginTop: 4 }}>{stat.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Filters Row ── */}
        <div className="rayum-card" style={{ padding: "20px 24px", marginBottom: 24, display: "flex", flexWrap: "wrap", gap: 16, alignItems: "center" }}>

          {/* Search */}
          <div style={{ position: "relative", flex: "1 1 220px", minWidth: 200 }}>
            <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--fg-muted)", display: "flex" }}>
              <RiSearchLine size={16} />
            </span>
            <input
              id="pyq-search"
              type="text"
              placeholder="Search by exam, year, shift…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input"
              style={{ paddingLeft: 36, width: "100%", fontSize: 14 }}
            />
          </div>

          <FilterGroup label="Exam"       options={EXAMS}        active={activeExam} onChange={setActiveExam} />
          <FilterGroup label="Year"       options={YEARS}        active={activeYear} onChange={setActiveYear} />
          <FilterGroup label="Difficulty" options={DIFFICULTIES} active={activeDiff} onChange={setActiveDiff} />

          {/* Bookmark toggle */}
          <button
            id="pyq-bookmarks-toggle"
            onClick={() => setShowBookmarked((v) => !v)}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "8px 14px", borderRadius: "var(--r-md)", border: "1px solid var(--border-default)",
              background: showBookmarked ? "var(--warning-10)" : "transparent",
              color: showBookmarked ? "var(--warning-60)" : "var(--fg-muted)",
              fontWeight: 600, fontSize: 13, cursor: "pointer", transition: "all 0.15s", whiteSpace: "nowrap",
            }}
          >
            {showBookmarked ? <RiBookmarkFill size={15} /> : <RiBookmarkLine size={15} />}
            Saved
          </button>
        </div>

        {/* ── Results Count ── */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <span className="t-body-sm" style={{ color: "var(--fg-muted)" }}>
            Showing <strong style={{ color: "var(--fg-default)" }}>{filtered.length}</strong> papers
          </span>
          <span className="t-body-sm" style={{ color: "var(--fg-muted)" }}>
            +4/−1 marking · NTA pattern
          </span>
        </div>

        {/* ── Loading / Error / Cards ── */}
        {loading ? (
          <div className="rayum-card" style={{ padding: 64, textAlign: "center", color: "var(--fg-muted)" }}>
            <RiLoader4Line size={40} style={{ animation: "spin 1s linear infinite", margin: "0 auto 16px" }} />
            <p>Loading papers from backend…</p>
          </div>
        ) : error ? (
          <div className="rayum-card" style={{ padding: 48, textAlign: "center", color: "var(--danger-50)" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
            <p style={{ fontWeight: 600 }}>{error}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="rayum-card" style={{ padding: 64, textAlign: "center" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📋</div>
            <h3 className="section-title" style={{ marginBottom: 8 }}>No papers found</h3>
            <p className="t-body-sm">Try adjusting your filters or search term.</p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 16 }}>
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

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
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
    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
      <span className="t-label" style={{ marginRight: 4, color: "var(--fg-muted)" }}>{label}:</span>
      {options.map((opt) => (
        <button
          key={opt}
          onClick={() => onChange(opt)}
          style={{
            padding: "5px 12px",
            borderRadius: "var(--r-full)",
            border: active === opt ? "1.5px solid var(--p-50)" : "1px solid var(--border-default)",
            background: active === opt ? "var(--p-10)" : "transparent",
            color: active === opt ? "var(--p-60)" : "var(--fg-muted)",
            fontWeight: active === opt ? 700 : 500,
            fontSize: 12,
            cursor: "pointer",
            transition: "all 0.15s",
            textTransform: opt === "All" ? "none" : "capitalize",
          }}
        >
          {opt}
        </button>
      ))}
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
  const accentColor = examColors[paper.exam] ?? "var(--p-50)";
  const diff        = difficultyMeta[paper.difficulty];

  return (
    <div
      className="rayum-card"
      style={{ padding: 24, cursor: "default", transition: "box-shadow 0.2s, transform 0.2s", display: "flex", flexDirection: "column", gap: 0 }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = "var(--sh-300)";
        (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = "";
        (e.currentTarget as HTMLDivElement).style.transform = "";
      }}
    >
      {/* Header row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 40, height: 40, borderRadius: "var(--r-md)", background: `${accentColor}18`, display: "flex", alignItems: "center", justifyContent: "center", color: accentColor, flexShrink: 0 }}>
            {examIcons[paper.exam]}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: "var(--fg-default)", lineHeight: 1.3 }}>{paper.exam}</div>
            <div className="t-body-sm" style={{ marginTop: 2, fontWeight: 600 }}>{paper.year} · {paper.shift}</div>
          </div>
        </div>
        <button
          id={`bookmark-${paper.id}`}
          onClick={(e) => onBookmark(paper.id, e)}
          style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: isBookmarked ? "var(--warning-50)" : "var(--fg-muted)", display: "flex", alignItems: "center", transition: "color 0.15s" }}
          title={isBookmarked ? "Remove bookmark" : "Bookmark"}
        >
          {isBookmarked ? <RiBookmarkFill size={18} /> : <RiBookmarkLine size={18} />}
        </button>
      </div>

      {/* Subjects */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 20 }}>
        {paper.subjects.map((s) => (
          <span key={s} style={{ fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: "var(--r-full)", background: "var(--n-10)", color: "var(--fg-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
            {s}
          </span>
        ))}
      </div>

      {/* Meta chips */}
      <div style={{ display: "flex", gap: 16, marginBottom: 20, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 13, color: "var(--fg-muted)", fontWeight: 500 }}>
          <RiQuestionLine size={14} /> {paper.questions} Questions
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 13, color: "var(--fg-muted)", fontWeight: 500 }}>
          <RiTimeLine size={14} /> {paper.duration} min
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 13, color: "var(--fg-muted)", fontWeight: 500 }}>
          <RiBarChartBoxLine size={14} /> {paper.marks} marks
        </div>
      </div>

      {/* Difficulty */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <span style={{ fontSize: 12, fontWeight: 700, padding: "4px 10px", borderRadius: "var(--r-full)", color: diff.color, background: diff.bg, textTransform: "capitalize" }}>
          {diff.label}
        </span>
        <span style={{ fontSize: 12, color: "var(--fg-muted)", fontWeight: 500 }}>90 questions · +4/−1</span>
      </div>

      {/* CTA */}
      <button
        id={`start-pyq-${paper.id}`}
        onClick={onStart}
        className="btn btn-primary"
        style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: "auto" }}
      >
        <RiArrowRightLine size={16} /> Start Paper
      </button>
    </div>
  );
}
