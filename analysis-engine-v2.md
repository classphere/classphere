# Analysis Engine v3 — Implementation Plan
## Research-Backed Upgrade to Human-Grade Analysis

> Based on research across Reddit (r/JEEPreparation, r/NEET), Quora, IIT-K study guides,
> Allen/Aakash methodology docs, and PW faculty materials.

---

## What the Current Engine Does Well ✅

Before listing gaps, acknowledge the solid foundation:
- Distractor-map-based classification (high confidence when map exists)
- Time-based heuristic fallback (fast = misread, slow = conceptual)
- 8 pattern detectors (careless, time pressure, blind spot, slow solver, etc.)
- Error breakdown per topic + batch comparison
- Study plan tied to dominant error type
- Skip classification by dwell time (never viewed vs. strategic vs. gave up)

The engine is better than most test series tools on the market. But it has **5 critical gaps** that a real teacher would catch that the engine currently misses.

---

## The 5 Critical Gaps (Research Findings)

### Gap 1: "Correct but Guessed" is Completely Invisible
**Research source:** Vidyamandir, Quora, Reddit r/JEEPreparation — consistently cited as the #1 deceptive blind spot.

> *"These are your most dangerous mistakes. Because you got the marks, you ignore these questions, allowing a knowledge gap to persist into the real exam."*

**Current engine behavior:** All `is_correct = true` answers are classified as `correct` with no further analysis. The engine never asks "but did you actually know it?"

**Why it matters for a real teacher:**
A teacher looking at a student's paper circles every question the student got correct in under 20% of average time. These are the "lucky guesses" — the student eliminated options or guessed based on vague memory. In the real exam, luck won't hold.

---

### Gap 2: No Attempt Strategy Analysis
**Research source:** IIT-K exam guides, Allen strategy docs, Reddit toppers.

> *"Toppers rarely go question-by-question. They do a multi-round sweep: easy first, medium second, hard third. If a student goes linear, they waste time on hard questions early and rush through easy ones at the end."*

**Current engine behavior:** `error-patterns.ts` detects accuracy drop in the final 25% of questions (time pressure). But it doesn't reconstruct HOW the student attempted the paper — their sequencing strategy.

**Why it matters:** A student who does questions 1→90 linearly vs. one who sweeps by difficulty has fundamentally different problems. The current engine can't tell them apart.

---

### Gap 3: Subject-Level Time Allocation is Not Analyzed
**Research source:** Competishun, Allen mock test guides.

> *"For JEE: spend ~45 min on Chemistry (fast), ~55 min on Physics (moderate), ~60 min on Maths (calculation-heavy). If you're spending 90 minutes on Physics, you're off-strategy regardless of your score."*

**Current engine behavior:** Skip analysis shows subject-level skip rates. But it never computes time *actually spent per subject* and compares it to the exam's optimal allocation.

---

### Gap 4: No Longitudinal / Cross-Test Memory
**Research source:** Reddit, Deeksha Learning, Competishun.

> *"If you make the same mistake 3 times across 3 tests, it is a habit, not a slip-up. Treat it differently."*

**Current engine behavior:** Analyzes each attempt in isolation. `updateStudentErrorProfile` exists in `db.mock.ts` but the data is never used to enrich the next analysis. A student could get the same conceptual error flagged in 5 consecutive tests and the engine wouldn't notice.

---

### Gap 5: Study Plan Ignores Exam Date & Time Urgency
**Research source:** All coaching institute methodology.

**Current engine behavior:** `generateStudyPlan` always generates a 7-day plan with uniform intensity. It doesn't know if the exam is in 6 months vs. 3 weeks. A student 3 weeks out needs crisis-mode triage (fix the easiest errors first for maximum mark recovery), not a comprehensive conceptual rebuild.

---

## Upgrade Plan: 8 Targeted Improvements

---

### Upgrade 1: "Correct But Guessed" Detector
**File:** `mistake-classifier.ts` — modify `classifyMistake`
**New file:** `confidence-scorer.ts`

