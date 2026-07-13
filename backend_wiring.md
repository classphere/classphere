# Backend Wiring — Status & Remaining Work

> Last audited: 2026-07-13. Reflects all changes made since the original plan.

---

## Part 1 — What's ✅ Done

### Auth & Session
| Item | Status |
|---|---|
| `auth.controller.ts` — login, session management | ✅ Real Supabase calls, done |
| `auth.middleware.ts` — JWT + one-device session enforcement | ✅ Done |
| `rbac.middleware.ts` — `requireRole()` guard | ✅ Done |
| `homePath` in `auth-context.tsx` — role-based redirect on login | ✅ Fixed. super_admin→`/superadmin`, institute_admin→`/institute`, teacher→`/teacher`, student→`/dashboard` |

### Institutes & Provisioning
| Item | Status |
|---|---|
| `createInstitute` (superadmin) | ✅ Done via `institutes.service.ts` |
| `getInstituteBySlug` (public) | ✅ Done |
| `createBatch` | ✅ Done with real Supabase insert |
| `listBatches` (admin + teacher) | ✅ Done — teacher sees own batches via `batch_teachers` |
| `provisionInstitute` — creates auth user, `public.users`, `institutes` row, back-fills `institute_id` | ✅ Done |

### Faculty Management
| Item | Status |
|---|---|
| `createFaculty` — creates Supabase auth user, `public.users`, `faculty`, `batch_teachers` rows, sends invite email | ✅ Done |
| `listFaculty` — returns faculty for admin's institute | ✅ Done |
| `mailer.ts` — Resend-based invite email with dev fallback | ✅ Done |

### Student Management
| Item | Status |
|---|---|
| `listStudents` — returns students for institute with batch names | ✅ Done |
| `importStudents` — CSV/XLSX import, duplicate handling (skip same batch, update different batch) | ✅ Done |
| Student login via phone + DOB (no Supabase auth account needed) | ✅ Designed — students in `public.users` only |

### Tests (PYQ path — partially working)
| Item | Status |
|---|---|
| `getTest` (`GET /api/v1/tests/:id`) — fetches paper + questions from Supabase using raw `fetch()` | ✅ Working but uses inline `sbFetch` (no service layer) |
| `deleteTest` — soft delete via `PATCH papers` | ✅ Working |
| `listTests` (`GET /api/v1/questions/tests`) — lists papers from Supabase | ✅ Working (in questions controller) |
| `bulkUpsertQuestions` — used by seeding scripts | ✅ Working |

### Superadmin
| Item | Status |
|---|---|
| Superadmin module with stats, institute CRUD | ✅ Done |
| `listInstitutes` — permission issue fixed (uses service-role) | ✅ Done |

### Web Hooks (Frontend)
| Hook | Status |
|---|---|
| `useBatches.ts` | ✅ Real API |
| `useFaculty.ts` | ✅ Real API (updated with email, phone, batch_id) |
| `useStudents.ts` | ✅ Real API with CSV import |
| `useInstitutes.ts` | ✅ Real API |
| `useSuperadminStats.ts` | ✅ Real API |

### Analysis Engine (architecture — already correct)
| Item | Status |
|---|---|
| JEE / NEET / SSC pipeline isolation | ✅ Correct architecture |
| `analysis.service.ts` orchestrator (single fetch, routes to pipeline) | ✅ Architecture correct, but reads from `db.mock` |
| `batch-analysis.ts` | ✅ Wired |

---

## Part 2 — ❌ Still Missing / Incomplete

### P0 — Core Test-Taking Flow (Critical — App Cannot Function Without These)

| # | Problem | File | Notes |
|---|---|---|---|
| P0-1 | `startAttempt` is a TODO stub | `attempts.controller.ts:7` | No attempt row is ever created in Supabase |
| P0-2 | `getAttempt` is a TODO stub | `attempts.controller.ts:50` | Resume functionality broken |
| P0-3 | `saveAttempt` is a TODO stub | `attempts.controller.ts:70` | Auto-save doesn't persist anything |
| P0-4 | `getMyAttempts` is a TODO stub | `attempts.controller.ts:29` | Student history page shows nothing |
| P0-5 | `submitAttempt` uses `db.mock` in-memory store | `attempts.controller.ts:97` | Attempts lost on server restart; no Supabase row created |
| P0-6 | `analysis.service.ts` imports from `db.mock` | `analysis.service.ts:2` | Analysis results never saved to Supabase |
| P0-7 | `analysis.controller.ts` reads from `globalDbStore` | `analysis.controller.ts:14` | Results disappear on restart |
| P0-8 | `db.service.ts` does not exist | — | The real Supabase persistence layer for the analysis engine is missing entirely |

