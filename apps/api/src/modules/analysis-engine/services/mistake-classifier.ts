import { AttemptAnswer, MistakeClassification } from "../../../../../../packages/types/src/analysis.types";

const AVG_TIME: Record<string, number> = {
  easy: 60,
  medium: 120,
  hard: 180,
};

export function classifyMistake(ans: AttemptAnswer): MistakeClassification {
  if (ans.is_correct) {
    return { type: "correct", detail: "", tip: "", confidence: "high", source: "distractor_map" };
  }

  if (!ans.selected_answer) {
    return classifySkip(ans);
  }

  // LAYER 1: Distractor map
  if (ans.question.distractor_map && ans.question.distractor_map[ans.selected_answer]) {
    const distractor = ans.question.distractor_map[ans.selected_answer];
    return {
      type: distractor.error_type,
      detail: distractor.trap_description,
      tip: distractor.common_mistake,
      confidence: "high",
      source: "distractor_map",
    };
  }

  // LAYER 2: Heuristic fallback
  return classifyByHeuristics(ans);
}

function classifyByHeuristics(ans: AttemptAnswer): MistakeClassification {
  const t = ans.time_taken_sec;
  const avgT = AVG_TIME[ans.question.difficulty] ?? 120;

  // Rule 1: Answered in <30% of average time → likely misread
  if (t < avgT * 0.3) {
    return {
      type: "silly",
      detail: `Answered in ${t}s (avg: ${avgT}s). Very fast = likely misread.`,
      tip: "Read the full question and all options before selecting an answer.",
      confidence: "medium",
      source: "heuristic",
    };
  }

  // Rule 2: Spent >2x average time and still wrong → conceptual gap
  if (t > avgT * 2) {
    return {
      type: "conceptual",
      detail: `Spent ${t}s on this (avg: ${avgT}s). Extended struggle = unfamiliarity.`,
      tip: `Revise ${ans.question.chapter} from basics. Focus on ${ans.question.topic}.`,
      confidence: "medium",
      source: "heuristic",
    };
  }

  // Rule 3: Marked for review → low confidence = likely conceptual
  if (ans.marked_review) {
    return {
      type: "conceptual",
      detail: "Flagged for review — you weren't confident in your method.",
      tip: `This topic needs revision: ${ans.question.topic}.`,
      confidence: "medium",
      source: "heuristic",
    };
  }

  // Rule 4: Easy question + normal time → calculation error
  if (ans.question.difficulty === "easy" && t > avgT * 0.5) {
    return {
      type: "calculation",
      detail: "Easy question answered incorrectly at normal pace.",
      tip: "You likely knew the method. Double-check your arithmetic.",
      confidence: "low",
      source: "heuristic",
    };
  }

  // Default fallback
  return {
    type: "conceptual",
    detail: "Could not auto-classify. Review the solution.",
    tip: `Study ${ans.question.topic} in ${ans.question.chapter}.`,
    confidence: "low",
    source: "heuristic",
  };
}

function classifySkip(ans: AttemptAnswer): MistakeClassification {
  const t = ans.time_taken_sec;

  // Never viewed — ran out of time
  if (t < 3) {
    return {
      type: "ran_out_of_time",
      detail: "Never reached this question.",
      tip: "Time management: don't spend >3 min on any single question.",
      confidence: "high",
      source: "heuristic",
    };
  }

  // Glanced and skipped — didn't know the topic
  if (t < 15) {
    return {
      type: "didnt_know",
      detail: `Viewed for ${t}s and moved on — topic was unfamiliar.`,
      tip: `Add ${ans.question.chapter} to your revision list.`,
      confidence: "medium",
      source: "heuristic",
    };
  }

  // Spent time and gave up — partial understanding
  if (t > 60) {
    return {
      type: "couldnt_solve",
      detail: `Spent ${t}s but couldn't reach an answer.`,
      tip: "You understand basics but need multi-step problem practice.",
      confidence: "medium",
      source: "heuristic",
    };
  }

  // Strategic skip (15–60s) — reasonable time management decision
  return {
    type: "strategic_skip",
    detail: "Reasonable skip — time was better spent elsewhere.",
    tip: "",
    confidence: "high",
    source: "heuristic",
  };
}
