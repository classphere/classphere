-- ============================================================
-- Migration: 52 — Tell a PDF extraction apart from a deliberately custom paper
--
-- Migration 51's era downgraded exam-pattern mismatches (NEET expects 180
-- total/45 Physics/45 Chemistry, JEE Main 75/25/25/25) from "error" to
-- "warning" everywhere, so a deliberately custom 80-question paper wouldn't
-- read as "Validation failed" when it would publish just fine.
--
-- That was too broad: most coachings upload a real PDF meant to already
-- match the official pattern, and for those a mismatch is real signal —
-- almost always extraction missing questions, not a deliberate choice. Only
-- a paper built through the bank (an explicit count typed in, count-by-
-- construction correct) should ever be soft about this. The validator has no
-- way to tell those apart without being told, so this records it.
--
-- Defaults false for every row that already exists — there is no reliable
-- way to determine after the fact whether an existing paper came from a PDF
-- or was bank-built, so this only takes effect for papers created from here
-- on. uploadTestController (institute PDF upload) is the first caller
-- updated to set it true.
-- ============================================================

ALTER TABLE public.papers
  ADD COLUMN IF NOT EXISTS extracted_from_pdf BOOLEAN NOT NULL DEFAULT false;

NOTIFY pgrst, 'reload schema';
