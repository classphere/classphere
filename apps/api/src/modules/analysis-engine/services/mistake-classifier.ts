import { AttemptAnswer, MistakeClassification } from "../../../../../../packages/types/src/analysis.types";

const AVG_TIME: Record<string, number> = {
  easy: 60,
  medium: 120,
  hard: 180,
};

export function classifyMistake(ans: AttemptAnswer, hasTimingData = true): MistakeClassification {
  if (ans.is_correct) {
    if (!hasTimingData) {
      return { type: "correct", detail: "", tip: "", confidence: "high", source: "distractor_map" };
    }
    const avgT = AVG_TIME[ans.question.difficulty] ?? 120;
    const isGuessed =
      (ans.time_taken_sec < avgT * 0.4) ||
      (ans.question.difficulty === "hard" && ans.time_taken_sec < AVG_TIME.easy) ||
      ans.marked_review;

    if (isGuessed) {
      let detail = `Answered correctly in ${ans.time_taken_sec}s. `;
      if (ans.marked_review) {
        detail += "Marked for review during the test, suggesting lower confidence.";
      } else {
        detail += "This is much faster than the average duration for this difficulty level, which may indicate a lucky guess or quick option elimination.";
      }
      return {
        type: "correct_guessed",
        detail,
        tip: "Verify you understand the step-by-step solution. Ensure you didn't just guess or get lucky.",
        confidence: "medium",
        source: "heuristic",
      };
    }

    return { type: "correct", detail: "", tip: "", confidence: "high", source: "distractor_map" };
  }

  if (!ans.selected_answer) {
    return classifySkip(ans, hasTimingData);
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
  return classifyByHeuristics(ans, hasTimingData);
}

function classifyByHeuristics(ans: AttemptAnswer, hasTimingData: boolean): MistakeClassification {
  const t = ans.time_taken_sec;
  const avgT = AVG_TIME[ans.question.difficulty] ?? 120;

  // ── Offline Mode (OMR) Fallback ──
  // If we have no timing data, we can only rely on difficulty
  if (!hasTimingData) {
    if (ans.question.difficulty === "easy") {
      const fb = getDynamicFeedback("calculation", ans, avgT);
      return {
        type: "calculation",
        detail: fb.detail,
        tip: fb.tip,
        confidence: "low",
        source: "heuristic",
      };
    }
    const fb = getDynamicFeedback("conceptual", ans, avgT);
    return {
      type: "conceptual",
      detail: fb.detail,
      tip: fb.tip,
      confidence: "low",
      source: "heuristic",
    };
  }

  // ── Online Mode Heuristics (Requires Time) ──
  const SLIP_THRESHOLD = 30; // 30 seconds threshold for careless slip vs knowledge gap

  // Guard: Fast wrong answers (t < 30s) are careless slips (silly)
  if (t < SLIP_THRESHOLD) {
    const fb = getDynamicFeedback("silly", ans, avgT);
    return {
      type: "silly",
      detail: fb.detail,
      tip: fb.tip,
      confidence: "medium",
      source: "heuristic",
    };
  }

  // Guard: Slow wrong answers (t >= 30s) are knowledge gaps (conceptual or calculation)
  // Rule 2: Spent >2x average time and still wrong → conceptual gap
  if (t > avgT * 2) {
    const fb = getDynamicFeedback("conceptual", ans, avgT);
    return {
      type: "conceptual",
      detail: fb.detail,
      tip: fb.tip,
      confidence: "medium",
      source: "heuristic",
    };
  }

  // Rule 3: Marked for review → low confidence = likely conceptual
  if (ans.marked_review) {
    const fb = getDynamicFeedback("conceptual", ans, avgT);
    return {
      type: "conceptual",
      detail: fb.detail,
      tip: fb.tip,
      confidence: "medium",
      source: "heuristic",
    };
  }

  // Rule 4: Easy question + normal time → calculation error
  if (ans.question.difficulty === "easy" && t > avgT * 0.5) {
    const fb = getDynamicFeedback("calculation", ans, avgT);
    return {
      type: "calculation",
      detail: fb.detail,
      tip: fb.tip,
      confidence: "low",
      source: "heuristic",
    };
  }

  // Default fallback for slow wrong answers -> conceptual knowledge gap
  const fb = getDynamicFeedback("conceptual", ans, avgT);
  return {
    type: "conceptual",
    detail: fb.detail,
    tip: fb.tip,
    confidence: "low",
    source: "heuristic",
  };
}

function classifySkip(ans: AttemptAnswer, hasTimingData: boolean): MistakeClassification {
  const avgT = AVG_TIME[ans.question.difficulty] ?? 120;
  // If offline (OMR), we can't tell WHY they skipped, only that they did.
  if (!hasTimingData) {
    const fb = getDynamicFeedback("didnt_know", ans, avgT);
    return {
      type: "unknown",
      detail: "Question left blank on OMR.",
      tip: fb.tip,
      confidence: "very_low",
      source: "heuristic",
    } as MistakeClassification;
  }

  const t = ans.time_taken_sec;

  // Never viewed — ran out of time
  if (t < 3) {
    const fb = getDynamicFeedback("ran_out_of_time", ans, avgT);
    return {
      type: "ran_out_of_time",
      detail: fb.detail,
      tip: fb.tip,
      confidence: "high",
      source: "heuristic",
    };
  }

  // Glanced and skipped — didn't know the topic
  if (t < 15) {
    const fb = getDynamicFeedback("didnt_know", ans, avgT);
    return {
      type: "didnt_know",
      detail: fb.detail,
      tip: fb.tip,
      confidence: "medium",
      source: "heuristic",
    };
  }

  // Spent time and gave up — partial understanding
  if (t > 60) {
    const fb = getDynamicFeedback("couldnt_solve", ans, avgT);
    return {
      type: "couldnt_solve",
      detail: fb.detail,
      tip: fb.tip,
      confidence: "medium",
      source: "heuristic",
    };
  }

  // Strategic skip (15–60s) — reasonable time management decision
  const fb = getDynamicFeedback("strategic_skip", ans, avgT);
  return {
    type: "strategic_skip",
    detail: fb.detail,
    tip: fb.tip,
    confidence: "high",
    source: "heuristic",
  };
}

function getDynamicFeedback(
  type: string,
  ans: AttemptAnswer,
  avgT: number
): { detail: string; tip: string } {
  const seed = ans.question.id + ans.attempt_id; // seeded key
  const subj = ans.question.subject;
  const chap = ans.question.chapter;
  const top = ans.question.topic;
  const diff = ans.question.difficulty;
  const time = ans.time_taken_sec;

  // Hashing function to get deterministic index
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  const getIndex = (arr: any[]) => Math.abs(hash) % arr.length;

  const sillyFeedbacks = [
    {
      detail: `Careless reading trap in ${subj} (${top}). You rushed this in just ${time}s (average student takes ${avgT}s). This is typically a reading slip, like missing a 'NOT', confusing units, or misinterpreting the core ask.`,
      tip: "Force yourself to read the final line of the question twice before looking at the options. Slow down your first 15 seconds."
    },
    {
      detail: `Speed error detected in ${chap}. You marked the option in ${time}s, which is way below the ${avgT}s average. Rushing leads to selecting the most 'obvious-looking' distractor option.`,
      tip: `Before selecting an option on ${top}, do a quick 3-second sanity check. Does the value scale or sign make sense?`
    },
    {
      detail: `Fast incorrect attempt on a ${diff} question from ${top}. Spent only ${time}s. Rushing questions causes careless oversight of constraints.`,
      tip: "Never choose an option in under 30% of the average time without writing down the initial step in your rough pad."
    }
  ];

  const calculationFeedbacks = [
    {
      detail: `Arithmetic slip in ${subj} (${top}). You solved it at a standard pace of ${time}s, indicating your formula setup was correct, but a calculation mistake cost you the marks.`,
      tip: "Write down the final step calculations clearly in your scratchpad. Confused scribbling is the #1 cause of calculation errors."
    },
    {
      detail: `Calculation error in ${chap}. Setup looks correct, but a math execution slip occurred. Common traps here include power-of-ten mistakes or simple division slips.`,
      tip: `Re-check your final arithmetic calculation steps for ${top}. Try solving the final step using an alternative simplification if possible.`
    },
    {
      detail: `Calculation trap. You spent ${time}s on this ${diff} question from ${top}. The method was solid, but a mathematical mismatch occurred in the final algebraic or arithmetic reduction.`,
      tip: `When solving numerical questions in ${subj}, keep units consistent (e.g., SI units) throughout the calculation steps.`
    }
  ];

  const conceptualFeedbacks = [
    {
      detail: `Core knowledge gap in ${subj} (${top}). You spent ${time}s struggling with this (average time is ${avgT}s). This extended time shows you were trying to reconstruct the concept from scratch, indicating a gap in core theory.`,
      tip: `Do not just read the solution. Re-study the derivation of this formula/concept in ${chap} before attempting similar problems.`
    },
    {
      detail: `Conceptual roadblock in ${chap}. You spent ${time}s but got it wrong, indicating that you got stuck on the multi-step reasoning or formula application for ${top}.`,
      tip: `Focus on understanding the primary assumptions behind the formulas in ${top}. Practice 5 standard solved examples to see how the theory is applied.`
    },
    {
      detail: `Conceptual struggle on ${top}. The time taken (${time}s) shows you knew the topic existed, but lacked the specific concept link needed to solve this ${diff} level problem.`,
      tip: "Summarize the key conditions for this concept on a flashcard. Revisit it during your weekly revision."
    }
  ];

  const didntKnowFeedbacks = [
    {
      detail: `Quick skip in ${subj} (${top}). You glanced at this for ${time}s and decided to skip it. This is a smart exam strategy if you didn't know the topic, preventing wasted time.`,
      tip: `Since you skipped this quickly, mark ${chap} for a complete theoretical review.`
    },
    {
      detail: `Unfamiliar territory. You skipped this ${diff} question from ${top} in ${time}s. Recognising that you don't know the concept saves precious minutes.`,
      tip: `Revise the basic definitions of ${top} in ${chap} to convert this from a complete blind spot to a potential easy question win.`
    }
  ];

  const couldntSolveFeedbacks = [
    {
      detail: `Time drain skip. You spent ${time}s working on this ${top} question but ended up leaving it blank. This means you got stuck halfway through the derivation or calculation.`,
      tip: "Analyze the solution to find the exact step where your progress halted. Was it a math block or a formula you forgot?"
    },
    {
      detail: `Unsuccessful attempt. You invested ${time}s (almost ${avgT}s average) into this question from ${chap} but skipped it. This indicates partial understanding.`,
      tip: `Practice solving half-solved problems in ${top} to build the confidence to push through to the final answer.`
    }
  ];

  const ranOutOfTimeFeedbacks = [
    {
      detail: `Unreached question in ${subj} (${top}). You spent less than 3 seconds here. This was a casualty of poor time management earlier in the exam.`,
      tip: "Practice the 'Round Strategy' (skipping hard questions early) to ensure you at least read every single question in the paper."
    },
    {
      detail: `Time pressure victim. You didn't get to read this ${diff} question from ${chap}. There were likely easier marks here that you missed.`,
      tip: "Set a hard cap of 3 minutes per question. If you are not close to an answer, mark it and move on."
    }
  ];

  const strategicSkipFeedbacks = [
    {
      detail: `Strategic skip in ${top}. You spent ${time}s evaluating it and correctly decided to move on. Good tactical decision to prioritize other questions.`,
      tip: "Continue practicing this evaluation skill to optimize your marks-to-minute ratio."
    }
  ];

  const unknownFeedbacks = [
    {
      detail: "Could not auto-classify. Please review the solution and self-tag this error.",
      tip: `Check if this was a concept error, calculation mistake, or silly reading slip in ${top}.`
    }
  ];

  let pool = unknownFeedbacks;
  switch (type) {
    case "silly":
      pool = sillyFeedbacks;
      break;
    case "calculation":
      pool = calculationFeedbacks;
      break;
    case "conceptual":
      pool = conceptualFeedbacks;
      break;
    case "didnt_know":
      pool = didntKnowFeedbacks;
      break;
    case "couldnt_solve":
      pool = couldntSolveFeedbacks;
      break;
    case "ran_out_of_time":
      pool = ranOutOfTimeFeedbacks;
      break;
    case "strategic_skip":
      pool = strategicSkipFeedbacks;
      break;
    default:
      pool = unknownFeedbacks;
      break;
  }

  const idx = getIndex(pool);
  return pool[idx];
}