**Logic:**
A correct answer is flagged as "guessed" when:
1. Time taken < 40% of difficulty average (too fast to have worked it out)
2. OR question difficulty = `hard` AND time < average for `easy` (impossibly fast for hard)
3. OR the student marked it for review (flagged = not confident)

```typescript
// New type to add to MistakeClassification
type: "correct" | "correct_guessed" | "conceptual" | "calculation" | ...

// In classifyMistake():
if (ans.is_correct) {
  const avgT = AVG_TIME[ans.question.difficulty] ?? 120;
  const isGuessed =
    (ans.time_taken_sec < avgT * 0.4) ||
    (ans.question.difficulty === "hard" && ans.time_taken_sec < AVG_TIME.easy) ||
    ans.marked_review;

  return {
    type: isGuessed ? "correct_guessed" : "correct",
    detail: isGuessed ? `Answered in ${ans.time_taken_sec}s — possibly guessed or used elimination.` : "",
    tip: isGuessed ? "Verify you understand the full solution path, not just the answer." : "",
    confidence: isGuessed ? "medium" : "high",
    source: "heuristic",
  };
}
```

**New output fields on `AnalysisResult`:**
```typescript
guessedCorrect: {
  count: number;             // how many correct answers look like guesses
  questionIds: string[];
  warningMessage: string;    // "You guessed X correct answers. In the real exam, this risk is real."
  hiddenScoreRisk: number;   // marks at risk if guesses go wrong
}
```

**Impact:** This is the single most human-like insight a teacher gives that no software currently provides.

---

### Upgrade 2: Attempt Strategy Reconstructor
**New file:** `attempt-strategy.ts`

This is new functionality that doesn't exist at all. Reconstruct HOW the student moved through the paper, not just what they got right or wrong.

**Algorithm:**
1. Sort all answers by `question_number`
2. Build an "attempt order" sequence using time_taken_sec as a proxy — questions with non-zero time appear in the attempt sequence
3. Detect if student went linear (1→N) vs. topic-grouped vs. multi-round

```typescript
export interface AttemptStrategy {
  pattern: "linear" | "subject_grouped" | "difficulty_sweep" | "chaotic";
  subjectOrder: string[];          // ["Chemistry", "Physics", "Maths"] order attempted
  avgTimePerSubject: Record<string, number>;
  optimalTimeAllocation: Record<string, number>; // exam-type-specific benchmarks
  timeDeviationPercent: Record<string, number>;  // how far off optimal
  strategyScore: number;           // 0–100, how optimal was the attempt strategy
  insight: string;                 // natural language: "You spent 47% of your time on Physics..."
  recommendation: string;
}
```

**Benchmarks to hardcode (from research):**
```typescript
const OPTIMAL_TIME_SPLIT: Record<string, Record<string, number>> = {
  "jee-main": { Physics: 35, Chemistry: 30, Mathematics: 35 },    // % of total time
  "jee-advanced": { Physics: 35, Chemistry: 30, Mathematics: 35 },
  "neet": { Physics: 28, Chemistry: 25, Biology: 47 },
};
```

**Strategy scoring rubric:**
- Subject order matches strength-first: +20
- No subject over-allocation (>15% over benchmark): +20
- Used multi-round (not purely linear): +20
- Time buffer: finished with >10 min remaining: +20
- No single question > 5 min: +20

---

### Upgrade 3: Enhanced Error Pattern — "Consistent Guesser"
**File:** `error-patterns.ts` — add new detector

```typescript
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
```

---

### Upgrade 4: Longitudinal Error Profile (Cross-Test Memory)
**New file:** `longitudinal-profile.ts`

The engine already calls `db.updateStudentErrorProfile()` — but this data is never read back. Add a new stage that fetches the student's historical error profile and uses it to detect *recurring patterns*.

**New orchestrator stage in `analysis.service.ts`:**
```typescript
// Stage 2.5: Fetch historical error profile
const historicalProfile = await db.getStudentErrorProfile(attempt.student_id, attempt.exam_id);
const longitudinalFlags = detectLongitudinalPatterns(classified, historicalProfile);
```

