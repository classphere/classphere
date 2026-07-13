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
    const { batch_id, page = "1", limit = "50" } = req.query as Record<string, string>;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));

    if (!batch_id) {
      res.status(400).json({ success: false, message: "batch_id is required" });
      return;
    }

    // Get all students in the batch
    const { data: members } = await supabaseDB
      .from("batch_students")
      .select("student_id, users(id, name)")
      .eq("batch_id", batch_id);

    const memberIds = (members ?? []).map((m: any) => m.student_id);
    const userMap: Record<string, string> = {};
    for (const m of members ?? []) {
      if (m.users) userMap[m.student_id] = (m.users as any).name ?? "Student";
    }

    if (memberIds.length === 0) {
      res.status(200).json({ success: true, data: { entries: [], total: 0, page: pageNum, limit: limitNum } });
      return;
    }

    // Get all submitted attempts for batch members
    const { data: attempts } = await supabaseDB
      .from("attempts")
      .select("student_id, score, max_score, submitted_at")
      .eq("status", "submitted")
      .in("student_id", memberIds);

    // Aggregate: best score, attempt count, avg score per student
    const statsMap: Record<string, { best: number; total: number; count: number; lastAttempt: string }> = {};
    for (const a of attempts ?? []) {
      if (!statsMap[a.student_id]) {
        statsMap[a.student_id] = { best: 0, total: 0, count: 0, lastAttempt: "" };
      }
      const s = statsMap[a.student_id];
      if (a.score > s.best) s.best = a.score;
      s.total += a.score;
      s.count++;
      if (!s.lastAttempt || a.submitted_at > s.lastAttempt) s.lastAttempt = a.submitted_at;
    }

    // Build sorted leaderboard (by best score descending)
    const allEntries = memberIds.map((id: string) => ({
      student_id: id,
      name: userMap[id] ?? "Student",
      best_score: statsMap[id]?.best ?? 0,
      avg_score: statsMap[id]?.count ? Math.round(statsMap[id].total / statsMap[id].count) : 0,
      total_tests: statsMap[id]?.count ?? 0,
      last_attempt: statsMap[id]?.lastAttempt ?? null,
    })).sort((a, b) => b.best_score - a.best_score);

    const total = allEntries.length;
    const offset = (pageNum - 1) * limitNum;
    const paged = allEntries.slice(offset, offset + limitNum).map((e, idx) => ({
      ...e,
      rank: offset + idx + 1,
    }));

    res.status(200).json({ success: true, data: { entries: paged, total, page: pageNum, limit: limitNum } });
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
