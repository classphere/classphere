export type ErrorType =
  | "conceptual"      // Didn't know the concept/formula
  | "calculation"     // Right approach, arithmetic error
  | "silly"           // Misread question or option (answered fast)
  | "partial_solve"   // Stopped at an intermediate step
  | "sign_error"      // Correct magnitude, wrong sign/direction
  | "wrong_method"    // Applied inapplicable formula
  | "misread"         // Confused two similar-looking values
  | "unknown";        // Couldn't auto-classify — student should self-tag

export type SkipType =
  | "didnt_know"         // Viewed <15s — complete topic gap
  | "couldnt_solve"      // Viewed >60s — partial understanding
  | "ran_out_of_time"    // Viewed <3s — never really saw it
  | "strategic_skip";    // Viewed 15-60s — reasonable decision

export interface MistakeClassification {
  type: ErrorType | SkipType | "correct" | "correct_guessed";
  detail: string;        // Human-readable explanation of WHY
  tip: string;           // Actionable advice
  confidence: "high" | "medium" | "low" | "very_low";
  source: "distractor_map" | "heuristic";
}

// ── Question Schema Interfaces ──

export interface QuestionOption {
  id: string; // "A", "B", "C", "D"
  text: string;
  image_url: string | null;
}

export interface DistractorMapEntry {
  error_type: ErrorType;
  trap_description: string;
  common_mistake: string;
}

export type DistractorMap = Record<string, DistractorMapEntry>;

export interface Question {
  id: string;
  question_number: number;
  question_text: string;
  image_url: string | null;
  options: QuestionOption[] | null;
  correct_answer: string[];
  explanation: string;
  explanation_image_url: string | null;
  question_type: "mcq_single" | "mcq_multi" | "integer";
  subject: string;
  chapter: string;
  topic: string;
  difficulty: "easy" | "medium" | "hard";
  source: string;
  year: number | null;
  tags: string[];
  distractor_map: DistractorMap | null;
  marking_scheme: {
    correct: number;
    incorrect: number;
    unattempted: number;
    partial: boolean;
  };
}

export interface AttemptAnswer {
  id: string;
  attempt_id: string;
  question_id: string;
  selected_answer: string | null;
  is_correct: boolean;
  marks_awarded: number;
  time_taken_sec: number;
  /** Option B: absolute clock offset in seconds from exam start (0 = exam opened).
   *  Recorded by the test UI as Math.floor((Date.now() - examStartMs) / 1000)
   *  when the student first navigates TO this question.
   *  Used by behavioral-analysis.ts to assign questions to 30-min time buckets.
   */
  start_timestamp: number;
  marked_review: boolean;
  question: Question;
}

export interface ClassifiedAnswer extends AttemptAnswer {
  classification: MistakeClassification;
}

// ── Stage outputs ──

export interface ScoringResult {
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

export interface TopicStat {
  chapter: string;
  topic: string;
  subject: string;
  attempted: number;
  correct: number;
  accuracy: number;
  avgTimeSec: number;
  difficulty: string;
  isWeak: boolean;
  batchAvg: number;
  errorBreakdown: {
    conceptual: number;
    calculation: number;
    silly: number;
    partial_solve: number;
  };
}

export interface ErrorPattern {
  id: string;
  name: string;
  description: string;
  questionsAffected: string[];
  severity: "high" | "medium" | "low";
  tip: string;
}

export interface FreeMarksResult {
  totalFreeMarks: number;
  sillyCount: number;
  calculationCount: number;
  projectedScore: number;
  projectedPercentage: number;
  message: string;
}

export interface SkipAnalysis {
  totalSkipped: number;
  didntKnow: number;
  couldntSolve: number;
  ranOutOfTime: number;
  strategicSkip: number;
  subjectBreakdown: Record<string, { skipped: number; total: number; skipRate: number }>;
  recommendation: string;
}

export interface StudyDay {
  day: number;
  topic: string;
  chapter: string;
  subject: string;
  activity: string;
  durationMinutes: number;
  focusErrorType: string;
}

export interface BoosterConfig {
  chapters: string[];
  topics: string[];
  questionCount: number;
  difficultyMix: { easy: number; medium: number; hard: number };
  reason: string;
  excludeQuestionIds: string[];
}

// ── v4: Behavioral Analysis ──

/** Attempts Over 3 Hours — one entry per 30-min bucket */
export interface TimeIntervalStat {
  intervalLabel: string;   // "First 30 mins" | "Next 30 mins" | ...
  startSec: number;        // bucket start offset from exam start
  endSec: number;          // bucket end offset
  correct: number;
  incorrect: number;
  skipped: number;
  total: number;
  accuracy: number;        // % of attempted that were correct (0 if none attempted)
}

/** One subject block in the navigation timeline */
export interface SubjectSwitch {
  subject: string;
  durationSec: number;
  sequenceIndex: number;   // 0-based order
}

/** Difficulty breakdown — one entry for "Overall" + one per subject */
export interface DifficultyBreakdown {
  subject: string;
  easy:   { correct: number; incorrect: number; skipped: number; total: number };
  medium: { correct: number; incorrect: number; skipped: number; total: number };
  hard:   { correct: number; incorrect: number; skipped: number; total: number };
}

/** MathonGo-style attempt quality classification per subject */
export interface AttemptClassification {
  subject: string;
  perfect: number;     // correct AND within efficient time
  overtime: number;    // correct but spent way too long (≥ 2× avg)
  wasted: number;      // incorrect AND spent lots of time (≥ 1.5× avg)
  confused: number;    // skipped but spent noticeable time (15s–2× avg)
  total: number;
}

/** Panic Cascade — cluster of rapid wrong answers indicating exam anxiety */
export interface PanicCascade {
  detected: boolean;
  startQuestionNumber: number | null;
  endQuestionNumber: number | null;
  incorrectInWindow: number;
  triggerSubject: string | null;
  description: string;
  tip: string;
}

export interface AnalysisResult {
  // Core (existing)
  scoring: ScoringResult;
  classified: ClassifiedAnswer[];
  topicStats: TopicStat[];
  errorPatterns: ErrorPattern[];
  freeMarks: FreeMarksResult;
  skipAnalysis: SkipAnalysis;
  studyPlan: StudyDay[];
  boosterConfig: BoosterConfig;
  processingMs: number;

