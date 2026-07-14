import { Request, Response } from "express";
import { supabaseDB } from "../../lib/supabase";

// ─────────────────────────────────────────────────────────────────────────────
/**
 * GET /api/v1/dashboard/student
 * Authenticated (student) — Aggregate stats for the student dashboard.
 *
 * Returns:
 *   - metric cards: total tests, accuracy, avg score, streak
 *   - performance chart: subject scores per attempt (last 10)
 *   - pending DPPs count
 */
export const getStudentDashboard = async (req: Request, res: Response): Promise<void> => {
  try {
    const studentId = req.user!.id;

    // ── Fetch user's exam_target ──────────────────────────────────────────────
    const { data: userData } = await supabaseDB
      .from("users")
      .select("exam_target")
      .eq("id", studentId)
      .single();

    const examTarget = userData?.exam_target ?? "jee-main";

    // ── Fetch all submitted attempts ──────────────────────────────────────────
    const { data: attempts } = await supabaseDB
      .from("attempts")
      .select("id, paper_id, exam_code, score, max_score, submitted_at, created_at")
      .eq("student_id", studentId)
      .eq("status", "submitted")
      .order("submitted_at", { ascending: true });

    const submitted = attempts ?? [];
    const totalTests = submitted.length;

    // ── Compute aggregate metrics ─────────────────────────────────────────────
    let totalScore = 0;
    let totalMaxScore = 0;

    for (const a of submitted) {
      totalScore += a.score ?? 0;
      totalMaxScore += a.max_score ?? 0;
    }

    const accuracyPct = totalMaxScore > 0 ? Math.round((totalScore / totalMaxScore) * 100) : 0;
    const avgScore = totalTests > 0 ? Math.round(totalScore / totalTests) : 0;

    // ── Last 10 attempts for chart: join with analysis_results ────────────────
    const last10 = submitted.slice(-10);
    const last10Ids = last10.map((a) => a.id);

    let chartData: any[] = [];

    if (last10Ids.length > 0) {
      const { data: analyses } = await supabaseDB
        .from("analysis_results")
        .select("attempt_id, result")
        .in("attempt_id", last10Ids);

      const analysisMap: Record<string, any> = {};
      for (const an of analyses ?? []) {
        analysisMap[an.attempt_id] = an.result;
      }

      chartData = last10.map((a, idx) => {
        const analysis = analysisMap[a.id];
        const subjectStats: Record<string, number> = {};

        if (analysis?.subjectBreakdown) {
          for (const [subj, stats] of Object.entries(analysis.subjectBreakdown as Record<string, any>)) {
            subjectStats[subj] = stats.score ?? 0;
          }
        }

        return {
          name: `T${idx + 1}`,
          date: a.submitted_at ? new Date(a.submitted_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "",
          overall: a.score ?? 0,
          max: a.max_score ?? 0,
          ...subjectStats,
        };
      });
    }

    // ── Pending DPPs ──────────────────────────────────────────────────────────
    let pendingDPPs = 0;
    try {
      const { count } = await supabaseDB
        .from("student_dpps")
        .select("id", { count: "exact", head: true })
        .eq("student_id", studentId)
        .eq("status", "pending");
      pendingDPPs = count ?? 0;
    } catch {
      // student_dpps may not exist yet
    }

    // ── Streak from student_stats (if table exists) ───────────────────────────
    let streakDays = 0;
    try {
      const { data: stats } = await supabaseDB
        .from("student_stats")
        .select("streak_days")
        .eq("student_id", studentId)
        .maybeSingle();
      streakDays = stats?.streak_days ?? 0;
    } catch {
      // student_stats may not exist yet
    }

    // ── Response ──────────────────────────────────────────────────────────────
    res.status(200).json({
      success: true,
      data: {
        examTarget,
        metrics: {
          totalTests,
          accuracyPct,
          avgScore,
          streakDays,
          pendingDPPs,
        },
        chartData,
      },
    });
  } catch (err: any) {
    console.error("[getStudentDashboard error]", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
/**
 * GET /api/v1/dashboard/student/history
 * Authenticated (student) — Full attempt history with paper titles.
 */
export const getStudentHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    const studentId = req.user!.id;
    const page = Math.max(1, Number(req.query.page ?? 1));
    const limit = Math.min(50, Math.max(1, Number(req.query.limit ?? 20)));
    const offset = (page - 1) * limit;

    const { data: attempts, count } = await supabaseDB
      .from("attempts")
      .select("id, paper_id, exam_code, score, max_score, submitted_at, created_at, status", { count: "exact" })
      .eq("student_id", studentId)
      .eq("status", "submitted")
      .order("submitted_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (!attempts) {
      res.status(200).json({ success: true, data: { history: [], total: 0, page, limit } });
      return;
    }

    // Fetch paper titles
    const paperIds = [...new Set(attempts.map((a) => a.paper_id).filter(Boolean))];
    let paperMap: Record<string, any> = {};

    if (paperIds.length > 0) {
      const { data: papers } = await supabaseDB
        .from("papers")
        .select("id, title, test_type, subject, chapter")
        .in("id", paperIds);
      for (const p of papers ?? []) paperMap[p.id] = p;
    }

    const history = attempts.map((a) => {
      const paper = paperMap[a.paper_id] ?? {};
      const pct = a.max_score && a.max_score > 0 ? Math.round(((a.score ?? 0) / a.max_score) * 100) : 0;
      return {
        id: a.id,
        title: paper.title ?? "Test",
        test_type: paper.test_type ?? "chapter-wise",
        subject: paper.subject,
        chapter: paper.chapter,
        exam_code: a.exam_code,
        score: a.score ?? 0,
        max_score: a.max_score ?? 0,
        percentage: pct,
        submitted_at: a.submitted_at,
        created_at: a.created_at,
      };
    });

    res.status(200).json({
      success: true,
      data: { history, total: count ?? 0, page, limit },
    });
  } catch (err: any) {
    console.error("[getStudentHistory error]", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
/**
 * GET /api/v1/dashboard/student/mistakes
 * Authenticated (student) — Mistake diary from student_error_profiles.
 */
export const getStudentMistakes = async (req: Request, res: Response): Promise<void> => {
  try {
    const studentId = req.user!.id;

    const { data: profile } = await supabaseDB
      .from("student_error_profiles")
      .select("error_topics, created_at, updated_at")
      .eq("student_id", studentId)
      .maybeSingle();

    if (!profile) {
      res.status(200).json({ success: true, data: { mistakes: [] } });
      return;
    }

    // error_topics is a JSON object: { [topic]: { count, lastSeen, errorType, resolved } }
    const errorTopics = profile.error_topics ?? {};
    const mistakes = Object.entries(errorTopics).map(([topic, data]: [string, any]) => ({
      topic,
      count: data.count ?? 1,
      errorType: data.errorType ?? "unknown",
      subject: data.subject ?? "",
      chapter: data.chapter ?? "",
      lastSeen: data.lastSeen ?? null,
      resolved: data.resolved ?? false,
      tip: data.tip ?? null,
    }));

    // Sort: unresolved first, then by count desc
    mistakes.sort((a, b) => {
      if (a.resolved !== b.resolved) return a.resolved ? 1 : -1;
      return b.count - a.count;
    });

    res.status(200).json({ success: true, data: { mistakes } });
  } catch (err: any) {
    console.error("[getStudentMistakes error]", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
/**
 * PATCH /api/v1/dashboard/student/mistakes/:topic/resolve
 * Authenticated (student) — Toggle the resolved state of a topic mistake.
 */
export const resolveMistake = async (req: Request, res: Response): Promise<void> => {
  try {
    const studentId = req.user!.id;
    const { topic } = req.params;
    const decodedTopic = decodeURIComponent(topic);

    const { data: profile } = await supabaseDB
      .from("student_error_profiles")
      .select("error_topics")
      .eq("student_id", studentId)
      .maybeSingle();

    if (!profile) {
      res.status(404).json({ success: false, message: "No error profile found" });
      return;
    }

    const errorTopics = profile.error_topics ?? {};
    if (!errorTopics[decodedTopic]) {
      res.status(404).json({ success: false, message: "Topic not found in mistake diary" });
      return;
    }

    const currentResolved = errorTopics[decodedTopic].resolved ?? false;
    errorTopics[decodedTopic].resolved = !currentResolved;

    const { error } = await supabaseDB
      .from("student_error_profiles")
      .update({ error_topics: errorTopics })
      .eq("student_id", studentId);

    if (error) {
      res.status(500).json({ success: false, message: error.message });
      return;
    }

    res.status(200).json({
      success: true,
      data: { topic: decodedTopic, resolved: !currentResolved },
    });
  } catch (err: any) {
    console.error("[resolveMistake error]", err);
    res.status(500).json({ success: false, message: err.message });
  }
};
