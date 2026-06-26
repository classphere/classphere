import { Request, Response } from "express";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY!;

// ─── Supabase REST helper ─────────────────────────────────────────────────────
async function sbFetch(path: string, options: RequestInit = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      "Content-Type":  "application/json",
      "apikey":        SUPABASE_SERVICE_KEY,
      "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`,
      ...(options.headers ?? {}),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase error (${res.status}): ${text}`);
  }
  return res.json();
}

// ─── Controllers ──────────────────────────────────────────────────────────────

/**
 * GET /api/v1/pyqs
 * Returns metadata for all PYQ papers from the DB.
 * Query params: exam (exam code e.g. "jee-main"), year
 */
export const getPYQList = async (req: Request, res: Response): Promise<void> => {
  try {
    const { exam, year } = req.query;

    let query = `papers?test_type=eq.pyq&is_active=eq.true&select=id,title,year,shift,total_questions,total_marks,duration_min,difficulty,exams(code,full_name)&order=year.desc`;

    if (exam) query += `&exams.code=eq.${exam}`;
    if (year) query += `&year=eq.${year}`;

    const papers = await sbFetch(query);

    res.json({ success: true, data: { papers, total: papers.length } });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * GET /api/v1/pyqs/:id/questions
 * Returns the full enriched question array for a specific PYQ paper.
 */
export const getPYQQuestions = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // 1. Fetch paper metadata
    const papers = await sbFetch(`papers?id=eq.${id}&is_active=eq.true&select=*,exams(code,full_name)`);
    if (!papers.length) {
      res.status(404).json({ success: false, message: `PYQ paper '${id}' not found.` });
      return;
    }
    const paper = papers[0];

    // 2. Fetch questions via join table
    const pqs = await sbFetch(
      `paper_questions?paper_id=eq.${id}&order=position.asc&select=question_id`
    );
    const questionIds = pqs.map((r: any) => r.question_id);

    let questions: any[] = [];
    if (questionIds.length > 0) {
      // Fetch questions by IDs in one shot using `in` filter
      const ids = questionIds.join(",");
      questions = await sbFetch(
        `questions?id=in.(${ids})&is_active=eq.true&select=id,question_text,image_url,options,correct_answer,explanation,question_type,subject,chapter,topic,difficulty,distractor_map,marking_scheme`
      );
    }

    res.json({
      success: true,
      data: { paper, questions, total: questions.length },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};
