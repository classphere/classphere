import { AttemptAnswer, AnalysisResult } from "../../../../../../packages/types/src/analysis.types";

// In-memory store for testing the engine without a real DB
export const globalDbStore = {
  attempts: new Map<string, { attempt: any; answers: AttemptAnswer[] }>(),
  analysisResults: new Map<string, AnalysisResult>(),
};

export const mockDb = {
  getAttemptWithAnswers: async (attemptId: string) => {
    return globalDbStore.attempts.get(attemptId) || {
      attempt: {
        id: attemptId,
        student_id: "student-uuid",
        exam_id: "exam-uuid",
        batch_id: "batch-uuid",
        marking_scheme: { correct: 4, incorrect: -1, unattempted: 0, partial: false },
      },
      answers: [] as AttemptAnswer[],
    };
  },

  getBatchAvgsByTopic: async (batchId: string) => {
    return new Map<string, number>();
  },

  getSeenQuestionIds: async (studentId: string, examId: string) => {
    return [] as string[];
  },

  upsertAnalysis: async (attemptId: string, data: any) => {
    console.log("Mock upsertAnalysis", attemptId, data);
  },

  saveAnswerClassifications: async (attemptId: string, classified: any[]) => {
    console.log("Mock saveAnswerClassifications", attemptId, classified.length);
  },

  updateStudentErrorProfile: async (studentId: string, examId: string, classified: any[]) => {
    console.log("Mock updateStudentErrorProfile", studentId, examId);
  },
};
