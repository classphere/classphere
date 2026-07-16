"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import { useAuth } from "@/lib/auth-context";
import { apiClient } from "@/lib/api.client";
import {
  RiAddLine,
  RiLoader4Line,
  RiFileList3Line,
  RiTimeLine,
  RiQuestionLine,
  RiDeleteBin6Line,
  RiCalendarEventLine,
  RiTeamLine,
  RiCheckLine,
  RiDraftLine,
  RiSearchLine,
} from "@remixicon/react";

interface Test {
  id: string;
  title: string;
  test_type: "chapter-wise" | "mock-test" | "pyq";
  total_questions: number;
  total_marks: number;
  duration_min: number;
  is_published: boolean;
  created_at: string;
  exams?: { code: string; full_name: string };
}

const EXAM_LABELS: Record<string, string> = {
  "jee-main": "JEE Main",
  "jee-advanced": "JEE Advanced",
  "neet-ug": "NEET-UG",
  "ssc-cgl": "SSC CGL",
};

const TYPE_LABELS: Record<string, string> = {
  "chapter-wise": "Chapter-wise",
  "mock-test": "Mock Test",
  "pyq": "PYQ",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function InstituteTestsPage() {
  const router = useRouter();
  const { session } = useAuth();

  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!session?.access_token) return;
    setLoading(true);
    apiClient.get("/api/v1/tests/my", session.access_token)
      .then((res) => {
        if (res.success) setTests(res.data.tests ?? []);
        else throw new Error(res.message || "Failed to load tests");
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [session]);

  const handleDelete = async (test: Test) => {
    if (!window.confirm(`Delete "${test.title}"? This cannot be undone.`)) return;
    setDeletingId(test.id);
    try {
      const res = await apiClient.delete(`/api/v1/tests/${test.id}`, session?.access_token || "");
      if (!res.success) throw new Error(res.message || "Delete failed");
      setTests((prev) => prev.filter((t) => t.id !== test.id));
    } catch (err: any) {
      alert(err.message || "Failed to delete test.");
    } finally {
      setDeletingId(null);
    }
  };

  const filtered = tests.filter((t) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      t.title.toLowerCase().includes(q) ||
      TYPE_LABELS[t.test_type]?.toLowerCase().includes(q) ||
      EXAM_LABELS[t.exams?.code || ""]?.toLowerCase().includes(q)
    );
  });

  return (
    <>
      <Navbar
        title="Tests"
        subtitle="Manage and schedule your institute's test papers."
        breadcrumbs="Institute > Tests"
      />
      <main className="mx-auto w-full max-w-screen-2xl px-4 pb-12 pt-4 md:px-8">

        {/* Header Row */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div className="relative flex-1 max-w-[360px]">
            <RiSearchLine size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-t-secondary" />
            <input
              type="text"
              placeholder="Search tests..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-10 pl-9 pr-4 rounded-[10px] border border-s-stroke2 bg-b-surface1 text-[13px] font-sans text-t-primary placeholder-t-secondary focus:border-t-secondary outline-none transition-all"
            />
          </div>
          <Link
            href="/institute/tests/create"
            className="flex items-center gap-2 h-10 px-4 rounded-[10px] bg-shade-02 text-white text-[13px] font-sans font-semibold hover:opacity-90 transition-all active:scale-95 shrink-0"
          >
            <RiAddLine size={16} />
            Create New Test
          </Link>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-28 gap-4">
            <RiLoader4Line size={36} className="animate-spin text-t-secondary" />
            <p className="text-[13px] font-sans text-t-secondary">Loading tests...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-28 gap-3">
            <div className="text-4xl">⚠️</div>
            <p className="text-[14px] font-sans font-semibold text-primary-03">{error}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-28 gap-4 text-center">
            <div className="w-16 h-16 rounded-2xl bg-b-surface2 flex items-center justify-center">
              <RiFileList3Line size={28} className="text-t-secondary" />
            </div>
            <div>
              <h3 className="font-sans font-semibold text-[15px] text-t-primary mb-1">
                {search ? "No tests match your search" : "No tests created yet"}
              </h3>
              <p className="text-[13px] font-sans text-t-secondary">
                {search ? "Try a different search term." : "Upload a PDF to create your first test."}
              </p>
            </div>
            {!search && (
              <Link
                href="/institute/tests/create"
                className="flex items-center gap-2 h-10 px-5 rounded-[10px] bg-shade-02 text-white text-[13px] font-sans font-semibold hover:opacity-90 transition-all active:scale-95 mt-2"
              >
                <RiAddLine size={15} />
                Create Your First Test
              </Link>
            )}
          </div>
        ) : (
          <>
            <p className="text-[11px] font-sans text-t-secondary uppercase tracking-widest mb-4 px-1">
              Showing <strong className="text-t-primary">{filtered.length}</strong> test{filtered.length !== 1 ? "s" : ""}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {filtered.map((test) => (
                <TestCard
                  key={test.id}
                  test={test}
                  deleting={deletingId === test.id}
                  onDelete={() => handleDelete(test)}
                  onView={() => router.push(`/institute/tests/view/${test.id}`)}
                />
              ))}
            </div>
          </>
        )}
      </main>
    </>
  );
}