**New detector:**
```typescript
export interface LongitudinalFlag {
  type: "recurring_error" | "recurring_blind_spot" | "no_improvement" | "regression";
  topic: string;
  occurrences: number;        // how many tests in a row
  message: string;            // "You've failed Carnot Cycle in 4 consecutive tests."
  urgency: "high" | "critical";
}

export function detectLongitudinalPatterns(
  current: ClassifiedAnswer[],
  history: StudentErrorProfile
): LongitudinalFlag[] {
  const flags: LongitudinalFlag[] = [];

  for (const [topic, errorHistory] of Object.entries(history.topicErrors)) {
    // Same topic flagged as weak in 3+ consecutive attempts
    const recentConsecutive = errorHistory.filter(h =>
      h.wasWeak && h.attemptDate > Date.now() - 30 * 24 * 60 * 60 * 1000 // last 30 days
    );

    if (recentConsecutive.length >= 3) {
      flags.push({
        type: "recurring_blind_spot",
        topic,
        occurrences: recentConsecutive.length,
        message: `You've struggled with "${topic}" in ${recentConsecutive.length} consecutive tests. This is no longer a revision gap — it's a fundamental knowledge gap that needs a teacher.`,
        urgency: "critical",
      });
    }

    // Regression: topic was doing well, now dropped
    const recentAcc = errorHistory.slice(-1)[0]?.accuracy ?? 0;
    const prevAcc = errorHistory.slice(-3, -1).reduce((s, h) => s + h.accuracy, 0) / 2;
    if (prevAcc > 60 && recentAcc < 40) {
      flags.push({
        type: "regression",
        topic,
        occurrences: 1,
        message: `Your accuracy in "${topic}" dropped from ${prevAcc.toFixed(0)}% to ${recentAcc.toFixed(0)}%. Something you learned previously has become confused — targeted revision needed.`,
        urgency: "high",
      });
    }
  }

  return flags;
}
```

---

### Upgrade 5: Study Plan v2 — Urgency-Aware + Priority-Ranked
**File:** `study-plan.ts` — complete rewrite

**New inputs:**
```typescript
export function generateStudyPlan(
  topicStats: TopicStat[],
  errorPatterns: ErrorPattern[],
  longitudinalFlags: LongitudinalFlag[],
  freeMarks: FreeMarksResult,
  examDateDaysOut?: number,   // NEW: days until exam
  planDays = 7
): StudyDay[]
```

**Priority scoring per topic (instead of just sorting by accuracy):**
```
priority_score = 
  (100 - accuracy) * 0.30            // weakness weight
  + marksAtStake * 0.30              // how many questions is this topic?
  + (isLongitudinalFlag ? 40 : 0)    // recurring = urgent
  + (isFreeMarksLeak ? 30 : 0)       // fixable errors get priority
  + (daysOut < 30 ? urgencyBoost : 0) // exam-proximity urgency
```

**Exam-date-aware planning modes:**

| Days out | Mode | Plan style |
|---|---|---|
| >90 | Foundation | Conceptual rebuild, 90min sessions |
| 30–90 | Growth | Mixed theory + drills, 75min |
| 14–30 | Sprint | Fix free marks first, 60min, high-speed drills |
| <14 | Crisis | Only attempt-strategy + silly mistake fixes. No new concepts. |

**Crisis mode logic:**
```typescript
if (examDateDaysOut !== undefined && examDateDaysOut < 14) {
  // Only fix silly + calculation errors — fastest mark recovery
  // Do NOT recommend conceptual rebuilding (not enough time)
  // Focus entirely on free marks and attempt strategy
  return generateCrisisPlan(freeMarks, errorPatterns);
}
```

---

### Upgrade 6: Natural Language Summary Generator
**New file:** `narrative-summary.ts`

Currently the engine returns structured data — the frontend has to decide how to display it. Add a natural-language summary that reads like a teacher wrote it.

**Output:**
```typescript
export interface AnalysisNarrative {
  headline: string;          // One-line diagnosis
  overview: string;          // 2-3 sentence summary
  biggestWin: string;        // The one thing they should fix first
  warningMessage?: string;   // If there's a critical flag
  motivationalNote: string;  // Ends on a positive, actionable note
}
```

