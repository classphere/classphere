import { Request, Response } from "express";
import { supabaseDB } from "../../lib/supabase";
import { getOrSetCache } from "../../lib/cache";
import {
  LifetimeAttempt,
  MIN_TESTS_FOR_LIFETIME_RANK,
  rankLifetimePerformance,
} from "./lifetime-ranking.service";

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
 * GET /api/v1/rankings/weekly?batch_id=&scope=institute|batch
 * Weekly gamified leaderboard based on questions actually solved this calendar week
 * (Monday 00:00 IST onward). Defaults to full institute level with batch badges.
 */
export const getWeeklyQuestionLeaderboard = async (req: Request, res: Response): Promise<void> => {
  try {
    const batchId = String(req.query.batch_id ?? "");
    const scope = String(req.query.scope ?? (batchId ? "batch" : "institute"));
    const actor = req.user!;

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

    let memberIds: string[] = [];
    const studentBatchMap = new Map<string, string>(); // studentId -> batchName

    if (scope === "batch" && batchId) {
      const { data: membership } = await supabaseDB.from("batch_students")
        .select("batch_id").eq("batch_id", batchId).eq("student_id", actor.id).maybeSingle();
      if (!membership && actor.role === "student") {
        res.status(403).json({ success: false, message: "Batch access denied" });
        return;
      }
    } else if (!actor.institute_id) {
      res.status(400).json({ success: false, message: "Institute ID required for institute weekly leaderboard" });
      return;
    }

    // The actual leaderboard computation doesn't depend on which actor asked for
    // it (only the access-gate above does) — cache per batch/institute + week so
    // repeated opens by many students don't each recompute from raw attempts.
    const cacheScopeId = scope === "batch" && batchId ? `batch:${batchId}` : `inst:${actor.institute_id}`;
    const ranked = await getOrSetCache(`rankings:weekly:${cacheScopeId}:${weekStart}`, 60, () =>
      computeWeeklyLeaderboard(scope, batchId, actor.institute_id, weekStart)
    );

    res.status(200).json({ success: true, data: { entries: ranked, week_start: weekStart, scope } });
  } catch (err: any) {
    console.error("[getWeeklyQuestionLeaderboard error]", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

async function computeWeeklyLeaderboard(
  scope: string,
  batchId: string,
  instituteId: string | null | undefined,
  weekStart: string
): Promise<any[]> {
    let memberIds: string[] = [];
    const studentBatchMap = new Map<string, string>(); // studentId -> batchName

    if (scope === "batch" && batchId) {
      const { data: members } = await supabaseDB
        .from("batch_students")
        .select("student_id, batches(name)")
        .eq("batch_id", batchId);
      for (const m of members ?? []) {
        memberIds.push(m.student_id);
        studentBatchMap.set(m.student_id, (m as any).batches?.name ?? "Batch");
      }
    } else {
      // Full Institute level scope
      const { data: students } = await supabaseDB
        .from("users")
        .select("id, name")
        .eq("institute_id", instituteId)
        .eq("role", "student");

      memberIds = (students ?? []).map((s: any) => s.id);

      // Fetch batch names for all students in institute
      if (memberIds.length > 0) {
        const { data: bStudents } = await supabaseDB
          .from("batch_students")
          .select("student_id, batches(name)")
          .in("student_id", memberIds);
        for (const bs of bStudents ?? []) {
          if (!studentBatchMap.has(bs.student_id)) {
            studentBatchMap.set(bs.student_id, (bs as any).batches?.name ?? "General");
          }
        }
      }
    }

    if (!memberIds.length) return [];

    /**
     * Distinct question ids each student answered correctly this week.
     *
     * Sets rather than running totals, for two reasons. Correctness: the board
     * counts questions *solved*, and two things previously inflated that — a
     * wrong answer counted the same as a right one, and re-sitting a paper
     * counted the same questions again. A question also counts once whether it
     * was met in a DPP or in a test.
     */
    const solvedByStudent = new Map<string, Set<string>>();
    const markSolved = (studentId: string, questionId: string) => {
      const existing = solvedByStudent.get(studentId);
      if (existing) existing.add(questionId);
      else solvedByStudent.set(studentId, new Set([questionId]));
    };

    // Questions answered CORRECTLY in submitted test attempts this week.
    //
    // This counted every question with a selected answer, correct or not. The
    // board is titled "questions solved" and ranks on it, so guessing paid: a
    // student who blind-clicked all 180 questions of a NEET mock scored 180 and
    // beat one who genuinely solved 120. is_correct is set during submitAttempt
    // for exactly this kind of question and was simply never consulted here.
    const fetchAttemptSolved = async (): Promise<Array<[string, string]>> => {
      const pairs: Array<[string, string]> = [];
      const { data: attempts } = await supabaseDB
        .from("attempts")
        .select("id, student_id")
        .in("student_id", memberIds)
        .eq("status", "submitted")
        .gte("submitted_at", weekStart);

      const attemptStudent = new Map((attempts ?? []).map((attempt: any) => [attempt.id, attempt.student_id]));
      const attemptIds = [...attemptStudent.keys()];
      if (!attemptIds.length) return pairs;

      // Paged, and ordered so the pages are stable. One batch of 30 students
      // sitting a single 180-question paper already produces 5,400 rows — well
      // past PostgREST's 1,000-row ceiling. Unpaged, everyone after the first
      // thousand rows silently showed as having solved nothing.
      const PAGE_SIZE = 1000;
      for (let from = 0; ; from += PAGE_SIZE) {
        const { data, error } = await supabaseDB
          .from("attempt_answers")
          .select("attempt_id, question_id")
          .in("attempt_id", attemptIds)
          .eq("is_correct", true)
          .order("id", { ascending: true })
          .range(from, from + PAGE_SIZE - 1);
        if (error) {
          console.error("[rankings] weekly answer page failed:", error.message);
          break;
        }
        const page = data ?? [];
        for (const row of page) {
          const studentId = attemptStudent.get((row as any).attempt_id);
          const questionId = String((row as any).question_id ?? "");
          if (studentId && questionId) pairs.push([studentId, questionId]);
        }
        if (page.length < PAGE_SIZE) break;
      }
      return pairs;
    };

    // Include DPP submissions — independent of attempts, so fetched concurrently
    const fetchDppSolved = async (): Promise<Array<[string, string]>> => {
      const pairs: Array<[string, string]> = [];
      const { data: dppSubmissions } = await supabaseDB
        .from("student_dpps")
        .select("student_id, attempt_answers")
        .in("student_id", memberIds)
        .eq("status", "submitted")
        .gte("submitted_at", weekStart);

      for (const submission of dppSubmissions ?? []) {
        const answers = Array.isArray((submission as any).attempt_answers)
          ? (submission as any).attempt_answers
          : Object.values((submission as any).attempt_answers ?? {});
        // submitDPP grades every answer and stores is_correct and question_id
        // beside it, so correctness is read here rather than recomputed.
        //
        // A non-object entry is an older payload shape that recorded only what
        // was chosen, never whether it was right, and cannot be counted without
        // guessing. Harmless in practice — this board only looks at the current
        // week, and everything written this week carries the graded shape. The
        // is_meta timing record has no is_correct and is skipped by the same test.
        for (const answer of answers) {
          if (!answer || typeof answer !== "object") continue;
          if ((answer as any).is_correct !== true) continue;
          const questionId = String((answer as any).question_id ?? "");
          if (questionId) pairs.push([String((submission as any).student_id), questionId]);
        }
      }
      return pairs;
    };

    const [attemptPairs, dppPairs, { data: users }] = await Promise.all([
      fetchAttemptSolved(),
      fetchDppSolved(),
      supabaseDB.from("users").select("id, name").in("id", memberIds),
    ]);

    for (const [studentId, questionId] of [...attemptPairs, ...dppPairs]) markSolved(studentId, questionId);

    const names = new Map((users ?? []).map((user: any) => [user.id, user.name]));

    const entries = memberIds.map((id: string) => ({
      student_id: id,
      name: names.get(id) ?? "Student",
      batch_name: studentBatchMap.get(id) ?? "Batch",
      questions_solved: solvedByStudent.get(id)?.size ?? 0,
    })).sort((a, b) => b.questions_solved - a.questions_solved || a.name.localeCompare(b.name));

    return entries.map((entry, index) => ({ ...entry, rank: index + 1 }));
}

/**
 * GET /api/v1/rankings/lifetime?batch_id=
 *
 * Sustained performance across every paper the batch has sat, rather than one
 * paper or one week. Scoped to the batch because that is the only comparison
 * that holds everything else steady — same exam, same papers, same teaching.
 * Ranking a NEET student against a JEE one, or class 11 against droppers, would
 * put a number on a difference that has nothing to do with ability.
 */
export const getLifetimeLeaderboard = async (req: Request, res: Response): Promise<void> => {
  try {
    const batchId = String(req.query.batch_id ?? "");
    const actor = req.user!;
    if (!batchId) {
      res.status(400).json({ success: false, message: "batch_id is required" });
      return;
    }

    // Same gate as the weekly board: a student may only read a batch they are in.
    const { data: membership } = await supabaseDB
      .from("batch_students")
      .select("batch_id")
      .eq("batch_id", batchId)
      .eq("student_id", actor.id)
      .is("left_at", null)
      .maybeSingle();
    if (!membership && actor.role === "student") {
      res.status(403).json({ success: false, message: "Batch access denied" });
      return;
    }
    if (actor.role !== "student" && actor.role !== "super_admin") {
      const { data: batch } = await supabaseDB.from("batches").select("institute_id").eq("id", batchId).maybeSingle();
      if (!batch || batch.institute_id !== actor.institute_id) {
        res.status(403).json({ success: false, message: "Batch is outside your institute." });
        return;
      }
    }

    // Identical for everyone who can see this batch, so it is cached per batch
    // rather than per viewer. Sixty seconds matches the weekly board.
    const entries = await getOrSetCache(`rankings:lifetime:batch:${batchId}`, 60, () =>
      computeLifetimeLeaderboard(batchId),
    );

    res.status(200).json({
      success: true,
      data: { entries, min_tests: MIN_TESTS_FOR_LIFETIME_RANK, scope: "batch" },
    });
  } catch (err: any) {
    console.error("[getLifetimeLeaderboard error]", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

async function computeLifetimeLeaderboard(batchId: string): Promise<any[]> {
  // The current roster. A student who left the batch is not part of the cohort
  // being compared, though their attempts remain for their own history.
  const { data: members } = await supabaseDB
    .from("batch_students")
    .select("student_id")
    .eq("batch_id", batchId)
    .is("left_at", null);

  const memberIds = (members ?? []).map((row: any) => row.student_id);
  if (!memberIds.length) return [];

  // Paged: a batch of forty students thirty papers deep is 1,200 rows, past
  // PostgREST's 1,000-row ceiling. Unpaged, the students who happened to sort
  // last would silently rank as though they had never sat anything.
  const PAGE_SIZE = 1000;
  const attempts: LifetimeAttempt[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabaseDB
      .from("attempts")
      .select("student_id, paper_id, score, max_score, submitted_at")
      .in("student_id", memberIds)
      .eq("batch_id", batchId)
      .eq("status", "submitted")
      .gt("max_score", 0)
      .order("id", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (error) {
      console.error("[rankings] lifetime attempt page failed:", error.message);
      break;
    }
    const page = data ?? [];
    for (const row of page) {
      const maxScore = Number((row as any).max_score);
      if (!Number.isFinite(maxScore) || maxScore <= 0) continue;
      attempts.push({
        studentId: String((row as any).student_id),
        paperId: String((row as any).paper_id ?? ""),
        percentage: (Number((row as any).score ?? 0) / maxScore) * 100,
        submittedAt: (row as any).submitted_at ?? null,
      });
    }
    if (page.length < PAGE_SIZE) break;
  }

  const ranked = rankLifetimePerformance(attempts);
  if (!ranked.length) return [];

  const { data: users } = await supabaseDB
    .from("users")
    .select("id, name")
    .in("id", ranked.map((entry) => entry.student_id));
  const names = new Map((users ?? []).map((user: any) => [user.id, user.name]));

  return ranked.map((entry) => ({ ...entry, name: names.get(entry.student_id) ?? "Student" }));
}

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

/** GET /api/v1/rankings/paper?paper_id=&batch_id=&scope=batch|institute — same-paper leaderboard (Batch or Institute wide). */
export const getPaperLeaderboard = async (req: Request, res: Response): Promise<void> => {
  try {
    const batchId = String(req.query.batch_id ?? "");
    const paperId = String(req.query.paper_id ?? "");
    const scope = String(req.query.scope ?? "batch");
    const actor = req.user!;

    if (!paperId) {
      res.status(400).json({ success: false, message: "paper_id is required" });
      return;
    }

    let query = supabaseDB
      .from("attempts")
      .select("student_id, score, max_score, submitted_at, batch_id, batches(name)")
      .eq("paper_id", paperId)
      .eq("status", "submitted")
      .order("submitted_at", { ascending: false });

    if (scope === "batch") {
      if (!batchId) {
        res.status(400).json({ success: false, message: "batch_id is required for batch scope" });
        return;
      }
      query = query.eq("batch_id", batchId);
    } else {
      // Institute scope: filter by all students in actor's institute
      if (!actor.institute_id && actor.role !== "super_admin") {
        res.status(400).json({ success: false, message: "Institute ID required" });
        return;
      }
    }

    const { data: attempts, error } = await query;
    if (error) throw error;

    // Filter out attempts from outside actor's institute if scope=institute
    let filteredAttempts = attempts ?? [];
    if (scope === "institute" && actor.institute_id && actor.role !== "super_admin") {
      const { data: instStudents } = await supabaseDB
        .from("users")
        .select("id")
        .eq("institute_id", actor.institute_id);
      const studentSet = new Set((instStudents ?? []).map((s: any) => s.id));
      filteredAttempts = (attempts ?? []).filter((a: any) => studentSet.has(a.student_id));
    }

    // Deduplicate by student: keep most recent submitted attempt
    const latestByStudent = new Map<string, any>();
    for (const attempt of filteredAttempts) {
      if (!latestByStudent.has(attempt.student_id)) latestByStudent.set(attempt.student_id, attempt);
    }

    const studentIds = [...latestByStudent.keys()];
    const { data: users } = studentIds.length
      ? await supabaseDB.from("users").select("id, name").in("id", studentIds)
      : { data: [] as any[] };
    const names = new Map((users ?? []).map((user: any) => [user.id, user.name]));

    const entries = [...latestByStudent.entries()].map(([studentId, attempt]) => ({
      student_id: studentId,
      name: names.get(studentId) ?? "Student",
      batch_name: attempt.batches?.name ?? "Batch",
      batch_id: attempt.batch_id,
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

    res.status(200).json({ success: true, data: { entries: ranked, total: ranked.length, median, scope } });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * GET /api/v1/rankings/batch-comparison?paper_id=
 * Director / Staff View — Comparative Rank Matrix analyzing performance across all batches
 * assigned to a given paper. Identifies underperforming batches/branches.
 */
export const getBatchComparisonMatrix = async (req: Request, res: Response): Promise<void> => {
  try {
    const paperId = String(req.query.paper_id ?? "");
    const actor = req.user!;

    if (!paperId) {
      res.status(400).json({ success: false, message: "paper_id is required" });
      return;
    }

    // Recomputing this matrix (multiple joined queries + in-memory aggregation) on
    // every request is wasteful for a view that's opened repeatedly by the same
    // staff/directors — cache per paper+scope for a short window instead.
    const scopeKey = actor.role === "super_admin" ? "super" : String(actor.institute_id ?? "none");
    const result = await getOrSetCache(`rankings:batch-comparison:${paperId}:${scopeKey}`, 60, () =>
      computeBatchComparisonMatrix(paperId, actor.role, actor.institute_id)
    );

    if (result.notFound) {
      res.status(404).json({ success: false, message: "Paper not found" });
      return;
    }

    res.status(200).json({ success: true, data: result.data });
  } catch (err: any) {
    console.error("[getBatchComparisonMatrix error]", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

async function computeBatchComparisonMatrix(
  paperId: string,
  actorRole: string,
  actorInstituteId: string | null | undefined
): Promise<{ notFound: true } | { notFound: false; data: any }> {
    // 1. Get paper details
    const { data: paper } = await supabaseDB
      .from("papers")
      .select("id, title, exam_code")
      .eq("id", paperId)
      .maybeSingle();

    if (!paper) {
      return { notFound: true };
    }

    // 2. Get all batch assignments for this paper in the actor's institute
    const { data: assignments, error: assignErr } = await supabaseDB
      .from("test_batch_assignments")
      .select("batch_id, batches(id, name, institute_id, exam)")
      .eq("test_id", paperId);
    if (assignErr) throw assignErr;

    // Filter by institute if not super admin
    const instBatches = (assignments ?? [])
      .map((a: any) => a.batches)
      .filter((b: any) => b && (actorRole === "super_admin" || b.institute_id === actorInstituteId));

    if (instBatches.length === 0) {
      return {
        notFound: false,
        data: {
          paper_id: paperId,
          paper_title: paper.title,
          overall_avg_pct: 0,
          total_batches: 0,
          batches: [],
        },
      };
    }

    // 3. Fetch all submitted attempts for this paper in these batches, plus
    // enrollment counts — independent of each other, run concurrently.
    const batchIds = instBatches.map((b: any) => b.id);
    const [{ data: attempts }, { data: studentCounts }] = await Promise.all([
      supabaseDB
        .from("attempts")
        .select("student_id, batch_id, score, max_score, users!inner(name)")
        .eq("paper_id", paperId)
        .eq("status", "submitted")
        .in("batch_id", batchIds),
      supabaseDB
        .from("batch_students")
        .select("batch_id")
        .in("batch_id", batchIds),
    ]);

    const enrollmentMap: Record<string, number> = {};
    for (const row of studentCounts ?? []) {
      enrollmentMap[row.batch_id] = (enrollmentMap[row.batch_id] || 0) + 1;
    }

    // Group attempts by batch
    const attemptsByBatch: Record<string, any[]> = {};
    for (const bId of batchIds) attemptsByBatch[bId] = [];
    for (const att of attempts ?? []) {
      if (attemptsByBatch[att.batch_id]) attemptsByBatch[att.batch_id].push(att);
    }

    // Compute overall test average
    let overallTotalScore = 0;
    let overallMaxScore = 0;
    for (const att of attempts ?? []) {
      overallTotalScore += Number(att.score ?? 0);
      overallMaxScore += Number(att.max_score ?? 0);
    }
    const overallAvgPct = overallMaxScore > 0 ? Math.round((overallTotalScore / overallMaxScore) * 100) : 0;

    // Compute comparative matrix for each batch
    const batchMatrix = instBatches.map((batch: any) => {
      const bAttempts = attemptsByBatch[batch.id] || [];
      const attemptedCount = bAttempts.length;
      const enrolledCount = enrollmentMap[batch.id] || 0;

      let bTotalScore = 0;
      let bMaxScore = 0;
      let highestScore = 0;
      let lowestScore = 99999;
      let topStudentName = "N/A";

      for (const att of bAttempts) {
        const score = Number(att.score ?? 0);
        const maxScore = Number(att.max_score ?? 0);
        bTotalScore += score;
        bMaxScore += maxScore;
        if (score >= highestScore) {
          highestScore = score;
          topStudentName = att.users?.name ?? "Student";
        }
        if (score < lowestScore) lowestScore = score;
      }

      const avgPct = bMaxScore > 0 ? Math.round((bTotalScore / bMaxScore) * 100) : 0;
      const avgScore = attemptedCount > 0 ? Math.round(bTotalScore / attemptedCount) : 0;
      if (lowestScore === 99999) lowestScore = 0;

      // Underperforming flag: if batch average percentage is >15% below institute average
      const isUnderperforming = attemptedCount > 0 && overallAvgPct > 0 && avgPct < overallAvgPct * 0.85;

      return {
        batch_id: batch.id,
        batch_name: batch.name,
        exam: batch.exam,
        total_enrolled: enrolledCount,
        students_attempted: attemptedCount,
        attempt_rate_pct: enrolledCount > 0 ? Math.round((attemptedCount / enrolledCount) * 100) : 0,
        avg_score: avgScore,
        avg_percentage: avgPct,
        highest_score: highestScore,
        lowest_score: lowestScore,
        top_student_name: topStudentName,
        underperforming_flag: isUnderperforming,
      };
    }).sort((a, b) => b.avg_percentage - a.avg_percentage);

    return {
      notFound: false,
      data: {
        paper_id: paperId,
        paper_title: paper.title,
        overall_avg_pct: overallAvgPct,
        total_batches: instBatches.length,
        batches: batchMatrix,
      },
    };
}

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
