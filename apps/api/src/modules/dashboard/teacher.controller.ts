import { Request, Response } from "express";
import { supabaseDB } from "../../lib/supabase";

// ─────────────────────────────────────────────────────────────────────────────
/**
 * GET /api/v1/dashboard/teacher
 * Authenticated (teacher) — Dashboard overview: batches, students, scores, pending DPPs.
 */
export const getTeacherDashboard = async (req: Request, res: Response): Promise<void> => {
  try {
    const teacherId = req.user!.id;

    // ── Get teacher's assigned batches via batch_teachers ──────────────────────
    const { data: batchLinks, error: blErr } = await supabaseDB
      .from("batch_teachers")
      .select("batch_id")
      .eq("teacher_id", teacherId);

    if (blErr) {
      // batch_teachers might have different structure — try fallback
      console.warn("[getTeacherDashboard] batch_teachers error:", blErr.message);
    }

    const batchIds = (batchLinks ?? []).map((bl: any) => bl.batch_id);

    let batches: any[] = [];
    if (batchIds.length > 0) {
      const { data: batchData } = await supabaseDB
        .from("batches")
        .select("id, name, exam, max_students, is_active")
        .in("id", batchIds)
        .eq("is_active", true);
      batches = batchData ?? [];
    }

    // ── Count total students across assigned batches ────────────────────────────
    let totalStudents = 0;
    const batchStudentCounts: Record<string, number> = {};

    if (batchIds.length > 0) {
      const { data: batchStudents } = await supabaseDB
        .from("batch_students")
        .select("batch_id, student_id")
        .in("batch_id", batchIds);

      for (const bs of batchStudents ?? []) {
        batchStudentCounts[bs.batch_id] = (batchStudentCounts[bs.batch_id] ?? 0) + 1;
      }

      totalStudents = Object.values(batchStudentCounts).reduce((a, b) => a + b, 0);
    }

    // ── Recent attempts for batch performance ──────────────────────────────────
    let avgBatchScore = 0;
    let upcomingTestsCount = 0;

    if (batchIds.length > 0) {
      const { data: recentAttempts } = await supabaseDB
        .from("attempts")
        .select("score, max_score, batch_id")
        .in("batch_id", batchIds)
        .eq("status", "submitted")
        .not("score", "is", null)
        .order("submitted_at", { ascending: false })
        .limit(100);

      const valid = (recentAttempts ?? []).filter((a) => a.max_score && a.max_score > 0);
      if (valid.length > 0) {
        const totalPct = valid.reduce((sum, a) => sum + ((a.score / a.max_score) * 100), 0);
        avgBatchScore = Math.round(totalPct / valid.length);
      }
    }

    // ── DPP stats ──────────────────────────────────────────────────────────────
    let pendingDPPsCount = 0;
    let completedDPPsCount = 0;
    let recentDPPs: any[] = [];

    try {
      const { data: dpps } = await supabaseDB
        .from("dpps")
        .select("id, title, subject, chapter, batch_id, due_date, total_questions, created_at")
        .eq("teacher_id", teacherId)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(10);

      recentDPPs = dpps ?? [];

      if (recentDPPs.length > 0) {
        const dppIds = recentDPPs.map((d) => d.id);
        const { data: submissions } = await supabaseDB
          .from("student_dpps")
          .select("dpp_id, status")
          .in("dpp_id", dppIds);

        const subMap: Record<string, { submitted: number; pending: number }> = {};
        for (const s of submissions ?? []) {
          if (!subMap[s.dpp_id]) subMap[s.dpp_id] = { submitted: 0, pending: 0 };
          if (s.status === "submitted") subMap[s.dpp_id].submitted++;
          else subMap[s.dpp_id].pending++;
        }

        // Count upcoming tests assigned to the teacher's batches
        if (batchIds.length > 0) {
          const { count } = await supabaseDB
            .from("test_batch_assignments")
            .select("test_id", { count: "exact", head: true })
            .in("batch_id", batchIds);
          upcomingTestsCount = count ?? 0;
        }

        // Enrich DPPs with completion stats + batch name
        const batchNameMap: Record<string, string> = {};
        for (const b of batches) batchNameMap[b.id] = b.name;

        recentDPPs = recentDPPs.map((d) => {
          const stats = subMap[d.id] ?? { submitted: 0, pending: 0 };
          const total = stats.submitted + stats.pending;
          if (total > 0 && stats.submitted >= total) {
            completedDPPsCount++;
          } else {
            pendingDPPsCount++;
          }

          return {
            ...d,
            batchName: batchNameMap[d.batch_id] ?? "Unknown Batch",
            submittedCount: stats.submitted,
            pendingCount: stats.pending,
            totalAssigned: total,
          };
        });
      }
    } catch (e: any) {
      console.error("[Teacher Dashboard] Error fetching DPP metrics:", e.message);
    }

    // ── Enrich batches with student counts ─────────────────────────────────────
    const enrichedBatches = batches.map((b) => ({
      ...b,
      studentCount: batchStudentCounts[b.id] ?? 0,
    }));

    res.status(200).json({
      success: true,
      data: {
        metrics: {
          totalStudents,
          avgBatchScore,
          upcomingTestsCount,
          batchCount: batches.length,
          pendingDPPsCount,
          completedDPPsCount,
        },
        batches: enrichedBatches,
        recentDPPs,
      },
    });
  } catch (err: any) {
    console.error("[getTeacherDashboard error]", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
/**
 * GET /api/v1/dashboard/teacher/batch/:id/analytics
 * Authenticated (teacher) — Deep analytics for a specific batch.
 *
 * Returns: subject breakdown, weak topics, per-student performance.
 */
export const getBatchAnalytics = async (req: Request, res: Response): Promise<void> => {
  try {
    const teacherId = req.user!.id;
    const { id: batchId } = req.params;

    // Verify teacher has access to this batch
    const { data: batchLink } = await supabaseDB
      .from("batch_teachers")
      .select("batch_id")
      .eq("teacher_id", teacherId)
      .eq("batch_id", batchId)
      .maybeSingle();

    // Also allow institute_admin
    const isAdmin = req.user?.role === "institute_admin" || req.user?.role === "super_admin";
    if (!batchLink && !isAdmin) {
      res.status(403).json({ success: false, message: "You don't have access to this batch." });
      return;
    }

    // Get all students in batch
    const { data: batchStudents } = await supabaseDB
      .from("batch_students")
      .select("student_id")
      .eq("batch_id", batchId);

    const studentIds = (batchStudents ?? []).map((bs: any) => bs.student_id);
    if (studentIds.length === 0) {
      res.status(200).json({ success: true, data: { students: [], subjectBreakdown: {}, weakTopics: [] } });
      return;
    }

    // Get recent submitted attempts for this batch
    const { data: attempts } = await supabaseDB
      .from("attempts")
      .select("id, student_id, score, max_score, exam_code, submitted_at")
      .in("student_id", studentIds)
      .eq("status", "submitted")
      .order("submitted_at", { ascending: false })
      .limit(500);

    // Aggregate per-student stats
    const studentStatsMap: Record<string, { tests: number; totalScore: number; totalMax: number }> = {};
    for (const a of attempts ?? []) {
      if (!studentStatsMap[a.student_id]) {
        studentStatsMap[a.student_id] = { tests: 0, totalScore: 0, totalMax: 0 };
      }
      studentStatsMap[a.student_id].tests++;
      studentStatsMap[a.student_id].totalScore += a.score ?? 0;
      studentStatsMap[a.student_id].totalMax += a.max_score ?? 0;
    }

    // Fetch student names
    const { data: students } = await supabaseDB
      .from("users")
      .select("id, name, email")
      .in("id", studentIds);

    const studentList = (students ?? []).map((s) => {
      const stats = studentStatsMap[s.id] ?? { tests: 0, totalScore: 0, totalMax: 0 };
      const accuracy = stats.totalMax > 0 ? Math.round((stats.totalScore / stats.totalMax) * 100) : 0;
      return {
        id: s.id,
        name: s.name,
        email: s.email,
        tests: stats.tests,
        avgScore: stats.tests > 0 ? Math.round(stats.totalScore / stats.tests) : 0,
        accuracy,
      };
    });

    // Aggregate weak topics from error profiles
    const { data: errorProfiles } = await supabaseDB
      .from("student_error_profiles")
      .select("error_topics")
      .in("student_id", studentIds);

    const topicAggregation: Record<string, { count: number; subject: string; chapter: string }> = {};
    for (const ep of errorProfiles ?? []) {
      const topics = ep.error_topics ?? {};
      for (const [topic, data] of Object.entries(topics) as [string, any][]) {
        if (!topicAggregation[topic]) {
          topicAggregation[topic] = { count: 0, subject: data.subject ?? "", chapter: data.chapter ?? "" };
        }
        topicAggregation[topic].count += data.count ?? 1;
      }
    }

    const weakTopics = Object.entries(topicAggregation)
      .map(([topic, data]) => ({
        topic,
        subject: data.subject,
        chapter: data.chapter,
        affectedStudents: data.count,
        priority: data.count >= studentIds.length * 0.5 ? "Critical" : data.count >= studentIds.length * 0.3 ? "High" : "Medium",
      }))
      .sort((a, b) => b.affectedStudents - a.affectedStudents)
      .slice(0, 20);

    // Overall batch metrics
    const allAttempts = attempts ?? [];
    const batchAvgScore = allAttempts.length > 0
      ? Math.round(allAttempts.filter(a => a.max_score > 0).reduce((sum, a) => sum + ((a.score / a.max_score) * 100), 0) / allAttempts.filter(a => a.max_score > 0).length)
      : 0;

    const sortedDesc = [...studentList].sort((a, b) => b.accuracy - a.accuracy);
    const topStudent = sortedDesc[0];
    const bottomStudent = sortedDesc[sortedDesc.length - 1];

    // ── DEEP ANALYTICS: Subject Breakdown & Recent Tests (Trap Questions) ──
    const recent100Attempts = allAttempts.slice(0, 100);
    const recent100Ids = recent100Attempts.map(a => a.id);
    
    let attemptAnswers: any[] = [];
    if (recent100Ids.length > 0) {
      const { data: aa } = await supabaseDB
        .from("attempt_answers")
        .select("attempt_id, question_id, selected_answer, is_correct, marks_awarded")
        .in("attempt_id", recent100Ids);
      attemptAnswers = aa ?? [];
    }

    const uniqueQuestionIds = [...new Set(attemptAnswers.map(a => a.question_id))];
    let questionsMap: Record<string, any> = {};
    if (uniqueQuestionIds.length > 0) {
      // Chunking if too many questions, but Supabase handles up to a few thousand easily
      const { data: qs } = await supabaseDB
        .from("questions")
        .select("id, question_text, subject, chapter")
        .in("id", uniqueQuestionIds);
      
      for (const q of qs ?? []) {
        questionsMap[q.id] = q;
      }
    }

    // 1. Overall Subject Breakdown
    const subjectStats: Record<string, { correct: number, wrong: number, unattempted: number, count: number }> = {};
    for (const ans of attemptAnswers) {
      const q = questionsMap[ans.question_id];
      if (!q) continue;
      const sub = q.subject || "Other";
      if (!subjectStats[sub]) subjectStats[sub] = { correct: 0, wrong: 0, unattempted: 0, count: 0 };
      
      subjectStats[sub].count++;
      if (ans.is_correct) {
        subjectStats[sub].correct++;
      } else if (ans.selected_answer) {
        subjectStats[sub].wrong++;
      } else {
        subjectStats[sub].unattempted++;
      }
    }

    const numRecentAttempts = recent100Attempts.length || 1;
    const subjectBreakdown = Object.entries(subjectStats).map(([subject, stats]) => {
       const totalQ = stats.count;
       const avgAccuracy = totalQ > 0 ? Math.round((stats.correct / totalQ) * 100) : 0;
       return {
         subject,
         avg: avgAccuracy,
         correct: Number((stats.correct / numRecentAttempts).toFixed(1)),
         wrong: Number((stats.wrong / numRecentAttempts).toFixed(1)),
         unattempted: Number((stats.unattempted / numRecentAttempts).toFixed(1)),
       };
    }).sort((a, b) => b.avg - a.avg);

    // 2. Recent Tests & Trap Questions
    const testGroups: Record<string, any[]> = {};
    for (const a of allAttempts) {
      const code = a.exam_code ?? "Unknown Test";
      if (!testGroups[code]) testGroups[code] = [];
      testGroups[code].push(a);
    }
    
    const recentTestCodes = Object.keys(testGroups).sort((a, b) => {
      const maxA = Math.max(...testGroups[a].map(x => new Date(x.submitted_at).getTime()));
      const maxB = Math.max(...testGroups[b].map(x => new Date(x.submitted_at).getTime()));
      return maxB - maxA;
    });

    const recentTestsData = [];
    const topTests = recentTestCodes.slice(0, 3);
    
    for (const testCode of topTests) {
      const testAttempts = testGroups[testCode];
      const testAttemptIds = new Set(testAttempts.map(a => a.id));
      const testAnswers = attemptAnswers.filter(a => testAttemptIds.has(a.attempt_id));
      
      const qStats: Record<string, { wrongCount: number, optionsPicked: Record<string, number>, totalCount: number }> = {};
      
      for (const ans of testAnswers) {
        const qId = ans.question_id;
        if (!qStats[qId]) qStats[qId] = { wrongCount: 0, optionsPicked: {}, totalCount: 0 };
        qStats[qId].totalCount++;
        
        if (!ans.is_correct && ans.selected_answer) {
           qStats[qId].wrongCount++;
           const opt = ans.selected_answer;
           qStats[qId].optionsPicked[opt] = (qStats[qId].optionsPicked[opt] || 0) + 1;
        }
      }
      
      const trapQuestions = [];
      for (const [qId, stats] of Object.entries(qStats)) {
         if (stats.totalCount < 3) continue; // Need at least 3 attempts to call it a trap
         const failRate = stats.wrongCount / stats.totalCount;
         if (failRate >= 0.5) { // > 50% failed
            let maxOpt = null;
            let maxVal = 0;
            for (const [opt, count] of Object.entries(stats.optionsPicked)) {
               if (count > maxVal) { maxVal = count; maxOpt = opt; }
            }
            if (maxOpt && (maxVal / stats.wrongCount) >= 0.4) { // > 40% of the wrong answers were this exact option
               const q = questionsMap[qId];
               if (q) {
                 const rawText = (q.question_text || "Question text not found").replace(/<[^>]+>/g, "").trim();
                 trapQuestions.push({
                   q: rawText.substring(0, 40) + (rawText.length > 40 ? "..." : ""),
                   option: maxOpt,
                   trap: "popular_distractor",
                   pct: Math.round((maxVal / stats.totalCount) * 100),
                   desc: `${Math.round((maxVal / stats.wrongCount) * 100)}% of incorrect students chose this.`
                 });
               }
            }
         }
      }
      
      trapQuestions.sort((a, b) => b.pct - a.pct);
      
      const validMax = testAttempts.filter(a => a.max_score > 0);
      const testAvg = validMax.length > 0
        ? Math.round(validMax.reduce((s, a) => s + (a.score / a.max_score) * 100, 0) / validMax.length)
        : 0;

      let niceName = testCode;
      if (testCode.startsWith("dpp-")) niceName = `Assignment (${testCode.split("-")[1]})`;
      if (testCode.includes("shala")) niceName = "Mock Test " + testCode.substring(0, 5);

      recentTestsData.push({
        testId: testCode,
        testName: niceName,
        avgScore: testAvg,
        trapQuestions: trapQuestions.slice(0, 10),
      });
    }

    res.status(200).json({
      success: true,
      data: {
        overall: {
          batchId,
          totalStudents: studentIds.length,
          batchAvgScore,
          topStudentAccuracy: topStudent?.accuracy ?? 0,
          bottomStudentAccuracy: bottomStudent?.accuracy ?? 0,
          students: studentList,
          weakTopics,
          subjectBreakdown,
        },
        recentTests: recentTestsData,
      },
    });
  } catch (err: any) {
    console.error("[getBatchAnalytics error]", err);
    res.status(500).json({ success: false, message: err.message });
  }
};
