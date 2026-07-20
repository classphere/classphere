# Classphere — Production Readiness Re-Audit Report

**Date:** July 15, 2026 (Round 2)  
**Scope:** Full-stack — `apps/api`, `apps/web`, `packages/types`, Analysis Engine, Workers  
**Auditors:** 3 parallel deep-dive agents covering Security/Auth, Frontend Architecture, and Analysis Engine/Business Logic  

---

## 🚨 Verdict: NOT PRODUCTION READY

> [!CAUTION]
> The application has **5 unfixed critical vulnerabilities** and **1 new runtime crash** that must be resolved before any public deployment. Significant progress has been made since the first audit (14 issues fixed), but 17 original issues remain unfixed and 15 new issues were discovered.

---

## Scorecard Overview

| Category | Fixed ✅ | Partially Fixed ⚠️ | Not Fixed ❌ | New Issues 🆕 |
|---|---|---|---|---|
| Security (SEC) | 2 | 2 | 1 | 7 |
| Data Integrity (DATA) | 2 | 0 | 1 | 1 |
| Analysis Engine (ENGINE) | 3 | 0 | 3 | 3 |
| Frontend (FE/H/M) | 7 | 2 | 6 | 7 |
| **Totals** | **14** | **4** | **11** | **18** |

---

## 🔴 CRITICAL — Must Fix Before Any Deployment (6 Issues)