function TestCard({
  test,
  deleting,
  onDelete,
  onView,
}: {
  test: Test;
  deleting: boolean;
  onDelete: () => void;
  onView: () => void;
}) {
  return (
    <div className="group relative flex flex-col justify-between bg-white dark:bg-[#161616] p-5 rounded-[20px] border border-s-stroke2 hover:border-t-secondary/30 transition-all duration-300 overflow-hidden">
      {/* Subtle glow on hover */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none bg-gradient-to-br from-indigo-500/[0.03] to-purple-500/[0.03] rounded-[20px]" />

      <div className="relative z-10">
        {/* Status + Type badges */}
        <div className="flex items-center gap-2 mb-3">
          <span
            className={`inline-flex items-center gap-1 text-[10px] font-sans font-bold uppercase tracking-widest px-2.5 py-1 rounded-full ${
              test.is_published
                ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
                : "bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400"
            }`}
          >
            {test.is_published ? <RiCheckLine size={10} /> : <RiDraftLine size={10} />}
            {test.is_published ? "Published" : "Draft"}
          </span>
          <span className="inline-flex text-[10px] font-sans font-bold uppercase tracking-widest px-2.5 py-1 rounded-full bg-b-surface2 text-t-secondary">
            {TYPE_LABELS[test.test_type] ?? test.test_type}
          </span>
        </div>

        {/* Title */}
        <h3 className="font-sans font-bold text-[16px] leading-[1.35] text-t-primary mb-1 tracking-[-0.01em] line-clamp-2">
          {test.title}
        </h3>
        {test.exams && (
          <p className="text-[12px] font-sans text-t-secondary mb-4">
            {EXAM_LABELS[test.exams.code] ?? test.exams.code}
          </p>
        )}

        {/* Stats row */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12px] font-sans font-medium text-t-secondary">
          <span className="flex items-center gap-1.5">
            <RiQuestionLine size={13} className="opacity-70" />
            {test.total_questions} Questions
          </span>
          <span className="flex items-center gap-1.5">
            <RiTimeLine size={13} className="opacity-70" />
            {test.duration_min} Min
          </span>
          <span className="flex items-center gap-1.5">
            <RiCalendarEventLine size={13} className="opacity-70" />
            {formatDate(test.created_at)}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="relative z-10 flex items-center justify-end gap-2 mt-5 pt-4 border-t border-s-stroke2">
        <button
          onClick={onDelete}
          disabled={deleting}
          className="flex items-center justify-center h-8 w-8 rounded-[8px] border border-red-200 text-red-400 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/30 transition-all active:scale-95 disabled:opacity-50"
          title="Delete test"
        >
          {deleting ? (
            <RiLoader4Line size={14} className="animate-spin" />
          ) : (
            <RiDeleteBin6Line size={14} />
          )}
        </button>
        <button
          onClick={onView}
          className="flex items-center gap-1.5 h-8 px-3.5 rounded-[8px] bg-shade-02 text-white text-[12px] font-sans font-semibold hover:opacity-90 transition-all active:scale-95"
        >
          View Test
        </button>
      </div>
    </div>
  );
}
