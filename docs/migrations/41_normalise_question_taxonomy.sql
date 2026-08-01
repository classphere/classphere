-- ============================================================
-- Migration: 41 — Normalise question types and subjects
--
-- These tags decide which axis a student's weakness lands on in the subject
-- and question-type analysis, so a synonym is not cosmetic: it splits one
-- category in two and understates both. Across 56,314 questions the table had
-- accumulated
--
--   mcq_single 49757 | integer 3344 | MCQ 1921 | mcq_multi 1106
--   Assertion-Reason 118 | Matching 67 | MSQ 1
--
-- where MCQ is mcq_single and MSQ is mcq_multi under different spellings.
--
-- Fixing the rows alone would re-drift within a day: the extractor prompt asks
-- the model for "MCQ" | "MSQ" | "Numerical" | "Matching" | "Assertion-Reason",
-- and the bulk-upload path stored whatever arrived. The writers are corrected
-- alongside this, and the CHECK below is what stops it happening again.
-- ============================================================

-- ─── 1. Question types ───────────────────────────────────────────────────────

UPDATE public.questions SET question_type = 'mcq_single'
  WHERE lower(regexp_replace(question_type, '[^a-zA-Z0-9]', '', 'g'))
        IN ('mcq', 'mcqsingle', 'singlecorrect', 'single', 'scq', 'objective');

UPDATE public.questions SET question_type = 'mcq_multi'
  WHERE lower(regexp_replace(question_type, '[^a-zA-Z0-9]', '', 'g'))
        IN ('msq', 'mcqmulti', 'mcqmultiple', 'multiplecorrect', 'multicorrect');

UPDATE public.questions SET question_type = 'integer'
  WHERE lower(regexp_replace(question_type, '[^a-zA-Z0-9]', '', 'g'))
        IN ('integer', 'numerical', 'numericalvalue', 'nvq', 'numeric');

UPDATE public.questions SET question_type = 'matching'
  WHERE lower(regexp_replace(question_type, '[^a-zA-Z0-9]', '', 'g'))
        IN ('matching', 'matrixmatch', 'match', 'matchthefollowing');

UPDATE public.questions SET question_type = 'assertion_reason'
  WHERE lower(regexp_replace(question_type, '[^a-zA-Z0-9]', '', 'g'))
        IN ('assertionreason', 'assertion', 'reasonassertion');

-- ─── 2. NEET has no numerical questions ──────────────────────────────────────
--
-- 139 rows on neet-ug carried question_type = 'integer' while sitting in
-- Botany and Zoology, on chapters such as "The Living World". NEET-UG is
-- entirely multiple choice, so the type is what is wrong here, not the subject.

UPDATE public.questions q
SET question_type = 'mcq_single'
FROM public.exams e
WHERE e.id = q.exam_id
  AND e.code = 'neet-ug'
  AND q.question_type = 'integer';

-- ─── 3. Stop the drift ───────────────────────────────────────────────────────
--
-- Applied after the updates above so it validates a table that already
-- conforms. If this fails, section 1 missed a spelling — read the offending
-- value out of the error rather than widening the constraint.

ALTER TABLE public.questions DROP CONSTRAINT IF EXISTS questions_question_type_check;
ALTER TABLE public.questions ADD CONSTRAINT questions_question_type_check
  CHECK (question_type IS NULL OR question_type IN
    ('mcq_single', 'mcq_multi', 'integer', 'matching', 'assertion_reason'));

-- ─── 4. Subjects ─────────────────────────────────────────────────────────────
--
-- 'General' is not a subject any exam has. It comes from the bulk-upload path
-- defaulting with `q.subject || subject || "General"`, so these rows belong to
-- no axis on any chart. Only 7 rows, and nothing to infer the real subject
-- from, so they are marked for review rather than guessed at.
--
-- NULL would be the natural way to say "unknown", but questions.subject is NOT
-- NULL. 'Unclassified' is the sentinel instead: unlike 'General' it does not
-- read as a real category, so it cannot be mistaken for one in a report and is
-- trivially excluded by name.

UPDATE public.questions SET subject = 'Unclassified' WHERE subject = 'General';

-- Case and spelling variants, in case any exist beyond the known set.
UPDATE public.questions SET subject = 'Physics'     WHERE lower(subject) IN ('physics', 'phy');
UPDATE public.questions SET subject = 'Chemistry'   WHERE lower(subject) IN ('chemistry', 'chem');
UPDATE public.questions SET subject = 'Mathematics' WHERE lower(subject) IN ('mathematics', 'maths', 'math');
UPDATE public.questions SET subject = 'Botany'      WHERE lower(subject) IN ('botany', 'bot');
UPDATE public.questions SET subject = 'Zoology'     WHERE lower(subject) IN ('zoology', 'zoo');
UPDATE public.questions SET subject = 'Biology'     WHERE lower(subject) IN ('biology', 'bio');

-- Note: 'Biology' is deliberately NOT split into Botany and Zoology here.
-- NEET examines them as separate sections, but ~2,856 rows carry chapters that
-- are genuinely shared (Cell Cycle, Biomolecules, Genetics, Evolution,
-- Ecology) or no chapter signal at all — 611 sit on chapter 'General'. Filing
-- those into a stream by guesswork would put a student's weakness under the
-- wrong section of the report, which is worse than leaving it unassigned.
-- Section 6 reports what is left so the split can be made deliberately.

-- ─── 5. Verify the vocabulary ────────────────────────────────────────────────

SELECT question_type, count(*) AS questions
FROM public.questions
GROUP BY question_type
ORDER BY questions DESC;

SELECT coalesce(subject, '(unassigned)') AS subject, count(*) AS questions
FROM public.questions
GROUP BY subject
ORDER BY questions DESC;

-- ─── 6. What still needs a human ─────────────────────────────────────────────
-- Ambiguous Biology rows, by chapter, so the Botany/Zoology split can be made
-- from the largest groups down.

SELECT coalesce(q.chapter, '(no chapter)') AS chapter,
       count(*) AS questions
FROM public.questions q
JOIN public.exams e ON e.id = q.exam_id
WHERE q.subject = 'Biology'
  AND e.code = 'neet-ug'
GROUP BY q.chapter
ORDER BY questions DESC
LIMIT 40;
