"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/layout/Navbar";
import { useAuth } from "@/lib/auth-context";
import { PageWrapper, SectionCard, DataTable, DataTableColumn, Card } from "@/components/ui";
import { RiMedalFill, RiLoader4Line, RiTrophyLine } from "@remixicon/react";
import { apiClient } from "@/lib/api.client";

type Batch = { id: string; name: string };
type Paper = { id: string; title: string };
type TestEntry = { student_id: string; name: string; rank: number; score: number; max_score: number; percentage: number; percentile: number };
type WeeklyEntry = { student_id: string; name: string; rank: number; questions_solved: number };
type LeaderboardTab = "test" | "weekly";

export default function LeaderboardPage() {
  const { user, session } = useAuth();
  const [batch, setBatch] = useState<Batch | null>(null);
  const [papers, setPapers] = useState<Paper[]>([]);
  const [paperId, setPaperId] = useState("");
  const [tab, setTab] = useState<LeaderboardTab>("test");
  const [testEntries, setTestEntries] = useState<TestEntry[]>([]);
  const [weeklyEntries, setWeeklyEntries] = useState<WeeklyEntry[]>([]);
  const [median, setMedian] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.access_token) return;
    apiClient.get<{ success: boolean; data: { batches: Batch[] } }>("/api/v1/rankings/batches", session.access_token)
      .then((response) => {
        if (!response.success) return;
        const currentBatch = response.data.batches[0] ?? null;
        setBatch(currentBatch);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [session?.access_token]);

  useEffect(() => {
    if (!session?.access_token || !batch?.id) return;
    setLoading(true);
    apiClient.get<{ success: boolean; data: { papers: Paper[] } }>(`/api/v1/rankings/papers?batch_id=${batch.id}`, session.access_token)
      .then((response) => {
        if (!response.success) return;
        const completedPapers = response.data.papers ?? [];
        setPapers(completedPapers);
        setPaperId(completedPapers[0]?.id ?? "");
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [batch?.id, session?.access_token]);

  useEffect(() => {
    if (!session?.access_token || !batch?.id || tab !== "test") return;
    if (!paperId) { setTestEntries([]); return; }
    setLoading(true);
    apiClient.get<{ success: boolean; data: { entries: TestEntry[]; batch_median: number } }>(`/api/v1/rankings/paper?batch_id=${batch.id}&paper_id=${paperId}`, session.access_token)
      .then((response) => {
        if (response.success) {
          setTestEntries(response.data.entries);
          setMedian(response.data.batch_median);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [batch?.id, paperId, session?.access_token, tab]);

  useEffect(() => {
    if (!session?.access_token || !batch?.id || tab !== "weekly") return;
    setLoading(true);
    apiClient.get<{ success: boolean; data: { entries: WeeklyEntry[] } }>(`/api/v1/rankings/weekly?batch_id=${batch.id}`, session.access_token)
      .then((response) => { if (response.success) setWeeklyEntries(response.data.entries); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [batch?.id, session?.access_token, tab]);

  const mine = testEntries.find((entry) => entry.student_id === user?.id);
  const weeklyMine = weeklyEntries.find((entry) => entry.student_id === user?.id);
  const testColumns: DataTableColumn<TestEntry>[] = [
    { key: "rank", label: "Rank", width: "100px", render: (row) => rankCell(row.rank) },
    { key: "name", label: "Student", render: (row) => studentCell(row, user?.id) },
    { key: "score", label: "Score", align: "center", render: (row) => <span className="font-semibold text-t-primary">{row.score}/{row.max_score}</span> },
    { key: "percentage", label: "Accuracy", align: "center", render: (row) => <span className="font-bold text-primary-02">{row.percentage}%</span> },
  ];
  const weeklyColumns: DataTableColumn<WeeklyEntry>[] = [
    { key: "rank", label: "Rank", width: "100px", render: (row) => rankCell(row.rank) },
    { key: "name", label: "Student", render: (row) => studentCell(row, user?.id) },
    { key: "questions_solved", label: "Questions solved", align: "center", render: (row) => <span className="font-bold text-primary-01">{row.questions_solved}</span> },
  ];

  return <>
    <Navbar title="Leaderboard" subtitle={batch ? `Your batch · ${batch.name}` : "Compare progress with your batchmates."} breadcrumbs="Student > Leaderboard" />
    <PageWrapper>
      <div className="mb-6 flex w-fit rounded-[14px] bg-b-surface2 p-1 shadow-widget">
        <button onClick={() => setTab("test")} className={`rounded-[10px] px-4 py-2 text-[13px] font-bold transition ${tab === "test" ? "bg-shade-02 text-white" : "text-t-secondary hover:text-t-primary"}`}>Test leaderboard</button>
        <button onClick={() => setTab("weekly")} className={`rounded-[10px] px-4 py-2 text-[13px] font-bold transition ${tab === "weekly" ? "bg-shade-02 text-white" : "text-t-secondary hover:text-t-primary"}`}>Weekly leaderboard</button>
      </div>

      {!batch && !loading ? <SectionCard padding="none"><div className="py-16 text-center"><p className="text-[15px] font-bold text-t-primary">You are not assigned to a batch yet.</p><p className="mt-2 text-[13px] text-t-secondary">Ask your institute to assign you to a batch to unlock fair comparisons.</p></div></SectionCard> : <>
        {tab === "test" ? <>
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-[16px] font-bold text-t-primary">Same-paper ranking</h2><p className="mt-1 text-[13px] text-t-secondary">Your newest completed batch test is selected automatically.</p></div><select value={paperId} onChange={(event) => setPaperId(event.target.value)} className="h-11 min-w-[260px] rounded-[10px] border border-s-stroke2 bg-b-surface2 px-3 text-sm font-semibold text-t-primary"><option value="">No completed batch tests</option>{papers.map((paper) => <option key={paper.id} value={paper.id}>{paper.title}</option>)}</select></div>
          {mine ? <Card variant="default" padding="large" className="mb-6 flex items-center justify-between"><div><p className="text-sm font-semibold text-t-secondary">Your result for this paper</p><p className="mt-1 text-xl font-bold text-t-primary">Rank #{mine.rank} · {mine.percentile}%ile</p></div><div className="text-right"><p className="text-sm text-t-secondary">Batch median</p><p className="mt-1 text-xl font-bold text-primary-01">{median}%</p></div></Card> : null}
          <LeaderboardTable loading={loading} columns={testColumns} entries={testEntries} emptyState="Complete a batch-assigned test to see a fair comparison." />
        </> : <>
          <div className="mb-5"><h2 className="flex items-center gap-2 text-[16px] font-bold text-t-primary"><RiTrophyLine size={18} className="text-primary-05" /> Weekly practice ranking</h2><p className="mt-1 text-[13px] text-t-secondary">Ranked by questions answered this week across tests and DPPs.</p></div>
          {weeklyMine ? <Card variant="default" padding="large" className="mb-6"><p className="text-sm font-semibold text-t-secondary">Your progress this week</p><p className="mt-1 text-xl font-bold text-t-primary">Rank #{weeklyMine.rank} · {weeklyMine.questions_solved} questions solved</p></Card> : null}
          <LeaderboardTable loading={loading} columns={weeklyColumns} entries={weeklyEntries} emptyState="No questions have been solved in your batch this week yet." />
        </>}
      </>}
    </PageWrapper>
  </>;
}

function rankCell(rank: number) {
  return rank <= 3 ? <span className="flex items-center gap-1 font-bold text-primary-05"><RiMedalFill size={18} /> #{rank}</span> : <span className="font-semibold text-t-secondary">#{rank}</span>;
}

function studentCell(row: { student_id: string; name: string }, currentUserId?: string) {
  return <span className={row.student_id === currentUserId ? "font-bold text-primary-01" : "font-semibold text-t-primary"}>{row.name}{row.student_id === currentUserId ? " (You)" : ""}</span>;
}

function LeaderboardTable<T extends { student_id: string }>({ loading, columns, entries, emptyState }: { loading: boolean; columns: DataTableColumn<T>[]; entries: T[]; emptyState: string }) {
  return <SectionCard padding="none" className="relative min-h-[280px]">{loading && <div className="absolute inset-0 z-10 flex items-center justify-center bg-b-surface1/60"><RiLoader4Line className="animate-spin text-primary-01" size={28} /></div>}<DataTable columns={columns} data={entries} keyExtractor={(row) => row.student_id} emptyState={emptyState} /></SectionCard>;
}
