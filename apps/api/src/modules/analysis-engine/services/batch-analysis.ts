import { supabaseAdmin } from "../../../lib/supabase";
import { BatchAnalysisResult, AnalysisResult } from "../../../../../../packages/types/src/analysis.types";

export const generateBatchAnalysis = async (testId: string, batchId: string): Promise<BatchAnalysisResult> => {
  // 1. Fetch all submitted attempts for this batch + test (paper)
  const { data: attempts } = await supabaseAdmin
    .from("attempts")
    .select("id, student_id, score, max_score")
    .eq("paper_id", testId)
    .eq("batch_id", batchId)
    .eq("status", "submitted");

  const relevantAttemptIds = (attempts ?? []).map((a: any) => a.id);

  if (relevantAttemptIds.length === 0) {
    return {
      testId,
      batchId,
      totalStudents: 0,
      avgScore: 0,
      avgPercentage: 0,
      topicPerformance: [],
      commonMistakes: [],
      bottleneckChapters: [],
    };
  }

  // 2. Fetch analysis results for those attempts from Supabase
  const { data: analysisRows } = await supabaseAdmin
    .from("analysis_results")
    .select("result")
    .in("attempt_id", relevantAttemptIds);

  const results: AnalysisResult[] = (analysisRows ?? [])
    .map((r: any) => r.result)
    .filter(Boolean);

  // If analysis hasn't run yet (might happen right after submit)
  if (results.length === 0) {
    const totalStudents = attempts?.length ?? 0;
    const avgScore = totalStudents > 0
      ? (attempts ?? []).reduce((s: number, a: any) => s + (a.score ?? 0), 0) / totalStudents
      : 0;
    const avgPercentage = totalStudents > 0
      ? (attempts ?? []).reduce((s: number, a: any) => s + (a.max_score > 0 ? (a.score / a.max_score) * 100 : 0), 0) / totalStudents
      : 0;

    return { testId, batchId, totalStudents, avgScore, avgPercentage, topicPerformance: [], commonMistakes: [], bottleneckChapters: [] };
  }

  const totalStudents = results.length;
  const avgScore = results.reduce((acc, r) => acc + r.scoring.score, 0) / totalStudents;
  const avgPercentage = results.reduce((acc, r) => acc + r.scoring.percentage, 0) / totalStudents;

  // 3. Aggregate topic performance
  const topicMap = new Map<string, { chapter: string; accuracies: number[] }>();
  for (const r of results) {
    for (const ts of r.topicStats) {
      if (!topicMap.has(ts.topic)) topicMap.set(ts.topic, { chapter: ts.chapter, accuracies: [] });
      topicMap.get(ts.topic)!.accuracies.push(ts.accuracy);
    }
  }

  const topicPerformance = [];
  for (const [topic, data] of topicMap.entries()) {
    const avgAccuracy = data.accuracies.reduce((a, b) => a + b, 0) / data.accuracies.length;
    const sorted = [...data.accuracies].sort((a, b) => a - b);
    const p25Index = Math.max(0, Math.floor(sorted.length * 0.25) - 1);
    topicPerformance.push({ topic, chapter: data.chapter, avgAccuracy, bottomQuartileAccuracy: sorted[p25Index] || 0 });
  }

  // 4. Bottleneck chapters
  const chapterAccuracies = new Map<string, number[]>();
  for (const tp of topicPerformance) {
    if (!chapterAccuracies.has(tp.chapter)) chapterAccuracies.set(tp.chapter, []);
    chapterAccuracies.get(tp.chapter)!.push(tp.avgAccuracy);
  }
  const bottleneckChapters = Array.from(chapterAccuracies.entries())
    .map(([chapter, accs]) => ({ chapter, avg: accs.reduce((a, b) => a + b, 0) / accs.length }))
    .sort((a, b) => a.avg - b.avg)
    .slice(0, 3)
    .map((c) => c.chapter);

  // 5. Common mistake traps
  const questionMistakes = new Map<string, { qNum: number; trapOptions: Record<string, { count: number; type: string }> }>();
  for (const r of results) {
    for (const ca of r.classified) {
      if (!ca.is_correct && ca.selected_answer) {
        if (!questionMistakes.has(ca.question_id)) {
          questionMistakes.set(ca.question_id, { qNum: ca.question.question_number, trapOptions: {} });
        }
        const traps = questionMistakes.get(ca.question_id)!.trapOptions;
        if (!traps[ca.selected_answer]) traps[ca.selected_answer] = { count: 0, type: ca.classification.type };
        traps[ca.selected_answer].count += 1;
      }
    }
  }

  const commonMistakes = [];
  for (const [qId, data] of questionMistakes.entries()) {
    for (const [opt, stats] of Object.entries(data.trapOptions)) {
      const percentageFallen = (stats.count / totalStudents) * 100;
      if (percentageFallen > 30 || stats.count > 1) {
        commonMistakes.push({ questionId: qId, questionNumber: data.qNum, trapOption: opt, studentsFallen: stats.count, percentageFallen, errorType: stats.type });
      }
    }
  }
  commonMistakes.sort((a, b) => b.percentageFallen - a.percentageFallen);

  return { testId, batchId, totalStudents, avgScore, avgPercentage, topicPerformance, commonMistakes: commonMistakes.slice(0, 5), bottleneckChapters };
};