**Consequence:** A student can submit a test and see results *in the same session*, but everything is lost the moment the server restarts. History page, leaderboard, and longitudinal analysis are all broken.

---

### P1 — Features (App is Incomplete Without These)

| # | Problem | File | Notes |
|---|---|---|---|
| P1-1 | `createTest` is a TODO stub | `tests.controller.ts:7` | Teachers/admins cannot create institute tests |
| P1-2 | `getMyTests` is a TODO stub | `tests.controller.ts:31` | Teacher "My Tests" page broken |
| P1-3 | `getAssignedTests` is a TODO stub | `tests.controller.ts:48` | Students cannot see assigned institute tests |
| P1-4 | `publishTest` is a TODO stub | `tests.controller.ts:144` | Tests can never be published |
| P1-5 | `listQuestions` is a TODO stub | `questions.controller.ts:29` | Question bank browser broken |
| P1-6 | `getQuestion` is a TODO stub | `questions.controller.ts:71` | Cannot fetch single question |
| P1-7 | `getExamsMeta` is a TODO stub | `questions.controller.ts:52` | Test creation dropdowns broken |
| P1-8 | `createQuestion` is a TODO stub | `questions.controller.ts:89` | Cannot add questions via UI |
| P1-9 | `updateQuestion` is a TODO stub | `questions.controller.ts:107` | Cannot edit questions |
| P1-10 | `deleteQuestion` is a TODO stub | `questions.controller.ts:125` | Cannot soft-delete questions |
| P1-11 | `getMyRanks` is a TODO stub | `rankings.controller.ts:7` | Student rank card broken |
| P1-12 | `getLeaderboard` is a TODO stub | `rankings.controller.ts:27` | Leaderboard page broken |
| P1-13 | `getRankCard` is a TODO stub | `rankings.controller.ts:55` | Shareable rank card broken |
| P1-14 | `getMyInstitute` is a TODO stub | `institutes.controller.ts:44` | Institute dashboard "my profile" broken |
| P1-15 | `updateInstitute` is a TODO stub | `institutes.controller.ts:60` | Institute settings page broken |
| P1-16 | `getInstituteStats` is a TODO stub | `institutes.controller.ts:78` | Dashboard stats widgets empty |

---

### P2 — Polish & Architecture Debt

| # | Problem | File | Notes |
|---|---|---|---|
| P2-1 | `getTest` uses inline raw `fetch()` (`sbFetch`) | `tests.controller.ts:77` | Violates service-layer architecture. Should use `supabaseDB` |
| P2-2 | `submitAttempt` uses inline raw `fetch()` | `attempts.controller.ts:117` | Same violation |
| P2-3 | `questions.controller.ts` uses inline `sbFetch` | `questions.controller.ts:7` | Same violation |
| P2-4 | `getTest` selects `image_url` (old schema) | `tests.controller.ts:109` | Should be `question_images, explanation_images` |
| P2-5 | `analysis.service.ts` still calls pipelines with `attemptId` | `analysis.service.ts:25` | Pipelines re-fetch what the orchestrator already fetched (double-fetch) |
| P2-6 | `getBatch`, `updateBatch`, `deactivateBatch`, `addStudentToBatch`, `removeStudentFromBatch`, `addTeacherToBatch`, `generateBatchInvite` are all TODO stubs | `institutes.controller.ts` | Batch detail/management operations broken |
| P2-7 | No centralized error handler middleware | `src/middleware/` | Every controller has its own `try/catch` boilerplate |
| P2-8 | Missing web hooks | `apps/web/src/lib/hooks/` | `useTests.ts`, `useAttempts.ts`, `useAnalysis.ts` not yet created |
| P2-9 | `regenerateAnalysis` is a TODO stub | `analysis.controller.ts:30` | Superadmin re-analysis tool broken |

---

## Part 3 — DB Tables Status

Run these checks in Supabase SQL Editor to confirm which tables exist:

