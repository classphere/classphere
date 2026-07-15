export function formatTimeSpent(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins > 0) {
    return `${mins} min ${secs} s`;
  }
  return `${secs} s`;
}

export function getSubjectStats(a: any, subj: string | null) {
  const answers = subj 
    ? a.classified.filter((ans: any) => ans.question.subject === subj)
    : a.classified;
  
  const total = answers.length;
  const correct = answers.filter((ans: any) => ans.is_correct).length;
  const incorrect = answers.filter((ans: any) => ans.selected_answer && !ans.is_correct).length;
  const skipped = answers.filter((ans: any) => !ans.selected_answer).length;
  const notVisited = answers.filter((ans: any) => !ans.selected_answer && (ans.time_taken_sec || 0) < 3).length;
  const unattempted = skipped - notVisited;

  const score = answers.reduce((sum: number, ans: any) => sum + (ans.marks_awarded || 0), 0);
  const maxScore = total * 4;

  return { total, correct, incorrect, unattempted, notVisited, score, maxScore };
}

export function getOverviewLabel(ans: any) {
  const allotted = ans.question.difficulty === "easy" ? 90 : ans.question.difficulty === "medium" ? 120 : 210;
  const spent = ans.time_taken_sec || 0;

  if (ans.is_correct) {
    return spent < allotted * 1.5 ? "Perfect" : "-";
  }
  if (!ans.selected_answer) {
    return spent >= 15 ? "Confused" : "-";
  }
  if (spent >= allotted * 1.2) return "Wasted";
  return "-";
}
