import { Request, Response } from "express";
import { supabaseDB } from "../../lib/supabase";

/**
 * GET /api/v1/rankings/me
 * Authenticated — Return the current student's rank stats across all batches.
 */
export const getMyRanks = async (req: Request, res: Response): Promise<void> => {
  try {
    res.status(410).json({ success: false, message: "Legacy aggregate rankings are retired. Use same-paper batch rankings." });
    return;
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

    // Get all batch members and attempts in batch query aggregates to prevent N+1 query loops (REL-2)
    const batchIds = filteredBatches.map((b: any) => b.id);
    const { data: allMembers } = batchIds.length > 0 ? await supabaseDB
      .from("batch_students")
      .select("batch_id, student_id")
      .in("batch_id", batchIds) : { data: [] };

    const studentsByBatch: Record<string, string[]> = {};
    const allStudentIds: string[] = [];
    for (const m of allMembers ?? []) {
      if (!studentsByBatch[m.batch_id]) studentsByBatch[m.batch_id] = [];
      studentsByBatch[m.batch_id].push(m.student_id);
      allStudentIds.push(m.student_id);
    }
    const uniqueStudentIds = Array.from(new Set(allStudentIds));

    const { data: allBatchAttempts } = uniqueStudentIds.length > 0 ? await supabaseDB
      .from("attempts")
      .select("student_id, score")
      .eq("status", "submitted")
      .in("student_id", uniqueStudentIds) : { data: [] };

    const attemptsByStudent: Record<string, Array<{ score: number }>> = {};
    for (const a of allBatchAttempts ?? []) {
      if (!attemptsByStudent[a.student_id]) attemptsByStudent[a.student_id] = [];
      attemptsByStudent[a.student_id].push(a);
    }

    const batchRanks = filteredBatches.map((batch: any) => {
      const memberIds = studentsByBatch[batch.id] ?? [];
      if (!memberIds.includes(studentId)) return null;

      const bestScoreByStudent: Record<string, number> = {};
      for (const mId of memberIds) {
        const studentAttempts = attemptsByStudent[mId] ?? [];
        const maxScore = studentAttempts.length > 0
          ? Math.max(...studentAttempts.map(a => a.score ?? 0))
          : 0;
        bestScoreByStudent[mId] = maxScore;
      }

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
    }).filter(Boolean);

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

/** GET /api/v1/rankings/batches — batches available to the signed-in student. */
export const getMyRankingBatches = async (req: Request, res: Response): Promise<void> => {
  try {
    const { data, error } = await supabaseDB
      .from("batch_students")
      .select("batch_id, joined_at, batches(id, name, exam)")
      .eq("student_id", req.user!.id)
      .order("joined_at", { ascending: false });
    if (error) throw error;
    const batches = (data ?? []).map((row: any) => row.batches).filter(Boolean);
    res.status(200).json({ success: true, data: { batches } });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * GET /api/v1/rankings/weekly?batch_id=
 * Compare the current batch by questions actually answered this calendar week
 * (Monday 00:00 IST onward). This is intentionally separate from a same-paper
 * result ranking: it rewards consistent practice rather than test percentage.
 */
export const getWeeklyQuestionLeaderboard = async (req: Request, res: Response): Promise<void> => {
  try {
    const batchId = String(req.query.batch_id ?? "");
    const studentId = req.user!.id;
    const { data: membership } = await supabaseDB.from("batch_students")
      .select("batch_id").eq("batch_id", batchId).eq("student_id", studentId).maybeSingle();
    if (!membership) { res.status(403).json({ success: false, message: "Batch access denied" }); return; }

    const now = new Date();
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Kolkata", weekday: "short", year: "numeric", month: "numeric", day: "numeric",
    }).formatToParts(now).reduce<Record<string, string>>((result, part) => {
      if (part.type !== "literal") result[part.type] = part.value;
      return result;
    }, {});
    const weekdayOffset: Record<string, number> = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };
    const istMidnightUtc = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day)) - (5.5 * 60 * 60 * 1000);
    const weekStart = new Date(istMidnightUtc - (weekdayOffset[parts.weekday] ?? 0) * 24 * 60 * 60 * 1000).toISOString();

    const { data: members, error: membersError } = await supabaseDB
      .from("batch_students").select("student_id").eq("batch_id", batchId);
    if (membersError) throw membersError;
    const memberIds = (members ?? []).map((member: any) => member.student_id);
    if (!memberIds.length) {
      res.status(200).json({ success: true, data: { entries: [], week_start: weekStart } });
      return;
    }

    const questionCount = new Map(memberIds.map((id: string) => [id, 0]));
    const { data: attempts, error: attemptsError } = await supabaseDB
      .from("attempts")
      .select("id, student_id")
      .eq("batch_id", batchId)
      .eq("status", "submitted")
      .gte("submitted_at", weekStart);
    if (attemptsError) throw attemptsError;

    const attemptStudent = new Map((attempts ?? []).map((attempt: any) => [attempt.id, attempt.student_id]));
    const attemptIds = [...attemptStudent.keys()];
    if (attemptIds.length) {
      const { data: answers, error: answersError } = await supabaseDB
        .from("attempt_answers")
        .select("attempt_id")
        .in("attempt_id", attemptIds)
        .not("selected_answer", "is", null);
      if (answersError) throw answersError;
      for (const answer of answers ?? []) {
        const answerStudentId = attemptStudent.get((answer as any).attempt_id);
        if (answerStudentId) questionCount.set(answerStudentId, (questionCount.get(answerStudentId) ?? 0) + 1);
      }
    }

    // DPP answers are stored as JSON with the submitted DPP row. Include those
    // too, so the weekly practice ranking reflects the full student workflow.
    const { data: dppSubmissions, error: dppError } = await supabaseDB
      .from("student_dpps")
      .select("student_id, attempt_answers, dpps!inner(batch_id)")
      .in("student_id", memberIds)
      .eq("status", "submitted")
      .gte("submitted_at", weekStart)
      .eq("dpps.batch_id", batchId);
    if (dppError) throw dppError;
    for (const submission of dppSubmissions ?? []) {
      const answers = Array.isArray((submission as any).attempt_answers)
        ? (submission as any).attempt_answers
        : Object.values((submission as any).attempt_answers ?? {});
      const solved = answers.filter((answer: any) => {
        if (answer === null || answer === undefined) return false;
        return typeof answer === "object" ? Boolean(answer.selected_answer) : Boolean(answer);
      }).length;
      const dppStudentId = (submission as any).student_id;
      questionCount.set(dppStudentId, (questionCount.get(dppStudentId) ?? 0) + solved);
    }

    const { data: users, error: usersError } = await supabaseDB
      .from("users").select("id, name").in("id", memberIds);
    if (usersError) throw usersError;
    const names = new Map((users ?? []).map((user: any) => [user.id, user.name]));
    const entries = memberIds.map((id: string) => ({
      student_id: id,
      name: names.get(id) ?? "Student",
      questions_solved: questionCount.get(id) ?? 0,
    })).sort((a, b) => b.questions_solved - a.questions_solved || a.name.localeCompare(b.name));
    const ranked = entries.map((entry, index) => ({ ...entry, rank: index + 1 }));
    res.status(200).json({ success: true, data: { entries: ranked, week_start: weekStart } });
  } catch (err: any) {
    console.error("[getWeeklyQuestionLeaderboard error]", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/** GET /api/v1/rankings/papers?batch_id= — papers this student completed in a batch. */
export const getMyRankedPapers = async (req: Request, res: Response): Promise<void> => {
  try {
    const batchId = String(req.query.batch_id ?? "");
    const studentId = req.user!.id;
    const { data: membership } = await supabaseDB.from("batch_students")
      .select("batch_id").eq("batch_id", batchId).eq("student_id", studentId).maybeSingle();
    if (!membership) { res.status(403).json({ success: false, message: "Batch access denied" }); return; }

    const { data: attempts, error } = await supabaseDB.from("attempts")
      .select("paper_id, submitted_at, papers(id, title)")
      .eq("student_id", studentId).eq("batch_id", batchId).eq("status", "submitted")
      .order("submitted_at", { ascending: false });
    if (error) throw error;
    const seen = new Set<string>();
    const papers = (attempts ?? []).flatMap((attempt: any) => {
      if (!attempt.paper_id || seen.has(attempt.paper_id)) return [];
      seen.add(attempt.paper_id);
      return [{ id: attempt.paper_id, title: attempt.papers?.title ?? "Test", submitted_at: attempt.submitted_at }];
    });
    res.status(200).json({ success: true, data: { papers } });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/** GET /api/v1/rankings/paper?batch_id=&paper_id= — fair same-paper batch comparison. */
export const getPaperLeaderboard = async (req: Request, res: Response): Promise<void> => {
  try {
    const batchId = String(req.query.batch_id ?? "");
    const paperId = String(req.query.paper_id ?? "");
    const actor = req.user!;
    const { data: membership } = await supabaseDB.from("batch_students")
      .select("batch_id").eq("batch_id", batchId).eq("student_id", actor.id).maybeSingle();
    if (!membership) { res.status(403).json({ success: false, message: "Batch access denied" }); return; }
    const { data: assignment } = await supabaseDB.from("test_batch_assignments")
      .select("test_id").eq("test_id", paperId).eq("batch_id", batchId).maybeSingle();
    if (!assignment) { res.status(403).json({ success: false, message: "This paper is not assigned to the selected batch." }); return; }

    const { data: attempts, error } = await supabaseDB.from("attempts")
      .select("student_id, score, max_score, submitted_at")
      .eq("batch_id", batchId).eq("paper_id", paperId).eq("status", "submitted")
      .order("submitted_at", { ascending: false });
    if (error) throw error;

    // A retake should not create duplicate rows; use the most recent submitted attempt.
    const latestByStudent = new Map<string, any>();
    for (const attempt of attempts ?? []) if (!latestByStudent.has(attempt.student_id)) latestByStudent.set(attempt.student_id, attempt);
    const studentIds = [...latestByStudent.keys()];
    const { data: users } = studentIds.length ? await supabaseDB.from("users").select("id, name").in("id", studentIds) : { data: [] as any[] };
    const names = new Map((users ?? []).map((user: any) => [user.id, user.name]));
    const entries = [...latestByStudent.entries()].map(([studentId, attempt]) => ({
      student_id: studentId,
      name: names.get(studentId) ?? "Student",
      score: Number(attempt.score ?? 0),
      max_score: Number(attempt.max_score ?? 0),
      percentage: attempt.max_score > 0 ? Math.round((Number(attempt.score ?? 0) / Number(attempt.max_score)) * 100) : 0,
    })).sort((a, b) => b.percentage - a.percentage || b.score - a.score);
    const medianValues = entries.map((entry) => entry.percentage).sort((a, b) => a - b);
    const median = medianValues.length ? medianValues[Math.floor(medianValues.length / 2)] : 0;
    const ranked = entries.map((entry, index) => ({
      ...entry,
      rank: index + 1,
      percentile: entries.length > 1 ? Math.round(((entries.length - index - 1) / (entries.length - 1)) * 100) : 100,
    }));
    res.status(200).json({ success: true, data: { entries: ranked, total: ranked.length, batch_median: median } });
  } catch (err: any) {
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
    const actor = req.user!;

    if (actor.role !== "super_admin") {
      res.status(410).json({ success: false, message: "Legacy aggregate leaderboards are retired. Use same-paper batch rankings." });
      return;
    }

    // Global rankings are an administrative view only. Tenant users may see
    // their own institute or a batch to which they belong/work.
    if (scope === "global" && actor.role !== "super_admin") {
      res.status(403).json({ success: false, message: "Global leaderboard access is restricted." });
      return;
    }

    let memberIds: string[] = [];

    if (scope === "batch") {
      if (!batch_id) { res.status(400).json({ success: false, message: "batch_id is required for batch scope" }); return; }
      const { data: batch } = await supabaseDB.from("batches").select("institute_id").eq("id", batch_id).maybeSingle();
      if (!batch || (actor.role !== "super_admin" && batch.institute_id !== actor.institute_id)) {
        res.status(403).json({ success: false, message: "Batch is outside your institute." }); return;
      }
      if (actor.role === "student") {
        const { data: membership } = await supabaseDB.from("batch_students")
          .select("batch_id").eq("batch_id", batch_id).eq("student_id", actor.id).maybeSingle();
        if (!membership) { res.status(403).json({ success: false, message: "You are not a member of this batch." }); return; }
      }
      const { data: members } = await supabaseDB.from("batch_students").select("student_id").eq("batch_id", batch_id);
      memberIds = (members ?? []).map((m: any) => m.student_id);
      if (memberIds.length === 0) { res.status(200).json({ success: true, data: { entries: [], total: 0, page: pageNum, limit: limitNum } }); return; }
    } else if (scope === "institute") {
      if (!institute_id) { res.status(400).json({ success: false, message: "institute_id is required for institute scope" }); return; }
      if (actor.role !== "super_admin" && institute_id !== actor.institute_id) {
        res.status(403).json({ success: false, message: "Institute is outside your access scope." }); return;
      }
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

    // Fetch total count and best score via lightweight aggregates (REL-2)
    const { count: totalTests } = await supabaseDB
      .from("attempts")
      .select("id", { count: "exact", head: true })
      .eq("student_id", studentId)
      .eq("status", "submitted");

    const { data: bestAttempt } = await supabaseDB
      .from("attempts")
      .select("score")
      .eq("student_id", studentId)
      .eq("status", "submitted")
      .order("score", { ascending: false })
      .limit(1);

    const bestScore = bestAttempt?.[0]?.score ?? 0;

    res.status(200).json({
      success: true,
      data: {
        student_name: user?.name ?? "Student",
        avatar_url: user?.avatar_url ?? null,
        total_tests: totalTests ?? 0,
        best_score: bestScore,
        computed_at: new Date().toISOString(),
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};
