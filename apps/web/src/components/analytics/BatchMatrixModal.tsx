import React, { useState, useEffect } from "react";
import {
  RiCloseLine,
  RiLoader4Line,
  RiBarChartGroupedLine,
  RiAlertLine,
  RiTrophyLine,
} from "@remixicon/react";
import { apiClient } from "@/lib/api.client";

interface BatchMatrixRow {
  batch_id: string;
  batch_name: string;
  exam: string;
  total_enrolled: number;
  students_attempted: number;
  attempt_rate_pct: number;
  avg_score: number;
  avg_percentage: number;
  highest_score: number;
  lowest_score: number;
  top_student_name: string;
  underperforming_flag: boolean;
}

interface BatchMatrixData {
  paper_id: string;
  paper_title: string;
  overall_avg_pct: number;
  total_batches: number;
  batches: BatchMatrixRow[];
}

interface BatchMatrixModalProps {
  show: boolean;
  paperId: string | null;
  token?: string;
  onClose: () => void;
}

export function BatchMatrixModal({ show, paperId, token, onClose }: BatchMatrixModalProps) {
  const [data, setData] = useState<BatchMatrixData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!show || !paperId || !token) return;
    setLoading(true);
    setError(null);
    apiClient.get<{ success: boolean; data: BatchMatrixData; message?: string }>(
      `/api/v1/rankings/batch-comparison?paper_id=${paperId}`,
      token
    )
      .then((res) => {
        if (res.success) setData(res.data);
        else setError(res.message || "Failed to load comparative matrix");
      })
      .catch((err) => setError(err.message || "Failed to fetch analytics"))
      .finally(() => setLoading(false));
  }, [show, paperId, token]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 px-4 py-6 backdrop-blur-md animate-in fade-in duration-200 select-none">
      <div className="card w-full max-w-4xl p-6 md:p-8 bg-b-surface1 border-s-stroke2 relative max-h-[90vh] overflow-y-auto shadow-2xl">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 flex size-9 items-center justify-center rounded-[10px] border border-s-stroke2 text-t-secondary hover:text-t-primary bg-b-surface2"
        >
          <RiCloseLine size={20} />
        </button>

        <div className="flex items-center gap-3 mb-3">
          <div className="flex size-11 items-center justify-center rounded-[12px] bg-primary-01/10 text-primary-01 border border-primary-01/20">
            <RiBarChartGroupedLine size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-t-primary">Batch vs. Batch Rank Matrix</h2>
            <p className="text-xs text-t-secondary mt-0.5">
              Comparative performance analysis for <strong className="text-t-primary">{data?.paper_title || "Test"}</strong>
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-3 py-10 text-t-secondary">
            <RiLoader4Line size={24} className="animate-spin text-primary-01" />
            <span className="font-semibold text-sm">Computing batch analytics matrix...</span>
          </div>
        ) : error ? (
          <div className="p-6 rounded-[12px] bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-semibold text-center">
            ⚠️ {error}
          </div>
        ) : !data || data.batches.length === 0 ? (
          <div className="py-10 text-center text-t-secondary text-sm">
            No submitted student attempts recorded across assigned batches yet.
          </div>
        ) : (
          <div className="space-y-3">
            {/* Top Stat Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="rounded-[14px] border border-s-stroke2 bg-b-surface2/60 p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-t-secondary">Institute Test Average</p>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-t-primary tabular-nums">
                    {data.overall_avg_pct}%
                  </span>
                  <span className="text-xs font-medium text-t-secondary">across all batches</span>
                </div>
              </div>

              <div className="rounded-[14px] border border-s-stroke2 bg-b-surface2/60 p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-t-secondary">Assigned Batches</p>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-t-primary tabular-nums">
                    {data.total_batches}
                  </span>
                  <span className="text-xs font-medium text-t-secondary">participating</span>
                </div>
              </div>

              <div className="rounded-[14px] border border-s-stroke2 bg-b-surface2/60 p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-t-secondary">Underperforming Batches</p>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className={`text-3xl font-extrabold tabular-nums ${data.batches.some(b => b.underperforming_flag) ? "text-red-500" : "text-primary-02"}`}>
                    {data.batches.filter(b => b.underperforming_flag).length}
                  </span>
                  <span className="text-xs font-medium text-t-secondary">need intervention</span>
                </div>
              </div>
            </div>

            {/* Matrix Table */}
            <div className="overflow-x-auto rounded-[14px] border border-s-stroke2">
              <table className="w-full text-left text-xs">
                <thead className="bg-b-surface2 border-b border-s-stroke2 text-[11px] uppercase tracking-wider text-t-secondary font-bold">
                  <tr>
                    <th className="py-3 px-4">Batch Name</th>
                    <th className="py-3 px-4">Exam</th>
                    <th className="py-3 px-4 text-center">Participation</th>
                    <th className="py-3 px-4 text-right">Avg Score</th>
                    <th className="py-3 px-4 text-right">Avg %</th>
                    <th className="py-3 px-4 text-right">Highest / Lowest</th>
                    <th className="py-3 px-4">Top Scorer</th>
                    <th className="py-3 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-s-stroke2/50 bg-b-surface1">
                  {data.batches.map((batch) => (
                    <tr
                      key={batch.batch_id}
                      className={`hover:bg-b-surface2/40 transition-colors ${
                        batch.underperforming_flag ? "bg-red-500/5" : ""
                      }`}
                    >
                      <td className="py-3.5 px-4 font-bold text-t-primary text-sm">
                        {batch.batch_name}
                      </td>
                      <td className="py-3.5 px-4 uppercase text-[11px] font-semibold text-t-secondary">
                        {batch.exam}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="font-semibold text-t-primary">
                          {batch.students_attempted} / {batch.total_enrolled}
                        </div>
                        <div className="text-[10px] text-t-secondary font-mono mt-0.5">
                          {batch.attempt_rate_pct}% turnout
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-t-primary text-sm tabular-nums">
                        {batch.avg_score}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <span className="font-extrabold text-sm text-t-primary tabular-nums">
                          {batch.avg_percentage}%
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-t-secondary">
                        <span className="text-primary-02 font-bold">{batch.highest_score}</span> / {batch.lowest_score}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-t-primary flex items-center gap-1.5 mt-1">
                        <RiTrophyLine size={13} className="text-amber-500 shrink-0" />
                        <span className="truncate max-w-[120px]">{batch.top_student_name}</span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {batch.underperforming_flag ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-500/10 text-red-500 font-bold text-[10px] uppercase tracking-wider border border-red-500/20">
                            <RiAlertLine size={12} /> Underperforming
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary-02/10 text-primary-02 font-bold text-[10px] uppercase tracking-wider border border-primary-02/20">
                            <RiTrophyLine size={12} /> On Track
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
