"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import { useAuth } from "@/lib/auth-context";
import { apiClient } from "@/lib/api.client";
import {
  SectionCard,
  MetricCard,
  MetricGrid,
  EmptyState,
  PageWrapper,
  SecondaryButton,
  Card,
} from "@/components/ui";

import {
  RiFlashlightFill,
  RiCheckboxCircleFill,
  RiPlayLine,
  RiGitMergeLine,
  RiLineChartLine,
  RiLoader4Line,
} from "@remixicon/react";

type HistoryItem = {
  id: string;
  title: string;
  test_type: string;
  subject?: string;
  exam_code: string;
  score: number;
  max_score: number;
  percentage: number;
  submitted_at: string;
};

function TestHistoryCard({ item }: { item: HistoryItem }) {
  const pct = item.percentage;
  const pctColor = pct >= 70 ? "text-primary-02" : pct >= 50 ? "text-primary-05" : "text-primary-03";
  const testTypeLabel =
    item.test_type === "pyq" ? "PYQ" :
    item.test_type === "mock-test" ? "Mock Test" :
    "Chapter-wise";

  return (
    <Card
      variant="default"
      padding="default"
      className="group relative overflow-hidden hover:-translate-y-1 hover:shadow-depth transition-all duration-300 select-none"
    >
      <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-sans font-bold px-2 py-0.5 border border-black/5 dark:border-white/5 bg-b-surface1 dark:bg-b-surface1/40 text-t-secondary rounded-[6px] uppercase tracking-wider">
              {testTypeLabel}
            </span>
            <span className="text-[12px] font-sans font-semibold text-t-secondary tracking-wide">
              {item.submitted_at
                ? new Date(item.submitted_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
                : ""}
            </span>
          </div>

          <h3 className="font-sans font-semibold text-[17px] leading-snug tracking-[-0.02em] text-t-primary">
            {item.title}
          </h3>
          {item.subject && (
            <p className="text-[13px] font-sans text-t-secondary mt-0.5">{item.subject}</p>
          )}

          <div className="mt-4 flex flex-wrap gap-1.5">
            <span className="text-[10px] font-sans font-bold px-2 py-0.5 border border-black/5 dark:border-white/5 bg-b-surface1 dark:bg-b-surface1/40 text-t-secondary rounded-[6px] uppercase tracking-wider">
              {item.score} / {item.max_score} marks
            </span>
            <span className="text-[10px] font-sans font-bold px-2 py-0.5 border border-black/5 dark:border-white/5 bg-b-surface1 dark:bg-b-surface1/40 text-t-secondary rounded-[6px] uppercase tracking-wider">
              {item.exam_code?.replace("-", " ").toUpperCase()}
            </span>
          </div>
        </div>

        <div className="flex shrink-0 items-start gap-4 lg:flex-col lg:items-end lg:text-right">
          <div>
            <div className={`font-sans text-[24px] font-semibold tracking-[-0.01em] leading-none ${pctColor}`}>
              {pct}%
            </div>
            <div className="text-[11px] font-sans font-bold text-t-secondary uppercase tracking-widest mt-1">Score</div>
          </div>
          <Link href={`/results/${item.id}`} className="block">
            <SecondaryButton>View Analysis</SecondaryButton>
          </Link>
        </div>
      </div>
    </Card>
  );
}

export default function HistoryPage() {
  const { session } = useAuth();
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session?.access_token) return;

    const fetchHistory = async () => {
      setLoading(true);
      try {
        const res = await apiClient.get("/api/v1/dashboard/student/history?limit=50", session.access_token) as any;
        if (res.success) {
          setHistory(res.data.history ?? []);
        } else {
          setError(res.message ?? "Failed to load history");
        }
      } catch (e: any) {
        setError(e.message ?? "Network error");
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [session?.access_token]);

  const totalTests = history.length;
  const bestScore = history.length > 0 ? Math.max(...history.map((h) => h.percentage)) : 0;
  const avgPct = history.length > 0
    ? Math.round(history.reduce((s, h) => s + h.percentage, 0) / history.length)
    : 0;

  return (
    <>
      <Navbar title="Test History" subtitle="Your completed test sessions, performance record, and score analysis." breadcrumbs="Dashboard > Test History" />

      <PageWrapper>
        {/* Stats Row */}
        <MetricGrid cols={3}>
          <MetricCard
            icon={<RiPlayLine size={18} />}
            label="Tests Completed"
            value={loading ? "—" : totalTests}
            badge="Total"
            badgeLabel="submitted attempts"
          />
          <MetricCard
            icon={<RiGitMergeLine size={18} />}
            label="Best Score"
            value={loading ? "—" : `${bestScore}%`}
            badge="Peak"
            badgeLabel="highest percentage"
          />
          <MetricCard
            icon={<RiLineChartLine size={18} />}
            label="Average Score"
            value={loading ? "—" : `${avgPct}%`}
            badge="Overall"
            badgeLabel="across all tests"
          />
        </MetricGrid>

        {/* History List */}
        {loading ? (
          <SectionCard padding="none">
            <div className="flex items-center justify-center gap-3 py-16 text-t-secondary">
              <RiLoader4Line size={22} className="animate-spin text-primary-01" />
              <span className="font-sans font-semibold text-[14px]">Loading your test history...</span>
            </div>
          </SectionCard>
        ) : error ? (
          <SectionCard padding="none">
            <EmptyState
              icon={<RiLineChartLine size={48} />}
              title="Couldn't load history"
              description={error}
            />
          </SectionCard>
        ) : history.length === 0 ? (
          <SectionCard padding="none">
            <EmptyState
              icon={<RiLineChartLine size={48} />}
              title="No tests completed yet"
              description="Once you complete a test, it will appear here along with your full performance analysis."
            />
          </SectionCard>
        ) : (
          <div className="flex flex-col gap-4">
            {history.map((item) => (
              <TestHistoryCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </PageWrapper>
    </>
  );
}
