"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/layout/Navbar";
import { useAuth } from "@/lib/auth-context";
import { PageWrapper, SectionCard, DataTable, DataTableColumn, Card } from "@/components/ui";
import { RiMedalFill, RiLoader4Line, RiTrophyLine } from "@remixicon/react";
import { useApiQuery } from "@/lib/hooks/useApiQuery";

type Batch = { id: string; name: string };
type Paper = { id: string; title: string };
type TestEntry = { student_id: string; name: string; rank: number; score: number; max_score: number; percentage: number; percentile: number };
type WeeklyEntry = { student_id: string; name: string; rank: number; questions_solved: number };
type LifetimeEntry = {
  student_id: string; name: string; rank: number; tests_taken: number;
  average_percentage: number; average_percentile: number; consistency: number;
  trend: number; performance_score: number;
};
type LeaderboardTab = "test" | "weekly" | "lifetime";

export default function LeaderboardPage() {
  const { user, session } = useAuth();
  const [paperId, setPaperId] = useState("");
  const [tab, setTab] = useState<LeaderboardTab>("test");

  // Four steps, each depending on the one above: which batch the student is in,
  // which papers that batch has completed, then the ranking for the selected
  // paper or the week. Passing a null path keeps a step from firing until its
  // input exists, and each step caches on its own — switching between the two
  // tabs no longer refetches the batch and paper lookups every time.
  const { data: batchData, isLoading: batchLoading } = useApiQuery<{ batches: Batch[] }>(
    "/api/v1/rankings/batches",
  );
  const batch = batchData?.batches?.[0] ?? null;

  const { data: paperData, isLoading: papersLoading } = useApiQuery<{ papers: Paper[] }>(
    batch?.id ? `/api/v1/rankings/papers?batch_id=${batch.id}` : null,
  );
  const papers = paperData?.papers ?? [];

  // The picker defaults to the most recent completed paper, then the student
  // owns the selection.
  const firstPaperId = paperData?.papers?.[0]?.id;
  useEffect(() => {
    if (firstPaperId && !paperId) setPaperId(firstPaperId);
  }, [firstPaperId, paperId]);

  const { data: testData, isLoading: testLoading } = useApiQuery<{ entries: TestEntry[]; batch_median: number }>(
    tab === "test" && batch?.id && paperId
      ? `/api/v1/rankings/paper?batch_id=${batch.id}&paper_id=${paperId}`
      : null,
  );
  const testEntries = testData?.entries ?? [];
  const median = testData?.batch_median ?? null;

  const { data: weeklyData, isLoading: weeklyLoading } = useApiQuery<{ entries: WeeklyEntry[] }>(
    tab === "weekly" && batch?.id ? `/api/v1/rankings/weekly?batch_id=${batch.id}` : null,
  );
  const weeklyEntries = weeklyData?.entries ?? [];

  const { data: lifetimeData, isLoading: lifetimeLoading } = useApiQuery<{ entries: LifetimeEntry[]; min_tests: number }>(
    tab === "lifetime" && batch?.id ? `/api/v1/rankings/lifetime?batch_id=${batch.id}` : null,
  );
  const lifetimeEntries = lifetimeData?.entries ?? [];
  const minTests = lifetimeData?.min_tests ?? 3;

  // isLoading rather than isPending: the steps that are disabled report
  // `pending` forever, which would pin this page to a spinner.
  const loading = batchLoading || papersLoading || testLoading || weeklyLoading || lifetimeLoading;

  const mine = testEntries.find((entry) => entry.student_id === user?.id);
  const weeklyMine = weeklyEntries.find((entry) => entry.student_id === user?.id);
  const lifetimeMine = lifetimeEntries.find((entry) => entry.student_id === user?.id);
  const testColumns: DataTableColumn<TestEntry>[] = [
    { key: "rank", label: "Rank", width: "100px", render: (row) => rankCell(row.rank) },
    { key: "name", label: "Student", render: (row) => studentCell(row, user?.id) },
    { key: "score", label: "Score", align: "center", render: (row) => <span className="font-semibold text-t-primary">{row.score}/{row.max_score}</span> },
    { key: "percentage", label: "Accuracy", align: "center", render: (row) => <span className="font-bold text-primary-02">{row.percentage}%</span> },
  ];
  const weeklyColumns: DataTableColumn<WeeklyEntry>[] = [
    { key: "rank", label: "Rank", width: "100px", render: (row) => rankCell(row.rank) },
    { key: "name", label: "Student", render: (row) => studentCell(row, user?.id) },
    { key: "questions_solved", label: "Solved correctly", align: "center", render: (row) => <span className="font-bold text-primary-01">{row.questions_solved}</span> },
  ];
  // Consistency and trend are shown rather than hidden inside the score: a
  // student overtaken by someone with a lower average should be able to see it
  // was steadiness or improvement that did it.
  const lifetimeColumns: DataTableColumn<LifetimeEntry>[] = [
    { key: "rank", label: "Rank", width: "100px", render: (row) => rankCell(row.rank) },
    { key: "name", label: "Student", render: (row) => studentCell(row, user?.id) },
    { key: "tests_taken", label: "Tests", align: "center", render: (row) => <span className="font-semibold text-t-secondary">{row.tests_taken}</span> },
    { key: "average_percentage", label: "Average", align: "center", render: (row) => <span className="font-bold text-primary-02">{row.average_percentage}%</span> },
    { key: "consistency", label: "Consistency", align: "center", render: (row) => <span className="font-semibold text-t-primary">{row.consistency}</span> },
    {
      key: "trend", label: "Trend", align: "center",
      render: (row) => (
        <span className={`font-bold ${row.trend > 0 ? "text-primary-02" : row.trend < 0 ? "text-primary-03" : "text-t-secondary"}`}>
          {row.trend > 0 ? `+${row.trend}` : row.trend}
        </span>
      ),
    },
  ];

  return <>
    <Navbar title="Leaderboard" subtitle={batch ? `Your batch · ${batch.name}` : "Compare progress with your batchmates."} breadcrumbs="Student > Leaderboard" />
    <PageWrapper>
      <div className="mb-3 flex w-fit rounded-[14px] bg-b-surface2 p-1 shadow-widget">
        <button onClick={() => setTab("test")} className={`rounded-[10px] px-4 py-2 text-[13px] font-bold transition ${tab === "test" ? "bg-shade-02 text-white" : "text-t-secondary hover:text-t-primary"}`}>Test leaderboard</button>
        <button onClick={() => setTab("weekly")} className={`rounded-[10px] px-4 py-2 text-[13px] font-bold transition ${tab === "weekly" ? "bg-shade-02 text-white" : "text-t-secondary hover:text-t-primary"}`}>Weekly leaderboard</button>
        <button onClick={() => setTab("lifetime")} className={`rounded-[10px] px-4 py-2 text-[13px] font-bold transition ${tab === "lifetime" ? "bg-shade-02 text-white" : "text-t-secondary hover:text-t-primary"}`}>All time</button>
      </div>

      {!batch && !loading ? <SectionCard padding="none"><div className="py-10 text-center"><p className="text-[15px] font-bold text-t-primary">You are not assigned to a batch yet.</p><p className="mt-2 text-[13px] text-t-secondary">Ask your institute to assign you to a batch to unlock fair comparisons.</p></div></SectionCard> : <>
        {tab === "test" ? <>
          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-[16px] font-bold text-t-primary">Same-paper ranking</h2><p className="mt-1 text-[13px] text-t-secondary">Your newest completed batch test is selected automatically.</p></div><select value={paperId} onChange={(event) => setPaperId(event.target.value)} className="h-11 min-w-[260px] rounded-[10px] border border-s-stroke2 bg-b-surface2 px-3 text-sm font-semibold text-t-primary"><option value="">No completed batch tests</option>{papers.map((paper) => <option key={paper.id} value={paper.id}>{paper.title}</option>)}</select></div>
          {mine ? <Card variant="default" padding="large" className="mb-3 flex items-center justify-between"><div><p className="text-sm font-semibold text-t-secondary">Your result for this paper</p><p className="mt-1 text-xl font-bold text-t-primary">Rank #{mine.rank} · {mine.percentile}%ile</p></div><div className="text-right"><p className="text-sm text-t-secondary">Batch median</p><p className="mt-1 text-xl font-bold text-primary-01">{median}%</p></div></Card> : null}
          <LeaderboardTable loading={loading} columns={testColumns} entries={testEntries} emptyState="Complete a batch-assigned test to see a fair comparison." />
        </> : tab === "weekly" ? <>
          <div className="mb-3"><h2 className="flex items-center gap-2 text-[16px] font-bold text-t-primary"><RiTrophyLine size={18} className="text-primary-05" /> Weekly practice ranking</h2><p className="mt-1 text-[13px] text-t-secondary">Ranked by unique questions answered correctly this week, across tests and DPPs.</p></div>
          {weeklyMine ? <Card variant="default" padding="large" className="mb-3"><p className="text-sm font-semibold text-t-secondary">Your progress this week</p><p className="mt-1 text-xl font-bold text-t-primary">Rank #{weeklyMine.rank} · {weeklyMine.questions_solved} solved correctly</p></Card> : null}
          <LeaderboardTable loading={loading} columns={weeklyColumns} entries={weeklyEntries} emptyState="Nobody in your batch has solved a question correctly this week yet." />
        </> : <>
          <div className="mb-3"><h2 className="flex items-center gap-2 text-[16px] font-bold text-t-primary"><RiTrophyLine size={18} className="text-primary-05" /> All-time standing</h2><p className="mt-1 text-[13px] text-t-secondary">Your last {8} tests, ranked on how you placed against your batch on each paper — so a hard paper never counts against you. Steadiness and improvement count too. Needs at least {minTests} completed tests.</p></div>
          {lifetimeMine ? <Card variant="default" padding="large" className="mb-3 flex items-center justify-between"><div><p className="text-sm font-semibold text-t-secondary">Your standing in this batch</p><p className="mt-1 text-xl font-bold text-t-primary">Rank #{lifetimeMine.rank} · {lifetimeMine.average_percentile}%ile average</p></div><div className="text-right"><p className="text-sm text-t-secondary">Consistency</p><p className="mt-1 text-xl font-bold text-primary-01">{lifetimeMine.consistency}</p></div></Card> : null}
          <LeaderboardTable loading={loading} columns={lifetimeColumns} entries={lifetimeEntries} emptyState={`No one in your batch has completed ${minTests} tests yet.`} />
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
