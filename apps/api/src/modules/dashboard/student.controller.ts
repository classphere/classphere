import { Request, Response } from "express";
import { supabaseDB } from "../../lib/supabase";
import {
  CANONICAL_SYLLABI,
  findCanonicalChapter,
  normaliseExamCode,
  normaliseSubject,
} from "../syllabus/canonical-syllabus";

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
        .neq("status", "submitted");
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

    // ── Fetch user's batch details ─────────────────────────────────────────────
    let batch: any = null;
    try {
      const { data: bStudent } = await supabaseDB
        .from("batch_students")
        .select("batch_id, batches(id, name, exam, ends_at, is_active)")
        .eq("student_id", studentId)
        .order("joined_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (bStudent && (bStudent as any).batches) {
        batch = {
          id: (bStudent as any).batches.id,
          name: (bStudent as any).batches.name,
          exam: (bStudent as any).batches.exam,
          ends_at: (bStudent as any).batches.ends_at,
          is_active: (bStudent as any).batches.is_active,
        };
      }
    } catch (e) {
      console.error("[getStudentDashboard batch fetch error]", e);
    }

    // ── Response ──────────────────────────────────────────────────────────────
    res.status(200).json({
      success: true,
      data: {
        examTarget,
        batch,
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

/**
 * GET /api/v1/dashboard/student/analytics
 * A real cross-test view of chapter accuracy and pace. Result-page analysis is
 * intentionally stored per attempt; this endpoint aggregates it for the
 * student's long-term preparation view.
 */
export const getStudentAnalytics = async (req: Request, res: Response): Promise<void> => {
  try {
    const studentId = req.user!.id;
    const { data: userData } = await supabaseDB
      .from("users")
      .select("exam_target")
      .eq("id", studentId)
      .single();
    const examCode = normaliseExamCode(userData?.exam_target);
    const syllabus = CANONICAL_SYLLABI[examCode];

    const { data: attempts } = await supabaseDB
      .from("attempts")
      .select("id, score, max_score, submitted_at")
      .eq("student_id", studentId)
      .eq("status", "submitted")
      .order("submitted_at", { ascending: false })
      .limit(100);

    const submitted = attempts ?? [];
    const attemptIds = submitted.map((attempt) => attempt.id);
    const { data: analyses } = attemptIds.length > 0
      ? await supabaseDB.from("analysis_results").select("attempt_id, result").in("attempt_id", attemptIds)
      : { data: [] as any[] };

    const chapters = new Map<string, { subject: string; chapter: string; attempted: number; correct: number; totalTime: number }>();
    const subjects = new Map<string, { attempted: number; correct: number; totalTime: number }>();

    for (const row of analyses ?? []) {
      for (const topic of (row.result as any)?.topicStats ?? []) {
        const reportedSubject = topic.subject || "Other";
        const reportedChapter = topic.chapter || "General";
        const canonical = findCanonicalChapter(examCode, reportedSubject, reportedChapter);
        const normalisedSubject = normaliseSubject(reportedSubject);
        const subject = canonical?.subject ?? (normalisedSubject === "Other" ? reportedSubject : normalisedSubject);
        const chapter = canonical?.name ?? reportedChapter;
        const attempted = Number(topic.attempted ?? 0);
        const correct = Number(topic.correct ?? 0);
        const totalTime = Number(topic.avgTimeSec ?? 0) * Math.max(1, attempted);
        const key = `${subject}::${chapter}`;
        const chapterStat = chapters.get(key) ?? { subject, chapter, attempted: 0, correct: 0, totalTime: 0 };
        chapterStat.attempted += attempted;
        chapterStat.correct += correct;
        chapterStat.totalTime += totalTime;
        chapters.set(key, chapterStat);

        const subjectStat = subjects.get(subject) ?? { attempted: 0, correct: 0, totalTime: 0 };
        subjectStat.attempted += attempted;
        subjectStat.correct += correct;
        subjectStat.totalTime += totalTime;
        subjects.set(subject, subjectStat);
      }
    }

    // Add official chapters that have not yet appeared in an analysed attempt.
    // This makes a readiness map honest: absence of practice is visible rather
    // than being mistaken for a completed or strong chapter.
    for (const officialChapter of syllabus.chapters) {
      const key = `${officialChapter.subject}::${officialChapter.name}`;
      if (!chapters.has(key)) {
        chapters.set(key, {
          subject: officialChapter.subject,
          chapter: officialChapter.name,
          attempted: 0,
          correct: 0,
          totalTime: 0,
        });
      }
      if (!subjects.has(officialChapter.subject)) {
        subjects.set(officialChapter.subject, { attempted: 0, correct: 0, totalTime: 0 });
      }
    }

    const totalScore = submitted.reduce((sum, attempt) => sum + Number(attempt.score ?? 0), 0);
    const totalMax = submitted.reduce((sum, attempt) => sum + Number(attempt.max_score ?? 0), 0);
    const totalAttempted = [...subjects.values()].reduce((sum, stat) => sum + stat.attempted, 0);
    const totalTime = [...subjects.values()].reduce((sum, stat) => sum + stat.totalTime, 0);

    const chapterRows = [...chapters.values()].map((stat) => {
      const accuracy = stat.attempted > 0 ? Math.round((stat.correct / stat.attempted) * 100) : 0;
      const status = stat.attempted === 0 ? "Not started" : stat.attempted < 3 ? "Learning" : accuracy < 50 ? "Needs revision" : accuracy < 75 ? "Improving" : "Reliable";
      return { ...stat, accuracy, avgTimeSec: stat.attempted > 0 ? Math.round(stat.totalTime / stat.attempted) : 0, status };
    }).sort((a, b) => a.attempted - b.attempted || a.accuracy - b.accuracy || a.chapter.localeCompare(b.chapter));

    const subjectRows = [...subjects.entries()].map(([subject, stat]) => ({
      subject,
      accuracy: stat.attempted > 0 ? Math.round((stat.correct / stat.attempted) * 100) : 0,
      avgTimeSec: stat.attempted > 0 ? Math.round(stat.totalTime / stat.attempted) : 0,
      attempted: stat.attempted,
    })).sort((a, b) => a.accuracy - b.accuracy);

    res.status(200).json({
      success: true,
      data: {
        metrics: {
          totalTests: submitted.length,
          accuracyPct: totalMax > 0 ? Math.round((totalScore / totalMax) * 100) : 0,
          avgTimeSec: totalAttempted > 0 ? Math.round(totalTime / totalAttempted) : 0,
          chaptersCovered: chapterRows.filter((chapter) => chapter.attempted > 0).length,
          chaptersInSyllabus: syllabus.chapters.length,
        },
        syllabus: {
          examCode: syllabus.examCode,
          label: syllabus.label,
          version: syllabus.version,
          sourceUrl: syllabus.sourceUrl,
          sourcePageLimit: syllabus.sourcePageLimit,
        },
        chapters: chapterRows,
        subjects: subjectRows,
      },
    });
  } catch (err: any) {
    console.error("[getStudentAnalytics error]", err);
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
      .select("error_topics, last_updated")
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

/** GET /api/v1/dashboard/student/revision-queue */
export const getStudentRevisionQueue = async (req: Request, res: Response): Promise<void> => {
  try {
    const { data, error } = await supabaseDB
      .from("student_revision_tasks")
      .select("id, subject, chapter, topic, task_type, title, description, duration_minutes, status, due_at, metadata")
      .eq("student_id", req.user!.id)
      .eq("status", "pending")
      .order("due_at", { ascending: true })
      .limit(8);
    if (error) throw error;
    res.status(200).json({ success: true, data: { tasks: data ?? [] } });
  } catch (err: any) {
    console.error("[getStudentRevisionQueue error]", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/** PATCH /api/v1/dashboard/student/revision-queue/:id */
export const updateStudentRevisionTask = async (req: Request, res: Response): Promise<void> => {
  try {
    const status = req.body?.status;
    if (status !== "completed" && status !== "skipped") {
      res.status(400).json({ success: false, message: "status must be completed or skipped" });
      return;
    }
    const { data, error } = await supabaseDB
      .from("student_revision_tasks")
      .update({ status, completed_at: status === "completed" ? new Date().toISOString() : null, updated_at: new Date().toISOString() })
      .eq("id", req.params.id)
      .eq("student_id", req.user!.id)
      .eq("status", "pending")
      .select("id, status")
      .maybeSingle();
    if (error) throw error;
    if (!data) {
      res.status(404).json({ success: false, message: "Revision task not found" });
      return;
    }
    res.status(200).json({ success: true, data });
  } catch (err: any) {
    console.error("[updateStudentRevisionTask error]", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/** GET /api/v1/dashboard/student/revision-queue/:id/questions */
export const getRevisionTaskQuestions = async (req: Request, res: Response): Promise<void> => {
  try {
    const { data: task, error: taskError } = await supabaseDB
      .from("student_revision_tasks")
      .select("id, subject, chapter, topic, title, duration_minutes, status")
      .eq("id", req.params.id)
      .eq("student_id", req.user!.id)
      .maybeSingle();
    if (taskError) throw taskError;
    if (!task || task.status !== "pending") {
      res.status(404).json({ success: false, message: "Active revision task not found" });
      return;
    }

    const fields = "id, question_text, image_url, options, question_type, subject, chapter, topic, difficulty";
    const { data: questions } = await supabaseDB
      .from("questions").select(fields)
      .eq("is_active", true).eq("subject", task.subject).eq("chapter", task.chapter).limit(10);

    res.status(200).json({ success: true, data: { task, questions: questions ?? [] } });
  } catch (err: any) {
    console.error("[getRevisionTaskQuestions error]", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/** POST /api/v1/dashboard/student/revision-queue/:id/submit */
export const submitRevisionTask = async (req: Request, res: Response): Promise<void> => {
  try {
    const { answers } = req.body ?? {};
    if (!answers || typeof answers !== "object") {
      res.status(400).json({ success: false, message: "answers object is required" });
      return;
    }
    const { data: task, error: taskError } = await supabaseDB
      .from("student_revision_tasks")
      .select("id, student_id, subject, chapter, topic, status")
      .eq("id", req.params.id).eq("student_id", req.user!.id).maybeSingle();
    if (taskError) throw taskError;
    if (!task || task.status !== "pending") {
      res.status(404).json({ success: false, message: "Active revision task not found" });
      return;
    }

    const questionIds = Object.keys(answers);
    if (questionIds.length === 0) {
      res.status(400).json({ success: false, message: "Answer at least one revision question before submitting" });
      return;
    }
    const { data: questions, error: questionError } = questionIds.length > 0
      ? await supabaseDB.from("questions").select("id, correct_answer, explanation")
        .in("id", questionIds).eq("is_active", true).eq("subject", task.subject).eq("chapter", task.chapter)
      : { data: [], error: null };
    if (questionError) throw questionError;

    const normalise = (value: unknown) => (Array.isArray(value) ? value : value == null ? [] : [value])
      .map((item) => String(item).trim().toUpperCase()).filter(Boolean).sort();
    const results = (questions ?? []).map((question: any) => {
      const selected = normalise(answers[question.id]);
      const correct = normalise(question.correct_answer);
      const isCorrect = selected.length === correct.length && selected.every((value, index) => value === correct[index]);
      return { question_id: question.id, is_correct: isCorrect, correct_answer: correct, explanation: question.explanation ?? "" };
    });
    const correctCount = results.filter((result) => result.is_correct).length;

    const { count: availableCount, error: countError } = await supabaseDB
      .from("questions").select("id", { count: "exact", head: true })
      .eq("is_active", true).eq("subject", task.subject).eq("chapter", task.chapter);
    if (countError) throw countError;
    const requiredAnswers = Math.min(10, availableCount ?? 0);
    if (requiredAnswers === 0 || results.length < requiredAnswers) {
      res.status(400).json({ success: false, message: `Answer all ${requiredAnswers} revision questions before submitting` });
      return;
    }

    if (results.length >= requiredAnswers) {
      await supabaseDB.from("student_revision_tasks")
        .update({ status: "completed", completed_at: new Date().toISOString(), updated_at: new Date().toISOString(), metadata: { lastScore: correctCount, totalQuestions: results.length } })
        .eq("id", task.id).eq("student_id", req.user!.id);
    }

    res.status(200).json({ success: true, data: { correctCount, totalQuestions: results.length, results } });
  } catch (err: any) {
    console.error("[submitRevisionTask error]", err);
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
