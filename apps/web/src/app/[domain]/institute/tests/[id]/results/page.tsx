"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import { useApiQuery } from "@/lib/hooks/useApiQuery";
import { PremiumCard } from "@/components/premium-ui";
import { RiLoader4Line, RiTeamLine, RiAlertLine, RiBarChartBoxLine } from "@remixicon/react";

/**
 * How one batch performed on one test.
 *
 * The aggregate itself (generateBatchAnalysis) and its endpoint have existed
 * for a long time, correctly institute-scoped — but nothing in the app ever
 * called them, so no teacher or institute admin could reach any of it. This
 * is that missing screen.
 *
 * Batch analysis is per (test, batch): the same paper given to three batches
 * produces three different reports, which is the point — it shows which class
 * is behind on what, not a single averaged number.
 */

type BatchRow = {
  batch_id: string;
  name: string;
  exam: string;
  scheduled_at: string | null;
  submitted_count: number;
};

type BatchAnalysis = {
  totalStudents: number;
  avgScore: number;
  avgPercentage: number;
  topicPerformance: { topic: string; chapter: string; avgAccuracy: number; bottomQuartileAccuracy: number }[];
  commonMistakes: { questionId: string; questionNumber: number; trapOption: string; studentsFallen: number; percentageFallen: number; errorType: string }[];
  bottleneckChapters: string[];
};