| Table | Used By | Status |
|---|---|---|
| `users` | Auth, all roles | ✅ Exists |
| `institutes` | Institute flow | ✅ Exists |
| `batches` | Batch management | ✅ Exists |
| `faculty` | Faculty provisioning | ✅ Exists (email + phone columns added) |
| `batch_students` | Student import | ✅ Exists |
| `batch_teachers` | Faculty provisioning | ⚠️ **Needs migration** — `CREATE TABLE IF NOT EXISTS batch_teachers` |
| `papers` | PYQ tests | ✅ Exists |
| `paper_questions` | Test questions | ✅ Exists |
| `questions` | Question bank | ✅ Exists |
| `exams` | Exam metadata | ✅ Exists |
| `attempts` | Test-taking | ⚠️ **Needs verification** — required for P0 |
| `attempt_answers` | Auto-save + submit | ⚠️ **Needs verification** — required for P0 |
| `analysis_results` | Analysis persistence | ⚠️ **Needs verification** — required for P0 |
| `student_error_profiles` | Longitudinal analysis | ⚠️ **Needs verification** — required for P0 |
| `tests` | Institute test creation | ⚠️ **Needs verification** — required for P1 |
| `test_batch_assignments` | Test assignment | ⚠️ **Needs verification** — required for P1 |
| `leaderboards` | Rankings | ⚠️ **Needs verification** — required for P1 |
| `student_stats` | Rankings | ⚠️ **Needs verification** — required for P1 |

---

## Part 4 — Recommended Execution Order (Updated)

```
── IMMEDIATE (P0 — data is being lost right now) ──────────────────────────────

Step 1:  Run DB migrations in Supabase SQL Editor:
         - CREATE TABLE IF NOT EXISTS batch_teachers
         - Verify attempts, attempt_answers, analysis_results, student_error_profiles exist

Step 2:  Create db.service.ts
         File: apps/api/src/modules/analysis-engine/services/db.service.ts
         Replaces db.mock.ts with real Supabase calls.

Step 3:  Implement startAttempt (attempts.controller.ts)
         Creates attempt row in Supabase.

Step 4:  Implement saveAttempt (attempts.controller.ts)
         UPSERTs attempt_answers on every auto-save tick.

Step 5:  Refactor submitAttempt (attempts.controller.ts)
         Remove globalDbStore. Write to Supabase. Call analyzeAttempt.
         Update analysis.service.ts to import from db.service instead of db.mock.
         Update analysis.controller.ts to read from Supabase instead of globalDbStore.

Step 6:  Implement getAttempt + getMyAttempts (attempts.controller.ts)
         Resume + history page.

── NEXT (P1 — feature completeness) ──────────────────────────────────────────

Step 7:  Implement getMyInstitute + getInstituteStats (institutes.controller.ts)
         Institute dashboard widgets.

Step 8:  Implement listQuestions + getExamsMeta (questions.controller.ts)
         Question bank browser.

Step 9:  Implement createTest + getAssignedTests (tests.controller.ts)
         Institute test creation flow.

Step 10: Implement getMyRanks + getLeaderboard (rankings.controller.ts)
         Leaderboard page.

── LATER (P2 — polish) ────────────────────────────────────────────────────────

Step 11: Replace all inline sbFetch() with supabaseDB client calls.
         Affected files: tests.controller.ts, attempts.controller.ts, questions.controller.ts

Step 12: Fix image_url → question_images schema mismatch in getTest.

Step 13: Add missing web hooks: useTests.ts, useAttempts.ts, useAnalysis.ts

Step 14: Add centralized error handler middleware.

Step 15: Fix double-fetch in analysis pipelines (pass data instead of re-fetching).
```

---

## Part 5 — Migration SQL Required

Run these in Supabase Dashboard → SQL Editor before Step 1:

```sql
-- 1. batch_teachers (required by faculty provisioning + listBatches for teachers)
CREATE TABLE IF NOT EXISTS batch_teachers (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  batch_id uuid NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
  teacher_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(batch_id, teacher_id)
);

-- 2. faculty table columns (may already be done — check first)
ALTER TABLE faculty ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE faculty ADD COLUMN IF NOT EXISTS phone text;

-- 3. Verify these exist (P0 requires them):
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('attempts', 'attempt_answers', 'analysis_results', 'student_error_profiles', 'tests', 'test_batch_assignments');
```
