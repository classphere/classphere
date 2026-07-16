/**
 * db.service.ts
 * Real Supabase persistence layer for the analysis engine.
 * Replaces db.mock.ts — drop-in compatible interface.
 *
 * Tables used:
 *   - attempts              (existing)
 *   - attempt_answers       (existing, with added columns via migration)
 *   - analysis_results      (new — created via migration)
 *   - student_error_profiles (new — created via migration)
 */

import { supabaseDB } from "../../../lib/supabase";
import {
  AttemptAnswer,
  AnalysisResult,
  StudentErrorProfile,
  TopicErrorHistoryEntry,
  Question,
} from "../../../../../../packages/types/src/analysis.types";

// ─── Attempt with answers (for analysis pipeline) ─────────────────────────────

export interface AttemptRecord {
  id: string;
  student_id: string;
  paper_id: string;
  exam_code: string;
  batch_id: string | null;
  marking_scheme: { correct: number; incorrect: number; unattempted: number; partial: boolean } | null;
  total_duration_sec: number;
  status: string;
}

// ─── Main db object (same interface as db.mock so analysis.service.ts just re-imports) ──

export const db = {
  // ── Fetch full attempt + all answers with question data ────────────────────
  getAttemptWithAnswers: async (attemptId: string): Promise<{ attempt: AttemptRecord; answers: AttemptAnswer[] }> => {
    // Fetch attempt row
    const { data: attempt, error: aErr } = await supabaseDB
      .from("attempts")
      .select("id, student_id, paper_id, exam_code, batch_id, marking_scheme, total_duration_sec, status")
      .eq("id", attemptId)
      .single();

    if (aErr || !attempt) {
      throw new Error(`[db.service] Attempt ${attemptId} not found: ${aErr?.message}`);
    }

    // Fetch all answers for this attempt
    const { data: rawAnswers, error: aaErr } = await supabaseDB
      .from("attempt_answers")
      .select("id, attempt_id, question_id, selected_answer, is_correct, marks_awarded, time_taken_sec, start_timestamp, marked_review")
      .eq("attempt_id", attemptId);

    if (aaErr) {
      throw new Error(`[db.service] Failed to fetch attempt_answers: ${aaErr.message}`);
    }

    // Fetch all questions for those answers
    const questionIds = (rawAnswers ?? []).map((a: any) => a.question_id);
    let questionMap: Record<string, Question> = {};

    if (questionIds.length > 0) {
      const { data: questions } = await supabaseDB
        .from("questions")
        .select("id, question_text, image_url, options, correct_answer, explanation, explanation_image_url, question_type, subject, chapter, topic, difficulty, source, year, tags")
        .in("id", questionIds);

      for (const q of questions ?? []) {
        questionMap[q.id] = {
          ...q,
          question_number: 0, // will be set below
          image_url: q.image_url || null,
          explanation_image_url: q.explanation_image_url || null,
          correct_answer: Array.isArray(q.correct_answer) ? q.correct_answer : [q.correct_answer],
          tags: q.tags ?? [],
        } as Question;
      }
    }

    // Fetch paper question ordering positions (REL-3)
    const { data: paperQs } = await supabaseDB
      .from("paper_questions")
      .select("question_id, position")
      .eq("paper_id", attempt.paper_id);

    const positionMap: Record<string, number> = {};
    for (const pq of paperQs ?? []) {
      positionMap[pq.question_id] = pq.position;
    }

    const answers: AttemptAnswer[] = (rawAnswers ?? [])
      .filter((a: any) => {
        if (!questionMap[a.question_id]) {
          console.warn(`[Analysis Engine] Warning: Question ID ${a.question_id} not found in database for attempt ${attemptId}. Filtering out.`);
          return false;
        }
        return true;
      })
      .map((a: any, idx: number) => ({
        id: a.id,
        attempt_id: a.attempt_id,
        question_id: a.question_id,
        selected_answer: a.selected_answer ?? null,
        is_correct: a.is_correct ?? false,
        marks_awarded: a.marks_awarded ?? 0,
        time_taken_sec: a.time_taken_sec ?? 0,
        start_timestamp: a.start_timestamp ?? -1,
        marked_review: a.marked_review ?? false,
        question: { ...questionMap[a.question_id], question_number: positionMap[a.question_id] || (idx + 1) },
      }))
      .sort((a, b) => a.question.question_number - b.question.question_number);

    return {
      attempt: {
        ...attempt,
        exam_code: attempt.exam_code ?? "jee-main",
        marking_scheme: attempt.marking_scheme ?? { correct: 4, incorrect: -1, unattempted: 0, partial: false },
        total_duration_sec: attempt.total_duration_sec ?? 10800,
      } as AttemptRecord,
      answers,
    };
  },

  // ── Batch averages per topic (for comparison) ──────────────────────────────
  getBatchAvgsByTopic: async (batchId: string): Promise<Map<string, number>> => {
    try {
      const { data, error } = await supabaseDB.rpc("calculate_batch_topic_averages", {
        p_batch_id: batchId,
      });

      if (error) {
        console.error(`[db.service] getBatchAvgsByTopic RPC error:`, error.message);
        return new Map<string, number>();
      }

      // data is a JSON object like { "Kinematics": 45.5, "Thermodynamics": 80.2 }
      const map = new Map<string, number>();
      if (data && typeof data === "object") {
        for (const [topic, avg] of Object.entries(data)) {
          map.set(topic, Number(avg));
        }
      }
      return map;
    } catch (e: any) {
      console.error(`[db.service] getBatchAvgsByTopic exception:`, e.message);
      return new Map<string, number>();
    }
  },

  // ── Seen question IDs (for booster config de-duplication) ─────────────────
  getSeenQuestionIds: async (studentId: string, _examCode: string): Promise<string[]> => {
    const { data } = await supabaseDB
      .from("attempt_answers")
      .select("question_id, attempts!inner(student_id)")
      .eq("attempts.student_id", studentId);
    return (data ?? []).map((r: any) => r.question_id);
  },

  // ── Upsert analysis result ─────────────────────────────────────────────────
  upsertAnalysis: async (attemptId: string, studentId: string, examCode: string, result: AnalysisResult): Promise<void> => {
    const { error } = await supabaseDB
      .from("analysis_results")
      .upsert({
        attempt_id: attemptId,
        student_id: studentId,
        exam_code: examCode,
        result: result as any,
        processing_ms: result.processingMs,
        updated_at: new Date().toISOString(),
      }, { onConflict: "attempt_id" });

    if (error) {
      console.error(`[db.service] upsertAnalysis failed for attempt ${attemptId}:`, error.message);
      throw new Error(`Failed to save analysis: ${error.message}`);
    }
    console.log(`[db.service] Analysis saved for attempt ${attemptId}`);
  },

  // ── Save classified answer results back to attempt_answers ─────────────────
  saveAnswerClassifications: async (attemptId: string, _classified: any[]): Promise<void> => {
    // Classifications are stored as part of the analysis_results JSONB, not individually.
    // This is intentional — avoids a schema explosion. Individual answer rows already
    // have is_correct and marks_awarded set during submitAttempt.
    console.log(`[db.service] Answer classifications saved within analysis result for attempt ${attemptId}`);
  },

  // ── Student error profile (longitudinal) ──────────────────────────────────

  getStudentErrorProfile: async (studentId: string, examCode: string): Promise<StudentErrorProfile | null> => {
    const { data, error } = await supabaseDB
      .from("student_error_profiles")
      .select("student_id, exam_code, topic_history, last_updated")
      .eq("student_id", studentId)
      .eq("exam_code", examCode)
      .maybeSingle();

    if (error || !data) return null;

    return {
      studentId: data.student_id,
      examId: data.exam_code,
      topicHistory: data.topic_history ?? {},
      lastUpdated: new Date(data.last_updated).getTime(),
    };
  },

  persistStudentErrorProfile: async (
    studentId: string,
    examCode: string,
    newEntries: Record<string, TopicErrorHistoryEntry>
  ): Promise<void> => {
    const MAX_RETRIES = 5;
    let retries = 0;
    let success = false;

    while (!success && retries < MAX_RETRIES) {
      retries++;
      // Read existing with last_updated to do OCC check (M20)
      const { data: existing } = await supabaseDB
        .from("student_error_profiles")
        .select("topic_history, last_updated")
        .eq("student_id", studentId)
        .eq("exam_code", examCode)
        .maybeSingle();

      const topicHistory: Record<string, TopicErrorHistoryEntry[]> = existing?.topic_history ?? {};
      const errorTopics: Record<string, any> = (existing as any)?.error_topics ?? {};

      // Merge new entries
      for (const [topicKey, entry] of Object.entries(newEntries)) {
        if (!topicHistory[topicKey]) topicHistory[topicKey] = [];
        topicHistory[topicKey].push(entry);
        // Sliding window — keep last 10
        if (topicHistory[topicKey].length > 10) {
          topicHistory[topicKey] = topicHistory[topicKey].slice(-10);
        }

        // If the topic was weak in this attempt, update/insert into error_topics (mistake diary)
        if (entry.wasWeak) {
          const parts = topicKey.split("::");
          const chapterName = entry.chapter || parts[0] || "General";
          const topicName = parts[1] || "General";
          
          if (!errorTopics[topicName]) {
            errorTopics[topicName] = {
              count: 1,
              lastSeen: new Date(entry.attemptDate).toISOString(),
              errorType: entry.dominantErrorType || "unknown",
              resolved: false,
              subject: entry.subject || "",
              chapter: chapterName,
              tip: null,
            };
          } else {
            errorTopics[topicName].count = (errorTopics[topicName].count ?? 0) + 1;
            errorTopics[topicName].lastSeen = new Date(entry.attemptDate).toISOString();
            errorTopics[topicName].errorType = entry.dominantErrorType || "unknown";
            errorTopics[topicName].resolved = false; // Reset resolved if they made a mistake again
          }
        }
      }

      const nextUpdated = new Date().toISOString();

      if (existing) {
        // Update with OCC guard
        const { data: updatedRows, error: updateErr } = await supabaseDB
          .from("student_error_profiles")
          .update({
            topic_history: topicHistory as any,
            error_topics: errorTopics as any,
            last_updated: nextUpdated,
          })
          .eq("student_id", studentId)
          .eq("exam_code", examCode)
          .eq("last_updated", existing.last_updated) // OCC check
          .select("student_id");

        if (!updateErr && updatedRows && updatedRows.length > 0) {
          success = true;
        } else {
          // Conflict, backoff and retry
          await new Promise((r) => setTimeout(r, 50 * retries));
        }
      } else {
        // First insert
        const { error: insertErr } = await supabaseDB
          .from("student_error_profiles")
          .insert({
            student_id: studentId,
            exam_code: examCode,
            topic_history: topicHistory as any,
            error_topics: errorTopics as any,
            last_updated: nextUpdated,
          });

        if (!insertErr) {
          success = true;
        } else {
          // Conflict (e.g. unique constraint if insert raced), backoff and retry
          await new Promise((r) => setTimeout(r, 50 * retries));
        }
      }
    }

    if (!success) {
      console.error(`[db.service] persistStudentErrorProfile failed after ${MAX_RETRIES} retries for student ${studentId}`);
    } else {
      console.log(`[db.service] Error profile updated for student ${studentId}, ${Object.keys(newEntries).length} topics`);
    }
  },

  // Legacy compat
  updateStudentErrorProfile: async (studentId: string, examCode: string, _classified: any[]): Promise<void> => {
    console.log(`[db.service] updateStudentErrorProfile (legacy no-op) student=${studentId} exam=${examCode}`);
  },
};
