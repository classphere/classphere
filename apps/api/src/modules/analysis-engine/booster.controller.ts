import { Request, Response } from "express";
import { supabaseAdmin } from "../../lib/supabase";

const ALLOWED_COUNTS = new Set([15, 20, 25, 30]);

function shuffled<T>(items: T[]): T[] {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const selected = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[selected]] = [copy[selected], copy[index]];
  }
  return copy;
}

/**
 * POST /api/v1/analysis/:attempt_id/booster
 * Creates a private, untimed practice paper from the completed attempt's weak topics.
 */
export const createBooster = async (req: Request, res: Response): Promise<void> => {
  try {
    const studentId = req.user!.id;
    const attemptId = req.params.attempt_id;
    const questionCount = Number(req.body?.question_count ?? 15);

    if (!ALLOWED_COUNTS.has(questionCount)) {
      res.status(400).json({ success: false, message: "Choose 15, 20, 25, or 30 questions." });
      return;
    }

    const [{ data: attempt, error: attemptError }, { data: analysis, error: analysisError }] = await Promise.all([
      supabaseAdmin
        .from("attempts")
        .select("id, student_id, status, paper_id, papers(exam_id)")
        .eq("id", attemptId)
        .maybeSingle(),
      supabaseAdmin
        .from("analysis_results")
        .select("result")
        .eq("attempt_id", attemptId)
        .maybeSingle(),
    ]);

    if (attemptError || analysisError) throw attemptError ?? analysisError;
    if (!attempt || attempt.student_id !== studentId) {
      res.status(404).json({ success: false, message: "Completed test attempt not found." });
      return;
    }
    if (attempt.status !== "submitted") {
      res.status(400).json({ success: false, message: "Finish the test before starting a booster." });
      return;
    }
    if (!analysis?.result) {
      res.status(409).json({ success: false, message: "Your personalized analysis is still being prepared." });
      return;
    }

    const result: any = analysis.result;
    const boosterConfig = result.boosterConfig ?? result.booster_config;
    const topics = [...new Set((boosterConfig?.topics ?? []).filter((topic: unknown) => typeof topic === "string" && topic.trim()))];
    const chapters = [...new Set((boosterConfig?.chapters ?? []).filter((chapter: unknown) => typeof chapter === "string" && chapter.trim()))];
    const seenQuestionIds = new Set<string>((boosterConfig?.excludeQuestionIds ?? []).filter((id: unknown) => typeof id === "string"));
    const paper = Array.isArray((attempt as any).papers) ? (attempt as any).papers[0] : (attempt as any).papers;
    const examId = paper?.exam_id;

    if (!examId || (topics.length === 0 && chapters.length === 0)) {
      res.status(422).json({ success: false, message: "This test does not have enough weak-topic data for a booster yet." });
      return;
    }

    const selectFields = "id";
    const candidates = new Map<string, any>();
    if (topics.length > 0) {
      const { data, error } = await supabaseAdmin
        .from("questions")
        .select(selectFields)
        .eq("exam_id", examId)
        .eq("is_active", true)
        .in("topic", topics)
        .limit(500);
      if (error) throw error;
      for (const question of data ?? []) candidates.set(question.id, question);
    }
    if (chapters.length > 0 && candidates.size < questionCount) {
      const { data, error } = await supabaseAdmin
        .from("questions")
        .select(selectFields)
        .eq("exam_id", examId)
        .eq("is_active", true)
        .in("chapter", chapters)
        .limit(500);
      if (error) throw error;
      for (const question of data ?? []) candidates.set(question.id, question);
    }

    const selectedQuestions = shuffled([...candidates.values()].filter((question) => !seenQuestionIds.has(question.id))).slice(0, questionCount);
    if (selectedQuestions.length < Math.min(questionCount, 5)) {
      res.status(422).json({
        success: false,
        message: "Not enough unseen questions are available for these weak topics yet. Try a different test after adding more question-bank coverage.",
      });
      return;
    }

    const totalMarks = selectedQuestions.length * 4;
    const { data: boosterPaper, error: paperError } = await supabaseAdmin
      .from("papers")
      .insert({
        exam_id: examId,
        test_type: "booster",
        title: `Personal Booster · ${selectedQuestions.length} Questions`,
        total_questions: selectedQuestions.length,
        total_marks: totalMarks,
        duration_min: 0,
        difficulty: "mixed",
        is_active: true,
        is_published: false,
        delivery_mode: "public_practice",
        created_by: studentId,
      })
      .select("id")
      .single();
    if (paperError || !boosterPaper) throw paperError ?? new Error("Could not create the booster paper.");

    const { error: linksError } = await supabaseAdmin.from("paper_questions").insert(
      selectedQuestions.map((question, index) => ({ paper_id: boosterPaper.id, question_id: question.id, position: index + 1 }))
    );
    if (linksError) {
      await supabaseAdmin.from("papers").delete().eq("id", boosterPaper.id).eq("created_by", studentId);
      throw linksError;
    }

    res.status(201).json({
      success: true,
      data: {
        paper_id: boosterPaper.id,
        question_count: selectedQuestions.length,
        reason: boosterConfig?.reason ?? "Focused practice on your weakest topics.",
      },
    });
  } catch (error: any) {
    console.error("[createBooster error]", error);
    res.status(500).json({ success: false, message: error.message ?? "Failed to create your booster." });
  }
};
