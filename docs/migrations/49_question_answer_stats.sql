-- ============================================================
-- Migration: 49 — What students actually do with each question
--
-- Two things the system currently guesses, both recoverable from attempts:
--
--   Difficulty. Today it is a label — typed by hand or produced by a model
--   before anyone attempted the question. The truth is the p-value: the
--   fraction of students who got it right.
--
--   Distractors. docs/analysis_engine.md specified a hand-written
--   distractor_map, per option, saying what each wrong choice implies, and
--   credited it with lifting mistake classification from ~70% to ~90%. It was
--   never built; the column was dropped in migration 08. Tagging three wrong
--   options across tens of thousands of questions was never going to happen.
--
--   But most of the signal does not need tagging. With four options, chance
--   puts roughly a third of wrong answers on each. When 58% land on one, that
--   option is a trap — and no one had to say so.
--
-- Both come from the same rollup, so this is one table rather than two
-- features.
--
-- Nothing reads it until a question has been answered enough times to mean
-- anything. That threshold is reached by one batch sitting one paper, not by
-- platform-wide volume: thirty students through a mock gives thirty answers on
-- each of its questions in an afternoon.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.question_answer_stats (
  question_id          UUID PRIMARY KEY REFERENCES public.questions(id) ON DELETE CASCADE,

  -- Students who answered it. Skips are excluded: a question nobody attempted
  -- tells you about the clock, not about the question.
  sample_size          INTEGER     NOT NULL DEFAULT 0,
  correct_count        INTEGER     NOT NULL DEFAULT 0,

  -- {"A": 12, "B": 40, "C": 5, "D": 3} — every option, however chosen.
  option_counts        JSONB       NOT NULL DEFAULT '{}'::jsonb,

  -- correct_count / sample_size. Low means hard. This is observed difficulty,
  -- against which the stored label can be checked.
  p_value              NUMERIC(5,4),

  -- The most-chosen wrong option, and its share of all wrong answers. Share is
  -- what matters: a distractor taking 58% of wrong answers is a trap, one
  -- taking 34% is noise around chance.
  top_distractor       TEXT,
  top_distractor_share NUMERIC(5,4),

  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.question_answer_stats IS
  'Observed behaviour per question, refreshed from attempt_answers. Replaces two guesses: the difficulty label with a p-value, and the never-built distractor_map with the empirical distribution of wrong answers.';

-- Callers ask "is this question hard" and "which wrong option is the trap",
-- both filtered by having enough of a sample to answer.
CREATE INDEX IF NOT EXISTS idx_question_stats_sample
  ON public.question_answer_stats (sample_size DESC)
  WHERE sample_size > 0;

-- ─── The rollup ──────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.refresh_question_answer_stats(p_question_ids UUID[] DEFAULT NULL)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rows INTEGER;
BEGIN
  -- Recomputed rather than incremented. An attempt can be re-analysed and an
  -- answer corrected, and a counter that only ever goes up would drift away
  -- from the answers it claims to summarise.
  -- selected_answer is JSONB, not text. A single-correct answer is stored as a
  -- JSON string ("A"), a multiple-correct one as an array (["A","C"]), and an
  -- index-style key as a number. Each is reduced to one comparable label:
  -- arrays are sorted and joined, so choosing A and C is the same choice
  -- whichever order the student clicked them, and the pair is counted as its
  -- own distractor — which is what it is on a multiple-correct question.
  WITH raw AS (
    SELECT aa.question_id,
           CASE jsonb_typeof(aa.selected_answer)
             WHEN 'array' THEN (
               SELECT string_agg(upper(btrim(v)), ',' ORDER BY upper(btrim(v)))
               FROM jsonb_array_elements_text(aa.selected_answer) AS v
               WHERE btrim(v) <> ''
             )
             WHEN 'string' THEN upper(btrim(aa.selected_answer #>> '{}'))
             WHEN 'number' THEN upper(btrim(aa.selected_answer #>> '{}'))
             ELSE NULL
           END AS choice,
           aa.is_correct
    FROM public.attempt_answers aa
    JOIN public.attempts a ON a.id = aa.attempt_id
    WHERE aa.selected_answer IS NOT NULL
      AND a.status = 'submitted'
      AND (p_question_ids IS NULL OR aa.question_id = ANY(p_question_ids))
  ),
  answered AS (
    SELECT question_id, choice, is_correct
    FROM raw
    WHERE choice IS NOT NULL AND choice <> ''
  ),
  totals AS (
    SELECT question_id,
           count(*)                                   AS sample_size,
           count(*) FILTER (WHERE is_correct)         AS correct_count,
           count(*) FILTER (WHERE NOT is_correct)     AS wrong_count
    FROM answered
    GROUP BY question_id
  ),
  per_option AS (
    SELECT question_id, choice, count(*) AS n
    FROM answered
    GROUP BY question_id, choice
  ),
  counts AS (
    SELECT question_id, jsonb_object_agg(choice, n) AS option_counts
    FROM per_option
    GROUP BY question_id
  ),
  -- The most-chosen option among answers that were wrong.
  distractors AS (
    SELECT DISTINCT ON (question_id)
           question_id, choice AS top_distractor, n AS distractor_n
    FROM (
      SELECT question_id, choice, count(*) AS n
      FROM answered
      WHERE NOT is_correct
      GROUP BY question_id, choice
    ) w
    ORDER BY question_id, n DESC, choice
  )
  INSERT INTO public.question_answer_stats AS s (
    question_id, sample_size, correct_count, option_counts,
    p_value, top_distractor, top_distractor_share, updated_at
  )
  SELECT t.question_id,
         t.sample_size,
         t.correct_count,
         COALESCE(c.option_counts, '{}'::jsonb),
         CASE WHEN t.sample_size > 0
              THEN round(t.correct_count::numeric / t.sample_size, 4) END,
         d.top_distractor,
         CASE WHEN t.wrong_count > 0
              THEN round(d.distractor_n::numeric / t.wrong_count, 4) END,
         now()
  FROM totals t
  LEFT JOIN counts c      ON c.question_id = t.question_id
  LEFT JOIN distractors d ON d.question_id = t.question_id
  ON CONFLICT (question_id) DO UPDATE SET
    sample_size          = EXCLUDED.sample_size,
    correct_count        = EXCLUDED.correct_count,
    option_counts        = EXCLUDED.option_counts,
    p_value              = EXCLUDED.p_value,
    top_distractor       = EXCLUDED.top_distractor,
    top_distractor_share = EXCLUDED.top_distractor_share,
    updated_at           = now();

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RETURN v_rows;
END; $$;

REVOKE ALL ON FUNCTION public.refresh_question_answer_stats(UUID[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_question_answer_stats(UUID[]) TO service_role;
GRANT ALL ON public.question_answer_stats TO service_role;

ALTER TABLE public.question_answer_stats ENABLE ROW LEVEL SECURITY;

NOTIFY pgrst, 'reload schema';

-- ─── Populate from whatever exists ───────────────────────────────────────────

SELECT public.refresh_question_answer_stats() AS questions_rolled_up;

-- ─── Verify ──────────────────────────────────────────────────────────────────
-- Expect very little today: 49 answers across 46 questions, none answered more
-- than twice. Meaningful rows arrive with the first real batch through a paper.

SELECT count(*)                                        AS questions_with_data,
       count(*) FILTER (WHERE sample_size >= 30)       AS ready_for_use,
       max(sample_size)                                AS best_sample
FROM public.question_answer_stats;
