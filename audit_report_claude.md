# Classphere — Full Codebase Audit Report

**Date:** July 15, 2026  
**Scope:** `apps/api`, `apps/web`, `packages/types`, Analysis Engine  
**Auditors:** 4 parallel deep-dive agents covering Security, Business Logic, Frontend Architecture, and the Analysis Engine  

---

## Executive Summary

| Severity | Count | Description |
|---|---|---|
| 🔴 **CRITICAL** | **19** | Data corruption, security vulnerabilities, crashes in production |
| 🟠 **HIGH** | **17** | Incorrect logic, missing authorization, performance bottlenecks |
| 🟡 **MEDIUM** | **31** | Edge cases, dead code, fragile patterns, UX gaps |
| 🟢 **LOW** | **21** | Code quality, accessibility, style |
| **Total** | **88** | |

> [!CAUTION]
> The application has **critical security vulnerabilities** that must be patched before any public deployment. The most severe are: unauthenticated profile overwrite, DPP endpoint leaking correct answers to students, missing tenant isolation on 7+ batch endpoints, and double-submission race conditions.

---

## 🔴 CRITICAL Issues — Must Fix Before Deployment

### Security Vulnerabilities

#### SEC-1: Unauthenticated Profile Overwrite via Signup
[auth.controller.ts](file:///d:/classphere/apps/api/src/modules/auth/auth.controller.ts)  
`POST /api/v1/auth/signup` is public and uses `.upsert()` with `onConflict: "id"`. An attacker can overwrite any user's `name` and `email` by sending their user ID.  
**Fix:** Use `.insert()` instead of `.upsert()`, or require JWT verification that the caller's ID matches.

#### SEC-2: Internal API Key Grants Full Superadmin on ALL Routes
[auth.middleware.ts](file:///d:/classphere/apps/api/src/middleware/auth.middleware.ts)  
The `authenticate` middleware checks for `x-api-key` and grants `role: "super_admin"` to the entire API. The internal key should only work on `/internal` routes.  
**Fix:** Remove the API key bypass from `authenticate`. Keep it solely in `internalAuth.middleware.ts`.

#### SEC-3: DPP Questions Endpoint Leaks Correct Answers to Students
[dpps.controller.ts](file:///d:/classphere/apps/api/src/modules/dpps/dpps.controller.ts) (line 296)  
`getDPPQuestions` selects `correct_answer` and `explanation` and sends them to students **before** they submit. Students can inspect the network response and cheat.  
**Fix:** Strip `correct_answer` and `explanation` from the response when `role === "student"`.

#### SEC-4: 7 Batch Handlers Missing Tenant Isolation
[institutes.controller.ts](file:///d:/classphere/apps/api/src/modules/institutes/institutes.controller.ts)  
`getBatch`, `updateBatch`, `deactivateBatch`, `addStudentToBatch`, `removeStudentFromBatch`, `addTeacherToBatch`, `generateBatchInvite` — none verify that the batch belongs to the requesting admin's institute. Admin A can manipulate Admin B's batches.  
**Fix:** Add `batch.institute_id === req.user.institute_id` check in every handler.

#### SEC-5: XSS via CSS Injection in Tenant Layout
[layout.tsx](file:///d:/classphere/apps/web/src/app/%5Bdomain%5D/layout.tsx) (line 46)  
`tenantConfig.primaryColor` is injected directly into a `<style>` tag via `dangerouslySetInnerHTML`. A malicious tenant could store CSS that exfiltrates data.  
**Fix:** Validate that `primaryColor` matches `/^#[0-9a-fA-F]{3,8}$/`.

---

### Data Integrity

#### DATA-1: Race Condition — Double DPP Submission
[dpps.controller.ts](file:///d:/classphere/apps/api/src/modules/dpps/dpps.controller.ts) (lines 351-366)  
Read-then-check-then-write pattern. Two concurrent requests can both read `status === "pending"`, both pass the guard, and both score+award XP — **doubling the student's score and XP**.  
**Fix:** Use `.update({ status: "submitted" }).match({ id: assignment.id, status: "pending" })` so only one succeeds.

#### DATA-2: Race Condition — Double Attempt Submission
[attempts.controller.ts](file:///d:/classphere/apps/api/src/modules/attempts/attempts.controller.ts) (lines 325-340)  
Same read-then-check-then-write pattern. Two concurrent requests = double scoring.

#### DATA-3: Race Condition — Lost Updates on `student_stats`
[dpps.controller.ts](file:///d:/classphere/apps/api/src/modules/dpps/dpps.controller.ts) (lines 438-458)  
Both `submitDPP` and `submitAttempt` do read-then-compute-then-write on `student_stats.xp`. Two concurrent submissions silently lose one update.  
**Fix:** Use atomic increment via Supabase RPC: `UPDATE student_stats SET xp = xp + $1`.

---

### Analysis Engine Crashes

#### ENGINE-1: Missing Question → Empty Object Contaminates All Analysis
[db.service.ts](file:///d:/classphere/apps/api/src/modules/analysis-engine/services/db.service.ts) (line 93)  
If a `question_id` in `attempt_answers` doesn't exist in the `questions` table, the answer gets `question: {}`. Every downstream function then produces `"undefined"` buckets in topic accuracy, error patterns, and narratives — silently corrupting the entire report.  
**Fix:** Filter out answers with missing questions and log a warning.

#### ENGINE-2: Scoring Mutates Input Data → Wrong Downstream Classification
[jee-scoring.service.ts](file:///d:/classphere/apps/api/src/modules/analysis-engine/services/jee/jee-scoring.service.ts) (line 46)  
When the 6th+ integer answer is encountered, the scoring code sets `ans.selected_answer = null` and `ans.is_correct = false` **on the original object**. Downstream, the mistake classifier and skip analyzer see these as "skipped" questions instead of "attempted but not scored."  
**Fix:** Clone the answer or use a separate scoring structure — never mutate inputs.

---

### Frontend Architecture

#### FE-1: Client-Side Routes Don't Account for `[domain]` Prefix
Found in: auth-context, DPP create page, test page, results page, sidebar  
All `router.push("/dashboard")` calls navigate to bare paths. Under `[domain]` routing (e.g., `allen.classphere.com`), client-side navigation doesn't go through Edge Middleware — so these navigate to `/dashboard` (404) instead of `/allen/dashboard`.  
**Fix:** Create a `useDomainRouter()` hook that reads the current domain from TenantContext and prepends it.

#### FE-2: `next.config.ts` Hardcodes `localhost:3001` for API Proxy
[next.config.ts](file:///d:/classphere/apps/web/next.config.ts) (line 12)  
`destination: "http://localhost:3001/api/:path*"` — in production, this proxy points to localhost, which doesn't exist.  
**Fix:** Use `process.env.BACKEND_URL ?? "http://localhost:3001"`.

#### FE-3: Student Dashboard API Paths Missing `/api/v1` Prefix
[dashboard/page.tsx](file:///d:/classphere/apps/web/src/app/%5Bdomain%5D/dashboard/page.tsx) (lines 37-38)  
`apiClient.get("/dashboard/student")` resolves to `http://localhost:3001/dashboard/student` instead of `http://localhost:3001/api/v1/dashboard/student`. These calls **always 404**.  
**Fix:** Change to `/api/v1/dashboard/student`.

#### FE-4: Results Page Bypasses Auth — Uses Raw `fetch()` Instead of `apiClient`
[results/[id]/page.tsx](file:///d:/classphere/apps/web/src/app/%5Bdomain%5D/results/%5Bid%5D/page.tsx) (line 68)  
Uses raw `fetch()` without `Authorization` header. No `x-session-token` header = bypasses one-device enforcement.

#### FE-5: No `error.tsx` Boundaries Anywhere
Zero `error.tsx` files in the entire `src/app/` tree. Any unhandled exception crashes the page with Next.js's raw error screen.

#### FE-6: Sidebar Role Override via `?role=` Query Param
[Sidebar.tsx](file:///d:/classphere/apps/web/src/components/layout/Sidebar.tsx) (line 41)  
`searchParams.get("role")` lets any user see teacher/admin/superadmin navigation by appending `?role=super_admin` to the URL.

---

## 🟠 HIGH Issues — Fix Before Launch

| # | Area | Issue | File |
|---|---|---|---|
| H1 | Auth | No ownership check on `publishTest` / `deleteTest` — any teacher can publish/delete any test | tests.controller.ts |
| H2 | Auth | Tenant check skippable by omitting `institute_slug` from login request | auth.controller.ts |
| H3 | Auth | DOB as password (only ~36,500 possible values) + no per-account lockout | auth.controller.ts |
| H4 | Auth | Institute stats/reports missing tenant ownership check | institutes.controller.ts |
| H5 | Auth | Public config endpoint may leak all `institute_settings` columns | institutes.controller.ts |
| H6 | Scoring | DPP scoring doesn't handle multi-select or numerical question types | dpps.controller.ts |
| H7 | Scoring | Inconsistent marking scheme usage between DPP and Attempt flows | dpps/attempts controllers |
| H8 | Perf | `getExamsMeta` fetches ALL questions per exam to extract distinct subjects/chapters/topics | questions.controller.ts |
| H9 | Perf | `getMyRanks` fires 2 DB queries per batch (N+1 pattern) | rankings.controller.ts |
| H10 | Perf | Leaderboard upsert in DPP submission uses a `for...of` loop (N+1) | dpps.controller.ts |
| H11 | Engine | Division by zero in `detectExcessiveSkipping` if answers array is empty | jee-error-patterns.ts |
| H12 | Engine | Double DB fetch — orchestrator fetches attempt, then sub-pipeline fetches again | analysis.service.ts |
| H13 | Engine | No sign validation on `marking_scheme.incorrect` — positive value = wrong scoring | jee-scoring.service.ts |
| H14 | FE | DPP create page has cascading `useEffect` re-renders (3 unnecessary per batch change) | dpps/create/page.tsx |
| H15 | FE | Results page polls forever with no max retry if analysis never completes | results/[id]/page.tsx |
| H16 | FE | `setTimeout` in results page not cleaned up on unmount (memory leak) | results/[id]/page.tsx |
| H17 | FE | 131 lines of dead `DEMO_QUESTIONS` code shipped to client bundle | test/[id]/page.tsx |

---

## 🟡 MEDIUM Issues — Fix After Launch

| # | Area | Issue |
|---|---|---|
| M1 | API | Raw `err.message` leaked to clients in 15+ catch blocks |
| M2 | API | Metadata object `{ is_meta: true }` pollutes `attempt_answers` array |
| M3 | API | `deleteDPP` returns success even if DPP doesn't exist |
| M4 | API | Race condition on invite code `used_count` increment |
| M5 | API | `createDPP` non-atomic — partially created DPPs on insert failure |
| M6 | API | No validation of question ID existence in `createDPP` |
| M7 | API | Anonymous attempts created for legacy PYQ flow (`student_id = "anonymous"`) |
| M8 | API | `createTest` uses biased shuffle (`Math.random() - 0.5`) instead of Fisher-Yates |
| M9 | API | Rank calculation assumes no ties — students with identical scores get different ranks |
| M10 | API | Teacher dashboard: `upcomingTestsCount`, `pendingDPPsCount`, `completedDPPsCount` always 0 |
| M11 | API | `getBatchAnalytics` sorts `studentList` in-place twice, corrupting final order |
| M12 | API | `getBatchAnalytics` queries wrong column name (`text` instead of `question_text`) |
| M13 | API | PYQ controller uses raw REST with string-interpolated query params (injection risk) |
| M14 | API | Console.log leaks sensitive data (user IDs, temp passwords, shadow emails) |
| M15 | API | Subdomain slug collision not handled (two institutes → same slug) |
| M16 | API | `supabaseAdmin` vs `supabaseDB` used inconsistently across controllers |
| M17 | API | Internal endpoints (`computeRankings`, `resetStreaks`, `sendWeeklyReports`) are stubs |
| M18 | Engine | Swapped `chapter`/`subject` field semantics in `TopicStat` |
| M19 | Engine | NEET countdown only triggers for `"neet"`, not `"neet-ug"` or `"neet-omr"` |
| M20 | Engine | Race condition on longitudinal profile read-modify-write |
| M21 | Engine | SSC scoring ignores per-attempt marking scheme |
| M22 | Engine | `.in()` query with large arrays may exceed Supabase URL limits |
| M23 | Engine | NEET default duration is 10800s (3h) but should be 12000s (3h20m) |
| M24 | FE | `api.client.ts` — `return new Promise(() => {})` creates permanently pending promise |
| M25 | FE | No request timeout or retry logic in API client |
| M26 | FE | Mobile nav drawer doesn't trap focus (accessibility) |
| M27 | FE | Nav arrays duplicated between Sidebar.tsx and MobileNav.tsx (~140 lines) |
| M28 | FE | `useEffect` in auth-context has `pathname` as dependency — re-subscribes on every route change |
| M29 | FE | Student nav Dashboard `href` is `"/"` instead of `"/dashboard"` |
| M30 | FE | `alert()` used for error feedback in DPP create page |
| M31 | FE | No error states displayed on fetch failure (empty dropdowns, no message) |

---

## Top 5 Fixes to Prioritize

These are the issues that will **immediately cause harm** in production:

```
┌───┬───────────────────────────────────────────────────┬────────────┐
│ # │ Issue                                             │ Time Est.  │
├───┼───────────────────────────────────────────────────┼────────────┤
│ 1 │ SEC-3: Strip correct_answer from DPP response     │ 10 min     │
│   │ (students can cheat RIGHT NOW)                    │            │
├───┼───────────────────────────────────────────────────┼────────────┤
│ 2 │ DATA-1/2: Atomic double-submission guard           │ 15 min     │
│   │ (double XP, double scoring)                       │            │
├───┼───────────────────────────────────────────────────┼────────────┤
│ 3 │ SEC-2: Remove internal API key from authenticate  │ 5 min      │
│   │ (any route exploitable as superadmin)             │            │
├───┼───────────────────────────────────────────────────┼────────────┤
│ 4 │ SEC-4: Add tenant isolation to batch handlers      │ 30 min     │
│   │ (cross-institute data manipulation)               │            │
├───┼───────────────────────────────────────────────────┼────────────┤
│ 5 │ FE-2/3: Fix hardcoded localhost + missing API      │ 10 min     │
│   │ prefix (dashboard completely broken in prod)       │            │
└───┴───────────────────────────────────────────────────┴────────────┘
```

> [!IMPORTANT]
> These 5 fixes total approximately **70 minutes of work** and would eliminate the most dangerous security and data-integrity vulnerabilities. I can begin implementing them immediately if you approve.
