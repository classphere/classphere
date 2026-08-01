import { Request, Response } from "express";
import { supabaseDB } from "../../lib/supabase";
import { notifyStudents } from "../notifications/notifications.service";

async function canManageDpp(req: Request, dppId: string): Promise<boolean> {
  const { data: dpp } = await supabaseDB.from("dpps").select("teacher_id, batch_id, batches(institute_id)").eq("id", dppId).maybeSingle();
  const instituteId = (dpp as any)?.batches?.institute_id;
  if (!dpp || !instituteId) return false;
  if (req.user?.role === "super_admin") return true;
  if (instituteId !== req.user?.institute_id) return false;
  return req.user?.role === "institute_admin" || dpp.teacher_id === req.user?.id;
}

/** Historical records remain visible after expiry, but an ended batch cannot accept work. */
async function isDppBatchAvailable(dppId: string): Promise<boolean> {
  const { data: dpp, error } = await supabaseDB
    .from("dpps")
    .select("batch_id, batches(is_active, starts_at, ends_at)")
    .eq("id", dppId)
    .maybeSingle();
  if (error || !dpp || !(dpp as any).batches) return false;
  const batch = (dpp as any).batches;
  const now = Date.now();
  return batch.is_active === true
    && (!batch.starts_at || Date.parse(batch.starts_at) <= now)
    && (!batch.ends_at || Date.parse(batch.ends_at) > now);
}

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
    const { data: batch } = await supabaseDB.from("batches").select("id, institute_id, is_active, starts_at, ends_at").eq("id", batch_id).maybeSingle();
    if (!batch || batch.institute_id !== req.user?.institute_id) {
      res.status(403).json({ success: false, message: "Target batch is outside your institute." });
      return;
    }
    const now = Date.now();
    if (!batch.is_active || (batch.starts_at && Date.parse(batch.starts_at) > now) || (batch.ends_at && Date.parse(batch.ends_at) <= now)) {
      res.status(409).json({ success: false, message: "DPPs cannot be assigned to an inactive or expired batch." }); return;
    }
    if (req.user?.role === "teacher") {
      const { data: teachingLink } = await supabaseDB.from("batch_teachers").select("teacher_id")
        .eq("batch_id", batch_id).eq("teacher_id", teacherId).maybeSingle();
      if (!teachingLink) { res.status(403).json({ success: false, message: "You are not assigned to this batch." }); return; }
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
      .eq("batch_id", batch_id)
      // Students who have left the batch are not assigned new work.
      .is("left_at", null);

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
      try {
        await notifyStudents({
          instituteId: batch.institute_id,
          userIds: batchStudents.map((student: any) => student.student_id),
          type: "dpp_assigned",
          title: "New DPP assigned",
          body: `${title}${due_date ? ` · Due ${new Date(due_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}` : ""}`,
          href: `/student/dpps/take/${dpp.id}`,
          eventKey: `dpp_assigned:${dpp.id}`,
          metadata: { dpp_id: dpp.id, batch_id, due_date: due_date ?? null },
        });
      } catch (notificationError: any) {
        console.error("[createDPP] notification delivery failed:", notificationError.message);
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

    const batchIds = [...new Set((dpps ?? []).map((d: any) => d.batch_id).filter(Boolean))];
    const { data: batches } = batchIds.length ? await supabaseDB.from("batches").select("id, is_active, starts_at, ends_at").in("id", batchIds) : { data: [] };
    const accessibleBatchIds = new Set((batches ?? []).filter((batch: any) => {
      const now = Date.now();
      return batch.is_active && (!batch.starts_at || Date.parse(batch.starts_at) <= now) && (!batch.ends_at || Date.parse(batch.ends_at) > now);
    }).map((batch: any) => batch.id));
    const dppMap: Record<string, any> = {};
    for (const d of dpps ?? []) dppMap[d.id] = d;

    const enriched = studentDpps.filter((sd) => accessibleBatchIds.has(dppMap[sd.dpp_id]?.batch_id)).map((sd) => {
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

    if (role !== "student" && !(await canManageDpp(req, dppId))) {
      res.status(403).json({ success: false, message: "Access denied" });
      return;
    }

    let assignment: any = null;
    // For students: verify they're assigned this DPP
    if (role === "student") {
      const { data } = await supabaseDB
        .from("student_dpps")
        .select("id, status")
        .eq("student_id", studentId)
        .eq("dpp_id", dppId)
        .maybeSingle();

      if (!data) {
        res.status(403).json({ success: false, message: "You are not assigned this DPP." });
        return;
      }
      assignment = data;
      if (!(await isDppBatchAvailable(dppId))) {
        res.status(410).json({ success: false, message: "This DPP is no longer available because its batch has ended." });
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
      .select("id, question_text, image_url, options, correct_answer, explanation, question_type, subject, chapter, topic, difficulty")
      .in("id", questionIds)
      .eq("is_active", true);

    // Reorder by DPP position
    const byId: Record<string, any> = {};
    for (const q of questions ?? []) byId[q.id] = q;

    const orderedQuestions = dppQs
      .map((dq: any, idx: number) => {
        const q = byId[dq.question_id];
        if (!q) return null;
        const mapped: any = {
          id: q.id,
          question_text: q.question_text,
          image_url: q.image_url,
          options: q.options,
          question_type: q.question_type,
          subject: q.subject,
          chapter: q.chapter,
          topic: q.topic,
          difficulty: q.difficulty,
          question_number: idx + 1,
        };
        // Expose correct answer and explanation to student ONLY after submission (SEC-3)
        const isSubmitted = assignment?.status === "submitted";
        if (role !== "student" || isSubmitted) {
          mapped.correct_answer = q.correct_answer;
          mapped.explanation = q.explanation;
        }
        return mapped;
      })
      .filter((q: any) => q);

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
    if (!(await isDppBatchAvailable(dppId))) {
      res.status(410).json({ success: false, message: "This DPP can no longer be submitted because its batch has ended." });
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
      .select("id, correct_answer, question_type")
      .in("id", questionIds);

    // Score answers
    let totalScore = 0;
    let maxScore = 0;
    const answerRecords: any[] = [];

    for (const q of questions ?? []) {
      const scheme = { correct: 4, incorrect: -1, unattempted: 0 };
      const incorrectPenalty = -Math.abs(scheme.incorrect ?? -1); // Enforce negative sign penalty (H7)

      const correctList = Array.isArray(q.correct_answer)
        ? q.correct_answer.map((v: any) => String(v).trim().toUpperCase())
        : [String(q.correct_answer).trim().toUpperCase()];

      let isCorrect = false;
      const selectedRaw = answers[q.id];
      const isAttempted = selectedRaw !== null && selectedRaw !== undefined && selectedRaw !== "" && (!Array.isArray(selectedRaw) || selectedRaw.length > 0);

      if (isAttempted) {
        if (q.question_type === "mcq_multi") {
          const selectedList = Array.isArray(selectedRaw)
            ? selectedRaw.map(v => String(v).trim().toUpperCase())
            : typeof selectedRaw === "string"
              ? selectedRaw.split(",").map(v => v.trim().toUpperCase())
              : [];
          isCorrect = selectedList.length === correctList.length &&
            selectedList.every(v => correctList.includes(v));
        } else if (q.question_type === "integer") {
          const selectedVal = String(selectedRaw).trim();
          const correctVal = correctList[0] || "";
          const selNum = parseFloat(selectedVal);
          const corNum = parseFloat(correctVal);
          if (!isNaN(selNum) && !isNaN(corNum)) {
            isCorrect = selNum === corNum;
          } else {
            isCorrect = selectedVal === correctVal;
          }
        } else {
          const selectedVal = String(selectedRaw).trim().toUpperCase();
          isCorrect = correctList.includes(selectedVal);
        }
      }

      const marks = isAttempted
        ? (isCorrect ? (scheme.correct ?? 4) : incorrectPenalty)
        : (scheme.unattempted ?? 0);

      maxScore += scheme.correct ?? 4;
      totalScore += marks;

      answerRecords.push({
        question_id: q.id,
        selected_answer: isAttempted ? (Array.isArray(selectedRaw) ? selectedRaw.join(",") : String(selectedRaw)) : null,
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
    const { data: updatedRows, error: updateErr } = await supabaseDB
      .from("student_dpps")
      .update({
        status: "submitted",
        score: totalScore,
        max_score: maxScore,
        attempt_answers: answerRecords,
        submitted_at: new Date().toISOString(),
      })
      .eq("id", assignment.id)
      .eq("status", "pending")
      .select("id");

    if (updateErr) {
      res.status(500).json({ success: false, message: updateErr.message });
      return;
    }

    if (!updatedRows || updatedRows.length === 0) {
      res.status(400).json({ success: false, message: "DPP already submitted or not found." });
      return;
    }

    const pct = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
    const correctCount = answerRecords.filter((a) => a.is_correct).length;

    let xpGained = correctCount * 4; // 4 XP per correct answer
    // Gamification: Update student_stats and leaderboards
    try {
      let statsUpdated = false;
      let newXp = xpGained;
      let currentXp = 0;
      const MAX_XP_RETRIES = 5; // Prevent infinite spin under high concurrency (DATA-3)
      let xpRetries = 0;
      
      while (!statsUpdated && xpRetries < MAX_XP_RETRIES) {
        xpRetries++;
        const { data: stats } = await supabaseDB
          .from("student_stats")
          .select("xp, total_score, total_tests")
          .eq("student_id", studentId)
          .maybeSingle();

        if (stats) {
          newXp = (stats.xp ?? 0) + xpGained;
          currentXp = stats.xp ?? 0;
          const { data: updatedRows } = await supabaseDB
            .from("student_stats")
            .update({
              xp: newXp,
              total_score: (stats.total_score ?? 0) + totalScore,
              total_tests: (stats.total_tests ?? 0) + 1,
            })
            .eq("student_id", studentId)
            .eq("xp", currentXp) // CAS guard: only update if xp hasn't changed
            .select();

          if (updatedRows && updatedRows.length > 0) {
            statsUpdated = true;
          } else {
            // Another concurrent update beat us — backoff and retry
            await new Promise(r => setTimeout(r, 50 * xpRetries));
          }
        } else {
          const { error: insertErr } = await supabaseDB
            .from("student_stats")
            .insert({
              student_id: studentId,
              xp: xpGained,
              total_score: totalScore,
              total_tests: 1,
            });

          if (!insertErr) {
            statsUpdated = true;
          } else {
            await new Promise(r => setTimeout(r, 50 * xpRetries));
          }
        }
      }

      if (!statsUpdated) {
        console.warn(`[submitDPP] XP update failed after ${MAX_XP_RETRIES} retries for student ${studentId}. Skipping gamification.`);
      }
      
      // Update leaderboard
      const { data: dppBatch } = await supabaseDB.from("dpps").select("batch_id").eq("id", dppId).maybeSingle();
      if (dppBatch?.batch_id) {
        await supabaseDB.from("leaderboards").upsert({
          batch_id: dppBatch.batch_id,
          student_id: studentId,
          xp: newXp,
          updated_at: new Date().toISOString(),
        }, { onConflict: "batch_id,student_id" });
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
    if (!(await canManageDpp(req, dppId))) { res.status(403).json({ success: false, message: "Access denied" }); return; }
    const { error } = await supabaseDB.from("dpps").update({ is_active: false }).eq("id", dppId);
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
    if (!(await canManageDpp(req, dppId))) { res.status(403).json({ success: false, message: "Access denied" }); return; }

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