**Generator logic:**
```typescript
export function generateNarrative(
  scoring: ScoringResult,
  topicStats: TopicStat[],
  errorPatterns: ErrorPattern[],
  freeMarks: FreeMarksResult,
  longitudinalFlags: LongitudinalFlag[],
  strategyAnalysis: AttemptStrategy
): AnalysisNarrative {

  // Determine headline based on dominant issue
  const headline = determineHeadline(scoring, errorPatterns, freeMarks, longitudinalFlags);

  // Overview: what happened, at a high level
  const pct = scoring.percentage.toFixed(0);
  const weakCount = topicStats.filter(t => t.isWeak).length;
  const overview = buildOverview(pct, weakCount, scoring, freeMarks);

  // Biggest win: the single highest-ROI fix
  const biggestWin = identifyBiggestWin(errorPatterns, freeMarks, longitudinalFlags);

  // Warning if critical longitudinal flag exists
  const warningMessage = longitudinalFlags.find(f => f.urgency === "critical")?.message;

  const motivationalNote = buildMotivationalNote(scoring, freeMarks);

  return { headline, overview, biggestWin, warningMessage, motivationalNote };
}
```

**Example outputs:**

*Scenario: Student scored 54%, has free marks issue:*
- **Headline:** "You left 40 marks on the table — and you already knew how to earn them."
- **Overview:** "You scored 54% (162/300) this test. Your conceptual understanding of Physics and Chemistry is solid, but 8 easy-to-medium questions were lost to silly errors and rushed calculations. These are fully recoverable."
- **Biggest Win:** "Fix your careless mistakes on easy questions: that's 40 marks you already have the knowledge to earn. Start by slowing down for the first 10 minutes of every exam."

*Scenario: Student scored 72%, but guessed many:*
- **Headline:** "Strong result — but 6 of your correct answers were luck, not knowledge."
- **Overview:** "72% is excellent. But our analysis found 6 questions where you likely guessed correctly. In the real exam, those guesses may not land. Your hidden risk zone is these 6 questions — treat them as if you got them wrong."

---

### Upgrade 7: Confidence Calibration Score
**New file:** `confidence-score.ts`

A single 0–100 score that tells a student how reliable their score is. High score = consistent, low guessing. Low score = score inflated by luck.

```typescript
export function computeConfidenceScore(classified: ClassifiedAnswer[]): {
  score: number;           // 0–100
  label: "Unreliable" | "Inconsistent" | "Solid" | "Excellent";
  interpretation: string;
} {
  const total = classified.length;
  const guessedCorrect = classified.filter(a => a.classification?.type === "correct_guessed").length;
  const careless = classified.filter(a => a.classification?.type === "silly").length;
  const highConf = classified.filter(a => a.classification?.confidence === "high").length;

  // Penalize guesses and careless errors, reward high-confidence classifications
  const score = Math.max(0, Math.min(100,
    100
    - (guessedCorrect / total) * 30   // guesses reduce reliability
    - (careless / total) * 20         // careless errors = inconsistency
    + (highConf / total) * 10         // high confidence = reliable
  ));

  const label =
    score >= 80 ? "Excellent" :
    score >= 60 ? "Solid" :
    score >= 40 ? "Inconsistent" : "Unreliable";

  return { score: Math.round(score), label, interpretation: buildInterpretation(score, guessedCorrect, careless) };
}
```

---

### Upgrade 8: Smarter Heuristic Thresholds (Calibration)
**File:** `mistake-classifier.ts`

The current heuristics use fixed time thresholds (30%, 2x). Real teacher analysis is more nuanced:

**Current issues identified:**
1. `easy` + normal time → `calculation` is a *low confidence* fallback. But if a student has distractor_map data, we should trust that over the heuristic.
2. The `marked_review → conceptual` rule is too aggressive. A student can mark for review AND still answer correctly — this should be `correct_guessed`, not `conceptual`.
3. The fallback default `conceptual` is too broad. If we genuinely can't classify, it should be `unknown` with `confidence: "very_low"` so the frontend can prompt the student to self-classify.

