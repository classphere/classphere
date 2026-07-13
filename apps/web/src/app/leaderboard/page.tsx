"use client";

import { useState, useEffect } from "react";
import Navbar from "@/components/layout/Navbar";
import { useAuth } from "@/lib/auth-context";
import {
  PageWrapper,
  SectionCard,
  TabBar,
  DataTable,
  DataTableColumn,
  Card,
} from "@/components/ui";

import {
  RiMedalFill,
  RiFireFill
} from "@remixicon/react";

const tabs = ["Global", "Institute", "Batch"] as const;
type Tab = typeof tabs[number];

// Mock data type
type LeaderboardEntry = {
  rank: number;
  name: string;
  avgScore: number;
  totalTests: number;
  streak: number;
  isCurrentUser?: boolean;
};

export default function LeaderboardPage() {
  const [activeTab, setActiveTab] = useState<Tab>("Global");
  const { user, session } = useAuth();
  const firstName = (user?.name ?? "User").split(" ")[0];
  
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Derive parameters based on activeTab
  let scope = "global";
  let queryParams = "";
  if (activeTab === "Institute") {
    scope = "institute";
    queryParams = `&institute_id=${user?.institute_id ?? ""}`;
  } else if (activeTab === "Batch") {
    scope = "batch";
    // For MVP, we just query if we have a batch. The user obj in context doesn't have batch_id directly.
    // Ideally we fetch the batch_id, but for now we'll just pass a placeholder or try to fetch it.
    // If we don't have batch_id, the API will return 400, which we catch.
  }

  useEffect(() => {
    if (!session?.access_token) return;

    const fetchLeaderboard = async () => {
      setLoading(true);
      try {
        let finalQuery = `?scope=${scope}`;
        
        if (scope === "institute") {
          if (!user?.institute_id) { setLeaderboardData([]); return; }
          finalQuery += `&institute_id=${user.institute_id}`;
        } else if (scope === "batch") {
          // Fetch user's batch first
          const batchRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/v1/rankings/me`, {
            headers: { Authorization: `Bearer ${session.access_token}` }
          }).then(r => r.json());
          
          const batchId = batchRes?.data?.batch_ranks?.[0]?.batch_id;
          if (!batchId) { setLeaderboardData([]); return; }
          finalQuery += `&batch_id=${batchId}`;
        }

        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/v1/rankings/leaderboard${finalQuery}`, {
          headers: { Authorization: `Bearer ${session.access_token}` }
        });
        const data = await res.json();
        
        if (data.success) {
          const mapped = (data.data.entries || []).map((e: any) => ({
            rank: e.rank,
            name: e.name,
            avgScore: e.avgScore,
            totalTests: e.totalTests,
            streak: e.streak,
            isCurrentUser: e.student_id === user?.id,
          }));
          setLeaderboardData(mapped);
        } else {
          setLeaderboardData([]);
        }
      } catch (err) {
        console.error(err);
        setLeaderboardData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, [activeTab, session?.access_token, user?.id, user?.institute_id]);

  const tabOptions = tabs.map(t => ({ id: t, label: t }));

  const columns: DataTableColumn<LeaderboardEntry>[] = [
    {
      key: "rank",
      label: "Rank",
      width: "100px",
      render: (row) => {
        if (row.rank === 1) return <span className="flex items-center gap-1 text-primary-05 font-bold"><RiMedalFill size={18} /> #1</span>;
        if (row.rank === 2) return <span className="flex items-center gap-1 text-t-secondary font-bold"><RiMedalFill size={18} /> #2</span>;
        if (row.rank === 3) return <span className="flex items-center gap-1 text-[#B45309] font-bold"><RiMedalFill size={18} /> #3</span>;
        return <span className="text-t-secondary font-semibold">#{row.rank}</span>;
      }
    },
    {
      key: "name",
      label: "Student",
      render: (row) => (
        <div className="flex items-center gap-3 text-left min-w-0">
          <div className={`flex size-9 shrink-0 items-center justify-center rounded-full text-[13px] font-sans font-bold ${
            row.isCurrentUser
              ? "bg-[#161616] text-white"
              : "bg-b-surface1 dark:bg-b-surface1/60 border border-black/5 dark:border-white/5 text-t-primary"
          }`}>
            {row.name.charAt(0)}
          </div>
          <div className="min-w-0">
            <div className="font-sans font-semibold text-[15px] text-t-primary truncate flex items-center leading-none">
              {row.name}
              {row.isCurrentUser && (
                <span className="px-1.5 py-0.5 rounded border border-black/5 dark:border-white/5 bg-primary-02/10 text-primary-02 text-[10px] font-sans font-bold uppercase tracking-wider ml-2">
                  You
                </span>
              )}
            </div>
            <div className="text-[12px] font-sans text-t-secondary mt-1 leading-none">JEE Target 2026</div>
          </div>
        </div>
      )
    },
    {
      key: "avgScore",
      label: "Avg Accuracy",
      align: "center",
      width: "120px",
      render: (row) => (
        <span className={`font-sans font-semibold text-[14px] ${
          row.avgScore >= 70
            ? "text-primary-02"
            : row.avgScore >= 50
              ? "text-primary-05"
              : "text-primary-03"
        }`}>
          {row.avgScore}%
        </span>
      )
    },
    {
      key: "totalTests",
      label: "Tests Taken",
      align: "center",
      width: "120px",
      render: (row) => (
        <span className="font-sans font-semibold text-[14px] text-t-primary">
          {row.totalTests}
        </span>
      )
    },
    {
      key: "streak",
      label: "Streak",
      align: "center",
      width: "100px",
      render: (row) => (
        <div className="font-sans text-[14px] text-primary-05 font-bold flex items-center justify-center gap-1">
          <RiFireFill size={16} />
          <span>{row.streak}</span>
        </div>
      )
    }
  ];

  useEffect(() => {
    import("lucide-react");
  }, []);

  const currentUserEntry = leaderboardData.find(e => e.isCurrentUser);
  const currentRank = currentUserEntry ? `#${currentUserEntry.rank}` : "#--";
  const currentPercentile = currentUserEntry && leaderboardData.length > 1
    ? Math.round(((leaderboardData.length - currentUserEntry.rank) / (leaderboardData.length - 1)) * 100)
    : (currentUserEntry ? 100 : "--");

  return (
    <>
      <Navbar title="Leaderboard" subtitle="See how you rank against students globally, in your institute, and in your batch." breadcrumbs="Dashboard > Leaderboard" />
      
      <PageWrapper>
        
        {/* Your rank card */}
        <Card 
          variant="default"
          padding="large" 
          className="group relative flex flex-col md:flex-row items-start md:items-center select-none mb-8 hover:-translate-y-1 hover:shadow-depth transition-all duration-300 gap-6"
        >

          <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(342.29deg,#070707_12.1%,#2F2E31_87.9%)] text-white text-[18px] font-sans font-semibold relative z-10 shadow-[0px_6.8656px_6.8656px_-2.33333px_rgba(0,0,0,0.16),inset_0px_1px_0px_rgba(255,255,255,0.16),inset_0px_-2px_0px_#191919] overflow-hidden">
            <i className="absolute -left-4 top-0 h-4 w-32 -rotate-[125deg] rounded-full bg-white/10 blur-[4px]" />
            <span className="relative z-10">{firstName.charAt(0)}</span>
          </div>
          
          <div className="flex-1 min-w-0 relative z-10">
            <h3 className="font-sans font-semibold text-[19px] leading-snug tracking-[-0.02em] text-t-primary mb-2.5">
              You · {user?.name ?? "User"}
            </h3>
            <div className="flex flex-wrap gap-2 text-[12px] font-sans text-t-secondary">
              <span className="px-2 py-0.5 rounded-[6px] border border-black/5 dark:border-white/5 bg-b-surface1 dark:bg-b-surface1/40 text-t-primary font-semibold tracking-wide">
                {activeTab} Rank: {currentRank}
              </span>
            </div>
          </div>
          
          <div className="text-left md:text-right shrink-0 relative z-10">
            <div className="font-sans text-[38px] font-semibold tracking-[-0.04em] text-t-primary leading-none">
              {currentPercentile}%ile
            </div>
            <div className="text-[12px] font-sans font-semibold text-t-secondary mt-1 tracking-wide">
              {activeTab} Percentile
            </div>
          </div>
        </Card>

        {/* Tabs Segment Controller */}
        <div className="mb-6">
          <TabBar tabs={tabOptions} active={activeTab} onChange={setActiveTab} />
        </div>

        {/* Table Container */}
        <SectionCard padding="none" className="relative min-h-[300px]">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-b-surface1/50 z-10">
              <div className="w-8 h-8 border-4 border-primary-01/30 border-t-primary-01 rounded-full animate-spin" />
            </div>
          )}
          <DataTable 
            columns={columns} 
            data={leaderboardData} 
            keyExtractor={(row) => row.rank.toString()}
            emptyState="No leaderboard data available yet."
          />
        </SectionCard>
      </PageWrapper>
    </>
  );
}