export default function BatchResultsPage() {
  const params = useParams<{ id: string }>();
  const testId = params.id;

  const [batchId, setBatchId] = useState<string | null>(null);

  const { data: batchData, isPending: batchesLoading } = useApiQuery<{
    paper: { id: string; title: string };
    batches: BatchRow[];
  }>(testId ? `/api/v1/tests/${testId}/batches` : null);

  const batches = batchData?.batches ?? [];
  const paperTitle = batchData?.paper?.title ?? "Test";

  // Default to the first batch that actually has submissions — opening on an
  // empty one reads as "the analysis is broken" rather than "nobody has sat
  // it yet".
  useEffect(() => {
    if (batchId || batches.length === 0) return;
    setBatchId((batches.find((b) => b.submitted_count > 0) ?? batches[0]).batch_id);
  }, [batches, batchId]);

  const { data: analysisData, isPending: analysisLoading } = useApiQuery<{ analysis: BatchAnalysis }>(
    testId && batchId ? `/api/v1/analysis/batch/${testId}/${batchId}` : null,
  );
  const analysis = analysisData?.analysis;
  const selected = batches.find((b) => b.batch_id === batchId);

  return (
    <>
      <Navbar
        title={paperTitle}
        breadcrumbs="INSTITUTE › TEST RESULTS"
        subtitle="How each batch performed, and what to reteach."
      />

      <main className="mx-auto w-full max-w-[1560px] px-4 pb-12 pt-5 md:px-6">
        {batchesLoading ? (
          <div className="flex items-center justify-center py-16">
            <RiLoader4Line size={32} className="animate-spin text-t-secondary" />
          </div>
        ) : batches.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-b-surface2">
              <RiTeamLine size={28} className="text-t-secondary" />
            </div>
            <h3 className="text-[15px] font-semibold text-t-primary">Not assigned to any batch yet</h3>
            <p className="max-w-md text-[13px] text-t-secondary">
              Assign this test to a batch, and once students submit, their aggregate performance shows up here.
            </p>
          </div>
        ) : (
          <>
            <div className="mb-4 flex flex-wrap gap-2">
              {batches.map((batch) => {
                const on = batch.batch_id === batchId;
                return (
                  <button
                    key={batch.batch_id}
                    type="button"
                    onClick={() => setBatchId(batch.batch_id)}
                    className={`flex h-10 items-center gap-2 rounded-[10px] border px-4 text-sm font-semibold transition ${
                      on ? "border-primary-01 bg-primary-01/10 text-primary-01" : "border-s-stroke2 bg-b-surface1 text-t-secondary hover:border-primary-01/40"
                    }`}
                  >
                    {batch.name}
                    <span className="text-[11px] font-normal opacity-70">
                      {batch.submitted_count} submitted
                    </span>
                  </button>
                );
              })}
            </div>

            {analysisLoading ? (
              <div className="flex items-center justify-center py-16">
                <RiLoader4Line size={32} className="animate-spin text-t-secondary" />
              </div>
            ) : !analysis || analysis.totalStudents === 0 ? (
              <div className="flex flex-col items-center gap-3 py-16 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-b-surface2">
                  <RiBarChartBoxLine size={28} className="text-t-secondary" />
                </div>
                <h3 className="text-[15px] font-semibold text-t-primary">No submissions yet</h3>
                <p className="max-w-md text-[13px] text-t-secondary">
                  {selected ? `Nobody in ${selected.name} has submitted this test yet.` : "Nobody has submitted this test yet."}{" "}
                  The report builds itself as results come in.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {/* Headline numbers */}
                <div className="grid gap-3 sm:grid-cols-3">
                  <StatCard label="Students submitted" value={String(analysis.totalStudents)} />
                  <StatCard label="Average score" value={analysis.avgScore.toFixed(1)} />
                  <StatCard label="Average percentage" value={`${Math.round(analysis.avgPercentage)}%`} />
                </div>

                {/* Where the batch is weakest — the actionable part */}
                {analysis.bottleneckChapters.length > 0 && (
                  <PremiumCard padding="large" className="flex w-full flex-col gap-2">
                    <h2 className="m-0 flex items-center gap-2 text-[16px] font-bold text-t-primary">
                      <RiAlertLine size={18} className="text-primary-03" /> Weakest chapters
                    </h2>
                    <p className="m-0 text-xs text-t-secondary">
                      Lowest average accuracy across this batch — the strongest candidates for a revision class.
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {analysis.bottleneckChapters.map((chapter) => (
                        <span key={chapter} className="rounded-[10px] border border-primary-03/25 bg-primary-03/5 px-3 py-1.5 text-[13px] font-semibold text-primary-03">
                          {chapter}
                        </span>
                      ))}
                    </div>
                  </PremiumCard>
                )}

                {analysis.topicPerformance.length > 0 && (
                  <PremiumCard padding="large" className="flex w-full flex-col gap-3">
                    <h2 className="m-0 text-[16px] font-bold text-t-primary">Topic performance</h2>
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[560px] text-left text-[13px]">
                        <thead>
                          <tr className="text-[11px] uppercase tracking-wider text-t-secondary">
                            <th className="pb-2 font-semibold">Topic</th>
                            <th className="pb-2 font-semibold">Chapter</th>
                            <th className="pb-2 text-right font-semibold">Batch avg</th>
                            <th className="pb-2 text-right font-semibold">Bottom 25%</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[...analysis.topicPerformance]
                            .sort((a, b) => a.avgAccuracy - b.avgAccuracy)
                            .map((row) => (
                              <tr key={`${row.chapter}-${row.topic}`} className="border-t border-s-stroke2/40">
                                <td className="py-2.5 font-medium text-t-primary">{row.topic}</td>
                                <td className="py-2.5 text-t-secondary">{row.chapter}</td>
                                <td className={`py-2.5 text-right font-semibold ${row.avgAccuracy < 50 ? "text-primary-03" : "text-t-primary"}`}>
                                  {Math.round(row.avgAccuracy)}%
                                </td>
                                <td className="py-2.5 text-right text-t-secondary">{Math.round(row.bottomQuartileAccuracy)}%</td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </PremiumCard>
                )}

                {analysis.commonMistakes.length > 0 && (
                  <PremiumCard padding="large" className="flex w-full flex-col gap-3">
                    <h2 className="m-0 text-[16px] font-bold text-t-primary">Common mistakes</h2>
                    <p className="m-0 text-xs text-t-secondary">
                      Wrong options a large share of the batch picked — usually a shared misconception rather than
                      a careless slip.
                    </p>
                    <div className="flex flex-col gap-2">
                      {analysis.commonMistakes.map((mistake) => (
                        <div
                          key={`${mistake.questionId}-${mistake.trapOption}`}
                          className="flex flex-wrap items-center gap-3 rounded-[10px] border border-s-stroke2 bg-b-surface1 px-3.5 py-2.5"
                        >
                          <span className="flex h-7 min-w-9 items-center justify-center rounded-[7px] bg-b-surface2 px-2 text-[12px] font-bold text-t-primary">
                            Q{mistake.questionNumber}
                          </span>
                          <span className="text-[13px] text-t-secondary">
                            chose <strong className="text-t-primary">{mistake.trapOption}</strong>
                          </span>
                          <span className="text-[13px] font-semibold text-primary-03">
                            {mistake.studentsFallen} student{mistake.studentsFallen === 1 ? "" : "s"} ({Math.round(mistake.percentageFallen)}%)
                          </span>
                          <span className="ml-auto rounded-full border border-s-stroke2 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-t-tertiary">
                            {String(mistake.errorType).replaceAll("_", " ")}
                          </span>
                        </div>
                      ))}
                    </div>
                  </PremiumCard>
                )}
              </div>
            )}
          </>
        )}
      </main>
    </>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[16px] border border-s-stroke2 bg-b-surface2 p-5">
      <p className="m-0 text-[11px] font-bold uppercase tracking-wider text-t-secondary">{label}</p>
      <p className="m-0 mt-1.5 text-[26px] font-bold tracking-tight text-t-primary">{value}</p>
    </div>
  );
}
