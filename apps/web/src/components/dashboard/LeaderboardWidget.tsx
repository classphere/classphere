"use client";

import { RiMedalLine, RiTrophyLine } from "@remixicon/react";
import { useApiQuery } from "@/lib/hooks/useApiQuery";
import { useAuth } from "@/lib/auth-context";
import { PremiumCard } from "@/components/premium-ui";
import Link from "next/link";

export function LeaderboardWidget() {
  const { user } = useAuth();
  // Three dependent steps: pick the student's batch, then its latest paper, then
  // that paper's ranking. Each is cached separately, so the batches lookup is
  // shared with anything else that needs it rather than refetched per widget.
  const { data: batchData } = useApiQuery<{ batches: any[] }>("/api/v1/rankings/batches");
  const batchId = batchData?.batches?.[0]?.id;

  const { data: paperData } = useApiQuery<{ papers: any[] }>(
    batchId ? `/api/v1/rankings/papers?batch_id=${batchId}` : null,
  );
  const paper = paperData?.papers?.[0];

  const { data: leaderboard } = useApiQuery<{ entries: any[] }>(
    batchId && paper ? `/api/v1/rankings/paper?batch_id=${batchId}&paper_id=${paper.id}` : null,
  );

  const paperTitle = paper?.title ?? "";
  const entries = leaderboard?.entries?.slice(0, 5) ?? [];
  const mine = leaderboard?.entries?.find((entry: any) => entry.student_id === user?.id) ?? null;


  if (!entries.length) return <PremiumCard padding="default"><h3 className="text-[18px] font-semibold text-t-primary">Batch Performance</h3><p className="mt-1 text-sm text-t-secondary">Complete a batch test to compare yourself on the same paper.</p><Link href="/student/leaderboard" className="mt-4 inline-flex text-[12px] font-bold text-primary-01">Open leaderboard</Link></PremiumCard>;
  return <PremiumCard padding="default" className="min-w-0"><div className="mb-4 flex items-start justify-between gap-3"><div><h3 className="flex items-center gap-2 text-[18px] font-semibold text-t-primary"><RiTrophyLine size={20} className="text-primary-02" /> Batch Performance</h3><p className="mt-1 line-clamp-1 text-[12px] text-t-secondary">{paperTitle}</p></div>{mine && <div className="text-right"><p className="text-[10px] font-bold uppercase text-t-tertiary">Your rank</p><p className="text-[20px] font-bold text-primary-02">#{mine.rank}</p></div>}</div><div className="flex flex-col gap-2">{entries.slice(0, 3).map((entry, index) => <div key={entry.student_id} className={`flex items-center justify-between rounded-[12px] border p-3 ${entry.student_id === user?.id ? "border-primary-02/30 bg-primary-02/10" : "border-transparent bg-b-surface1"}`}><div className="flex items-center gap-3"><span className="w-6 text-center text-sm font-bold text-t-secondary">{index < 3 ? <RiMedalLine size={17} className="inline text-primary-05" /> : `#${entry.rank}`}</span><span className="text-sm font-semibold text-t-primary">{entry.name}{entry.student_id === user?.id ? " (You)" : ""}</span></div><span className="text-sm font-bold text-primary-02">{entry.percentage}%</span></div>)}</div><Link href="/student/leaderboard" className="mt-4 flex h-10 items-center justify-center rounded-[10px] border border-s-stroke2 text-[12px] font-bold text-t-secondary transition hover:text-t-primary">View full leaderboard</Link></PremiumCard>;
}
