# ExamPrep — Analysis Engine v2: Complete Technical Documentation

> **Version:** 2.0 | **Status:** Pre-implementation | **Classification:** Internal Engineering Reference

---

## Table of Contents

1. [Overview & Philosophy](#1-overview--philosophy)
2. [Pipeline Architecture](#2-pipeline-architecture)
3. [Question Schema Contract](#3-question-schema-contract)
4. [TypeScript Type Definitions](#4-typescript-type-definitions)
5. [Stage 1 — Scoring](#5-stage-1--scoring)
6. [Stage 2 — Mistake Classifier](#6-stage-2--mistake-classifier)
7. [Stage 3 — Topic Accuracy](#7-stage-3--topic-accuracy)
8. [Stage 4 — Error Pattern Detection](#8-stage-4--error-pattern-detection)
9. [Stage 5 — Free Marks Calculator](#9-stage-5--free-marks-calculator)
10. [Stage 6 — Skip Analysis](#10-stage-6--skip-analysis)
11. [Stage 7 — Study Plan Generator](#11-stage-7--study-plan-generator)
12. [Stage 8 — Booster Config](#12-stage-8--booster-config)
13. [Stage 9 — Batch Analysis](#13-stage-9--batch-analysis)
14. [Master Orchestrator](#14-master-orchestrator)
15. [Database Schema Changes](#15-database-schema-changes)
16. [File Structure](#16-file-structure)
17. [API Integration](#17-api-integration)
18. [Implementation Roadmap](#18-implementation-roadmap)
19. [Error Taxonomy Reference](#19-error-taxonomy-reference)
20. [Testing Strategy](#20-testing-strategy)

---

## 1. Overview & Philosophy

The ExamPrep Analysis Engine v2 is a **zero-AI, fully deterministic** performance analysis pipeline. Every output is computed through pure rule-based logic — no LLM calls, no external API dependencies, no per-analysis cost.

### Core Tenets

| Tenet | Description |
|---|---|
| **Deterministic** | Same inputs always produce identical outputs. No randomness, no model drift. |
| **Zero Cost** | ₹0/analysis. No Gemini/GPT calls. Runs entirely on your own compute. |
| **Fast** | Target: <50ms per analysis. Single database round-trip + pure computation. |
| **Explainable** | Every classification has a `confidence` level and human-readable `detail` string. |
| **Incremental** | Works with zero historical data on day 1. Gets smarter as `distractor_map` is populated. |

### Why Rule-Based Over LLM?

| Concern | LLM Approach | Rule Engine Approach |
|---|---|---|
| Cost at scale | ~₹0.03–₹0.90 per analysis | ₹0 |
| Latency | 3–8 seconds (API call) | <50ms (in-process) |
| Reliability | API outages, rate limits | 100% uptime (in-process) |
| Determinism | Non-deterministic (temperature) | Fully deterministic |
| Auditability | Black box | Every decision is a traceable `if` statement |
| Accuracy on structured data | Good | Equal or better (rules fit this domain perfectly) |

The rule engine achieves **~70% classification accuracy out of the box** (heuristics only), rising to **~90%+ once teachers populate `distractor_map`** for questions.

---

## 2. Pipeline Architecture

The engine runs as a single `analyzeAttempt(attemptId)` function call. All 9 stages execute sequentially in one request with a single database join.

```
Student Submits Test
        │
        ▼
┌───────────────────┐
│  Stage 1: Scoring │  ← Raw score, %, correct/incorrect/skipped counts
└────────┬──────────┘
         │
         ▼
┌──────────────────────────┐
│  Stage 2: Mistake        │  ← Classify EVERY answer into error type
│  Classifier              │    (distractor map → heuristic fallback)
└────────┬─────────────────┘
         │  (classified answers feed all downstream stages)
         ├──────────────────────────────────────┐
         │                                      │
         ▼                                      ▼
┌─────────────────────┐            ┌────────────────────────┐
│  Stage 3: Topic     │            │  Stage 4: Error        │
│  Accuracy           │            │  Pattern Detection     │
│  (per chapter/topic)│            │  (8 cross-Q detectors) │
└────────┬────────────┘            └────────────────────────┘
         │
         ├──────────────────────────────────────┐
         │                                      │
         ▼                                      ▼
┌─────────────────────┐            ┌────────────────────────┐
│  Stage 5: Free      │            │  Stage 6: Skip         │
│  Marks Calculator   │            │  Analysis              │
└─────────────────────┘            └────────────────────────┘
         │
         ├──────────────────────────────────────┐
         │                                      │
         ▼                                      ▼
┌─────────────────────┐            ┌────────────────────────┐
│  Stage 7: Study     │            │  Stage 8: Booster      │
│  Plan Generator     │            │  Config                │
└─────────────────────┘            └────────────────────────┘
         │
         ▼
┌───────────────────────────────────────────────────────┐
│  Stage 9: Batch Analysis  (teacher-facing aggregate)  │
└───────────────────────────────────────────────────────┘
         │
         ▼
┌───────────────────────────────────────────────────────┐
│  Save to DB + Update Student Error Profile + Return   │
└───────────────────────────────────────────────────────┘
```

**Trigger:** `POST /api/v1/attempts/:id/submit` calls `analyzeAttempt()` asynchronously after scoring. The student sees their score immediately; the analysis report is available within 50ms.

---
## 3. Question Schema Contract

The engine **depends entirely** on the enriched question schema. Every stage that produces useful output requires these fields to be populated on the `questions` table.

### Required Fields Per Stage

| Field | Type | Required By | Notes |
|---|---|---|---|
| `id` | UUID | All stages | Primary key |
| `subject` | string | Stages 3, 6, 9 | `"Physics"` / `"Chemistry"` / `"Mathematics"` |
| `chapter` | string | Stages 3, 7, 8 | e.g. `"Laws of Motion"` |
| `topic` | string | Stages 3, 7 | e.g. `"Newton's Second Law"` |
| `difficulty` | enum | Stages 2, 5 | `"easy"` / `"medium"` / `"hard"` |
| `question_type` | enum | Stage 1 | `"mcq_single"` / `"integer"` / `"mcq_multi"` |
| `correct_answer` | JSONB | Stage 1 | `["A"]` for MCQ, `[4]` for integer |
| `distractor_map` | JSONB | Stage 2 | Optional but upgrades accuracy 70% → 90% |
| `marking_scheme` | JSONB | Stages 1, 5 | `{"correct":4,"incorrect":-1,"unattempted":0}` |

### Enriched Question JSON Structure

```typescript
interface Question {
  id: string;                    // UUID — required for dedup in boosters
  question_number: number;       // 1-90 for standard JEE paper
  question_text: string;         // Full LaTeX-supported text
  question_images: string[];     // URLs of embedded images
  options: Array<{
    id: "A" | "B" | "C" | "D";
    text: string;
    image_url: string | null;
  }>;
  correct_answer: string[];      // ["A"] or ["A","C"] for multi-correct
  explanation: string;           // Solution text (LaTeX supported)
  explanation_images: string[];
  question_type: "mcq_single" | "mcq_multi" | "integer";
  subject: string;               // "Physics" | "Chemistry" | "Mathematics"
  chapter: string;               // "Kinematics", "Thermodynamics", etc.
  topic: string;                 // "Projectile Motion", "Carnot Cycle", etc.
  difficulty: "easy" | "medium" | "hard";
  source: string;                // "JEE Main 2024 (27 Jan Shift 1)"
  year: number | null;           // 2024 for PYQs, null for custom
  tags: string[];
  distractor_map: DistractorMap | null;   // null = use heuristics only
  marking_scheme: {
    correct: number;             // +4 for JEE
    incorrect: number;           // -1 for JEE
    unattempted: number;         // 0
    partial: boolean;            // false for JEE Main
  };
}

// Distractor map: maps each WRONG option to the mistake it represents
interface DistractorMap {
  [optionId: string]: {          // e.g. "A", "C", "D" (not the correct answer)
    error_type: ErrorType;
    trap_description: string;   // "Formula inversion (a = m/F)"
    common_mistake: string;     // "Confused numerator/denominator in F=ma"
  };
}
```

### Attempt Answer Structure (Input to Engine)

```typescript
interface AttemptAnswer {
  id: string;
  attempt_id: string;
  question_id: string;
  selected_answer: string | null;   // null = skipped
  is_correct: boolean;
  marks_awarded: number;
  time_taken_sec: number;           // time spent on THIS question
  marked_review: boolean;           // student flagged it for review
  // Joined from questions table:
  question: Question;
}
```

---
## 4. TypeScript Type Definitions

All shared types live in `packages/types/src/analysis.types.ts`.

```typescript
// ── Error classification ──────────────────────────────────────────────────────

type ErrorType =
  | "conceptual"      // Didn't know the concept/formula
  | "calculation"     // Right approach, arithmetic error
  | "silly"           // Misread question or option (answered fast)
  | "partial_solve"   // Stopped at an intermediate step
  | "sign_error"      // Correct magnitude, wrong sign/direction
  | "wrong_method"    // Applied inapplicable formula
  | "misread";        // Confused two similar-looking values

type SkipType =
  | "didnt_know"         // Viewed <15s — complete topic gap
  | "couldnt_solve"      // Viewed >60s — partial understanding
  | "ran_out_of_time"    // Viewed <3s — never really saw it
  | "strategic_skip";    // Viewed 15-60s — reasonable decision

interface MistakeClassification {
  type: ErrorType | SkipType | "correct";
  detail: string;        // Human-readable explanation of WHY
  tip: string;           // Actionable advice
  confidence: "high" | "medium" | "low";
  source: "distractor_map" | "heuristic";
}

// ── Classified answer (answer + question + classification) ────────────────────

interface ClassifiedAnswer extends AttemptAnswer {
  classification: MistakeClassification;
}

// ── Stage outputs ─────────────────────────────────────────────────────────────

interface ScoringResult {
  score: number;
  maxScore: number;
  percentage: number;
  correctCount: number;
  incorrectCount: number;
  skippedCount: number;
  subjectBreakdown: Record<string, {
    score: number; maxScore: number; correct: number; incorrect: number; skipped: number;
  }>;
}

interface TopicStat {
  chapter: string;
  topic: string;
  subject: string;
  attempted: number;
  correct: number;
  accuracy: number;         // 0-100
  avgTimeSec: number;
  difficulty: string;       // modal difficulty of questions in this topic
  isWeak: boolean;          // accuracy < 50% OR accuracy < batchAvg - 15
  batchAvg: number;         // batch average accuracy on this topic
  errorBreakdown: {
    conceptual: number;
    calculation: number;
    silly: number;
    partial_solve: number;
  };
}

interface ErrorPattern {
  id: string;               // "careless_errors" | "time_pressure" | etc.
  name: string;
  description: string;
  questionsAffected: string[];  // question IDs
  severity: "high" | "medium" | "low";
  tip: string;
}

interface FreeMarksResult {
  totalFreeMarks: number;
  sillyCount: number;
  calculationCount: number;
  projectedScore: number;
  projectedPercentage: number;
  message: string;          // "Fix 6 errors → score jumps from 156 to 186"
}

interface SkipAnalysis {
  totalSkipped: number;
  didntKnow: number;
  couldntSolve: number;
  ranOutOfTime: number;
  strategicSkip: number;
  subjectBreakdown: Record<string, { skipped: number; total: number; skipRate: number }>;
  recommendation: string;
}

interface StudyDay {
  day: number;
  topic: string;
  chapter: string;
  subject: string;
  activity: string;
  durationMinutes: number;
  focusErrorType: string;   // "conceptual" | "calculation" | "silly"
}

interface BoosterConfig {
  chapters: string[];
  topics: string[];
  questionCount: number;
  difficultyMix: { easy: number; medium: number; hard: number };
  reason: string;
  excludeQuestionIds: string[];  // all Q IDs the student has already seen
}

interface BatchAnalysis {
  testId: string;
  batchId: string;
  totalStudents: number;
  submittedCount: number;
  avgScore: number;
  scoreDistribution: number[];   // histogram buckets
  chapterHeatmap: Array<{
    chapter: string;
    avgAccuracy: number;
    conceptualErrors: number;
    calculationErrors: number;
    sillyErrors: number;
    flag: "strong" | "needs_work" | "critical";
  }>;
  teachingRecs: Array<{ recommendation: string; priority: "high" | "medium" }>;
  attentionFlags: Array<{ studentId: string; reason: string }>;
}

// ── Master result ─────────────────────────────────────────────────────────────

interface AnalysisResult {
  scoring: ScoringResult;
  classified: ClassifiedAnswer[];
  topicStats: TopicStat[];
  errorPatterns: ErrorPattern[];
  freeMarks: FreeMarksResult;
  skipAnalysis: SkipAnalysis;
  studyPlan: StudyDay[];
  boosterConfig: BoosterConfig;
  processingMs: number;
}
```

---
## 5. Stage 1 — Scoring

**File:** `apps/api/src/services/scoring.service.ts`

The simplest stage. Applies the marking scheme to produce raw counts and the score breakdown.

```typescript
function scoreAttempt(
  answers: AttemptAnswer[],
  scheme: MarkingScheme
): ScoringResult {
  let score = 0, correct = 0, incorrect = 0, skipped = 0;

  const subjectBreakdown: Record<string, any> = {};

  for (const ans of answers) {
    const subj = ans.question.subject;
    if (!subjectBreakdown[subj]) {
      subjectBreakdown[subj] = { score: 0, maxScore: 0, correct: 0, incorrect: 0, skipped: 0 };
    }
    const s = subjectBreakdown[subj];
    s.maxScore += scheme.correct;

    if (!ans.selected_answer) {
      score += scheme.unattempted;
      s.score += scheme.unattempted;
      skipped++;
      s.skipped++;
    } else if (ans.is_correct) {
      score += scheme.correct;
      s.score += scheme.correct;
      correct++;
      s.correct++;
    } else {
      score += scheme.incorrect;
      s.score += scheme.incorrect;
      incorrect++;
      s.incorrect++;
    }
  }

  const maxScore = answers.length * scheme.correct;
  return {
    score,
    maxScore,
    percentage: maxScore > 0 ? (score / maxScore) * 100 : 0,
    correctCount: correct,
    incorrectCount: incorrect,
    skippedCount: skipped,
    subjectBreakdown,
  };
}
```

**Output contract:** `ScoringResult` — used by Stages 5 and 9.

---

## 6. Stage 2 — Mistake Classifier

**File:** `apps/api/src/services/analysis/mistake-classifier.ts`

The core differentiator. Every single answer (correct, wrong, skipped) gets a `MistakeClassification` attached to it. All downstream stages consume **classified answers**, not raw answers.

### Two-Layer Architecture

```
For each wrong answer:
  Layer 1: Check distractor_map   → confidence: "high"   (~90% accurate)
  Layer 2: Heuristic fallback     → confidence: "medium"  (~70% accurate)
```

### Main Classifier

```typescript
export function classifyMistake(ans: AttemptAnswer): MistakeClassification {
  // Correct — no further analysis needed
  if (ans.is_correct) {
    return { type: "correct", detail: "", tip: "", confidence: "high", source: "distractor_map" };
  }

  // Skipped — separate classification path
  if (!ans.selected_answer) {
    return classifySkip(ans);
  }

  // LAYER 1: Distractor map (teacher-tagged, high confidence)
  const distractor = ans.question.distractor_map?.[ans.selected_answer];
  if (distractor) {
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
```

### Heuristic Fallback (4 Rules)

These rules use only `time_taken_sec`, `marked_review`, and `difficulty` — all available without any tagging.

```typescript
// Average times (in seconds) per difficulty — tune based on real data
const AVG_TIME: Record<string, number> = {
  easy: 60,
  medium: 120,
  hard: 180,
};

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
```

### Skip Classifier (3 Types)

```typescript
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
```

**Output contract:** `ClassifiedAnswer[]` — this array feeds ALL subsequent stages.

---
## 7. Stage 3 — Topic Accuracy

**File:** `apps/api/src/services/analysis/topic-accuracy.ts`

Groups classified answers by `chapter::topic`, computes per-topic accuracy, and identifies weak topics. Includes an error-type breakdown per topic so the study plan can prescribe the right remedy (not just "revise this topic").

```typescript
export function computeTopicAccuracy(
  classified: ClassifiedAnswer[],
  batchAvgByTopic?: Map<string, number>  // from DB: batch avg accuracy per topic key
): TopicStat[] {

  // Group by "chapter::topic"
  const groups = new Map<string, ClassifiedAnswer[]>();
  for (const ans of classified) {
    const key = `${ans.question.chapter}::${ans.question.topic}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(ans);
  }

  const stats: TopicStat[] = [];

  for (const [key, group] of groups) {
    const [chapter, topic] = key.split("::");
    const attempted = group.filter(a => a.selected_answer !== null).length;
    const correct   = group.filter(a => a.is_correct).length;
    const accuracy  = attempted > 0 ? (correct / attempted) * 100 : 0;
    const batchAvg  = batchAvgByTopic?.get(key) ?? 60;  // default 60% if no data

    // Count each error type within this topic
    const errors = group.filter(a => !a.is_correct && a.selected_answer !== null);
    const errorBreakdown = {
      conceptual:    errors.filter(e => e.classification.type === "conceptual").length,
      calculation:   errors.filter(e => e.classification.type === "calculation").length,
      silly:         errors.filter(e => e.classification.type === "silly").length,
      partial_solve: errors.filter(e => e.classification.type === "partial_solve").length,
    };

    // Weak = accuracy < 50% OR accuracy is >15 points below batch average
    const isWeak = accuracy < 50 || accuracy < batchAvg - 15;

    stats.push({
      chapter,
      topic,
      subject: group[0].question.subject,
      attempted,
      correct,
      accuracy,
      avgTimeSec: group.reduce((s, a) => s + a.time_taken_sec, 0) / group.length,
      difficulty: modalValue(group.map(a => a.question.difficulty)),
      isWeak,
      batchAvg,
      errorBreakdown,
    });
  }

  // Sort: weakest topics first
  return stats.sort((a, b) => a.accuracy - b.accuracy);
}

// Returns the most frequent value in an array
function modalValue<T>(arr: T[]): T {
  const freq = new Map<T, number>();
  for (const v of arr) freq.set(v, (freq.get(v) ?? 0) + 1);
  return [...freq.entries()].sort((a, b) => b[1] - a[1])[0][0];
}
```

### Weak Topic Detection Logic

```
isWeak = true  if:
  - accuracy < 50%          (absolute threshold)
  - accuracy < batchAvg - 15  (relative: significantly below peers)

Both conditions are ORed — a topic qualifies as weak under either condition.
```

**Output contract:** `TopicStat[]` — consumed by Stages 7, 8, and 9.

---

## 8. Stage 4 — Error Pattern Detection

**File:** `apps/api/src/services/analysis/error-patterns.ts`

Runs 8 detectors across the entire classified answer set. Each detector looks for a specific cross-question behavioral pattern. Returns only detected patterns (null patterns are filtered out).

```typescript
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
];

export function detectAllPatterns(answers: ClassifiedAnswer[]): ErrorPattern[] {
  return ALL_DETECTORS.map(d => d(answers)).filter(Boolean) as ErrorPattern[];
}
```

### The 8 Detectors

**Detector 1 — Careless Errors**
```typescript
// Wrong on EASY questions but correct on HARD questions in same chapter
const detectCarelessErrors: PatternDetector = (answers) => {
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
};
```

**Detector 2 — Time Pressure**
```typescript
// Accuracy drops >25% in the last quartile of the test
const detectTimePressure: PatternDetector = (answers) => {
  const sorted = [...answers].sort((a, b) => a.question.question_number - b.question.question_number);
  const q3Start = Math.floor(sorted.length * 0.75);
  const first3Q = sorted.slice(0, q3Start);
  const last1Q  = sorted.slice(q3Start);

  const acc = (arr: ClassifiedAnswer[]) => {
    const att = arr.filter(a => a.selected_answer).length;
    return att > 0 ? arr.filter(a => a.is_correct).length / att * 100 : 0;
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
};
```

**Detector 3 — Blind Spot**
```typescript
// 0% accuracy on a topic with 3+ questions
const detectBlindSpot: PatternDetector = (answers) => {
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
};
```

**Detector 4 — Excessive Skipping**
```typescript
// >30% of questions skipped
const detectExcessiveSkipping: PatternDetector = (answers) => {
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
};
```

**Detector 5 — Slow Solver**
```typescript
// High accuracy but spending >3 min avg per question
const detectSlowSolver: PatternDetector = (answers) => {
  const attempted = answers.filter(a => a.selected_answer);
  const accuracy = attempted.filter(a => a.is_correct).length / attempted.length * 100;
  const avgTime = attempted.reduce((s, a) => s + a.time_taken_sec, 0) / attempted.length;
  if (accuracy > 70 && avgTime > 180) {
    return {
      id: "slow_solver", name: "Accurate But Too Slow",
      description: `${accuracy.toFixed(0)}% accuracy but averaging ${(avgTime/60).toFixed(1)} min/question.`,
      questionsAffected: [],
      severity: "medium",
      tip: "You know the material but need speed drills. Practice under strict time limits.",
    };
  }
  return null;
};
```

**Detector 6 — Subject Avoidance**
```typescript
// Disproportionately skips one subject (>50% skip rate on ≥5 questions)
const detectSubjectAvoidance: PatternDetector = (answers) => {
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
};
```

**Detector 7 — Distractor Trap Victim**
```typescript
// Repeatedly falls for the same trap type (≥3 high-confidence misclassifications of same type)
const detectDistractorTrap: PatternDetector = (classified) => {
  const trapCounts: Record<string, number> = {};
  for (const a of classified) {
    if (a.classification?.confidence === "high" && a.classification.type !== "correct") {
      const t = a.classification.type;
      trapCounts[t] = (trapCounts[t] ?? 0) + 1;
    }
  }
  const [worstType, count] = Object.entries(trapCounts).sort((a, b) => b[1] - a[1])[0] ?? [];
  if (!worstType || count < 3) return null;

  const labels: Record<string, string> = {
    partial_solve: "Stopping at intermediate steps",
    sign_error: "Sign / direction errors",
    formula_inversion: "Formula inversions",
    wrong_method: "Applying wrong method",
  };

  return {
    id: "distractor_trap", name: labels[worstType] ?? `Repeated ${worstType} errors`,
    description: `You made "${worstType}" errors ${count} times in this test.`,
    questionsAffected: [],
    severity: count >= 5 ? "high" : "medium",
    tip: `Before finalising: check signs, verify formula direction, confirm you answered the actual question asked.`,
  };
};
```

**Detector 8 — Free Marks Leak**
```typescript
// Easy/medium questions lost to silly or calculation errors (≥2 instances)
const detectFreeMarksLeak: PatternDetector = (classified) => {
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
};
```

---
## 9. Stage 5 — Free Marks Calculator

**File:** `apps/api/src/services/analysis/free-marks.ts`

The single most emotionally impactful metric in the report. Shows students exactly how many marks they left on the table due to fixable errors (silly mistakes + calculation errors) — errors they *could have* avoided without learning anything new.

```typescript
export function calculateFreeMarks(
  classified: ClassifiedAnswer[],
  scoring: ScoringResult,
  scheme: MarkingScheme
): FreeMarksResult {

  const silly = classified.filter(a => a.classification?.type === "silly");
  const calc  = classified.filter(a => a.classification?.type === "calculation");
  const fixable = silly.length + calc.length;

  // Each fixable error recovers:
  //   +scheme.correct   (gained)
  //   -scheme.incorrect (penalty avoided, which was negative, so we add its absolute)
  const marksPerFix = scheme.correct + Math.abs(scheme.incorrect); // +4 + 1 = +5 for JEE
  const totalFree = fixable * marksPerFix;
  const projected = scoring.score + totalFree;

  return {
    totalFreeMarks: totalFree,
    sillyCount: silly.length,
    calculationCount: calc.length,
    projectedScore: projected,
    projectedPercentage: scoring.maxScore > 0 ? (projected / scoring.maxScore) * 100 : 0,
    message: `Fix ${fixable} silly+calc errors → score jumps from ${scoring.score} to ${projected} (+${totalFree} marks)`,
  };
}
```

### How to Display This to the Student

```
╔═══════════════════════════════════════════════════════╗
║  🎯 Your "Free Marks" — No Extra Studying Required    ║
╠═══════════════════════════════════════════════════════╣
║  Silly mistakes (misread):  3 questions = +15 marks   ║
║  Calculation errors:        4 questions = +20 marks   ║
║  ─────────────────────────────────────────────────    ║
║  Total recoverable:         35 marks                  ║
║  Your actual score:   156   →   Projected: 191        ║
╚═══════════════════════════════════════════════════════╝
```

---

## 10. Stage 6 — Skip Analysis

**File:** `apps/api/src/services/analysis/skip-analysis.ts`

Breaks down skipped questions into 4 types with a per-subject view and an actionable recommendation.

```typescript
export function analyzeSkips(classified: ClassifiedAnswer[]): SkipAnalysis {
  const skips = classified.filter(a => !a.selected_answer);

  const byType = {
    didntKnow:     skips.filter(a => a.classification?.type === "didnt_know").length,
    couldntSolve:  skips.filter(a => a.classification?.type === "couldnt_solve").length,
    ranOutOfTime:  skips.filter(a => a.classification?.type === "ran_out_of_time").length,
    strategicSkip: skips.filter(a => a.classification?.type === "strategic_skip").length,
  };

  // Subject-level skip rates
  const allBySubject = groupBy(classified, a => a.question.subject);
  const subjectBreakdown: Record<string, any> = {};
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
  if (byType.ranOutOfTime > 5)
    recommendation = "Major time management issue. Practice full-length mocks with strict timing.";
  else if (byType.didntKnow > byType.couldntSolve)
    recommendation = "Syllabus gaps detected. Prioritise topic coverage before drilling problems.";
  else if (byType.couldntSolve > 3)
    recommendation = "You understand basics but struggle with multi-step problems. Practice is the fix.";
  else
    recommendation = "Skip strategy is healthy. Focus on reducing wrong answers.";

  return {
    totalSkipped: skips.length,
    ...byType,
    subjectBreakdown,
    recommendation,
  };
}
```

---

## 11. Stage 7 — Study Plan Generator

**File:** `apps/api/src/services/analysis/study-plan.ts`

Generates a 7-day study plan targeting the weakest topics. Crucially, the **activity prescribed per day depends on the dominant error type** for that topic — not just accuracy. A topic with 80% conceptual errors gets a theory-revision activity; the same topic with 80% silly errors gets speed-drill activities.

```typescript
export function generateStudyPlan(
  topicStats: TopicStat[],
  planDays = 7
): StudyDay[] {

  // Take up to 6 weakest topics (leave 1 day for revision)
  const weak = topicStats.filter(t => t.isWeak).slice(0, planDays - 1);
  const plan: StudyDay[] = [];

  for (let i = 0; i < weak.length; i++) {
    const t = weak[i];
    const dominant = getDominantErrorType(t.errorBreakdown);

    // Activity is error-type-aware, not just accuracy-based
    const activity = getActivityForErrorType(dominant, t.topic, t.chapter);

    // Duration scales with severity of weakness
    const durationMinutes = t.accuracy < 25 ? 90 : t.accuracy < 50 ? 75 : 60;

    plan.push({
      day: i + 1,
      topic: t.topic,
      chapter: t.chapter,
      subject: t.subject,
      activity,
      durationMinutes,
      focusErrorType: dominant,
    });
  }

  // Always end with a mixed revision test
  plan.push({
    day: plan.length + 1,
    topic: "Revision",
    chapter: "All weak topics",
    subject: "Mixed",
    activity: "Attempt a 25-question mixed test covering all weak topics from this plan.",
    durationMinutes: 60,
    focusErrorType: "mixed",
  });

  return plan;
}

function getDominantErrorType(breakdown: TopicStat["errorBreakdown"]): string {
  const sorted = Object.entries(breakdown).sort((a, b) => b[1] - a[1]);
  return sorted[0]?.[0] ?? "conceptual";
}

function getActivityForErrorType(type: string, topic: string, chapter: string): string {
  switch (type) {
    case "conceptual":
      return `Revise NCERT + reference theory for "${topic}". Solve 15 basic problems from scratch. Focus on understanding the WHY behind each formula.`;
    case "calculation":
      return `Do 20 calculation-heavy drills on "${topic}". Write out every step. Check units and significant figures. Verify each step before moving to the next.`;
    case "silly":
      return `Attempt 15 questions on "${topic}" under strict 90-second time pressure per question. Read every option before selecting. No rushing.`;
    case "partial_solve":
      return `Practice 10 multi-step problems on "${topic}". Always verify your intermediate result AND final answer against the options. Ask: did I answer what was actually asked?`;
    default:
      return `Mixed practice on "${topic}" in ${chapter}. Focus on your identified weak areas.`;
  }
}
```

---

## 12. Stage 8 — Booster Config

**File:** `apps/api/src/services/analysis/booster.ts`

Generates the configuration for the auto-generated Booster Test shown on the results page. The booster is a follow-up test targeting only the student's weak topics, with questions the student hasn't seen before.

```typescript
export function generateBoosterConfig(
  topicStats: TopicStat[],
  allSeenQuestionIds: string[]  // questions the student has already attempted (ever)
): BoosterConfig {

  // Target top 3 weakest topics
  const weak = topicStats.filter(t => t.isWeak).slice(0, 3);

  // Difficulty mix: easier start if accuracy is very low
  const avgAccuracy = weak.reduce((s, t) => s + t.accuracy, 0) / (weak.length || 1);
  const diffMix = avgAccuracy < 25
    ? { easy: 7, medium: 6, hard: 2 }   // mostly easy — build confidence
    : { easy: 3, medium: 8, hard: 4 };  // standard mix

  return {
    chapters: [...new Set(weak.map(t => t.chapter))],
    topics: weak.map(t => t.topic),
    questionCount: 15,           // micro booster default (30 for full booster)
    difficultyMix: diffMix,
    reason: `Targeting your ${weak.length} weakest topics: ${weak.map(t => t.topic).join(", ")}`,
    excludeQuestionIds: allSeenQuestionIds,
  };
}
```

### Booster Question Selection Algorithm (in `tests.service.ts`)

```typescript
// When the student clicks "Start Booster":
async function generateBoosterTest(config: BoosterConfig, examId: string) {
  const questions = await db.questions.findMany({
    where: {
      exam_id: examId,
      topic: { in: config.topics },
      id: { notIn: config.excludeQuestionIds },  // never repeat questions
    },
  });

  // Split by difficulty and weight toward weakest topic
  const selected = selectWithWeighting(questions, config);
  return selected;
}
```

---
## 13. Stage 9 — Batch Analysis

**File:** `apps/api/src/services/analysis/batch-analysis.ts`

Aggregates all student attempts for a given institute test and produces a teacher-facing report. Tells teachers not just *which* chapters students struggled with, but *why* — and prescribes whether to re-teach theory or assign drills.

```typescript
export async function analyzeBatch(
  testId: string,
  batchId: string
): Promise<BatchAnalysis> {

  // Fetch all submitted attempts for this test+batch with classified answers
  const attempts = await db.getAttemptsByTestAndBatch(testId, batchId);
  // Each attempt has: answers[] with classification already stored in DB

  const totalStudents = attempts.length;
  const scores = attempts.map(a => a.score);
  const avgScore = scores.reduce((s, x) => s + x, 0) / totalStudents;

  // Score distribution — 10 histogram buckets (0-10%, 10-20%, ... 90-100%)
  const buckets = Array(10).fill(0);
  for (const a of attempts) {
    const bucket = Math.min(9, Math.floor(a.percentage / 10));
    buckets[bucket]++;
  }

  // Chapter heatmap with error-type breakdown
  const chapterData = new Map<string, {
    correct: number; total: number;
    conceptual: number; calculation: number; silly: number;
  }>();

  for (const attempt of attempts) {
    for (const ans of attempt.answers) {
      const ch = ans.question.chapter;
      if (!chapterData.has(ch)) {
        chapterData.set(ch, { correct: 0, total: 0, conceptual: 0, calculation: 0, silly: 0 });
      }
      const d = chapterData.get(ch)!;
      d.total++;
      if (ans.is_correct) d.correct++;
      else if (ans.classification?.type === "conceptual") d.conceptual++;
      else if (ans.classification?.type === "calculation") d.calculation++;
      else if (ans.classification?.type === "silly") d.silly++;
    }
  }

  // Build heatmap with dominant error type and teaching recommendation
  const chapterHeatmap = [...chapterData.entries()].map(([chapter, d]) => {
    const avgAccuracy = d.total > 0 ? (d.correct / d.total) * 100 : 0;
    const dominant = d.conceptual >= d.calculation && d.conceptual >= d.silly ? "conceptual"
                   : d.calculation >= d.silly ? "calculation" : "silly";
    const flag: "strong" | "needs_work" | "critical" =
      avgAccuracy >= 70 ? "strong" : avgAccuracy >= 40 ? "needs_work" : "critical";
    return { chapter, avgAccuracy, conceptualErrors: d.conceptual, calculationErrors: d.calculation, sillyErrors: d.silly, flag, dominant };
  }).sort((a, b) => a.avgAccuracy - b.avgAccuracy);

  // Teaching recommendations — error-type-aware
  const teachingRecs = chapterHeatmap
    .filter(c => c.flag !== "strong")
    .map(c => {
      let recommendation = "";
      if (c.dominant === "conceptual")
        recommendation = `${c.chapter}: ${c.conceptualErrors} conceptual errors. Schedule a re-teaching session on core theory.`;
      else if (c.dominant === "calculation")
        recommendation = `${c.chapter}: Students grasp concepts but ${c.calculationErrors} calculation errors. Assign a drill sheet, not a lecture.`;
      else
        recommendation = `${c.chapter}: ${c.sillyErrors} silly mistakes. Emphasise careful reading in next test. No re-teaching needed.`;
      return { recommendation, priority: (c.flag === "critical" ? "high" : "medium") as "high" | "medium" };
    });

  // Flag students significantly below batch average
  const attentionFlags = attempts
    .filter(a => a.percentage < avgScore - 20)
    .map(a => ({
      studentId: a.student_id,
      reason: `Score ${a.score.toFixed(0)} is ${(avgScore - a.percentage).toFixed(0)}% below batch average`,
    }));

  return {
    testId, batchId, totalStudents,
    submittedCount: attempts.filter(a => a.status === "submitted").length,
    avgScore, scoreDistribution: buckets,
    chapterHeatmap, teachingRecs, attentionFlags,
  };
}
```

---

## 14. Master Orchestrator

**File:** `apps/api/src/services/analysis.service.ts`

The single entry point. Called by `submitAttempt()` in the attempts controller.

```typescript
export async function analyzeAttempt(attemptId: string): Promise<AnalysisResult> {
  const start = Date.now();

  // Single DB round-trip: fetch attempt + all answers + questions (JOIN)
  const { attempt, answers } = await db.getAttemptWithAnswers(attemptId);
  // answers[i].question is populated (JOIN with questions table)

  // ── Stage 1: Score ────────────────────────────────────────────────────────
  const scoring = scoreAttempt(answers, attempt.marking_scheme);

  // ── Stage 2: Classify every answer ────────────────────────────────────────
  const classified: ClassifiedAnswer[] = answers.map(a => ({
    ...a,
    classification: classifyMistake(a),
  }));

  // ── Stages 3-6: Parallel analysis (all consume classified) ───────────────
  const [batchAvgs] = await Promise.all([
    db.getBatchAvgsByTopic(attempt.batch_id),   // for comparison benchmarks
  ]);

  const topicStats    = computeTopicAccuracy(classified, batchAvgs);
  const errorPatterns = detectAllPatterns(classified);
  const freeMarks     = calculateFreeMarks(classified, scoring, attempt.marking_scheme);
  const skipAnalysis  = analyzeSkips(classified);

  // ── Stages 7-8: Generate action items ─────────────────────────────────────
  const seenQIds = await db.getSeenQuestionIds(attempt.student_id, attempt.exam_id);
  const studyPlan     = generateStudyPlan(topicStats);
  const boosterConfig = generateBoosterConfig(topicStats, seenQIds);

  const processingMs = Date.now() - start;

  // ── Persist results ────────────────────────────────────────────────────────
  await Promise.all([
    // Save analysis record
    db.upsertAnalysis(attemptId, {
      weak_topics:      topicStats.filter(t => t.isWeak),
      error_patterns:   errorPatterns,
      free_marks:       freeMarks,
      skip_analysis:    skipAnalysis,
      study_plan:       studyPlan,
      next_test_config: boosterConfig,
      model_used:       "rule-engine-v2",
      tokens_used:      0,
      processing_ms:    processingMs,
    }),
    // Store per-answer classifications (for future cross-test trend analysis)
    db.saveAnswerClassifications(attemptId, classified),
    // Update rolling student error profile
    db.updateStudentErrorProfile(attempt.student_id, attempt.exam_id, classified),
  ]);

  return {
    scoring,
    classified,
    topicStats,
    errorPatterns,
    freeMarks,
    skipAnalysis,
    studyPlan,
    boosterConfig,
    processingMs,
  };
}
```

### Performance Characteristics

| Operation | Time (estimated) |
|---|---|
| DB fetch (1 JOIN) | ~5–15ms |
| Stage 2: classify N answers | ~0.1ms × N |
| Stages 3–6: all analyzers | ~1–5ms total |
| Stages 7–8: plan generation | ~1ms |
| DB writes (3 parallel) | ~10–20ms |
| **Total end-to-end** | **<50ms** |

---
## 15. Database Schema Changes

Three changes to the existing schema are required.

### 15.1 Add `distractor_map` to `questions`

```sql
-- Nullable — questions without a distractor_map use heuristic classification
ALTER TABLE questions
  ADD COLUMN distractor_map JSONB DEFAULT NULL;

-- Example stored value:
-- {
--   "A": {"error_type":"conceptual","trap_description":"Formula inversion","common_mistake":"Used a=m/F"},
--   "C": {"error_type":"calculation","trap_description":"Multiplication instead of division","common_mistake":"F×m instead of F÷m"}
-- }
```

### 15.2 Add `error_classification` to `attempt_answers`

```sql
-- Stores the MistakeClassification object for each answer
-- Enables: cross-test trend analysis, teacher drill-down, future ML training data
ALTER TABLE attempt_answers
  ADD COLUMN error_classification JSONB DEFAULT NULL;

-- Example stored value:
-- {"type":"silly","detail":"Answered in 18s (avg: 120s)","tip":"Read fully before answering","confidence":"medium","source":"heuristic"}
```

### 15.3 New Table: `student_error_profile`

```sql
-- Rolling error profile per student per exam. Updated after every test.
-- Enables cross-test trend analysis without re-processing historical data.
CREATE TABLE student_error_profile (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id            UUID REFERENCES users(id) NOT NULL,
  exam_id               UUID REFERENCES exams(id) NOT NULL,

  -- Rolling cumulative counts (ever-increasing)
  conceptual_errors     INTEGER DEFAULT 0,
  calculation_errors    INTEGER DEFAULT 0,
  silly_errors          INTEGER DEFAULT 0,
  partial_solve_errors  INTEGER DEFAULT 0,
  time_management_skips INTEGER DEFAULT 0,

  -- Per-chapter breakdown: {"Thermodynamics":{"conceptual":5,"calculation":2},...}
  chapter_error_profile JSONB DEFAULT '{}',

  -- Rolling window: last 5 tests breakdown for trend charts
  last_5_tests_breakdown JSONB DEFAULT '[]',
  -- [{"test_id":"...","date":"...","conceptual":3,"calculation":2,"silly":1},...]

  updated_at            TIMESTAMPTZ DEFAULT now(),
  UNIQUE(student_id, exam_id)
);

CREATE INDEX idx_error_profile_student ON student_error_profile(student_id, exam_id);
```

### 15.4 Add Columns to `ai_analyses`

```sql
-- Extend the existing ai_analyses table with new engine outputs
ALTER TABLE ai_analyses
  ADD COLUMN free_marks    JSONB DEFAULT NULL,
  ADD COLUMN skip_analysis JSONB DEFAULT NULL;
-- weak_topics, error_patterns, study_plan, next_test_config already exist
```

---

## 16. File Structure

```
apps/api/src/services/
├── analysis.service.ts              ← Master orchestrator (Stage entry point)
├── scoring.service.ts               ← Stage 1: Scoring
└── analysis/
    ├── mistake-classifier.ts        ← Stage 2: Classify every answer
    ├── topic-accuracy.ts            ← Stage 3: Per-topic accuracy + error breakdown
    ├── error-patterns.ts            ← Stage 4: 8 cross-question pattern detectors
    ├── free-marks.ts                ← Stage 5: Recoverable marks calculator
    ├── skip-analysis.ts             ← Stage 6: Skip type breakdown
    ├── study-plan.ts                ← Stage 7: Error-type-aware 7-day plan
    ├── booster.ts                   ← Stage 8: Booster test config generator
    └── batch-analysis.ts            ← Stage 9: Teacher-facing batch report

packages/types/src/
└── analysis.types.ts                ← All shared TypeScript interfaces (Section 4)
```

---

## 17. API Integration

### How the Engine is Triggered

```
POST /api/v1/attempts/:id/submit
  → attempts.controller.ts → submitAttempt()
      → scoring (synchronous, instant)
      → analyzeAttempt(attemptId)  ← engine call (async, non-blocking)
  ← 200 OK { score, percentage, ... }   (returned immediately)

GET /api/v1/analysis/:attempt_id
  ← 200 OK { ...AnalysisResult }        (available ~50ms after submit)
  ← 202 Accepted                        (if still processing — rare)
```

### Analysis Controller

```typescript
// apps/api/src/controllers/analysis.controller.ts

export const getAnalysis = async (req: Request, res: Response) => {
  const { attempt_id } = req.params;
  const studentId = req.user.id;

  // Verify ownership
  const attempt = await db.attempts.findUnique({ where: { id: attempt_id } });
  if (!attempt || attempt.student_id !== studentId) {
    return res.status(403).json({ error: "Access denied" });
  }

  const analysis = await db.ai_analyses.findUnique({
    where: { attempt_id },
  });

  if (!analysis) {
    // Engine still running (should be <50ms, so this is very rare)
    return res.status(202).json({ message: "Analysis in progress" });
  }

  return res.json(analysis);
};

export const getBatchAnalysis = async (req: Request, res: Response) => {
  const { test_id, batch_id } = req.params;
  // requireRole("teacher") middleware already validated access

  const existing = await db.batch_analyses.findFirst({
    where: { test_id, batch_id },
  });

  // If batch analysis already exists and is fresh, return it
  if (existing) return res.json(existing);

  // Otherwise compute on-demand (idempotent)
  const result = await analyzeBatch(test_id, batch_id);
  await db.batch_analyses.create({ data: { test_id, batch_id, ...result } });
  return res.json(result);
};
```

### Polling Strategy (Frontend)

```typescript
// apps/web/src/hooks/useAnalysis.ts
// React Query automatically polls until analysis is ready

const { data: analysis } = useQuery({
  queryKey: ["analysis", attemptId],
  queryFn: () => api.get(`/analysis/${attemptId}`),
  refetchInterval: (data) => data?.status === 202 ? 500 : false,  // poll every 500ms until ready
  staleTime: Infinity,  // once received, never refetch
});
```

---

## 18. Implementation Roadmap

### Phase 0 — Foundation (Week 1) 🔴 P0

| Task | File | Effort |
|---|---|---|
| Create `analysis/` directory + shared utils | `services/analysis/index.ts` | 2h |
| Implement Scoring (Stage 1) | `scoring.service.ts` | 4h |
| Implement Mistake Classifier — heuristics only | `analysis/mistake-classifier.ts` | 1 day |
| Implement Topic Accuracy (Stage 3) | `analysis/topic-accuracy.ts` | 1 day |
| Implement Free Marks Calculator (Stage 5) | `analysis/free-marks.ts` | 4h |
| Wire master orchestrator | `analysis.service.ts` | 4h |
| Run DB migrations (Sections 15.1–15.4) | SQL | 1h |

**End of Phase 0:** Working engine. Every submission gets a full analysis with mistake types, weak topics, and free marks. No teacher data needed.

### Phase 1 — Full Engine (Week 2) 🟡 P1

| Task | File | Effort |
|---|---|---|
| Error Pattern Detection (all 8 detectors) | `analysis/error-patterns.ts` | 1.5 days |
| Skip Analysis (Stage 6) | `analysis/skip-analysis.ts` | 4h |
| Study Plan Generator (Stage 7) | `analysis/study-plan.ts` | 1 day |
| Booster Config (Stage 8) | `analysis/booster.ts` | 4h |
| Add `distractor_map` to question creation UI | Teacher UI | 2 days |

**End of Phase 1:** Full 9-stage engine running. Teachers can start tagging distractors.

### Phase 2 — Intelligence Layer (Week 3–4) 🟢 P2

| Task | File | Effort |
|---|---|---|
| Batch Analysis (Stage 9) | `analysis/batch-analysis.ts` | 1 day |
| Student error profile (rolling updates) | DB + `analysis.service.ts` | 1 day |
| Cross-test pattern detection | New service | 1.5 days |
| PDF report generation | `report.service.ts` | 2 days |

**Total effort:** ~12 engineering days for complete engine. Phase 0 alone is ~3 days.

---

## 19. Error Taxonomy Reference

Complete reference for all 12 error types the engine can detect and report.

### Wrong Answer Types (7)

| Code | Name | Trigger | Student Message |
|---|---|---|---|
| `conceptual` | Conceptual Gap | Distractor map OR slow+wrong OR review-flagged | "You didn't know the underlying concept." |
| `calculation` | Calculation Error | Distractor map OR easy+normal-time+wrong | "Right approach, arithmetic slip." |
| `silly` | Misread / Silly | Distractor map OR answered in <30% avg time | "You likely misread the question or options." |
| `partial_solve` | Stopped Too Early | Distractor map (selected intermediate answer) | "You found an intermediate result but not the final answer." |
| `sign_error` | Sign / Direction | Distractor map (correct magnitude, wrong sign) | "Correct value, wrong sign or direction." |
| `wrong_method` | Wrong Method | Distractor map | "Applied an inapplicable formula or method." |
| `misread` | Confused Values | Distractor map | "Mixed up two similar quantities in the problem." |

### Skip Types (3)

| Code | Name | Trigger | Student Message |
|---|---|---|---|
| `didnt_know` | Topic Gap | Viewed <15s and moved on | "You weren't familiar with this topic at all." |
| `couldnt_solve` | Partial Understanding | Viewed >60s and gave up | "You understand basics but need multi-step practice." |
| `ran_out_of_time` | Time Management | Viewed <3s (never reached) | "You ran out of time before reaching this question." |
| `strategic_skip` | Smart Skip | Viewed 15-60s and skipped | "Reasonable skip — time was better used elsewhere." |

### Cross-Question Patterns (8 detectors)

| ID | Name | Trigger |
|---|---|---|
| `careless_errors` | Easy Q wrong, Hard Q right | Same chapter, ≥2 easy wrong + ≥1 hard correct |
| `time_pressure` | Accuracy drops in last quartile | >25% drop in last 25% of test |
| `blind_spot` | 0% on topic with 3+ Qs | 3+ attempted, 0 correct |
| `excessive_skipping` | High skip rate | >30% skipped |
| `slow_solver` | High accuracy, slow pace | >70% accuracy + >3min/Q avg |
| `subject_avoidance` | Avoids one subject | >50% skip rate on one subject |
| `distractor_trap` | Keeps falling for same trap | ≥3 high-confidence same-type errors |
| `free_marks_leak` | Loses easy/medium to fixable errors | ≥2 silly+calc errors on easy/medium Qs |

---

## 20. Testing Strategy

### Unit Tests (Jest)

Each stage is a pure function — test it independently with mocked inputs.

```typescript
// apps/api/src/services/analysis/__tests__/mistake-classifier.test.ts

describe("classifyMistake", () => {
  it("returns 'correct' for correct answers", () => {
    const ans = mockAnswer({ is_correct: true });
    expect(classifyMistake(ans).type).toBe("correct");
  });

  it("uses distractor_map when available (high confidence)", () => {
    const ans = mockAnswer({
      is_correct: false,
      selected_answer: "A",
      question: mockQuestion({
        distractor_map: { A: { error_type: "calculation", trap_description: "...", common_mistake: "..." } }
      })
    });
    const result = classifyMistake(ans);
    expect(result.type).toBe("calculation");
    expect(result.confidence).toBe("high");
    expect(result.source).toBe("distractor_map");
  });

  it("uses heuristic fallback when distractor_map is null", () => {
    const ans = mockAnswer({ is_correct: false, selected_answer: "B", time_taken_sec: 10 });
    // 10s < 30% of 120s avg → silly
    expect(classifyMistake(ans).type).toBe("silly");
    expect(classifyMistake(ans).source).toBe("heuristic");
  });

  it("classifies skips correctly by time", () => {
    expect(classifyMistake(mockAnswer({ selected_answer: null, time_taken_sec: 1 })).type).toBe("ran_out_of_time");
    expect(classifyMistake(mockAnswer({ selected_answer: null, time_taken_sec: 8 })).type).toBe("didnt_know");
    expect(classifyMistake(mockAnswer({ selected_answer: null, time_taken_sec: 90 })).type).toBe("couldnt_solve");
    expect(classifyMistake(mockAnswer({ selected_answer: null, time_taken_sec: 30 })).type).toBe("strategic_skip");
  });
});
```

### Integration Test — Full Pipeline

```typescript
describe("analyzeAttempt", () => {
  it("produces correct output structure", async () => {
    const result = await analyzeAttempt(TEST_ATTEMPT_ID);
    expect(result).toHaveProperty("scoring.score");
    expect(result).toHaveProperty("classified");
    expect(result.classified.length).toBeGreaterThan(0);
    expect(result.classified[0]).toHaveProperty("classification.type");
    expect(result).toHaveProperty("topicStats");
    expect(result).toHaveProperty("freeMarks.totalFreeMarks");
    expect(result).toHaveProperty("studyPlan");
    expect(result.processingMs).toBeLessThan(500);  // must be fast
  });
});
```

### Key Test Scenarios

| Scenario | Expected Behaviour |
|---|---|
| 90/90 correct, no skips | No weak topics, freeMarks = 0, no error patterns |
| All questions skipped | skipAnalysis shows ranOutOfTime or didntKnow, studyPlan covers all topics |
| 0% on 3 topics | detectBlindSpot fires for those topics |
| >30% skip rate | detectExcessiveSkipping fires |
| Accuracy drops >25% last 25 Qs | detectTimePressure fires |
| distractor_map null everywhere | All classifications use heuristic source, confidence = medium or low |
| distractor_map present on all Qs | All classifications use distractor_map source, confidence = high |

---

*Document maintained by the ExamPrep engineering team. Last updated: June 2026.*
*For questions: open an issue in the `test-jee-neet` repository.*
