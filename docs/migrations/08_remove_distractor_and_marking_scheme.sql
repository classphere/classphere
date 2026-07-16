-- 08_remove_distractor_and_marking_scheme.sql
-- Drop distractor_map and marking_scheme columns from questions table

ALTER TABLE questions DROP COLUMN IF EXISTS distractor_map;
ALTER TABLE questions DROP COLUMN IF EXISTS marking_scheme;
