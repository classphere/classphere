"use client";

import { useState, useEffect } from "react";
import { RiTrophyLine, RiMedalLine, RiArrowUpLine, RiArrowDownLine } from "@remixicon/react";
import { apiClient } from "@/lib/api.client";
import { useAuth } from "@/lib/auth-context";
import { PremiumCard } from "@/components/premium-ui";

export function LeaderboardWidget() {
  const { session, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [myRank, setMyRank] = useState<any>(null);
  const [batchName, setBatchName] = useState<string>("");

  useEffect(() => {
    if (!session?.access_token) return;

    const fetchLeaderboard = async () => {
      setLoading(true);
      try {
        // 1. Get my ranks to find my primary batch
        const meRes = await apiClient.get("/api/v1/rankings/me", session.access_token);
        let targetBatchId = null;
        
        if (meRes.success && meRes.data.batch_ranks?.length > 0) {
          const primaryBatch = meRes.data.batch_ranks[0];
          targetBatchId = primaryBatch.batch_id;
          setBatchName(primaryBatch.batch_name);
          setMyRank(primaryBatch);
        }

        // 2. Fetch the actual leaderboard for that batch
        if (targetBatchId) {
          const lbRes = await apiClient.get(`/api/v1/rankings/leaderboard?scope=batch&batch_id=${targetBatchId}&limit=10`, session.access_token);
          if (lbRes.success) {
            setLeaderboard(lbRes.data.entries || []);
          }
        }
      } catch (err) {
        console.error("Failed to fetch leaderboard", err);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, [session?.access_token]);

  if (loading) {
    return (
      <PremiumCard padding="default" className="flex flex-col gap-4 w-full h-[400px] animate-pulse">
        <div className="h-6 w-48 bg-b-surface2 rounded" />
        <div className="flex-1 flex flex-col gap-3 mt-4">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-12 w-full bg-b-surface2 rounded-xl" />
          ))}
        </div>
      </PremiumCard>
    );
  }

  if (!leaderboard.length) {
    return (
      <PremiumCard padding="default" className="flex flex-col w-full">
        <h3 className="font-sans font-semibold text-[18px] text-t-primary mb-1">Batch Leaderboard</h3>
        <p className="text-sm text-t-secondary mb-4">You are not in any active batches with rankings yet.</p>
      </PremiumCard>
    );
  }

  return (
    <PremiumCard padding="default" className="flex flex-col w-full min-w-0 h-[400px]">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="font-sans font-semibold text-[18px] text-t-primary tracking-[-0.01em] flex items-center gap-2">
            <RiTrophyLine size={20} className="text-primary-02" />
            Top Performers
          </h3>
          <p className="text-[13px] text-t-secondary mt-1">{batchName}</p>
        </div>
        
        {myRank && (
          <div className="flex flex-col items-end">
            <span className="text-[11px] font-sans font-bold uppercase tracking-wider text-t-tertiary">Your Rank</span>
            <span className="text-[20px] font-mono font-bold text-primary-02">#{myRank.rank}</span>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2 relative flex-1 overflow-y-auto pr-2 custom-scrollbar">
        {leaderboard.map((entry, idx) => {
          const isMe = entry.student_id === user?.id;
          let RankIcon = null;
          if (idx === 0) RankIcon = <RiMedalLine size={18} className="text-yellow-500" />;
          else if (idx === 1) RankIcon = <RiMedalLine size={18} className="text-gray-400" />;
          else if (idx === 2) RankIcon = <RiMedalLine size={18} className="text-amber-600" />;

          return (
            <div 
              key={entry.student_id}
              className={`flex items-center justify-between p-3 rounded-[12px] transition-all shrink-0 ${
                isMe 
                  ? "bg-primary-02/10 border border-primary-02/30 shadow-[0_0_12px_rgba(42,133,255,0.15)]" 
                  : "bg-b-surface1 dark:bg-b-surface1/50 border border-transparent hover:border-s-stroke2/40"
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`w-8 flex justify-center font-mono font-bold ${idx < 3 ? 'text-t-primary' : 'text-t-tertiary'}`}>
                  {RankIcon ? RankIcon : `#${idx + 1}`}
                </div>
                <div className="flex flex-col">
                  <span className={`text-[14px] font-sans font-semibold ${isMe ? 'text-primary-02' : 'text-t-primary'}`}>
                    {entry.name} {isMe && "(You)"}
                  </span>
                  <span className="text-[11px] text-t-tertiary">
                    {entry.streak} day streak
                  </span>
                </div>
              </div>

              <div className="flex flex-col items-end text-right">
                <span className="text-[14px] font-mono font-bold text-t-primary">{entry.rankScore}</span>
                <span className="text-[11px] text-t-tertiary">Rank Score</span>
              </div>
            </div>
          );
        })}
      </div>
    </PremiumCard>
  );
}
