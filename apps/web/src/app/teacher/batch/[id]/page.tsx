"use client";

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
import Navbar from "../../../../components/layout/Navbar";
const mockBatches: any[] = [];
const mockBatchAnalysis: any = {
  testTitle: "",
  attemptedCount: 0,
  totalStudents: 0,
  classSummary: { avgScore: 0, topScore: 0, bottomScore: 0, belowAverageCount: 0 },
  teachingRecs: [],
  chapterHeatmap: []
};

export default function BatchAnalysisPage() {
  const params = useParams();
  const batchId = params.id as string;
  const batch = mockBatches.find(b => b.id === batchId) || { name: "", exam: "" };

  return (
    <>
      <Navbar
        title={mockBatchAnalysis.testTitle}
        subtitle={`${mockBatchAnalysis.attemptedCount} of ${mockBatchAnalysis.totalStudents} students attempted · ${batch.exam} · ${batch.name}`}
        breadcrumbs={`Dashboard > ${batch.name}`}
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
                { label: "Average Score", value: `${mockBatchAnalysis.classSummary.avgScore}%`, textColor: "text-t-primary" },
                { label: "Highest Score", value: `${mockBatchAnalysis.classSummary.topScore}%`,  textColor: "text-primary-02" },
                { label: "Lowest Score",  value: `${mockBatchAnalysis.classSummary.bottomScore}%`, textColor: "text-primary-03" },
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
                <div className="text-body-2 font-bold text-t-primary">{mockBatchAnalysis.classSummary.belowAverageCount} Students Below Average</div>
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
              {mockBatchAnalysis.teachingRecs.map((rec: any, i: number) => (
                <div key={i} className="flex gap-4 p-4 bg-b-surface2 border border-s-stroke2 rounded-[10px]">
                  <div className={`size-8 rounded-full flex items-center justify-center shrink-0 ${
                    rec.priority === "high"
                      ? "bg-primary-03/10 text-primary-03"
                      : "bg-primary-05/10 text-primary-05"
                  }`}>
                    <RiAlertLine size={16} />
                  </div>
                  <div>
                    <div className="text-body-2 font-bold text-t-primary mb-1">
                      {rec.priority === "high" ? "Critical Priority" : "Medium Priority"}
                    </div>
                    <p className="text-caption text-t-secondary leading-relaxed">{rec.recommendation}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Chapter Heatmap */}
        <div className="group relative card flex flex-col p-6 border border-s-stroke2 bg-b-surface1">
          <h2 className="text-sub-title-1 font-bold text-t-primary mb-6">Chapter Performance Heatmap</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-s-stroke2 text-caption font-bold text-t-secondary">
                  <th className="pb-3 pr-4">Chapter</th>
                  <th className="pb-3 px-4">Batch Accuracy</th>
                  <th className="pb-3 px-4">Status</th>
                  <th className="pb-3 pl-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {mockBatchAnalysis.chapterHeatmap.map((ch: any, idx: number) => (
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
                        <Link href="/teacher/dpps" className="btn btn-sm btn-outline">
                          + Assign DPP
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </main>
    </>
  );
}
