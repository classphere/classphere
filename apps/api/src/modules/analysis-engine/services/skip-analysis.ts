import { ClassifiedAnswer, SkipAnalysis } from "../../../../../../packages/types/src/analysis.types";

export function analyzeSkips(classified: ClassifiedAnswer[]): SkipAnalysis {
  const skips = classified.filter(a => !a.selected_answer);

  const byType = {
    didntKnow: skips.filter(a => a.classification?.type === "didnt_know").length,
    couldntSolve: skips.filter(a => a.classification?.type === "couldnt_solve").length,
    ranOutOfTime: skips.filter(a => a.classification?.type === "ran_out_of_time").length,
    strategicSkip: skips.filter(a => a.classification?.type === "strategic_skip").length,
  };

  // Subject-level skip rates
  const allBySubject = groupBy(classified, a => a.question.subject);
  const subjectBreakdown: Record<string, { skipped: number; total: number; skipRate: number }> = {};
  
  for (const [subj, group] of Object.entries(allBySubject)) {
    const skipped = group.filter(a => !a.selected_answer).length;
    subjectBreakdown[subj] = {
      skipped,
      total: group.length,
      skipRate: group.length > 0 ? (skipped / group.length) * 100 : 0,
    };
  }

  // Generate primary recommendation
  let recommendation = "";
  if (byType.ranOutOfTime > 5) {
    recommendation = "Major time management issue. Practice full-length mocks with strict timing.";
  } else if (byType.didntKnow > byType.couldntSolve) {
    recommendation = "High number of immediate skips. You have significant syllabus gaps. Focus on completing chapter theory.";
  } else if (byType.couldntSolve > 3) {
    recommendation = "You understand basics but get stuck halfway. Practice multi-step problems and review solutions.";
  } else {
    recommendation = "Good skip discipline. You skipped strategically without wasting too much time.";
  }

  return {
    totalSkipped: skips.length,
    didntKnow: byType.didntKnow,
    couldntSolve: byType.couldntSolve,
    ranOutOfTime: byType.ranOutOfTime,
    strategicSkip: byType.strategicSkip,
    subjectBreakdown,
    recommendation,
  };
}

// Helper: Group by key
function groupBy<T, K extends string | number | symbol>(list: T[], keyGetter: (item: T) => K): Record<K, T[]> {
  const map = {} as Record<K, T[]>;
  for (const item of list) {
    const key = keyGetter(item);
    if (!map[key]) map[key] = [];
    map[key].push(item);
  }
  return map;
}
