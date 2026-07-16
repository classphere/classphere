import { AttemptAnswer, MistakeClassification } from "../../../../../../../packages/types/src/analysis.types";

/**
 * SSC Mistake Classifier
 * ─────────────────────────────────────────────────────────────
 * SSC is 100% MCQ. Every question is worth 2 marks.
 * The biggest strategic failure in SSC is a *correct-but-slow* answer
 * in Quant/Reasoning — it costs the student 2-3 easy marks before
 * the section locks at the 15-minute mark.
 *
 * Key thresholds (per community research & coaching institute data):
 *  - Quant/Reasoning: 36 sec/question is the ideal pace (25 Qs in 15 min)
 *  - English/GA:      24 sec/question is the ideal pace (faster read)
 *  - Silly slip:      answer chosen in < 12s — reading error likely
 *  - Overtime:        correct answer took > 90s — strategic failure
 *  - Calculative trap: incorrect, spent > 60s — setup right but arithmetic wrong
 */

const SSC_IDEAL_PACE_SEC: Record<string, number> = {
  "Quantitative Aptitude":            36,
  "General Intelligence & Reasoning": 36,
  "English Comprehension":            24,
  "General Awareness":                20,
};

const DEFAULT_PACE = 36;

function getIdealPace(subject: string): number {
  return SSC_IDEAL_PACE_SEC[subject] ?? DEFAULT_PACE;
}

// Deterministic hash to pick feedback templates without randomness
function hashIndex(seed: string, length: number): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h << 5) - h + seed.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h) % length;
}

export function classifySscMistake(ans: AttemptAnswer, hasTimingData = true): MistakeClassification {
  const t   = ans.time_taken_sec;
  const subj = ans.question.subject;
  const pace = getIdealPace(subj);
  const seed = ans.question.id + ans.attempt_id;

  // ── CORRECT ─────────────────────────────────────────────────────────────────
  if (ans.is_correct) {
    if (!hasTimingData) {
      return { type: "correct", detail: "", tip: "", confidence: "high", source: "distractor_map" };
    }

    // Correct but dangerously slow (overtime) — strategic failure in SSC
    if (t > 90) {
      const templates = [
        {
          detail: `Correct, but you spent ${t}s on this ${subj} question (ideal: ${pace}s). In a 15-minute section, a 90-second question costs you 2–3 easy marks that get locked away when the timer runs out.`,
          tip: `Set a hard self-rule: if you haven't cracked it in 50s, mark your best guess and move on. You can't bank time in SSC.`,
        },
        {
          detail: `Got it right, but ${t}s is too slow for SSC pacing. The section locked after 15 minutes — questions you skipped at the end may have been easier than this one.`,
          tip: `Practice ${ans.question.chapter} questions under a 45-second stopwatch to build the reflex speed needed.`,
        },
      ];
      const fb = templates[hashIndex(seed, templates.length)];
      return { type: "correct_guessed", detail: fb.detail, tip: fb.tip, confidence: "high", source: "heuristic" };
    }

    // Suspiciously fast correct — possible guess
    if (t < 8) {
      return {
        type: "correct_guessed",
        detail: `Answered in ${t}s — very fast for ${subj}. Verify you didn't get lucky on this one.`,
        tip: "Re-solve it from scratch to confirm your understanding. Lucky guesses don't repeat on the final day.",
        confidence: "medium",
        source: "heuristic",
      };
    }

    return { type: "correct", detail: "", tip: "", confidence: "high", source: "distractor_map" };
  }

  // ── SKIPPED ─────────────────────────────────────────────────────────────────
  if (!ans.selected_answer) {
    return classifySscSkip(ans, hasTimingData, pace);
  }

  // ── INCORRECT ───────────────────────────────────────────────────────────────
  if (!hasTimingData) {
    return {
      type: ans.question.difficulty === "easy" ? "calculation" : "conceptual",
      detail: "OMR test — no time data. Classified by difficulty.",
      tip: "Review the step-by-step solution to identify where you went wrong.",
      confidence: "low",
      source: "heuristic",
    };
  }

  // Silly mistake: answered too fast (< 12s) — classic reading trap
  if (t < 12) {
    const templates = [
      {
        detail: `Speed trap in ${subj}. You answered in ${t}s — almost certainly a misread. SSC setters place options that look identical to the wrong shortcut.`,
        tip: "Read the question stem and each option fully. Never pick in under 12 seconds.",
      },
      {
        detail: `Reading error in ${ans.question.chapter} (${t}s). You selected an option without fully processing the question — a common trap with 'approximately' or 'not' wording.`,
        tip: "Underline the key constraint word before looking at options (especially 'NOT', 'EXCEPT', 'INCORRECT').",
      },
    ];
    const fb = templates[hashIndex(seed, templates.length)];
    return { type: "silly", detail: fb.detail, tip: fb.tip, confidence: "medium", source: "heuristic" };
  }

  // Calculative trap: spent time, wrong arithmetic — common in Quant
  if ((subj === "Quantitative Aptitude") && t > 40 && t < 120) {
    const templates = [
      {
        detail: `Arithmetic slip in ${ans.question.chapter}. You spent ${t}s — your method was likely correct, but a calculation error in the final step cost you the 2 marks and triggered a -0.5 penalty.`,
        tip: "For Quant, always estimate the answer magnitude first. If your final answer is wildly different from the estimate, re-check the arithmetic.",
      },
      {
        detail: `Calculation error detected. You invested ${t}s on this ${ans.question.topic} question. Setup was right, arithmetic went wrong. Common culprits: LCM/HCF, percentage steps, or wrong squaring.`,
        tip: `Write every intermediate step clearly. Do not do multi-step calculations mentally for ${ans.question.chapter}.`,
      },
    ];
    const fb = templates[hashIndex(seed, templates.length)];
    return { type: "calculation", detail: fb.detail, tip: fb.tip, confidence: "medium", source: "heuristic" };
  }

  // Conceptual gap: spent significant time and still wrong
  if (t > pace * 1.5) {
    const templates = [
      {
        detail: `Concept gap in ${subj} (${ans.question.topic}). You spent ${t}s — well above the ideal ${pace}s pace — and still got it wrong. This is a clear signal of missing foundational knowledge.`,
        tip: `Revise the core theory of "${ans.question.chapter}" with solved examples before your next mock. Don't just read — practice 5 questions.`,
      },
      {
        detail: `Knowledge gap in ${ans.question.chapter}. The ${t}s time shows you were reasoning from incomplete understanding. This topic needs targeted revision.`,
        tip: `Create a flashcard for the key formula/rule in "${ans.question.topic}". Review it daily for a week.`,
      },
    ];
    const fb = templates[hashIndex(seed, templates.length)];
    return { type: "conceptual", detail: fb.detail, tip: fb.tip, confidence: "medium", source: "heuristic" };
  }

  // Default: medium time, wrong — likely conceptual
  return {
    type: "conceptual",
    detail: `Incorrect on ${ans.question.topic} (${t}s). Likely a conceptual gap — review the core concept.`,
    tip: `Re-read the theory section for "${ans.question.chapter}" and re-attempt 3 similar questions.`,
    confidence: "low",
    source: "heuristic",
  };
}