### 1. SEC-2: Internal API Key Grants Superadmin on ALL Routes ❌ NOT FIXED
[auth.middleware.ts](file:///d:/classphere/apps/api/src/middleware/auth.middleware.ts#L30-L41)  

The `authenticate` middleware still checks `x-api-key` and grants `role: "super_admin"` on **every route** — questions, tests, attempts, batches, DPPs, rankings, dashboard — everything. If this key leaks (it's shared with GCP Cloud Scheduler and exposed in `.env`), full platform takeover is possible.

```typescript
// Line 30-41 — still present
if (internalKey && typeof providedKey === "string") {
  if (crypto.timingSafeEqual(providedBuffer, expectedBuffer)) {
    req.user = { id: "superadmin", role: "super_admin", ... };
    next(); return;
  }
}
```

**Fix:** Remove the API key bypass from `authenticate`. Keep it solely in `internalAuth.middleware.ts`.

---

### 2. NEW-SEC-1: Analysis Routes Missing Authentication 🆕
[analysis.routes.ts](file:///d:/classphere/apps/api/src/modules/analysis-engine/analysis.routes.ts#L16-L17)

```typescript
router.get("/:attempt_id", getAnalysis);              // ← NO auth
router.post("/:attempt_id/regenerate", regenerateAnalysis); // ← NO auth
```

Anyone can fetch analysis for ANY attempt (exposing scores, AI analysis, question-level data) and trigger expensive reprocessing — all without authentication.

**Fix:** Add `authenticate` middleware to both routes.

---

### 3. NEW-SEC-2: PYQ Routes Fully Public — Leak Correct Answers 🆕
[pyqs.routes.ts](file:///d:/classphere/apps/api/src/modules/pyqs/pyqs.routes.ts) + [pyqs.controller.ts](file:///d:/classphere/apps/api/src/modules/pyqs/pyqs.controller.ts#L75)

Zero auth middleware on PYQ routes. The `getPYQQuestions` endpoint selects `correct_answer, explanation` and returns them to **unauthenticated users**. Anyone on the internet can see correct answers.

**Fix:** Either add `authenticate` or strip `correct_answer`/`explanation` from the response.

---

### 4. SEC-3: Tests Controller Still Leaks Correct Answers ⚠️ PARTIALLY FIXED
[tests.controller.ts](file:///d:/classphere/apps/api/src/modules/tests/tests.controller.ts#L50)

Fixed in DPPs (good), but `getTest` still selects `correct_answer` for **all users** including students. Any authenticated student can see correct answers during an active test by inspecting the network response.

**Fix:** Strip `correct_answer` and `explanation` from the response when user role is `student`.

---

### 5. NEW-1: Sidebar Crash — Undefined `p()` Function 🆕
[Sidebar.tsx](file:///d:/classphere/apps/web/src/components/layout/Sidebar.tsx#L232)

```tsx
href={p("/profile")}  // ← p() is NOT defined anywhere in this file
```

This causes a `ReferenceError` crash for **every user** who sees the sidebar (i.e., every logged-in user). This is a leftover from a refactor where a path-prefix helper was removed but this call site was missed.

**Fix:** Replace `p("/profile")` with the correct path string (e.g., `/${domain}/profile` or use the nav item href pattern from the rest of the sidebar).

---

### 6. NEW-SEC-3: Signup Allows Arbitrary User ID Injection 🆕
[auth.controller.ts](file:///d:/classphere/apps/api/src/modules/auth/auth.controller.ts#L263)

The public `POST /api/v1/auth/signup` endpoint accepts `id` directly from the request body and inserts it into the `users` table. An attacker can pre-create a profile for any UUID, potentially hijacking a legitimate user's identity when they first log in.

**Fix:** Never accept `id` from request body. Use the authenticated Supabase user's ID.

---

## 🟠 HIGH — Fix Before Launch (9 Issues)

| # | Issue | Status | File |
|---|---|---|---|
| DATA-3 | Lost XP updates — read-modify-write race on `student_stats` | ❌ NOT FIXED | [dpps.controller.ts](file:///d:/classphere/apps/api/src/modules/dpps/dpps.controller.ts#L463-L483) |
| H6 | Multi-select (MSQ) and numerical question scoring completely broken in DPPs | ❌ NOT FIXED | [dpps.controller.ts](file:///d:/classphere/apps/api/src/modules/dpps/dpps.controller.ts#L407-L412) |
| H9 | N+1 queries in rankings (2 queries per batch) | ❌ NOT FIXED | [rankings.controller.ts](file:///d:/classphere/apps/api/src/modules/rankings/rankings.controller.ts#L39-L84) |
| H15 | Results page polls every 2s forever with no max retry | ❌ NOT FIXED | [student/results/page.tsx](file:///d:/classphere/apps/web/src/app/[domain]/student/results/[id]/page.tsx#L68-L86) |
| H16 | setTimeout not cleaned up on unmount (memory leak) | ❌ NOT FIXED | Same file as H15 |
| ENGINE-2 | Scoring function mutates input answers — corrupts downstream classifiers | ❌ NOT FIXED | [jee-scoring.service.ts](file:///d:/classphere/apps/api/src/modules/analysis-engine/services/jee/jee-scoring.service.ts#L46-L47) |
| H13 | No sign validation on `marking_scheme.incorrect` — positive value = awards marks for wrong answers | ❌ NOT FIXED | [jee-scoring.service.ts](file:///d:/classphere/apps/api/src/modules/analysis-engine/services/jee/jee-scoring.service.ts#L62) |
| NEW-W1 | Worker double-writes analysis result (upserted inside pipeline AND in worker callback) | 🆕 HIGH | [analysis.worker.ts](file:///d:/classphere/apps/api/src/workers/analysis.worker.ts#L15-L16) |
| NEW-SEC-5 | `POST /api/v1/tests` missing `requireRole` — any student can create tests | 🆕 HIGH | [tests.routes.ts](file:///d:/classphere/apps/api/src/modules/tests/tests.routes.ts#L19) |

---

## 🟡 MEDIUM — Fix After Launch (17 Issues)

| # | Issue | Status |
|---|---|---|
| M13 | PostgREST injection in PYQ controller via string interpolation | ❌ NOT FIXED |
| M18 | Swapped chapter/subject field names in TopicStat — semantically wrong | ❌ NOT FIXED |
| M20 | Race condition in longitudinal profile read-merge-write (no locking) | ❌ NOT FIXED |
| M24 | `return new Promise(() => {})` in api.client.ts — permanently pending promise | ❌ NOT FIXED |
| M25 | No request timeout or retry logic in API client | ❌ NOT FIXED |
| M28 | Auth context re-subscribes to `onAuthStateChange` on every route change | ❌ NOT FIXED |
| H17 | 110 lines of dead `DEMO_QUESTIONS` code shipped to client bundle | ❌ NOT FIXED |
| M11 | getBatchAnalytics queries wrong column name (`error_topics` vs `topic_history`) | ❌ NOT FIXED |
| M12 | getBatchAnalytics NaN when all attempts have `max_score === 0` | ❌ NOT FIXED |
| NEW-W2 | No job deduplication in analysis queue — duplicate attempts processed twice | 🆕 |
| NEW-W3 | Worker `concurrency: 5` amplifies race condition on error profiles (M20) | 🆕 |
| NEW-E2 | No error handling on partial analysis pipeline failures | 🆕 |
| NEW-SEC-6 | `getTest` leaks correct_answer to all authenticated users | 🆕 |
| NEW-E8 | Missing authorization check on `getDPPAnalytics` | 🆕 |
| NEW-6 | Login page makes direct `fetch()` bypassing `apiClient` error handling | 🆕 |
| NEW-DATA-1 | Invite `used_count` increment is a read-modify-write race | 🆕 |
| SEC-1 | Role escalation via `app_metadata.role` on upsert (partially fixed) | ⚠️ |

---

## 🟢 LOW (11 Issues)

| # | Issue |
|---|---|
| H7 | Inconsistent marking scheme fallback (hardcoded JEE-Main `{4, -1, 0}`) |
| H14 | Cascading useEffect in DPP create page (3 re-renders per change) |
| NEW-2 | Unused imports in test page (~6 icons, MarkdownRenderer) |
| NEW-3 | Unused imports in results page (~8 icons) |
| NEW-4 | Unused `RiBuilding4Line` import in Sidebar |
| NEW-5 | Unused `useMemo` and `RiCloseLine` in DPP create page |
| NEW-7 | Login page no loading state cleanup on success path |
| NEW-E7 | PostgREST filter injection in institutes `.or()` query |
| NEW-S1 | Support controller: no userId guard on unauthenticated path |
| NEW-S2 | Support controller: no priority enum validation |
| NEW-S3 | Support/tickets: no pagination |

---

## ✅ What Was Fixed (14 Issues)

These issues from the original audit have been properly resolved:

| Issue | Description |
|---|---|
| SEC-4 | Batch tenant isolation — `checkBatchTenant()` added to all 7 handlers |
| SEC-5 | XSS via CSS injection — `primaryColor` validated with strict hex regex |
| DATA-1 | DPP double submission — atomic `.eq("status", "pending")` guard |
| DATA-2 | Attempt double submission — atomic `.eq("status", "in_progress")` guard |
| ENGINE-1 | Missing question → empty object — filtered out with `console.warn` |
| H1 | publishTest/deleteTest ownership — scoped by `created_by` |
| H8 | Fetches ALL questions — paginated with max 100 per page |
| H11 | Division by zero in error patterns — all paths guarded |
| H12 | Double DB fetch in analysis orchestrator — lightweight routing query |
| M10 | Teacher dashboard counters always 0 — now properly calculated |
| FE-1 | Routes don't account for [domain] prefix — domain-aware routing |
| FE-3 | Missing /api/v1 prefix — page restructured as redirect stub |
| FE-4 | Results page bypasses auth — now uses `apiClient` with session token |
| FE-5 | No error.tsx boundaries — 3 error boundaries added (root, global, domain) |
| M27 | Duplicated nav arrays — cleaned up, 3 distinct arrays |

---

## Production Readiness Summary

```
┌────────────────────────────────────────────────────────────────────┐
│                    PRODUCTION READINESS GATE                       │
├──────────────────────┬─────────────────────────────────────────────┤
│ Security             │ ❌ FAIL — 5 critical/high vulns open       │
│ Data Integrity       │ ⚠️ WARN — race conditions remain           │
│ Analysis Engine      │ ⚠️ WARN — input mutation, no sign check    │
│ Frontend Stability   │ ❌ FAIL — runtime crash in Sidebar         │
│ Error Handling       │ ⚠️ WARN — no retry, infinite polling       │
│ Performance          │ ⚠️ WARN — N+1 queries in rankings          │
│ Code Quality         │ ⚠️ WARN — dead code, unused imports        │
├──────────────────────┼─────────────────────────────────────────────┤
│ OVERALL VERDICT      │ ❌ NOT PRODUCTION READY                    │
└──────────────────────┴─────────────────────────────────────────────┘
```

## Minimum Viable Fix List (Ship Blocker)

These **6 fixes** are the absolute minimum to ship. Estimated total: **~90 minutes**.

| Priority | Issue | Fix | Est. |
|---|---|---|---|
| 1 | **Sidebar crash** (NEW-1) | Replace `p("/profile")` with correct href | 2 min |
| 2 | **SEC-2: API key bypass** | Remove `x-api-key` check from `authenticate` | 5 min |
| 3 | **Analysis routes no auth** (NEW-SEC-1) | Add `authenticate` to both routes | 2 min |
| 4 | **PYQ answer leak** (NEW-SEC-2) | Add auth or strip `correct_answer` | 10 min |
| 5 | **Tests answer leak** (SEC-3) | Strip `correct_answer` for students in `getTest` | 10 min |
| 6 | **Signup ID injection** (NEW-SEC-3) | Don't accept `id` from body | 5 min |

> [!IMPORTANT]
> After these 6 fixes, the remaining HIGH issues (DATA-3 race condition, MSQ scoring, N+1 queries, engine mutation) are serious but won't cause immediate security breaches or crashes. They should be fixed before scaling to real users.
