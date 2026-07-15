"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  RiArrowLeftLine,
  RiPieChart2Line,
  RiFocus2Line,
  RiAlertLine,
  RiCheckDoubleLine,
  RiAddLine,
} from "@remixicon/react";
import Navbar from "@/components/layout/Navbar";
import { useAuth } from "@/lib/auth-context";

export default function BatchAnalysisPage() {
  const params = useParams();
  const batchId = params.id as string;
  const { session } = useAuth();
  
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.access_token) return;
    const fetchAnalytics = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/v1/dashboard/teacher/batch/${batchId}/analytics`, {
          headers: { Authorization: `Bearer ${session.access_token}` }
        });
        const json = await res.json();
        if (json.success) {
          setData(json.data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, [batchId, session?.access_token]);

  if (loading || !data) {
    return (
      <>
        <Navbar title="Loading..." subtitle="Fetching batch analytics..." breadcrumbs="Dashboard > Loading" />
        <main className="w-full max-w-[1200px] mx-auto px-8 pb-12 flex justify-center pt-20">
           <div className="w-8 h-8 border-4 border-primary-01/30 border-t-primary-01 rounded-full animate-spin" />
        </main>
      </>
    );
  }

  const { overall, recentTests } = data;
  
  // Calculate stats
  const students = overall.students || [];
  const topScore = overall.topStudentAccuracy ?? 0;
  const bottomScore = overall.bottomStudentAccuracy ?? 0;
  const avgScore = overall.batchAvgScore ?? 0;
  const belowAverageCount = students.filter((s: any) => s.accuracy < avgScore).length;

  // Generate Teaching Recs from weak topics
  const teachingRecs = (overall.weakTopics || []).slice(0, 3).map((wt: any) => ({
    priority: wt.priority.toLowerCase(),
    recommendation: `${wt.affectedStudents} students are struggling with ${wt.topic} (${wt.subject}). Consider reviewing ${wt.chapter}.`
  }));

  // Generate Chapter Heatmap from weak topics (or subjects if no chapters)
  const chapterHeatmap = (overall.weakTopics || []).map((wt: any) => {
    const avgAccuracy = Math.max(0, 100 - Math.round((wt.affectedStudents / overall.totalStudents) * 100));
    return {
      chapter: wt.topic || wt.chapter || "Unknown Chapter",
      avgAccuracy,
      flag: avgAccuracy >= 70 ? "good" : avgAccuracy >= 40 ? "warning" : "critical"
    };
  });

  // If no weak topics, fallback to subject breakdown
  if (chapterHeatmap.length === 0) {
    (overall.subjectBreakdown || []).forEach((sb: any) => {
      chapterHeatmap.push({
        chapter: sb.subject,
        avgAccuracy: sb.avg,
        flag: sb.avg >= 70 ? "good" : sb.avg >= 40 ? "warning" : "critical"
      });
    });
  }

  return (
    <>
      <Navbar
        title="Batch Deep Dive"
        subtitle={`${overall.totalStudents} total students · Analytical Overview`}
        breadcrumbs={`Dashboard > Batch ${batchId.substring(0,6)}`}
      />
      
      <main className="w-full max-w-[1200px] mx-auto px-8 pb-12">
        {/* Action bar */}
        <div className="flex justify-between items-center mb-8">
          <Link href="/teacher" className="inline-flex items-center gap-1.5 text-caption font-bold text-t-secondary hover:text-t-primary no-underline transition-colors">
            <RiArrowLeftLine size={16} /> Back to Dashboard
          </Link>
          <div className="flex gap-3">
            <Link href="/teacher/dpps" className="btn btn-sm btn-outline flex items-center gap-1">
              <RiAddLine size={16} /> Assign DPP for this Batch
            </Link>
            <button className="btn btn-sm btn-primary">Export PDF Report</button>
          </div>
        </div>

        {/* Score + Recs */}
        <div className="grid grid-cols-2 gap-6 mb-8">
          {/* Score Distribution Card */}
          <div className="group relative card flex flex-col p-6 border border-s-stroke2 bg-b-surface1">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 bg-b-surface2 rounded-[10px] border border-s-stroke2 text-t-secondary">
                <RiPieChart2Line size={20} />
              </div>
              <h2 className="text-sub-title-1 font-bold text-t-primary">Score Distribution</h2>
            </div>
            
            <div className="flex gap-4 mb-6">
              {[
                { label: "Average Score", value: `${avgScore}%`, textColor: "text-t-primary" },
                { label: "Highest Score", value: `${topScore}%`,  textColor: "text-primary-02" },
                { label: "Lowest Score",  value: `${bottomScore}%`, textColor: "text-primary-03" },
              ].map(s => (
                <div key={s.label} className="flex-1 p-4 bg-b-surface2 border border-s-stroke2 rounded-[10px] text-center">
                  <div className={`text-h5 font-bold mb-1 ${s.textColor}`}>{s.value}</div>
                  <div className="text-caption text-t-secondary">{s.label}</div>
                </div>
              ))}
            </div>
            
            <div className="flex items-center gap-4 p-4 bg-primary-05/5 border border-primary-05/20 rounded-[10px] mt-auto">
              <RiAlertLine size={22} className="text-primary-05 shrink-0" />
              <div>
                <div className="text-body-2 font-bold text-t-primary">{belowAverageCount} Students Below Average</div>
                <div className="text-caption text-t-secondary mt-0.5">Consider assigning a Booster DPP to this cohort.</div>
              </div>
            </div>
          </div>

          {/* AI Teaching Recommendations */}
          <div className="group relative card flex flex-col p-6 border border-s-stroke2 bg-b-surface1">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 bg-b-surface2 rounded-[10px] border border-s-stroke2 text-t-secondary">
                <RiFocus2Line size={20} />
              </div>
              <h2 className="text-sub-title-1 font-bold text-t-primary">AI Teaching Recommendations</h2>
            </div>
            
            <div className="flex flex-col gap-4">
              {teachingRecs.length > 0 ? teachingRecs.map((rec: any, i: number) => (
                <div key={i} className="flex gap-4 p-4 bg-b-surface2 border border-s-stroke2 rounded-[10px]">
                  <div className={`size-8 rounded-full flex items-center justify-center shrink-0 ${
                    rec.priority === "high" || rec.priority === "critical"
                      ? "bg-primary-03/10 text-primary-03"
                      : "bg-primary-05/10 text-primary-05"
                  }`}>
                    <RiAlertLine size={16} />
                  </div>
                  <div>
                    <div className="text-body-2 font-bold text-t-primary mb-1">
                      {rec.priority === "high" || rec.priority === "critical" ? "Critical Priority" : "Medium Priority"}
                    </div>
                    <p className="text-caption text-t-secondary leading-relaxed">{rec.recommendation}</p>
                  </div>
                </div>
              )) : (
                <div className="text-caption text-t-secondary p-4">No critical areas identified based on recent tests.</div>
              )}
            </div>
          </div>
        </div>

        {/* Chapter Heatmap */}
        <div className="group relative card flex flex-col p-6 border border-s-stroke2 bg-b-surface1">
          <h2 className="text-sub-title-1 font-bold text-t-primary mb-6">Topic / Chapter Performance</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-s-stroke2 text-caption font-bold text-t-secondary">
                  <th className="pb-3 pr-4">Topic / Chapter</th>
                  <th className="pb-3 px-4">Estimated Accuracy</th>
                  <th className="pb-3 px-4">Status</th>
                  <th className="pb-3 pl-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {chapterHeatmap.map((ch: any, idx: number) => (
                  <tr key={idx} className="border-b border-s-stroke2 last:border-b-0">
                    <td className="py-4 pr-4 text-body-2 font-bold text-t-primary">{ch.chapter}</td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-[120px] h-1.5 bg-s-stroke2 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              ch.flag === "good"
                                ? "bg-primary-02"
                                : ch.flag === "warning"
                                  ? "bg-primary-05"
                                  : "bg-primary-03"
                            }`}
                            style={{ width: `${ch.avgAccuracy}%` }}
                          />
                        </div>
                        <span className="text-caption font-bold text-t-primary">{ch.avgAccuracy}%</span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      {ch.flag === "good" ? (
                        <span className="label label-green flex items-center gap-1 w-fit">
                          <RiCheckDoubleLine size={14} /> Mastered
                        </span>
                      ) : ch.flag === "warning" ? (
                        <span className="label label-yellow flex items-center gap-1 w-fit">
                          <RiAlertLine size={14} /> Needs Review
                        </span>
                      ) : (
                        <span className="label label-red flex items-center gap-1 w-fit">
                          <RiAlertLine size={14} /> Critical Weakness
                        </span>
                      )}
                    </td>
                    <td className="py-4 pl-4 text-right">
                      {ch.flag !== "good" && (
                        <Link href={`/teacher/dpps/create?chapter=${encodeURIComponent(ch.chapter)}`} className="btn btn-sm btn-outline">
                          + Assign DPP
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
                {chapterHeatmap.length === 0 && (
                   <tr><td colSpan={4} className="py-8 text-center text-t-secondary">No topic data available yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Tests & Trap Questions */}
        {recentTests && recentTests.length > 0 && (
          <div className="mt-8 flex flex-col gap-6">
            <h2 className="text-sub-title-1 font-bold text-t-primary">Recent Tests & Trap Questions</h2>
            {recentTests.map((test: any, idx: number) => (
              <div key={idx} className="group relative card flex flex-col p-6 border border-s-stroke2 bg-b-surface1">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="text-body-1 font-bold text-t-primary">{test.testName}</h3>
                    <div className="text-caption text-t-secondary">Average Score: {test.avgScore}%</div>
                  </div>
                </div>
                
                {test.trapQuestions && test.trapQuestions.length > 0 ? (
                  <div className="flex flex-col gap-4">
                    <h4 className="text-caption font-bold text-t-secondary uppercase tracking-wider mb-2">Trap Questions</h4>
                    {test.trapQuestions.map((trap: any, tIdx: number) => (
                      <div key={tIdx} className="p-4 bg-primary-03/5 border border-primary-03/20 rounded-[10px]">
                        <div className="text-body-2 font-semibold text-t-primary mb-2 line-clamp-2">{trap.q}</div>
                        <div className="flex items-center gap-2">
                          <span className="label label-red font-mono font-bold">{trap.pct}% Failed</span>
                          <span className="text-caption text-t-secondary">{trap.desc} (Option {trap.option})</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-caption text-t-secondary">No trap questions identified for this test.</div>
                )}
              </div>
            ))}
          </div>
        )}

      </main>
    </>
  );
}