  // v3 additions
  attemptStrategy: AttemptStrategy;
  longitudinalFlags: LongitudinalFlag[];
  narrative: AnalysisNarrative;

  // v4 additions — behavioral analysis
  timeIntervals: TimeIntervalStat[];
  subjectMovement: SubjectSwitch[];
  difficultyBreakdown: DifficultyBreakdown[];
  attemptClassification: AttemptClassification[];
  panicCascade: PanicCascade;
  fatigueSummary: string;
}

// ── v3: Longitudinal Profiling ──

export interface TopicErrorHistoryEntry {
  attemptId: string;
  attemptDate: number;    // Unix timestamp
  accuracy: number;       // 0–100
  wasWeak: boolean;       // accuracy < 50 OR below batch avg
  dominantErrorType: string;
  questionsAttempted: number;
}

export interface StudentErrorProfile {
  studentId: string;
  examId: string;
  topicHistory: Record<string, TopicErrorHistoryEntry[]>; // key: "chapter::topic"
  lastUpdated: number;
}

export interface LongitudinalFlag {
  type:
    | "recurring_blind_spot"   // same topic weak in 3+ consecutive tests
    | "regression"             // topic was good, now dropped
    | "no_improvement"         // topic weak for 3+ tests, accuracy not moving
    | "newly_weak";            // topic was fine, first time weak
  topic: string;
  chapter: string;
  subject: string;
  occurrences: number;          // how many consecutive tests this appeared
  accuracyTrend: number[];      // last N accuracy values e.g. [72, 58, 41, 38]
  message: string;              // human-readable, teacher-voice message
  urgency: "medium" | "high" | "critical";
  actionRequired: string;       // concrete next step
}

// ── v3: Attempt Strategy ──

export interface AttemptStrategy {
  pattern: "linear" | "subject_grouped" | "difficulty_sweep" | "mixed";
  subjectOrder: string[];                              // order subjects were attempted
  timePerSubjectSec: Record<string, number>;           // actual time spent per subject
  optimalTimeSec: Record<string, number>;              // benchmark for this exam type
  timeDeviationPct: Record<string, number>;            // % over/under optimal
  strategyScore: number;                               // 0–100
  insight: string;                                     // e.g. "You spent 47% on Physics..."
  recommendation: string;
  overtimeSubjects: string[];                          // subjects where >20% over budget
  undertimeSubjects: string[];                         // subjects where >20% under budget
}

// ── v3: Narrative Summary ──

export interface AnalysisNarrative {
  headline: string;            // One punchy line diagnosis
  overview: string;            // 2-3 sentences: what happened this test
  biggestWin: string;          // Highest-ROI single fix
  warningMessage: string | null;  // Critical longitudinal issue, if any
  motivationalNote: string;    // Ends on positive + action
  examCountdown: ExamCountdown | null;
}

export interface ExamCountdown {
  examName: string;            // "JEE Main Session 1" / "JEE Main Session 2"
  examDate: string;            // "2027-01-22"
  daysRemaining: number;
  urgencyMode: "foundation" | "growth" | "sprint" | "crisis";
  urgencyLabel: string;        // e.g. "Sprint Mode — 28 days left"
}

export interface BatchAnalysisResult {
  testId: string;
  batchId: string;
  totalStudents: number;
  avgScore: number;
  avgPercentage: number;
  topicPerformance: {
    topic: string;
    chapter: string;
    avgAccuracy: number;
    bottomQuartileAccuracy: number;
  }[];
  commonMistakes: {
    questionId: string;
    questionNumber: number;
    trapOption: string;
    studentsFallen: number;
    percentageFallen: number;
    errorType: string;
  }[];
  bottleneckChapters: string[];
}
