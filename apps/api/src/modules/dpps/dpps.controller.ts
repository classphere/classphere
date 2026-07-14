import { Request, Response } from "express";
import { supabaseDB } from "../../lib/supabase";

// ─────────────────────────────────────────────────────────────────────────────
/**
 * POST /api/v1/dpps
 * [teacher | institute_admin] — Create a new DPP and assign it to a batch.
 *
 * Body: { title, batch_id, subject, chapter, question_ids[], due_date }
 */
export const createDPP = async (req: Request, res: Response): Promise<void> => {
  try {
    const teacherId = req.user!.id;
    const { title, batch_id, subject, chapter, question_ids, due_date } = req.body;

    // Validate required fields
    if (!title || !batch_id || !Array.isArray(question_ids) || question_ids.length === 0) {
      res.status(400).json({
        success: false,
        message: "title, batch_id, and question_ids[] are required.",
      });
      return;
    }

    if (question_ids.length > 50) {
      res.status(400).json({ success: false, message: "A DPP can have at most 50 questions." });
      return;
    }

    // Create DPP record
    const { data: dpp, error: dppErr } = await supabaseDB
      .from("dpps")
      .insert({
        teacher_id: teacherId,
        batch_id,
        title,
        subject: subject ?? null,
        chapter: chapter ?? null,
        total_questions: question_ids.length,
        due_date: due_date ?? null,
      })
      .select()
      .single();

    if (dppErr || !dpp) {
      res.status(500).json({ success: false, message: dppErr?.message ?? "Failed to create DPP." });
      return;
    }

    // Link questions to DPP
    const dppQuestionRows = question_ids.map((qId: string, idx: number) => ({
      dpp_id: dpp.id,
      question_id: qId,
      position: idx + 1,
    }));

    const { error: qErr } = await supabaseDB
      .from("dpp_questions")
      .insert(dppQuestionRows);

    if (qErr) {
      console.error("[createDPP] dpp_questions insert error:", qErr.message);
      // Don't fail — DPP created, questions partially linked
    }

    // Auto-provision student_dpps rows for all students in the batch
    const { data: batchStudents } = await supabaseDB
      .from("batch_students")
      .select("student_id")
      .eq("batch_id", batch_id);

    if (batchStudents && batchStudents.length > 0) {
      const studentDppRows = batchStudents.map((bs: any) => ({
        student_id: bs.student_id,
        dpp_id: dpp.id,
        status: "pending",
      }));

      const { error: sdErr } = await supabaseDB
        .from("student_dpps")
        .upsert(studentDppRows, { onConflict: "student_id,dpp_id", ignoreDuplicates: true });

      if (sdErr) {
        console.warn("[createDPP] student_dpps provision warning:", sdErr.message);
      }
    }

    res.status(201).json({
      success: true,
      message: `DPP "${title}" created and assigned to ${batchStudents?.length ?? 0} students.`,
      data: { dpp },
    });
  } catch (err: any) {
    console.error("[createDPP error]", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
/**
 * GET /api/v1/dpps/teacher
 * [teacher] — List all DPPs created by this teacher, with completion stats.
 */
export const getTeacherDPPs = async (req: Request, res: Response): Promise<void> => {
  try {
    const teacherId = req.user!.id;

    const { data: dpps, error } = await supabaseDB
      .from("dpps")
      .select("id, title, subject, chapter, batch_id, total_questions, due_date, created_at")
      .eq("teacher_id", teacherId)
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (error) {
      res.status(500).json({ success: false, message: error.message });
      return;
    }

    if (!dpps || dpps.length === 0) {
      res.status(200).json({ success: true, data: { dpps: [] } });
      return;
    }

    // Fetch batch names
    const batchIds = [...new Set(dpps.map((d) => d.batch_id).filter(Boolean))];
    const batchMap: Record<string, string> = {};
    if (batchIds.length > 0) {
      const { data: batches } = await supabaseDB
        .from("batches")
        .select("id, name")
        .in("id", batchIds);
      for (const b of batches ?? []) batchMap[b.id] = b.name;
    }

    // Fetch completion counts
    const dppIds = dpps.map((d) => d.id);
    const { data: submissions } = await supabaseDB
      .from("student_dpps")
      .select("dpp_id, status")
      .in("dpp_id", dppIds);

    const submissionMap: Record<string, { submitted: number; pending: number }> = {};
    for (const s of submissions ?? []) {
      if (!submissionMap[s.dpp_id]) submissionMap[s.dpp_id] = { submitted: 0, pending: 0 };
      if (s.status === "submitted") submissionMap[s.dpp_id].submitted++;
      else submissionMap[s.dpp_id].pending++;
    }

    const enriched = dpps.map((d) => {
      const now = new Date();
      const due = d.due_date ? new Date(d.due_date) : null;
      const stats = submissionMap[d.id] ?? { submitted: 0, pending: 0 };
      const total = stats.submitted + stats.pending;

      let status = "active";
      if (due && due < now && stats.submitted < total) status = "late";
      else if (due && due < now && stats.submitted >= total) status = "completed";
      else if (due && due > now) status = "upcoming";

      return {
        ...d,
        batchName: batchMap[d.batch_id] ?? "Unknown Batch",
        submittedCount: stats.submitted,
        pendingCount: stats.pending,
        totalAssigned: total,
        status,
      };
    });

    res.status(200).json({ success: true, data: { dpps: enriched } });
  } catch (err: any) {
    console.error("[getTeacherDPPs error]", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
/**
 * GET /api/v1/dpps/student
 * [student] — List all DPPs assigned to this student via batch.
 */
export const getStudentDPPs = async (req: Request, res: Response): Promise<void> => {
  try {
    const studentId = req.user!.id;

    const { data: studentDpps, error } = await supabaseDB
      .from("student_dpps")
      .select("id, dpp_id, status, score, max_score, submitted_at, created_at")
      .eq("student_id", studentId)
      .order("created_at", { ascending: false });

    if (error) {
      res.status(500).json({ success: false, message: error.message });
      return;
    }

    if (!studentDpps || studentDpps.length === 0) {
      res.status(200).json({ success: true, data: { dpps: [] } });
      return;
    }

    // Fetch DPP metadata
    const dppIds = studentDpps.map((sd) => sd.dpp_id);
    const { data: dpps } = await supabaseDB
      .from("dpps")
      .select("id, title, subject, chapter, batch_id, total_questions, due_date")
      .in("id", dppIds);

    const dppMap: Record<string, any> = {};
    for (const d of dpps ?? []) dppMap[d.id] = d;

    const enriched = studentDpps.map((sd) => {
      const dpp = dppMap[sd.dpp_id] ?? {};
      const now = new Date();
      const due = dpp.due_date ? new Date(dpp.due_date) : null;

      let displayStatus = sd.status;
      if (sd.status === "pending" && due && due < now) displayStatus = "late";

      const pct = sd.max_score && sd.max_score > 0 ? Math.round(((sd.score ?? 0) / sd.max_score) * 100) : null;

      return {
        studentDppId: sd.id,
        dppId: sd.dpp_id,
        title: dpp.title ?? "DPP",
        subject: dpp.subject,
        chapter: dpp.chapter,
        totalQuestions: dpp.total_questions,
        dueDate: dpp.due_date,
        status: displayStatus,
        score: sd.score,
        maxScore: sd.max_score,
        percentage: pct,
        submittedAt: sd.submitted_at,
      };
    });

    // Sort: late first, then pending, then submitted
    const order = { late: 0, pending: 1, submitted: 2 };
    enriched.sort((a, b) => (order[a.status as keyof typeof order] ?? 3) - (order[b.status as keyof typeof order] ?? 3));

    res.status(200).json({ success: true, data: { dpps: enriched } });
  } catch (err: any) {
    console.error("[getStudentDPPs error]", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
/**
 * GET /api/v1/dpps/:id/questions
 * [student | teacher] — Fetch all questions for a DPP (for the test-taking interface).
 */
export const getDPPQuestions = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id: dppId } = req.params;
    const studentId = req.user!.id;
    const role = req.user?.role;

    // For students: verify they're assigned this DPP
    if (role === "student") {
      const { data: assignment } = await supabaseDB
        .from("student_dpps")
        .select("id, status")
        .eq("student_id", studentId)
        .eq("dpp_id", dppId)
        .maybeSingle();

      if (!assignment) {
        res.status(403).json({ success: false, message: "You are not assigned this DPP." });
        return;
      }
      if (assignment.status === "submitted") {
        res.status(400).json({ success: false, message: "You have already submitted this DPP." });
        return;
      }
    }

    // Fetch ordered question IDs
    const { data: dppQs } = await supabaseDB
      .from("dpp_questions")
      .select("question_id, position")
      .eq("dpp_id", dppId)
      .order("position", { ascending: true });

    if (!dppQs || dppQs.length === 0) {
      res.status(404).json({ success: false, message: "No questions found for this DPP." });
      return;
    }

    const questionIds = dppQs.map((q: any) => q.question_id);

    const { data: questions } = await supabaseDB
      .from("questions")
      .select("id, question_text, image_url, options, correct_answer, explanation, question_type, subject, chapter, topic, difficulty, marking_scheme")
      .in("id", questionIds)
      .eq("is_active", true);

    // Reorder by DPP position
    const byId: Record<string, any> = {};
    for (const q of questions ?? []) byId[q.id] = q;

    const orderedQuestions = dppQs
      .map((dq: any, idx: number) => ({
        ...byId[dq.question_id],
        question_number: idx + 1,
      }))
      .filter((q: any) => q.id);

    // Fetch DPP meta
    const { data: dpp } = await supabaseDB
      .from("dpps")
      .select("id, title, subject, chapter, total_questions, due_date")
      .eq("id", dppId)
      .single();

    res.status(200).json({
      success: true,
      data: {
        dpp,
        questions: orderedQuestions,
      },
    });
  } catch (err: any) {
    console.error("[getDPPQuestions error]", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
/**
 * POST /api/v1/dpps/:id/submit
 * [student] — Submit DPP answers, score them, update student_dpps.
 *
 * Body: { answers: { [question_id]: string } }
 */
export const submitDPP = async (req: Request, res: Response): Promise<void> => {
  try {
    const studentId = req.user!.id;
    const { id: dppId } = req.params;
    const { answers, timeTaken } = req.body;

    if (!answers || typeof answers !== "object") {
      res.status(400).json({ success: false, message: "answers object is required." });
      return;
    }

    const timeTakenSeconds = typeof timeTaken === "number" ? timeTaken : 0;

    // Verify assignment
    const { data: assignment } = await supabaseDB
      .from("student_dpps")
      .select("id, status")
      .eq("student_id", studentId)
      .eq("dpp_id", dppId)
      .maybeSingle();

    if (!assignment) {
      res.status(403).json({ success: false, message: "You are not assigned this DPP." });
      return;
    }
    if (assignment.status === "submitted") {
      res.status(400).json({ success: false, message: "DPP already submitted." });
      return;
    }

    // Fetch DPP questions
    const { data: dppQs } = await supabaseDB
      .from("dpp_questions")
      .select("question_id, position")
      .eq("dpp_id", dppId)
      .order("position", { ascending: true });

    const questionIds = (dppQs ?? []).map((q: any) => q.question_id);

    const { data: questions } = await supabaseDB
      .from("questions")
      .select("id, correct_answer, marking_scheme")
      .in("id", questionIds);

    // Score answers
    let totalScore = 0;
    let maxScore = 0;
    const answerRecords: any[] = [];

    for (const q of questions ?? []) {
      const scheme = q.marking_scheme ?? { correct: 4, incorrect: -1, unattempted: 0 };
      const correctList = Array.isArray(q.correct_answer)
        ? q.correct_answer.map((v: any) => String(v).trim().toUpperCase())
        : [String(q.correct_answer).trim().toUpperCase()];

      const selected = answers[q.id] ? String(answers[q.id]).trim().toUpperCase() : null;
      const isCorrect = selected ? correctList.includes(selected) : false;
      const marks = selected
        ? (isCorrect ? (scheme.correct ?? 4) : (scheme.incorrect ?? -1))
        : (scheme.unattempted ?? 0);

      maxScore += scheme.correct ?? 4;
      totalScore += marks;

      answerRecords.push({
        question_id: q.id,
        selected_answer: selected,
        is_correct: isCorrect,
        marks_awarded: marks,
      });
    }

    // Add metadata object for timing
    answerRecords.push({
      is_meta: true,
      time_taken_seconds: timeTakenSeconds
    });

    // Update student_dpps
    const { error: updateErr } = await supabaseDB
      .from("student_dpps")
      .update({
        status: "submitted",
        score: totalScore,
        max_score: maxScore,
        attempt_answers: answerRecords,
        submitted_at: new Date().toISOString(),
      })
      .eq("id", assignment.id);

    if (updateErr) {
      res.status(500).json({ success: false, message: updateErr.message });
      return;
    }

    const pct = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
    const correctCount = answerRecords.filter((a) => a.is_correct).length;

    let xpGained = correctCount * 4; // 4 XP per correct answer
    // Gamification: Update student_stats and leaderboards
    try {
      const { data: stats } = await supabaseDB
        .from("student_stats")
        .select("xp, total_score, total_tests")
        .eq("student_id", studentId)
        .maybeSingle();

      if (stats) {
        await supabaseDB.from("student_stats").update({
          xp: (stats.xp ?? 0) + xpGained,
          total_score: (stats.total_score ?? 0) + totalScore,
          total_tests: (stats.total_tests ?? 0) + 1,
        }).eq("student_id", studentId);
      } else {
        await supabaseDB.from("student_stats").insert({
          student_id: studentId,
          xp: xpGained,
          total_score: totalScore,
          total_tests: 1,
        });
      }
      
      // Update leaderboard
      const { data: batchLinks } = await supabaseDB
        .from("batch_students")
        .select("batch_id")
        .eq("student_id", studentId);
        
      if (batchLinks && batchLinks.length > 0) {
        const batchIds = batchLinks.map(b => b.batch_id);
        const newXp = (stats?.xp ?? 0) + xpGained;
        
        // Upsert into leaderboard for each batch
        for (const bId of batchIds) {
          await supabaseDB.from("leaderboards").upsert({
            batch_id: bId,
            student_id: studentId,
            xp: newXp,
            updated_at: new Date().toISOString()
          }, { onConflict: "batch_id,student_id" });
        }
      }
    } catch (gamificationErr) {
      console.error("[submitDPP gamification error]", gamificationErr);
      // Don't fail the request if gamification fails
    }

    res.status(200).json({
      success: true,
      data: {
        score: totalScore,
        maxScore,
        percentage: pct,
        correct: correctCount,
        xpGained,
        total: questions?.length ?? 0,
      },
    });
  } catch (err: any) {
    console.error("[submitDPP error]", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
/**
 * DELETE /api/v1/dpps/:id
 * [teacher | institute_admin] — Soft-delete a DPP (set is_active = false).
 */
export const deleteDPP = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id: dppId } = req.params;
    const teacherId = req.user!.id;
    const isAdmin = req.user?.role === "institute_admin" || req.user?.role === "super_admin";

    let query = supabaseDB.from("dpps").update({ is_active: false }).eq("id", dppId);
    if (!isAdmin) query = query.eq("teacher_id", teacherId);

    const { error } = await query;
    if (error) {
      res.status(500).json({ success: false, message: error.message });
      return;
    }

    res.status(200).json({ success: true, message: "DPP removed." });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
/**
 * GET /api/v1/dpps/:id/analytics
 * [teacher | institute_admin] — Get analytics for a specific DPP.
 */
export const getDPPAnalytics = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id: dppId } = req.params;

    // Fetch DPP metadata
    const { data: dpp } = await supabaseDB
      .from("dpps")
      .select("id, title, batch_id, total_questions, due_date")
      .eq("id", dppId)
      .single();

    if (!dpp) {
      res.status(404).json({ success: false, message: "DPP not found." });
      return;
    }

    // Fetch student DPPs
    const { data: studentDpps } = await supabaseDB
      .from("student_dpps")
      .select("id, student_id, status, score, max_score, submitted_at, attempt_answers")
      .eq("dpp_id", dppId);

    const sd = studentDpps ?? [];
    
    // Fetch student names
    const studentIds = sd.map(s => s.student_id);
    let studentMap: Record<string, string> = {};
    if (studentIds.length > 0) {
      const { data: users } = await supabaseDB
        .from("users")
        .select("id, name")
        .in("id", studentIds);
      for (const u of users ?? []) studentMap[u.id] = u.name;
    }

    const submitted: any[] = [];
    const pending: any[] = [];
    let totalTimeTaken = 0;

    for (const record of sd) {
      const name = studentMap[record.student_id] ?? "Unknown Student";
      
      if (record.status === "submitted") {
        const pct = record.max_score && record.max_score > 0 ? Math.round((record.score / record.max_score) * 100) : 0;
        
        let timeTaken = 0;
        if (record.attempt_answers && Array.isArray(record.attempt_answers)) {
          const meta = record.attempt_answers.find((a: any) => a.is_meta);
          if (meta && typeof meta.time_taken_seconds === "number") {
            timeTaken = meta.time_taken_seconds;
          }
        }
        totalTimeTaken += timeTaken;
        
        submitted.push({
          student_id: record.student_id,
          name,
          score: record.score,
          max_score: record.max_score,
          percentage: pct,
          time_taken_seconds: timeTaken,
          submitted_at: record.submitted_at
        });
      } else {
        pending.push({
          student_id: record.student_id,
          name
        });
      }
    }
    
    submitted.sort((a, b) => b.percentage - a.percentage); // Sort by highest score

    const totalStudents = sd.length;
    const completionRate = totalStudents > 0 ? Math.round((submitted.length / totalStudents) * 100) : 0;
    const averageTime = submitted.length > 0 ? Math.round(totalTimeTaken / submitted.length) : 0;

    res.status(200).json({
      success: true,
      data: {
        dpp,
        analytics: {
          totalStudents,
          submittedCount: submitted.length,
          pendingCount: pending.length,
          completionRate,
          averageTimeSeconds: averageTime,
          submitted,
          pending
        }
      }
    });

  } catch (err: any) {
    console.error("[getDPPAnalytics error]", err);
    res.status(500).json({ success: false, message: err.message });
  }
};
