import { ClassifiedAnswer, ErrorPattern } from "../../../../../../../packages/types/src/analysis.types";

type PatternDetector = (answers: ClassifiedAnswer[]) => ErrorPattern | null;

const ALL_DETECTORS: PatternDetector[] = [
  detectCarelessErrors,
  detectTimePressure,
  detectBlindSpot,
  detectExcessiveSkipping,
  detectSlowSolver,
  detectSubjectAvoidance,
  detectDistractorTrap,
  detectFreeMarksLeak,
  detectConsistentGuesser,
  detectEndgameFatigue,
];

export function detectAllPatterns(answers: ClassifiedAnswer[]): ErrorPattern[] {
  return ALL_DETECTORS.map(d => d(answers)).filter(Boolean) as ErrorPattern[];
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

// 1. Careless Errors: Wrong on EASY questions but correct on HARD questions in same chapter
function detectCarelessErrors(answers: ClassifiedAnswer[]): ErrorPattern | null {
  const byChapter = groupBy(answers, a => a.question.chapter);
  for (const [chapter, group] of Object.entries(byChapter)) {
    const easyWrong = group.filter(a => a.question.difficulty === "easy" && !a.is_correct && a.selected_answer).length;
    const hardCorrect = group.filter(a => a.question.difficulty === "hard" && a.is_correct).length;
    if (easyWrong >= 2 && hardCorrect >= 1) {
      return {
        id: "careless_errors", name: "Careless on Easy Questions",
        description: `In ${chapter}: got ${hardCorrect} hard questions right but missed ${easyWrong} easy ones.`,
        questionsAffected: group.filter(a => a.question.difficulty === "easy" && !a.is_correct).map(a => a.question_id),
        severity: "high",
        tip: "Slow down on easy questions. You know the material — don't rush.",
      };
    }
  }
  return null;
}

// 2. Time Pressure: Accuracy drops >25% in the last quartile of the test
function detectTimePressure(answers: ClassifiedAnswer[]): ErrorPattern | null {
  const sorted = [...answers].sort((a, b) => a.question.question_number - b.question.question_number);
  const q3Start = Math.floor(sorted.length * 0.75);
  const first3Q = sorted.slice(0, q3Start);
  const last1Q = sorted.slice(q3Start);

  const acc = (arr: ClassifiedAnswer[]) => {
    const att = arr.filter(a => a.selected_answer).length;
    return att > 0 ? (arr.filter(a => a.is_correct).length / att) * 100 : 0;
  };

  const drop = acc(first3Q) - acc(last1Q);
  if (drop > 25 && last1Q.length >= 5) {
    return {
      id: "time_pressure", name: "Performance Drop Under Time Pressure",
      description: `Accuracy dropped ${drop.toFixed(0)}% in the last quarter of the test.`,
      questionsAffected: last1Q.filter(a => !a.is_correct).map(a => a.question_id),
      severity: drop > 40 ? "high" : "medium",
      tip: "Practice timed mock tests. With 30 min left, switch to easier unattempted questions.",
    };
  }
  return null;
}

// 3. Blind Spot: 0% accuracy on a topic with 3+ questions
function detectBlindSpot(answers: ClassifiedAnswer[]): ErrorPattern | null {
  const byTopic = groupBy(answers, a => a.question.topic);
  for (const [topic, group] of Object.entries(byTopic)) {
    const attempted = group.filter(a => a.selected_answer);
    if (attempted.length >= 3 && attempted.every(a => !a.is_correct)) {
      return {
        id: "blind_spot", name: `Complete Blind Spot: ${topic}`,
        description: `Attempted ${attempted.length} questions on "${topic}" — got 0 correct.`,
        questionsAffected: group.map(a => a.question_id),
        severity: "high",
        tip: `Start ${topic} from scratch. Watch a lecture video before solving any problems.`,
      };
    }
  }
  return null;
}

// 4. Excessive Skipping: >30% of questions skipped
function detectExcessiveSkipping(answers: ClassifiedAnswer[]): ErrorPattern | null {
  const skipped = answers.filter(a => !a.selected_answer).length;
  const rate = (skipped / answers.length) * 100;
  if (rate > 30) {
    return {
      id: "excessive_skipping", name: "High Skip Rate",
      description: `Skipped ${skipped} of ${answers.length} questions (${rate.toFixed(0)}%).`,
      questionsAffected: answers.filter(a => !a.selected_answer).map(a => a.question_id),
      severity: rate > 50 ? "high" : "medium",
      tip: "Work on syllabus coverage. Identify which topics you haven't studied yet.",
    };
  }
  return null;
}

// 5. Slow Solver: High accuracy but spending >3 min avg per question
function detectSlowSolver(answers: ClassifiedAnswer[]): ErrorPattern | null {
  const attempted = answers.filter(a => a.selected_answer);
  if (attempted.length === 0) return null;
  const accuracy = (attempted.filter(a => a.is_correct).length / attempted.length) * 100;
  const avgTime = attempted.reduce((s, a) => s + a.time_taken_sec, 0) / attempted.length;
  if (accuracy > 70 && avgTime > 180) {
    return {
      id: "slow_solver", name: "Accurate But Too Slow",
      description: `${accuracy.toFixed(0)}% accuracy but averaging ${(avgTime / 60).toFixed(1)} min/question.`,
      questionsAffected: [],
      severity: "medium",
      tip: "You know the material but need speed drills. Practice under strict time limits.",
    };
  }
  return null;
}

// 6. Subject Avoidance: Disproportionately skips one subject (>50% skip rate on ≥5 questions)
function detectSubjectAvoidance(answers: ClassifiedAnswer[]): ErrorPattern | null {
  const bySubject = groupBy(answers, a => a.question.subject);
  for (const [subject, group] of Object.entries(bySubject)) {
    const skipRate = group.filter(a => !a.selected_answer).length / group.length;
    if (skipRate > 0.5 && group.length >= 5) {
      return {
        id: "subject_avoidance", name: `Avoiding ${subject}`,
        description: `Skipped ${(skipRate * 100).toFixed(0)}% of ${subject} questions.`,
        questionsAffected: group.filter(a => !a.selected_answer).map(a => a.question_id),
        severity: "high",
        tip: `Start ${subject} with the easiest chapters to rebuild confidence.`,
      };
    }
  }
  return null;
}

// 7. Distractor Trap: Repeatedly falls for the same trap type
function detectDistractorTrap(classified: ClassifiedAnswer[]): ErrorPattern | null {
  const trapCounts: Record<string, number> = {};
  for (const a of classified) {
    if (a.classification?.confidence === "high" && a.classification.type !== "correct" && a.classification.type !== "didnt_know" && a.classification.type !== "couldnt_solve" && a.classification.type !== "ran_out_of_time" && a.classification.type !== "strategic_skip") {
      const t = a.classification.type;
      trapCounts[t] = (trapCounts[t] ?? 0) + 1;
    }
  }
  const [worstType, count] = Object.entries(trapCounts).sort((a, b) => b[1] - a[1])[0] ?? [];
  if (!worstType || count < 3) return null;

  const labels: Record<string, string> = {
    partial_solve: "Stopping at intermediate steps",
    sign_error: "Sign / direction errors",
    wrong_method: "Applying wrong method",
    misread: "Confusing values",
    conceptual: "Conceptual errors",
    calculation: "Calculation errors",
    silly: "Silly mistakes",
  };

  return {
    id: "distractor_trap", name: labels[worstType] ?? `Repeated ${worstType} errors`,
    description: `You made "${worstType}" errors ${count} times in this test.`,
    questionsAffected: [],
    severity: count >= 5 ? "high" : "medium",
    tip: `Before finalising: check signs, verify formula direction, confirm you answered the actual question asked.`,
  };
}

// 8. Free Marks Leak: Easy/medium questions lost to silly or calculation errors
function detectFreeMarksLeak(classified: ClassifiedAnswer[]): ErrorPattern | null {
  const leaks = classified.filter(a =>
    (a.question.difficulty === "easy" || a.question.difficulty === "medium") &&
    (a.classification?.type === "silly" || a.classification?.type === "calculation")
  );
  if (leaks.length < 2) return null;
  return {
    id: "free_marks_leak", name: "Free Marks Lost to Fixable Errors",
    description: `${leaks.length} easy/medium questions lost to silly or calculation errors.`,
    questionsAffected: leaks.map(a => a.question_id),
    severity: leaks.length >= 5 ? "high" : "medium",
    tip: "These are your highest ROI fixes. Slow down on straightforward questions.",
  };
}

// 9. Consistent Guesser: >3 correct answers flagged as guessed
function detectConsistentGuesser(classified: ClassifiedAnswer[]): ErrorPattern | null {
  const guessed = classified.filter(a => a.classification?.type === "correct_guessed");
  if (guessed.length < 3) return null;

  const marksAtRisk = guessed.length * 5; // +4 gained, +1 penalty avoided = 5 per question

  return {
    id: "consistent_guesser",
    name: "Hidden Score Risk: Correct But Guessed",
    description: `${guessed.length} correct answers were likely guesses or eliminations, not confident solutions. These ${marksAtRisk} marks are at risk in the real exam.`,
    questionsAffected: guessed.map(a => a.question_id),
    severity: guessed.length >= 6 ? "high" : "medium",
    tip: "Review every question you answered quickly. If you can't reproduce the solution path from scratch, mark it as 'weak' and revise the topic.",
  };
}

// 10. Endgame Fatigue: accuracy in last 30-min bucket ≥ 35% lower than first 60 min
function detectEndgameFatigue(answers: ClassifiedAnswer[]): ErrorPattern | null {
  // Only consider questions that were actually visited (start_timestamp >= 0)
  const visited = answers.filter(a => a.start_timestamp !== undefined && a.start_timestamp !== null && a.start_timestamp >= 0);
  if (visited.length < 10) return null;

  // Sort by start_timestamp for time-based bucketing
  const sorted = [...visited].sort((a, b) => a.start_timestamp - b.start_timestamp);
  const lastTs = sorted[sorted.length - 1];
  const totalTs = lastTs.start_timestamp + (lastTs.time_taken_sec || 60);
  if (totalTs < 3600) return null; // Only meaningful for exams > 1 hour

  const first60 = sorted.filter(a => a.start_timestamp < 3600);
  const last30  = sorted.filter(a => a.start_timestamp >= totalTs - 1800);

  const acc = (arr: ClassifiedAnswer[]) => {
    const att = arr.filter(a => a.selected_answer).length;
    return att > 0 ? (arr.filter(a => a.is_correct).length / att) * 100 : 0;
  };

  if (first60.length < 4 || last30.length < 3) return null;

  const early = acc(first60);
  const late  = acc(last30);
  const drop  = early - late;

  if (drop > 35) {
    return {
      id: "endgame_fatigue",
      name: "Endgame Fatigue Detected",
      description: `Your accuracy in the first 60 minutes was ${early.toFixed(0)}% but dropped to ${late.toFixed(0)}% in the final 30 minutes — a ${drop.toFixed(0)}% fall.`,
      questionsAffected: last30.filter(a => !a.is_correct).map(a => a.question_id),
      severity: drop > 50 ? "high" : "medium",
      tip: "Train your stamina with back-to-back full 3-hour mocks. Eat a light snack before the real exam and stay hydrated. With 45 min left, do a quick mental reset.",
    };
  }
  return null;
}
