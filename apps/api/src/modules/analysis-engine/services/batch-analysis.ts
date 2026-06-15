import { globalDbStore } from "./db.mock";
import { BatchAnalysisResult, AnalysisResult } from "../../../../../../packages/types/src/analysis.types";

export const generateBatchAnalysis = async (testId: string, batchId: string): Promise<BatchAnalysisResult> => {
  // 1. Fetch all AnalysisResults for this batch & test.
  // Since we are mocking the DB, we grab from globalDbStore.
  // Wait, the globalDbStore stores by attemptId. 
  // We need to look at the attempts map to filter by testId and batchId.
  const relevantAttemptIds: string[] = [];
  for (const [attemptId, data] of globalDbStore.attempts.entries()) {
    if (data.attempt.batch_id === batchId && data.attempt.exam_id === testId) {
      relevantAttemptIds.push(attemptId);
    }
  }

  const results: AnalysisResult[] = [];
  for (const id of relevantAttemptIds) {
    const analysis = globalDbStore.analysisResults.get(id);
    if (analysis) results.push(analysis);
  }

  // If no students have submitted, return empty state
  if (results.length === 0) {
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

  const totalStudents = results.length;
  const avgScore = results.reduce((acc, r) => acc + r.scoring.score, 0) / totalStudents;
  const avgPercentage = results.reduce((acc, r) => acc + r.scoring.percentage, 0) / totalStudents;

  // 2. Aggregate Topic Performance
  const topicMap = new Map<string, { chapter: string, accuracies: number[] }>();
  for (const r of results) {
    for (const ts of r.topicStats) {
      if (!topicMap.has(ts.topic)) {
        topicMap.set(ts.topic, { chapter: ts.chapter, accuracies: [] });
      }
      topicMap.get(ts.topic)!.accuracies.push(ts.accuracy);
    }
  }

  const topicPerformance = [];
  for (const [topic, data] of topicMap.entries()) {
    const avgAccuracy = data.accuracies.reduce((a, b) => a + b, 0) / data.accuracies.length;
    // Mock bottom quartile (25th percentile)
    const sorted = [...data.accuracies].sort((a, b) => a - b);
    const p25Index = Math.max(0, Math.floor(sorted.length * 0.25) - 1);
    const bottomQuartileAccuracy = sorted[p25Index] || 0;

    topicPerformance.push({
      topic,
      chapter: data.chapter,
      avgAccuracy,
      bottomQuartileAccuracy,
    });
  }

  // Find bottleneck chapters (bottom 3 chapters by avg accuracy)
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

  // 3. Aggregate Common Mistakes (Trap Questions)
  // Look at classified array for all students
  const questionMistakes = new Map<string, { qNum: number, trapOptions: Record<string, { count: number, type: string }> }>();
  
  for (const r of results) {
    for (const ca of r.classified) {
      if (!ca.is_correct && ca.selected_answer) {
        if (!questionMistakes.has(ca.question_id)) {
          questionMistakes.set(ca.question_id, { qNum: ca.question.question_number, trapOptions: {} });
        }
        const traps = questionMistakes.get(ca.question_id)!.trapOptions;
        if (!traps[ca.selected_answer]) {
          traps[ca.selected_answer] = { count: 0, type: ca.classification.type };
        }
        traps[ca.selected_answer].count += 1;
      }
    }
  }

  const commonMistakes = [];
  for (const [qId, data] of questionMistakes.entries()) {
    for (const [opt, stats] of Object.entries(data.trapOptions)) {
      const percentageFallen = (stats.count / totalStudents) * 100;
      // If more than 30% fell for the exact same wrong option, it's a trap
      if (percentageFallen > 30 || stats.count > 1) { // lowered threshold for demo
        commonMistakes.push({
          questionId: qId,
          questionNumber: data.qNum,
          trapOption: opt,
          studentsFallen: stats.count,
          percentageFallen,
          errorType: stats.type,
        });
      }
    }
  }

  // Sort common mistakes by percentage fallen (desc)
  commonMistakes.sort((a, b) => b.percentageFallen - a.percentageFallen);

  return {
    testId,
    batchId,
    totalStudents,
    avgScore,
    avgPercentage,
    topicPerformance,
    commonMistakes: commonMistakes.slice(0, 5), // top 5 traps
    bottleneckChapters,
  };
};
