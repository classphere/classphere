"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import { useAuth } from "@/lib/auth-context";
import { apiClient } from "@/lib/api.client";
import { PremiumMetricCard as MetricCard, PremiumMetricGrid as MetricGrid, PremiumSectionCard as SectionCard } from "@/components/premium-ui";
import { RiCheckLine, RiTimeLine, RiTeamLine, RiTimerLine, RiMedalLine } from "@remixicon/react";

export default function DPPAnalyticsPage() {
  const { id } = useParams();
  const { session } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    if (!session?.access_token || !id) return;
    const fetchAnalytics = async () => {
      setLoading(true);
      try {
        const res = await apiClient.get(`/api/v1/dpps/${id}/analytics`, session.access_token);
        if (res.success) {
          setData(res.data);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, [id, session?.access_token]);

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-01"></div>
      </div>
    );
  }

  const { dpp, analytics } = data;

  const formatTime = (seconds: number) => {
    if (!seconds) return "—";
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  };

  return (
    <>
      <Navbar
        title="DPP Analytics"
        subtitle={dpp.title}
        breadcrumbs={`Dashboard > DPPs > ${dpp.title}`}
      />
      
      <main className="mx-auto w-full max-w-screen-2xl px-4 pb-10 sm:px-6 md:px-8">
        <MetricGrid cols={4}>
          <MetricCard
            icon={<RiTeamLine size={20} />}
            label="Total Assigned"
            value={<span className="text-t-primary">{analytics.totalStudents}</span>}
          />
          <MetricCard
            icon={<RiCheckLine size={20} />}
            label="Completion Rate"
            value={<span className="text-primary-01">{analytics.completionRate}%</span>}
          />
          <MetricCard
            icon={<RiMedalLine size={20} />}
            label="Submitted"
            value={<span className="text-primary-02">{analytics.submittedCount}</span>}
          />
          <MetricCard
            icon={<RiTimerLine size={20} />}
            label="Avg Time"
            value={<span className="text-primary-05">{formatTime(analytics.averageTimeSeconds)}</span>}
          />
        </MetricGrid>

        <div className="grid gap-6 lg:grid-cols-[2fr_1fr] mt-6">
          <SectionCard title="Submitted Students" subtitle="Ranked by score">
            {analytics.submitted.length === 0 ? (
              <div className="text-center py-10 text-t-secondary text-sm">No submissions yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-s-stroke2 text-xs uppercase tracking-wider text-t-secondary">
                      <th className="py-3 px-4 font-semibold">Rank</th>
                      <th className="py-3 px-4 font-semibold">Student</th>
                      <th className="py-3 px-4 font-semibold text-right">Score</th>
                      <th className="py-3 px-4 font-semibold text-right">Time Taken</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {analytics.submitted.map((s: any, idx: number) => (
                      <tr key={s.student_id} className="border-b border-s-stroke2/50 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors">
                        <td className="py-3 px-4 text-t-secondary font-medium">#{idx + 1}</td>
                        <td className="py-3 px-4 text-t-primary font-medium">{s.name}</td>
                        <td className="py-3 px-4 text-right">
                          <span className={s.percentage >= 80 ? "text-primary-02 font-bold" : s.percentage >= 50 ? "text-primary-05 font-bold" : "text-primary-03 font-bold"}>
                            {s.percentage}%
                          </span>
                          <span className="text-t-secondary text-xs ml-2">({s.score}/{s.max_score})</span>
                        </td>
                        <td className="py-3 px-4 text-right text-t-secondary tabular-nums">
                          {formatTime(s.time_taken_seconds)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>

          <SectionCard title="Pending Students" subtitle="Yet to submit">
            {analytics.pending.length === 0 ? (
              <div className="text-center py-10 text-t-secondary text-sm">All students have submitted.</div>
            ) : (
              <ul className="flex flex-col gap-2">
                {analytics.pending.map((p: any) => (
                  <li key={p.student_id} className="flex items-center gap-3 p-3 rounded-[12px] bg-b-surface2 border border-s-stroke2">
                    <div className="w-8 h-8 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center text-t-secondary font-semibold">
                      {p.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm font-medium text-t-primary">{p.name}</span>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </div>
      </main>
    </>
  );
}
