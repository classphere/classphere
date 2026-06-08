import { Request, Response, Router } from "express";

const router = Router();

// Mock AI Analysis result to act as the source of "weak topics"
const mockAnalysisData = {
  weakTopics: ["Newton's Laws", "Work-Energy Theorem", "Thermodynamics"],
};

export interface GenerateImprovementRequest {
  studentId: string;
  parentAttemptId: string;
  examType: "JEE" | "NEET";
  mode: "micro" | "full";
  questionCount?: number; // 15-30 for micro
  durationHours?: 1 | 2 | 3; // 1, 2, or 3 for full
}

export const generateImprovementTest = async (reqBody: GenerateImprovementRequest) => {
  const { examType, mode, questionCount, durationHours } = reqBody;

  let finalQuestionCount = 0;
  let finalDurationMinutes = 0;

  if (mode === "micro") {
    if (!questionCount || questionCount < 15 || questionCount > 30) {
      throw new Error("Micro booster requires questionCount between 15 and 30");
    }
    finalQuestionCount = questionCount;
    // Dynamic duration based on exam type
    finalDurationMinutes = examType === "JEE" 
      ? Math.round(finalQuestionCount * 2.4) 
      : finalQuestionCount * 1;
  } else if (mode === "full") {
    if (!durationHours || ![1, 2, 3].includes(durationHours)) {
      throw new Error("Full improvement test requires durationHours of 1, 2, or 3");
    }
    
    // For JEE: 25 Qs per hour. For NEET: 60 Qs per hour.
    const hourlyRate = examType === "JEE" ? 25 : 60;
    finalQuestionCount = hourlyRate * durationHours;
    finalDurationMinutes = durationHours * 60;
  }

  // Generate the mock test response
  return {
    testId: `test_${Date.now()}`,
    examType,
    mode,
    topicsTargeted: mockAnalysisData.weakTopics,
    questionCount: finalQuestionCount,
    durationMinutes: finalDurationMinutes,
    status: "created",
    message: `Generated a ${mode} test with ${finalQuestionCount} questions for ${finalDurationMinutes} minutes.`
  };
};

router.post("/generate-improvement", async (req: Request, res: Response) => {
  try {
    const result = await generateImprovementTest(req.body);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
