"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/layout/Navbar";
import { PageWrapper, SectionCard, MetricGrid, MetricCard } from "@/components/ui";
import { RiLineChartLine, RiTimeLine, RiCrosshair2Line, RiBookOpenLine, RiLoader4Line } from "@remixicon/react";
import { useAuth } from "@/lib/auth-context";
import { apiClient } from "@/lib/api.client";

type Chapter = {
  subject: string;
  chapter: string;
  attempted: number;
  accuracy: number;
  avgTimeSec: number;
  status: "Not started" | "Learning" | "Needs revision" | "Improving" | "Reliable";
};

type Subject = { subject: string; attempted: number; accuracy: number; avgTimeSec: number };

const statusClass: Record<Chapter["status"], string> = {
  "Not started": "bg-s-stroke2 text-t-secondary",
  Learning: "bg-primary-01/10 text-primary-01",
  "Needs revision": "bg-primary-03/10 text-primary-03",
  Improving: "bg-primary-05/10 text-primary-05",
  Reliable: "bg-primary-02/10 text-primary-02",
};

export default function StudentAnalyticsPage() {
  const { session } = useAuth();
  const [data, setData] = useState<{ metrics: any; chapters: Chapter[]; subjects: Subject[]; syllabus?: { label: string; version: string; sourceUrl: string; sourcePageLimit?: number } } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.access_token) return;
    apiClient.get<{ success: boolean; data: any }>("/api/v1/dashboard/student/analytics", session.access_token)
      .then((response) => { if (response.success) setData(response.data); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [session?.access_token]);

  if (loading) {
    return <><Navbar title="My Performance Analytics" /><PageWrapper><div className="flex min-h-64 items-center justify-center text-t-secondary"><RiLoader4Line className="animate-spin" size={28} /></div></PageWrapper></>;
  }

  const metrics = data?.metrics ?? { totalTests: 0, accuracyPct: 0, avgTimeSec: 0, chaptersCovered: 0, chaptersInSyllabus: 0 };
  const formatSeconds = (seconds: number) => seconds >= 60 ? `${Math.floor(seconds / 60)}m ${seconds % 60}s` : `${seconds}s`;

  return (
    <>
      <Navbar title="My Performance Analytics" subtitle="Your test data, measured against the official syllabus." breadcrumbs="Student > Analytics" />
      <PageWrapper>
        <MetricGrid cols={4}>
          <MetricCard icon={<RiCrosshair2Line size={18} />} label="Overall Accuracy" value={`${metrics.accuracyPct}%`} />
          <MetricCard icon={<RiTimeLine size={18} />} label="Average Time / Q" value={formatSeconds(metrics.avgTimeSec)} />
          <MetricCard icon={<RiBookOpenLine size={18} />} label="Chapters Practised" value={`${metrics.chaptersCovered}/${metrics.chaptersInSyllabus}`} />
          <MetricCard icon={<RiLineChartLine size={18} />} label="Tests Attempted" value={metrics.totalTests} />
        </MetricGrid>

        {data?.chapters.length ? <div className="grid gap-3 xl:grid-cols-2">
          <SectionCard title="Chapter Readiness" subtitle={`${data.syllabus?.label ?? "Official syllabus"} ${data.syllabus?.version ?? ""} · unattempted chapters are shown as not started.`}>
            <div className="space-y-3">
              {data.chapters.slice(0, 12).map((chapter) => (
                <div key={`${chapter.subject}-${chapter.chapter}`} className="rounded-[12px] border border-s-stroke2 bg-b-surface2 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0"><p className="text-[14px] font-bold text-t-primary">{chapter.chapter}</p><p className="mt-1 text-[11px] text-t-secondary">{chapter.subject} · {chapter.attempted} attempted · {formatSeconds(chapter.avgTimeSec)}/Q</p></div>
                    <span className={`shrink-0 rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${statusClass[chapter.status]}`}>{chapter.status}</span>
                  </div>
                  <div className="mt-3 flex items-center gap-3"><div className="h-2 flex-1 overflow-hidden rounded-full bg-s-stroke2"><div className={chapter.accuracy >= 75 ? "h-full bg-primary-02" : chapter.accuracy >= 50 ? "h-full bg-primary-05" : "h-full bg-primary-03"} style={{ width: `${chapter.accuracy}%` }} /></div><span className="w-9 text-right text-[12px] font-bold text-t-primary">{chapter.accuracy}%</span></div>
                </div>
              ))}
            </div>
          </SectionCard>
          <SectionCard title="Subject Pacing" subtitle="Where accuracy and speed need attention.">
            <div className="space-y-3">
              {data.subjects.map((subject) => (
                <div key={subject.subject} className="rounded-[12px] border border-s-stroke2 bg-b-surface2 p-4"><div className="flex items-center justify-between"><div><p className="text-[14px] font-bold text-t-primary">{subject.subject}</p><p className="mt-1 text-[11px] text-t-secondary">{subject.attempted} attempted · {formatSeconds(subject.avgTimeSec)}/Q</p></div><span className={subject.accuracy >= 75 ? "text-primary-02 font-black" : subject.accuracy >= 50 ? "text-primary-05 font-black" : "text-primary-03 font-black"}>{subject.accuracy}%</span></div></div>
              ))}
            </div>
          </SectionCard>
        </div> : null}
        {data?.syllabus && <p className="mt-4 text-xs text-t-secondary">Catalog source: <a className="font-semibold text-primary-01 underline underline-offset-2" href={data.syllabus.sourceUrl} target="_blank" rel="noreferrer">official {data.syllabus.label} syllabus</a>{data.syllabus.sourcePageLimit ? ` (catalog scope: pages 1–${data.syllabus.sourcePageLimit})` : ""}.</p>}
      </PageWrapper>
    </>
  );
}
