"use client";

import { useEffect, useState } from "react";
import { RiCloseLine, RiLoader4Line } from "@remixicon/react";
import { supabase } from "@/lib/supabase";
import { API_URL } from "@/lib/api.client";

interface HistoryEntry {
  batch_id: string;
  name: string;
  exam: string | null;
  target_year: number | null;
  batch_archived: boolean;
  joined_at: string | null;
  left_at: string | null;
  left_reason: "departed" | "moved" | "batch_archived" | null;
  current: boolean;
}

/** Why an enrolment ended, in the words an admin would use. */
const REASON_LABEL: Record<string, string> = {
  departed: "Removed from batch",
  moved: "Moved to another batch",
  batch_archived: "Batch archived",
};

const formatDate = (value: string | null) =>
  value
    ? new Date(value).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })
    : "—";

/**
 * Every batch a student has passed through.
 *
 * batch_students has always been append-only — removals, moves and archives all
 * write left_at rather than deleting the row, so billing can reconstruct any
 * past period. Nothing ever read it back, so an institute could see the batch a
 * student is in now and had no way to answer "which batches have they been
 * through" — the question that comes up when someone turns up in the wrong
 * cohort or disputes a fee.
 */
export function StudentHistoryModal({
  studentId,
  studentName,
  onClose,
}: {
  studentId: string;
  studentName: string;
  onClose: () => void;
}) {
  const [history, setHistory] = useState<HistoryEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;
        if (!token) throw new Error("Not authenticated");

        const sessionToken =
          typeof window !== "undefined" ? localStorage.getItem("classphere_session_token") ?? "" : "";

        const res = await fetch(`${API_URL}/api/v1/students/${studentId}/history`, {
          headers: {
            Authorization: `Bearer ${token}`,
            ...(sessionToken ? { "x-session-token": sessionToken } : {}),
          },
        });
        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json.message ?? "Could not load history");
        if (!cancelled) setHistory(json.data.history);
      } catch (err: any) {
        if (!cancelled) setError(err.message);
      }
    })();
    // Guards against setting state after the admin closes the modal mid-request.
    return () => { cancelled = true; };
  }, [studentId]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="flex max-h-[80vh] w-full max-w-[520px] flex-col rounded-[16px] border border-s-stroke2 bg-b-surface1 shadow-depth">
        <div className="flex items-center justify-between border-b border-s-stroke2 px-5 py-4">
          <div className="min-w-0">
            <h2 className="truncate text-[15px] font-bold text-t-primary">{studentName}</h2>
            <p className="mt-0.5 text-[12px] text-t-secondary">Batch history</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="rounded-[8px] p-1 text-t-secondary transition-colors hover:text-t-primary">
            <RiCloseLine size={20} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {error && <p className="text-sm text-primary-03">{error}</p>}

          {!history && !error && (
            <div className="flex items-center gap-2 py-6 text-sm text-t-secondary">
              <RiLoader4Line size={16} className="animate-spin" /> Loading…
            </div>
          )}

          {history?.length === 0 && (
            <p className="py-6 text-sm text-t-secondary">
              This student has never been in a batch.
            </p>
          )}

          <div className="flex flex-col gap-2">
            {(history ?? []).map((entry) => (
              <div
                key={`${entry.batch_id}-${entry.joined_at}`}
                className={`rounded-[12px] border px-3.5 py-3 ${
                  entry.current
                    ? "border-primary-02/40 bg-primary-02/5"
                    : "border-s-stroke2/50 bg-b-surface2/50"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-[14px] font-semibold text-t-primary">
                      {entry.name}
                      {entry.batch_archived && (
                        <span className="ml-2 rounded-[5px] bg-b-surface2 px-1.5 py-0.5 text-[10px] font-bold uppercase text-t-tertiary">
                          Archived
                        </span>
                      )}
                    </p>
                    <p className="mt-0.5 text-[11px] text-t-secondary">
                      {[entry.exam, entry.target_year].filter(Boolean).join(" · ") || "—"}
                    </p>
                  </div>
                  {entry.current && (
                    <span className="shrink-0 rounded-[6px] bg-primary-02/15 px-2 py-0.5 text-[10px] font-bold uppercase text-primary-02">
                      Current
                    </span>
                  )}
                </div>

                <p className="mt-2 text-[11px] text-t-secondary">
                  Joined {formatDate(entry.joined_at)}
                  {!entry.current && <> · Left {formatDate(entry.left_at)}</>}
                  {/* Departures recorded before left_reason existed carry null.
                      Saying nothing beats inventing a reason for them. */}
                  {!entry.current && entry.left_reason && (
                    <> · {REASON_LABEL[entry.left_reason] ?? entry.left_reason}</>
                  )}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
