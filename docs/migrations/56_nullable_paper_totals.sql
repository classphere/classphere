-- ============================================================
-- Migration: 56 — papers.total_marks and duration_min must accept NULL
--
-- Both columns have carried NOT NULL (with DEFAULT 0 / DEFAULT 180) since
-- migration 02. That was fine while every paper insert supplied a real
-- number — it stopped being fine the moment total_marks and duration_min
-- became "state what you know, leave the rest for the review screen"
-- fields (see tests.controller.ts createTest/uploadTestPDF and their
-- statedNumberOrNull comments): those code paths now insert an explicit
-- NULL "usually", on the assumption the Test Head fills both in later.
--
-- The schema was never updated to match, so every paper created without
-- an upfront total_marks/duration_min — which is the normal case for a
-- PDF upload, and any bank-built test whose caller didn't pass one either
-- — fails at INSERT with "null value in column total_marks of relation
-- papers violates not-null constraint" before a review screen is ever
-- reached. This migration makes the schema match the design that was
-- already written against it.
--
-- Defaults are dropped too: a silent DEFAULT 0 / DEFAULT 180 on a column
-- the app treats as "unset means null" would let a paper claim a false
-- total the moment some future insert omits the key instead of stating
-- it explicitly.
-- ============================================================

ALTER TABLE papers ALTER COLUMN total_marks DROP NOT NULL;
ALTER TABLE papers ALTER COLUMN total_marks DROP DEFAULT;

ALTER TABLE papers ALTER COLUMN duration_min DROP NOT NULL;
ALTER TABLE papers ALTER COLUMN duration_min DROP DEFAULT;
