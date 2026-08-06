-- ============================================================
-- Migration: 47 — Lowercase difficulty
--
-- The analysis engine compares difficulty by exact string:
--
--   jee-error-patterns.ts    question.difficulty === "easy"
--   jee-attempt-strategy.ts  question.difficulty === "hard"
--
-- so a question stored as "Easy" is not merely untidy, it is invisible. It
-- never appears in the "Careless on Easy Questions" pattern, and never counts
-- toward whether a student worked easy questions before hard ones.
--
-- Across 56,314 questions:
--
--   medium 46,244 | Medium 5,268 | easy 3,170 | Easy 341
--   hard    1,126 | Hard     164 | "1"      1
--
-- 5,773 capitalised, plus one row reading "1". Roughly a tenth of the bank was
-- excluded from every difficulty-based finding, silently.
--
-- Ingest now normalises, so this fixes the history and the CHECK stops it
-- recurring.
-- ============================================================

UPDATE public.questions SET difficulty = 'easy'
  WHERE lower(btrim(coalesce(difficulty, ''))) IN ('easy', 'e', 'low', 'simple', 'basic');

UPDATE public.questions SET difficulty = 'medium'
  WHERE lower(btrim(coalesce(difficulty, ''))) IN ('medium', 'med', 'm', 'moderate', 'average');

UPDATE public.questions SET difficulty = 'hard'
  WHERE lower(btrim(coalesce(difficulty, ''))) IN ('hard', 'h', 'high', 'difficult', 'tough', 'advanced');

-- Anything left is unrecognised — the "1" among them. Medium is the value that
-- skews a distribution least, and an unlabelled question still belongs
-- somewhere.
UPDATE public.questions SET difficulty = 'medium'
  WHERE difficulty IS NULL OR difficulty NOT IN ('easy', 'medium', 'hard');

ALTER TABLE public.questions DROP CONSTRAINT IF EXISTS questions_difficulty_check;
ALTER TABLE public.questions ADD CONSTRAINT questions_difficulty_check
  CHECK (difficulty IN ('easy', 'medium', 'hard'));

-- Papers carry a difficulty too. It is nullable and mostly null, which is
-- correct — a real paper mixes all three — but the few that are set should
-- read the same way.
UPDATE public.papers
SET difficulty = lower(btrim(difficulty))
WHERE difficulty IS NOT NULL
  AND difficulty <> lower(btrim(difficulty));

-- ─── Verify ──────────────────────────────────────────────────────────────────

SELECT difficulty, count(*) AS questions
FROM public.questions
GROUP BY difficulty
ORDER BY questions DESC;
