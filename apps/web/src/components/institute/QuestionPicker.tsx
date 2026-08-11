"use client";

import { useEffect, useState } from "react";
import { RiSearchLine, RiLoader4Line, RiCheckLine, RiAlertLine } from "@remixicon/react";
import { supabase } from "@/lib/supabase";
import { API_URL } from "@/lib/api.client";

export interface BankQuestion {
  id: string;
  question_text: string;
  subject: string | null;
  chapter: string | null;
  topic: string | null;
  difficulty: string | null;
  question_type: string | null;
  option_count: number;
  has_answer: boolean;
}

/** Strip the markdown and maths delimiters so a preview line reads as prose. */
function preview(text: string): string {
  return (text ?? "")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " [figure] ")
    .replace(/\$\$?([^$]*)\$\$?/g, "$1")
    .replace(/[*_`#>]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Browse the question bank and choose questions by hand.
 *
 * Building from the bank could only be done blind: set filters and a count, and
 * the server drew at random. A teacher who knew which questions they wanted had
 * no way to say so — they had to assemble the paper as a PDF and put it back
 * through extraction.
 *
 * Selection is held by id across pages and filters, so narrowing the search does
 * not silently drop what has already been chosen.
 */
export function QuestionPicker({
  examId,
  selected,
  onChange,
}: {
  examId: string | null;
  selected: BankQuestion[];
  onChange: (next: BankQuestion[]) => void;
}) {
  const [questions, setQuestions] = useState<BankQuestion[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Typing a search term should not fire a request per keystroke.
  useEffect(() => {
    const timer = setTimeout(() => { setDebounced(search); setPage(1); }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (!examId) { setQuestions([]); setTotal(0); return; }
    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;
        if (!token) throw new Error("Not authenticated");
        const sessionToken =
          typeof window !== "undefined" ? localStorage.getItem("classphere_session_token") ?? "" : "";

        const params = new URLSearchParams({ exam_id: examId, page: String(page) });
        if (debounced) params.set("search", debounced);

        const res = await fetch(`${API_URL}/api/v1/tests/bank-questions?${params}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            ...(sessionToken ? { "x-session-token": sessionToken } : {}),
          },
        });
        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json.message ?? "Could not load questions");
        if (cancelled) return;
        setQuestions(json.data.questions);
        setTotal(json.data.total);
      } catch (err: any) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [examId, page, debounced]);

  const selectedIds = new Set(selected.map((q) => q.id));
  const toggle = (question: BankQuestion) =>
    onChange(
      selectedIds.has(question.id)
        ? selected.filter((q) => q.id !== question.id)
        : [...selected, question],
    );

  const pageCount = Math.max(1, Math.ceil(total / 25));

  if (!examId) {
    return (
      <p className="rounded-[10px] bg-b-surface2 px-3.5 py-3 text-[13px] text-t-secondary">
        Select a batch above — its exam decides which questions you can choose from.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex h-11 flex-1 min-w-[200px] items-center gap-2 rounded-[10px] border border-s-stroke2 bg-b-surface1 px-3">
          <RiSearchLine size={18} className="text-t-secondary" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search question text…"
            className="w-full border-none bg-transparent text-sm text-t-primary outline-none placeholder:text-t-tertiary"
          />
        </div>
        <span className="text-[13px] font-semibold text-t-primary">
          {selected.length} selected
        </span>
        {selected.length > 0 && (
          <button type="button" onClick={() => onChange([])} className="btn btn-ghost h-11 px-3 text-[13px]">
            Clear
          </button>
        )}
      </div>

      {error && (
        <p className="flex items-center gap-2 rounded-[10px] bg-primary-03/10 px-3.5 py-2.5 text-[13px] text-primary-03">
          <RiAlertLine size={16} /> {error}
        </p>
      )}

      <div className="flex max-h-[420px] flex-col gap-2 overflow-y-auto rounded-[12px] border border-s-stroke2/40 bg-b-surface1 p-2">
        {loading && (
          <div className="flex items-center gap-2 px-2 py-6 text-sm text-t-secondary">
            <RiLoader4Line size={16} className="animate-spin" /> Loading…
          </div>
        )}

        {!loading && questions.length === 0 && !error && (
          <p className="px-2 py-6 text-sm text-t-secondary">
            {debounced
              ? "No approved questions match that search."
              : "No approved questions in the bank for this exam yet. Extracted papers have to be reviewed and approved first."}
          </p>
        )}

        {!loading && questions.map((question) => {
          const on = selectedIds.has(question.id);
          return (
            <label
              key={question.id}
              className={`flex cursor-pointer items-start gap-2.5 rounded-[10px] border px-3 py-2.5 transition-colors ${
                on ? "border-primary-01/50 bg-primary-01/5" : "border-s-stroke2/40 bg-b-surface2/40 hover:border-primary-01/30"
              }`}
            >
              <input
                type="checkbox"
                checked={on}
                onChange={() => toggle(question)}
                className="mt-0.5 size-4 shrink-0 cursor-pointer accent-primary-01"
              />
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] leading-snug text-t-primary line-clamp-2">
                  {preview(question.question_text) || "(no text)"}
                </span>
                <span className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-t-secondary">
                  {[question.subject, question.chapter, question.topic].filter(Boolean).map((tag) => (
                    <span key={tag as string} className="rounded-[5px] bg-b-surface2 px-1.5 py-0.5">{tag}</span>
                  ))}
                  {question.difficulty && <span className="capitalize">{question.difficulty}</span>}
                  {/* An approved question with no answer key cannot be scored,
                      and is worth seeing before it goes into a paper. */}
                  {!question.has_answer && (
                    <span className="font-semibold text-primary-03">no answer set</span>
                  )}
                </span>
              </span>
              {on && <RiCheckLine size={16} className="mt-0.5 shrink-0 text-primary-01" />}
            </label>
          );
        })}
      </div>

      {pageCount > 1 && (
        <div className="flex items-center justify-between text-[13px] text-t-secondary">
          <span>{total} question{total === 1 ? "" : "s"} · page {page} of {pageCount}</span>
          <div className="flex gap-2">
            <button type="button" disabled={page <= 1 || loading} onClick={() => setPage((p) => p - 1)} className="btn btn-ghost px-3 py-1.5 disabled:opacity-40">Previous</button>
            <button type="button" disabled={page >= pageCount || loading} onClick={() => setPage((p) => p + 1)} className="btn btn-ghost px-3 py-1.5 disabled:opacity-40">Next</button>
          </div>
        </div>
      )}
    </div>
  );
}