**Fixes:**
```typescript
// Fix 1: Add "unknown" as a valid classification type
type: "correct" | "correct_guessed" | "conceptual" | "calculation" |
      "silly" | "partial_solve" | "sign_error" | "wrong_method" | "misread" |
      "ran_out_of_time" | "didnt_know" | "couldnt_solve" | "strategic_skip" |
      "unknown"   // NEW: honest about uncertainty

// Fix 2: Improve the marked_review rule
// marked_review + wrong → conceptual (keep current)
// marked_review + correct → correct_guessed (currently classified as just "correct" — WRONG)

// Fix 3: Better default fallback
return {
  type: "unknown",
  detail: "Could not auto-classify. Please review the solution and self-tag this error.",
  tip: "",
  confidence: "very_low",
  source: "heuristic",
};
```

---

## New `AnalysisResult` Shape (v3)

```typescript
export interface AnalysisResult {
  // Existing
  scoring: ScoringResult;
  classified: ClassifiedAnswer[];
  topicStats: TopicStat[];
  errorPatterns: ErrorPattern[];
  freeMarks: FreeMarksResult;
  skipAnalysis: SkipAnalysis;
  studyPlan: StudyDay[];
  boosterConfig: BoosterConfig;
  processingMs: number;

  // NEW in v3
  guessedCorrect: GuessedCorrectResult;         // Upgrade 1
  attemptStrategy: AttemptStrategy;             // Upgrade 2
  longitudinalFlags: LongitudinalFlag[];        // Upgrade 4
  narrative: AnalysisNarrative;                 // Upgrade 6
  confidenceScore: ConfidenceScoreResult;       // Upgrade 7
}
```

---

## File Change Map

| File | Change Type | Upgrade |
|---|---|---|
| `mistake-classifier.ts` | Modify | 1, 8 |
| `error-patterns.ts` | Add 2 detectors | 3 |
| `study-plan.ts` | Rewrite | 5 |
| `analysis.service.ts` | Add new stages | 1, 2, 4, 6, 7 |
| `confidence-score.ts` | **NEW** | 7 |
| `attempt-strategy.ts` | **NEW** | 2 |
| `longitudinal-profile.ts` | **NEW** | 4 |
| `narrative-summary.ts` | **NEW** | 6 |
| `packages/types/analysis.types.ts` | Add new interfaces | All |

---

## Implementation Order (Sequential — each builds on previous)

```
Step 1: types first        → Add new interfaces to analysis.types.ts (30 min)
Step 2: classifier fix     → Upgrade heuristics, add correct_guessed (1 hr)
Step 3: confidence-score   → New file, simple math (45 min)
Step 4: attempt-strategy   → New file, reconstruct attempt order (1.5 hr)
Step 5: longitudinal       → New file, cross-test memory (1 hr)
Step 6: error-patterns     → Add 2 new detectors (45 min)
Step 7: study-plan rewrite → Priority scoring + exam date awareness (1.5 hr)
Step 8: narrative          → NL summary generator (1 hr)
Step 9: orchestrator       → Wire all new stages into analysis.service.ts (30 min)
Step 10: test              → Run against real PYQ submissions, validate output (1 hr)

Total estimated time: ~9.5 hours
```

---

## Open Questions for Approval

> [!IMPORTANT]
> **Q1: Exam date input** — Does the system know a student's target exam date? The study plan v2 urgency modes need this. If not stored, we can add it to user profile at signup.

> [!IMPORTANT]
> **Q2: Longitudinal data availability** — The `db.getStudentErrorProfile()` call exists in the mock but the real data store doesn't persist across attempts yet. This upgrade requires the auth + DB wiring to be done first, OR we can build the logic now and have it gracefully skip if no history exists.

> [!NOTE]
> **Q3: "Correct but guessed" UX** — Should these be shown as warnings on the results page? They might feel discouraging to a student who's happy with their score. Recommendation: show them as a "hidden risk zone" section, not as "errors."
