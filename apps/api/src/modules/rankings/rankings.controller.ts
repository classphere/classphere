import { Request, Response } from "express";
import { supabaseDB } from "../../lib/supabase";

/**
 * GET /api/v1/rankings/me
 * Authenticated — Return the current student's rank stats across all batches.
 */
export const getMyRanks = async (req: Request, res: Response): Promise<void> => {
  try {
    const studentId = req.user!.id;
    const { exam } = req.query as { exam?: string };

    // Get all batches for this student
    const { data: batchLinks } = await supabaseDB
      .from("batch_students")
      .select("batch_id, batches(id, name, institute_id, exam)")
      .eq("student_id", studentId);

    const batches = (batchLinks ?? []).map((r: any) => r.batches).filter(Boolean);

    // Filter by exam if provided
    const filteredBatches = exam ? batches.filter((b: any) => b.exam === exam) : batches;

    // Get all submitted attempts for this student
    const { data: attempts } = await supabaseDB
      .from("attempts")
      .select("id, paper_id, exam_code, score, max_score, submitted_at")
      .eq("student_id", studentId)
      .eq("status", "submitted")
      .order("submitted_at", { ascending: false });

    const totalTests = (attempts ?? []).length;
    const bestScore = Math.max(0, ...(attempts ?? []).map((a: any) => a.score ?? 0));
    const avgScore = totalTests > 0
      ? Math.round((attempts ?? []).reduce((s: number, a: any) => s + (a.score ?? 0), 0) / totalTests)
      : 0;

    // For each batch: compute rank within batch
    const batchRanks = await Promise.all(
      filteredBatches.map(async (batch: any) => {
        // Get all students in this batch
        const { data: members } = await supabaseDB
          .from("batch_students")
          .select("student_id")
          .eq("batch_id", batch.id);

        const memberIds = (members ?? []).map((m: any) => m.student_id);
        if (!memberIds.includes(studentId)) return null;

        // Get best score per student in this batch
        const { data: batchAttempts } = await supabaseDB
          .from("attempts")
          .select("student_id, score")
          .eq("status", "submitted")
          .in("student_id", memberIds)
          .order("score", { ascending: false });

        // Best score per student
        const bestScoreByStudent: Record<string, number> = {};
        for (const a of batchAttempts ?? []) {
          if (!bestScoreByStudent[a.student_id] || a.score > bestScoreByStudent[a.student_id]) {
            bestScoreByStudent[a.student_id] = a.score;
          }
        }

        // Sort descending, find my rank
        const sorted = Object.entries(bestScoreByStudent).sort(([, a], [, b]) => b - a);
        const myIdx = sorted.findIndex(([id]) => id === studentId);
        const myRank = myIdx >= 0 ? myIdx + 1 : null;
        const myScore = bestScoreByStudent[studentId] ?? 0;
        const percentile = myRank && sorted.length > 1
          ? Math.round(((sorted.length - myRank) / (sorted.length - 1)) * 100)
          : 100;

        return {
          batch_id: batch.id,
          batch_name: batch.name,
          rank: myRank,
          total_students: sorted.length,
          best_score: myScore,
          percentile,
        };
      })
    );

    res.status(200).json({
      success: true,
      data: {
        student_id: studentId,
        total_tests: totalTests,
        best_score: bestScore,
        avg_score: avgScore,
        batch_ranks: batchRanks.filter(Boolean),
      },
    });
  } catch (err: any) {
    console.error("[getMyRanks error]", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * GET /api/v1/rankings/leaderboard
 * Authenticated — Get paginated leaderboard for a batch.
 * Query params: batch_id (required), exam, page=1, limit=50
 */
export const getLeaderboard = async (req: Request, res: Response): Promise<void> => {
  try {
    const { scope = "global", batch_id, institute_id, page = "1", limit = "50" } = req.query as Record<string, string>;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const offset = (pageNum - 1) * limitNum;

    let memberIds: string[] = [];

    if (scope === "batch") {
      if (!batch_id) { res.status(400).json({ success: false, message: "batch_id is required for batch scope" }); return; }
      const { data: members } = await supabaseDB.from("batch_students").select("student_id").eq("batch_id", batch_id);
      memberIds = (members ?? []).map((m: any) => m.student_id);
      if (memberIds.length === 0) { res.status(200).json({ success: true, data: { entries: [], total: 0, page: pageNum, limit: limitNum } }); return; }
    } else if (scope === "institute") {
      if (!institute_id) { res.status(400).json({ success: false, message: "institute_id is required for institute scope" }); return; }
      const { data: members } = await supabaseDB.from("users").select("id").eq("institute_id", institute_id).eq("role", "student");
      memberIds = (members ?? []).map((m: any) => m.id);
      if (memberIds.length === 0) { res.status(200).json({ success: true, data: { entries: [], total: 0, page: pageNum, limit: limitNum } }); return; }
    }

    // Query student_stats
    let query = supabaseDB
      .from("student_stats")
      .select("student_id, total_tests, accuracy_pct, rank_score, streak_days, users!inner(name)", { count: "exact" });
      
    if (scope !== "global") {
      query = query.in("student_id", memberIds);
    }
    
    query = query.order("rank_score", { ascending: false }).range(offset, offset + limitNum - 1);

    const { data: stats, count, error } = await query;
    if (error) { res.status(500).json({ success: false, message: error.message }); return; }

    const entries = (stats ?? []).map((s: any, idx) => ({
      student_id: s.student_id,
      name: s.users?.name ?? "Student",
      rank: offset + idx + 1,
      avgScore: s.accuracy_pct ?? 0,
      totalTests: s.total_tests ?? 0,
      streak: s.streak_days ?? 0,
      rankScore: s.rank_score ?? 0,
    }));

    res.status(200).json({ success: true, data: { entries, total: count ?? 0, page: pageNum, limit: limitNum } });
  } catch (err: any) {
    console.error("[getLeaderboard error]", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * GET /api/v1/rankings/rank-card
 * Authenticated — Return rank card data for the current student.
 */
export const getRankCard = async (req: Request, res: Response): Promise<void> => {
  try {
    const studentId = req.user!.id;

    const { data: user } = await supabaseDB
      .from("users")
      .select("name, avatar_url")
      .eq("id", studentId)
      .maybeSingle();

    const { data: attempts } = await supabaseDB
      .from("attempts")
      .select("score, max_score, exam_code")
      .eq("student_id", studentId)
      .eq("status", "submitted");

    const totalTests = (attempts ?? []).length;
    const bestScore = Math.max(0, ...(attempts ?? []).map((a: any) => a.score ?? 0));

    res.status(200).json({
      success: true,
      data: {
        student_name: user?.name ?? "Student",
        avatar_url: user?.avatar_url ?? null,
        total_tests: totalTests,
        best_score: bestScore,
        computed_at: new Date().toISOString(),
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};
