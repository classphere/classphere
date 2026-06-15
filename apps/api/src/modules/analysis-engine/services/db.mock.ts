import {
  AttemptAnswer,
  AnalysisResult,
  StudentErrorProfile,
  TopicErrorHistoryEntry,
} from "../../../../../../packages/types/src/analysis.types";

// ── In-memory store (replaces DB until real persistence is wired) ────────────
export const globalDbStore = {
  attempts: new Map<string, { attempt: any; answers: AttemptAnswer[] }>(),
  analysisResults: new Map<string, AnalysisResult>(),

  /**
   * Longitudinal profile store.
   * Key: `${studentId}::${examId}`
   * Value: StudentErrorProfile
   *
   * In production this will be a `student_error_profiles` table in PostgreSQL
   * with JSONB for topicHistory (efficient partial updates via jsonb_set).
   */
  errorProfiles: new Map<string, StudentErrorProfile>(),
};

export const mockDb = {
  getAttemptWithAnswers: async (attemptId: string) => {
    return globalDbStore.attempts.get(attemptId) || {
      attempt: {
        id: attemptId,
        student_id: "student-uuid",
        exam_id: "exam-uuid",
        exam_code: "jee-main",           // needed for strategy benchmarks + countdown
        batch_id: "batch-uuid",
        marking_scheme: { correct: 4, incorrect: -1, unattempted: 0, partial: false },
        total_duration_sec: 10800,        // 3 hours default
      },
      answers: [] as AttemptAnswer[],
    };
  },

  getBatchAvgsByTopic: async (_batchId: string) => {
    return new Map<string, number>();
  },

  getSeenQuestionIds: async (_studentId: string, _examId: string) => {
    return [] as string[];
  },

  // ── Longitudinal Profile ──────────────────────────────────────────────────

  /**
   * Retrieves the stored error profile for a student+exam pair.
   * Returns null if this is their first attempt (no history yet).
   */
  getStudentErrorProfile: async (
    studentId: string,
    examId: string
  ): Promise<StudentErrorProfile | null> => {
    const key = `${studentId}::${examId}`;
    return globalDbStore.errorProfiles.get(key) ?? null;
  },

  /**
   * Merges new topic history entries into the student's persisted profile.
   * In production: UPSERT into student_error_profiles with jsonb_set per topic key.
   */
  persistStudentErrorProfile: async (
    studentId: string,
    examId: string,
    newEntries: Record<string, TopicErrorHistoryEntry>
  ): Promise<void> => {
    const key = `${studentId}::${examId}`;
    const existing = globalDbStore.errorProfiles.get(key) ?? {
      studentId,
      examId,
      topicHistory: {},
      lastUpdated: 0,
    };

    // Merge: append new entry for each topic
    for (const [topicKey, entry] of Object.entries(newEntries)) {
      if (!existing.topicHistory[topicKey]) {
        existing.topicHistory[topicKey] = [];
      }
      existing.topicHistory[topicKey].push(entry);

      // Keep only last 10 attempts per topic (sliding window)
      if (existing.topicHistory[topicKey].length > 10) {
        existing.topicHistory[topicKey] = existing.topicHistory[topicKey].slice(-10);
      }
    }

    existing.lastUpdated = Date.now();
    globalDbStore.errorProfiles.set(key, existing);
    console.log(`[db.mock] Updated error profile for student ${studentId}, ${Object.keys(newEntries).length} topics merged.`);
  },

  // ── Persistence helpers (existing) ───────────────────────────────────────

  upsertAnalysis: async (attemptId: string, data: any) => {
    console.log("[db.mock] upsertAnalysis", attemptId, JSON.stringify(data).slice(0, 120) + "...");
  },

  saveAnswerClassifications: async (attemptId: string, classified: any[]) => {
    console.log(`[db.mock] saveAnswerClassifications attempt=${attemptId} count=${classified.length}`);
  },

  updateStudentErrorProfile: async (studentId: string, examId: string, classified: any[]) => {
    // Legacy method — superseded by persistStudentErrorProfile in v3
    console.log(`[db.mock] updateStudentErrorProfile (legacy) student=${studentId} exam=${examId}`);
  },
};