function classifySscSkip(ans: AttemptAnswer, hasTimingData: boolean, pace: number): MistakeClassification {
  if (!hasTimingData) {
    return {
      type: "unknown",
      detail: "Question left blank on OMR.",
      tip: `Review "${ans.question.chapter}" to identify if this was a topic gap or a time issue.`,
      confidence: "very_low",
      source: "heuristic",
    };
  }

  const t = ans.time_taken_sec;

  // Never saw it — ran out of time in the 15-minute block
  if (t < 3) {
    return {
      type: "ran_out_of_time",
      detail: `Section ran out of time before you reached this "${ans.question.topic}" question. The 15-minute lock cut you off.`,
      tip: "Practice the 2-sweep strategy: Round 1 — only sure-shot questions. Round 2 — come back to calculative ones. Never spend > 50s on any single question in Round 1.",
      confidence: "high",
      source: "heuristic",
    };
  }

  // Glanced and immediately skipped — topic blind spot
  if (t < 15) {
    return {
      type: "didnt_know",
      detail: `Quick skip on "${ans.question.topic}" — you identified within ${t}s that you didn't know this. Smart move in a 15-minute section.`,
      tip: `Mark "${ans.question.chapter}" for a complete theory review. Convert this blind spot into 2 easy marks for the next mock.`,
      confidence: "medium",
      source: "heuristic",
    };
  }

  // Spent time, gave up — partial knowledge
  if (t > 60) {
    return {
      type: "couldnt_solve",
      detail: `Time drain skip: ${t}s spent on "${ans.question.topic}" but you left it blank. Danger — in a 15-minute section, spending > 60s on one question and skipping it is a double loss (time + marks).`,
      tip: "Set a 45-second escape rule: if you are stuck, guess the most plausible option, mark it, and move on. Never leave a question blank after spending 60+ seconds on it — the -0.5 penalty is worth the attempt.",
      confidence: "medium",
      source: "heuristic",
    };
  }

  // Strategic skip (15–60s) — valid decision
  return {
    type: "strategic_skip",
    detail: `Strategic skip in "${ans.question.topic}" (${t}s). You evaluated it and correctly decided to move on within the 15-minute window.`,
    tip: "Good discipline. If time permitted a second sweep in this section, return to these strategic skips.",
    confidence: "high",
    source: "heuristic",
  };
}
