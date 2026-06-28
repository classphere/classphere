# ExamPrep Platform — Architecture Documentation V2

> **Status:** Living document. Last updated: June 2026  
> **Stack:** Next.js 16 (Turbopack) · Express/TypeScript · Supabase (Postgres + Auth) · Turborepo monorepo

---

## 1. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        MONOREPO (Turborepo)                     │
│                                                                 │
│  ┌──────────────────┐        ┌──────────────────────────────┐   │
│  │   apps/web        │        │         apps/api             │   │
│  │   Next.js 16      │◄──────►│  Express + TypeScript        │   │
│  │   (App Router)    │  REST  │  /api/v1/*                   │   │
│  └──────────────────┘        └──────────┬───────────────────┘   │
│                                         │                       │
│  ┌──────────────────┐        ┌──────────▼───────────────────┐   │
│  │  packages/types   │        │  modules/analysis-engine     │   │
│  │  (shared types)   │        │  (JEE/NEET + SSC isolated)   │   │
│  └──────────────────┘        └──────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────▼──────────┐
                    │  Supabase (Cloud)   │
                    │  PostgreSQL + Auth  │
                    │  + Storage          │
                    └────────────────────┘
```

---

## 2. Current State: What's Good

### ✅ Things Already Done Right

| Area | Status | Notes |
|---|---|---|
| Monorepo with Turborepo | ✅ Solid | `apps/`, `packages/` correctly separated |
| Role-Based Access Control | ✅ Solid | `rbac.middleware.ts` with `requireRole()` factory |
| Analysis Engine Isolation | ✅ Solid | SSC pipeline completely separate from JEE/NEET |
| Shared Types Package | ✅ Good | `packages/types` consumed by both api and web |
| Auth Middleware | ✅ Good | Supabase JWT verification in `auth.middleware.ts` |
| Internal Cron Routes | ✅ Good | Separate `INTERNAL_API_KEY` protection |
| Exam Code Router | ✅ Good | Single dispatch point in `analysis.service.ts` |

---

## 3. Current State: What Needs Work

### ❌ Critical Issues Found in Audit

#### 3.1 `attempts.controller.ts` imports from `pyqs.controller.ts`
```typescript
// BAD — controller importing from another controller
import { PYQ_REGISTRY, ROOT } from "./pyqs.controller";
```
**Problem:** Controllers should never import from each other. This creates tight coupling. `PYQ_REGISTRY` and `ROOT` should live in a shared service or a `pyqs.service.ts`.

#### 3.2 `db.mock.ts` is the real DB layer
The analysis engine uses `db.mock.ts` with an in-memory `Map` as the database. This works for demos but **cannot survive a server restart or scale horizontally**.

#### 3.3 All controllers live in a flat `controllers/` folder
`superadmin.controller.ts`, `institutes.controller.ts`, `questions.controller.ts`, etc. are all siblings in one folder. As the app grows, this becomes hard to navigate and reason about.

#### 3.4 No service layer between controllers and Supabase
Controllers call `fetch()` to Supabase directly. If the DB ever changes or you want to unit-test, you'd have to mock raw HTTP calls.

#### 3.5 Only one module folder (`modules/analysis-engine`)
The analysis engine is correctly modularized. Nothing else is. The `tests`, `questions`, `auth`, `rankings` domains are all flat files in `controllers/`.

#### 3.6 Web `lib/` folder has only `mock-data.ts`
There are no API client utilities, no React Query hooks, no type-safe fetch wrappers. Every page that needs data will re-invent the wheel.

---

## 4. Target Architecture

### 4.1 API — Full Modular Structure

```
apps/api/src/
├── index.ts                          # Express bootstrap ONLY
├── middleware/
│   ├── auth.middleware.ts            ✅ exists
│   ├── rbac.middleware.ts            ✅ exists
│   ├── internalAuth.middleware.ts    ✅ exists
│   └── errorHandler.middleware.ts    ← TODO: centralize error handling
│
├── modules/                          # One folder per domain
│   │
│   ├── auth/
│   │   ├── auth.controller.ts
│   │   ├── auth.routes.ts
│   │   └── auth.service.ts           ← TODO: extract Supabase calls here
│   │
│   ├── questions/
│   │   ├── questions.controller.ts
│   │   ├── questions.routes.ts
│   │   ├── questions.service.ts      ← TODO
│   │   └── questions.types.ts        ← TODO (local types if needed)
│   │
│   ├── tests/
│   │   ├── tests.controller.ts
│   │   ├── tests.routes.ts
│   │   └── tests.service.ts
│   │
│   ├── attempts/
│   │   ├── attempts.controller.ts
│   │   ├── attempts.routes.ts
│   │   └── attempts.service.ts       ← TODO: move PYQ logic here
│   │
│   ├── rankings/
│   │   ├── rankings.controller.ts
│   │   ├── rankings.routes.ts
│   │   └── rankings.service.ts
│   │
│   ├── institutes/
│   │   ├── institutes.controller.ts
│   │   ├── institutes.routes.ts
│   │   ├── institutes.service.ts
│   │   └── batches/
│   │       ├── batches.controller.ts
│   │       ├── batches.routes.ts
│   │       └── batches.service.ts
│   │
│   ├── superadmin/
│   │   ├── superadmin.controller.ts
│   │   └── superadmin.routes.ts
│   │
│   └── analysis-engine/              ✅ Already modular — keep expanding
│       ├── analysis.controller.ts
│       ├── analysis.routes.ts
│       └── services/
│           ├── analysis.service.ts   # Top-level router
│           ├── scoring.service.ts
│           ├── db.service.ts         ← TODO: replace db.mock.ts
│           ├── jee-neet/             ← TODO: create this sub-folder
│           │   ├── scoring.ts
│           │   ├── mistake-classifier.ts
│           │   ├── behavioral-analysis.ts
│           │   ├── topic-accuracy.ts
│           │   ├── error-patterns.ts
│           │   ├── skip-analysis.ts
│           │   ├── narrative-summary.ts
│           │   ├── study-plan.ts
│           │   ├── booster.ts
│           │   ├── longitudinal-profile.ts
│           │   └── attempt-strategy.ts
│           └── ssc/                  ✅ Already isolated
│               ├── ssc-analysis.service.ts
│               ├── ssc-scoring.service.ts
│               ├── ssc-mistake-classifier.ts
│               ├── ssc-behavioral-analysis.ts
│               ├── ssc-topic-accuracy.ts
│               └── ssc-narrative-summary.ts
│
└── shared/
    ├── supabase.ts                   ← TODO: single Supabase client
    └── logger.ts                     ← TODO: structured logging
```

### 4.2 Web — Role-Scoped Route Structure

The web app already has the right skeleton. The key improvement is adding a proper `lib/` layer.

```
apps/web/src/
├── app/
│   ├── (student)/                    # Student routes (implicit layout group)
│   │   ├── page.tsx                  # Dashboard
│   │   ├── tests/
│   │   ├── history/
│   │   ├── analytics/
│   │   ├── leaderboard/
│   │   ├── doubts/
│   │   └── assignments/
│   │
│   ├── teacher/                      ✅ Exists
│   │   ├── page.tsx
│   │   ├── analytics/
│   │   ├── doubts/
│   │   └── dpps/
│   │
│   ├── institute/                    ✅ Exists
│   │   ├── page.tsx
│   │   ├── batches/
│   │   ├── faculty/
│   │   ├── students/
│   │   ├── reports/
│   │   ├── billing/
│   │   └── support/
│   │
│   ├── superadmin/                   ✅ Exists
│   │   ├── page.tsx
│   │   ├── analytics/
│   │   ├── revenue/
│   │   ├── questions/
│   │   ├── institutes/
│   │   ├── configuration/
│   │   └── support/
│   │
│   ├── test/[id]/                    # Test-taking engine (full-screen)
│   ├── results/[attemptId]/          # Result + analysis view
│   ├── settings/                     ✅ Role-aware
│   └── help/                         ✅ Role-aware
│
├── components/
│   ├── layout/
│   │   ├── Sidebar.tsx               ✅ Role-aware
│   │   ├── Navbar.tsx
│   │   └── AppShell.tsx
│   ├── shared/                       # Reusable across all roles
│   │   ├── StatCard.tsx              ← TODO: extract from pages
│   │   ├── DataTable.tsx             ← TODO: extract from pages
│   │   ├── Toggle.tsx                ← TODO: extract from pages
│   │   ├── Badge.tsx                 ← TODO
│   │   └── Modal.tsx                 ← TODO
│   └── analysis/                     ← TODO: chart components
│       ├── FatigueCurve.tsx
│       ├── TopicRadar.tsx
│       └── SubjectBreakdown.tsx
│
└── lib/
    ├── mock-data.ts                  ✅ Exists (replace with real API calls)
    ├── api.client.ts                 ← TODO: base fetch wrapper
    ├── hooks/                        ← TODO: React Query hooks
    │   ├── useAttempt.ts
    │   ├── useAnalysis.ts
    │   └── useInstitute.ts
    └── constants/
        ├── exam-codes.ts             ← TODO: centralize exam config
        └── roles.ts                  ← TODO
```

---

## 5. Analysis Engine — Detailed Breakdown

This is the **core intellectual property** of the platform. The current structure is already strong — the key improvement is creating explicit `jee-neet/` and `ssc/` sub-folders so each exam type is fully self-contained.

```
analysis.service.ts  (ROUTER — exam_code drives pipeline selection)
    │
    ├── "ssc-cgl" | "ssc-chsl" | "ssc-mts" | "ssc-gd"
    │       └──► ssc/ssc-analysis.service.ts
    │               ├── ssc-scoring     (+2/-0.5 or +1/0 by variant)
    │               ├── ssc-mistake-classifier
    │               ├── ssc-behavioral-analysis  (no timing heuristics for skips)
    │               ├── ssc-topic-accuracy       (weak threshold ≥2 Qs, GK/GA grouping)
    │               └── ssc-narrative-summary
    │
    ├── "neet" | "neet-omr"
    │       └──► neet/neet-analysis.service.ts
    │               ├── neet-scoring     (+4/-1 pure MCQ, 720 marks total)
    │               ├── neet-mistake-classifier  (no integer mis-read type)
    │               ├── neet-behavioral-analysis (Botany/Zoology sub-tracking)
    │               ├── neet-topic-accuracy      (Biology = Botany + Zoology split)
    │               └── neet-narrative-summary
    │
    └── "jee-main" | "jee-advanced" (default)
            └──► jee/jee-analysis.service.ts
                    ├── jee-scoring     (+4/-1 MCQ, +4/0 integer, partial for Advanced)
                    ├── jee-mistake-classifier  (integer mis-read, multi-correct risk)
                    ├── jee-behavioral-analysis (subject movement, panic cascade)
                    ├── jee-topic-accuracy      (weak threshold ≥3 Qs)
                    └── jee-narrative-summary
```

### Why JEE and NEET Must Be Separate (Not Just JEE-vs-SSC)

| Dimension | JEE Main / Advanced | NEET UG |
|---|---|---|
| Question types | MCQ + Integer (+ multi-correct in Advanced) | Pure MCQ only |
| Subjects | Physics, Chemistry, **Maths** | Physics, Chemistry, **Biology (Botany + Zoology)** |
| Total marks | 300 (Main) / 360 (Advanced) | 720 |
| Marking | +4/−1 MCQ, +4/0 integer | +4/−1 strict |
| Skip classification | Integer Qs have a separate skip type (never-attempted vs given-up) | Low skip rate; no integer complexity |
| Weak topic threshold | ≥3 wrong Qs per topic | Can be ≥2 for Biology due to dense chapter coverage |
| Attempt strategy | Integer-risk model needed | No integer; strategy is simpler |
| Subject movement analysis | Physics→Maths→Chemistry jumps | Botany↔Zoology switching matters |
| Booster generation | Maths-heavy recovery plans | Biology recovery = Botany + Zoology targeted |

### Future Exam Registry Pattern (extensible for CUET, GATE, CAT)

```typescript
// analysis.registry.ts
const PIPELINE_REGISTRY: Record<string, ExamPipeline> = {
  "jee-main":     JeePipeline,
  "jee-advanced": JeePipeline,   // same pipeline, Advanced flag passed internally
  "neet":         NeetPipeline,
  "neet-omr":     NeetPipeline,
  "ssc-cgl":      SscPipeline,
  "ssc-chsl":     SscPipeline,
  "ssc-mts":      SscPipeline,
  "ssc-gd":       SscPipeline,
  // Future:
  "cuet":         CuetPipeline,
  "gate-cs":      GatePipeline,
};

// analysis.service.ts — zero changes needed to add new exams
export async function analyzeAttempt(attemptId: string, hasTimingData = true) {
  const { attempt } = await db.getAttemptWithAnswers(attemptId);
  const Pipeline = PIPELINE_REGISTRY[attempt.exam_code] ?? JeePipeline;
  return Pipeline.analyze(attemptId, hasTimingData);
}
```

---

## 6. Data Flow: Test Submission → Analysis → Results

```
Student submits test
        │
        ▼
POST /api/v1/attempts/:id/submit
        │
        ├── Validate answers payload
        ├── Fetch questions from DB / PYQ registry
        ├── Build AttemptAnswer[] with is_correct + marks_awarded
        ├── Store attempt in DB (status = 'submitted')
        │
        ▼
analyzeAttempt(attemptId)          ← synchronous (demo) or async (production)
        │
        ├── Exam router: SSC?  → ssc/ssc-analysis.service.ts
        │                NEET? → neet/neet-analysis.service.ts
        │                JEE?  → jee/jee-analysis.service.ts  (default)
        │
        ├── Stage 1: Scoring
        ├── Stage 2: Mistake Classification
        ├── Stages 3–6: Topic Accuracy + Error Patterns + Free Marks + Skips (parallel)
        ├── Stage 6.5: Attempt Strategy
        ├── Stage 6.6: Longitudinal Pattern Detection
        ├── Stage 7: Study Plan
        ├── Stage 8: Booster Config
        └── Stage 8.5: Natural Language Narrative
        │
        ▼
Persist: analysis_results + answer_classifications + student_error_profile
        │
        ▼
GET /api/v1/analysis/:attemptId    ← Frontend polls/fetches
        │
        ▼
results/[attemptId] page renders diagnostic dashboard
```

---

## 7. Role & Access Architecture

### 7.1 Role Hierarchy

```
super_admin
    │
    ├── Can manage: all institutes, all users, all questions, config
    │
institute_admin
    │
    ├── Can manage: own institute, own batches, faculty, students, billing
    │
teacher
    │
    ├── Can manage: assigned batches, doubts, DPPs
    │
student
    │
    └── Can access: tests, own history, leaderboard, doubts
```

### 7.2 Route Access Matrix

| Route Prefix | Allowed Roles |
|---|---|
| `/api/v1/auth/*` | Public |
| `/api/v1/pyqs/*` | Public |
| `/api/v1/questions/*` | student, teacher, institute_admin, super_admin |
| `/api/v1/tests/*` | student, teacher, institute_admin |
| `/api/v1/attempts/*` | student |
| `/api/v1/analysis/*` | student, teacher, institute_admin |
| `/api/v1/rankings/*` | student, teacher |
| `/api/v1/batches/*` | teacher, institute_admin |
| `/api/v1/institutes/*` | institute_admin, super_admin |
| `/api/v1/superadmin/*` | super_admin |
| `/api/v1/internal/*` | INTERNAL_API_KEY (cron only) |

---

## 8. Database Schema Overview

```sql
-- Core entities
users          (id, email, name, role, avatar_url)
exams          (id, code, full_name, type)   -- jee-main, ssc-cgl, neet, etc.
institutes     (id, name, owner_id, institute_type, subscription_plan, trial_ends_at)
batches        (id, institute_id, name, exam_id, is_active)
batch_students (batch_id, student_id, joined_at)
batch_teachers (batch_id, teacher_id)

-- Question bank
questions      (id, question_text, subject, chapter, topic, difficulty,
                options, correct_answer, explanation, distractor_map, exam_code)
papers         (id, title, year, shift, exam_id, test_type, duration_min)
paper_questions(paper_id, question_id, position)

-- Test engine
tests          (id, title, type, exam_id, is_institute_test, marking_scheme)
test_batch_assignments (test_id, batch_id, scheduled_start, scheduled_end)
attempts       (id, student_id, test_id, exam_id, batch_id, status, score)
attempt_answers(attempt_id, question_id, selected_answer, is_correct,
                marks_awarded, time_taken_sec, start_timestamp, marked_review)

-- Analysis output
analysis_results     (attempt_id, weak_topics, error_patterns, study_plan,
                      attempt_strategy, longitudinal_flags, narrative, model_used)
student_error_profile(student_id, exam_id, topic, accuracy_history[])

-- B2B
batch_invites  (batch_id, code, max_uses, expires_at, created_by)
```

---

## 9. Immediate Action Items (Priority Order)

### P0 — Fix Now (Bugs / Coupling)

| # | Problem | Fix |
|---|---|---|
| 1 | `attempts.controller.ts` imports from `pyqs.controller.ts` | Create `pyqs.service.ts`, export `PYQ_REGISTRY` and `ROOT` from there |
| 2 | `db.mock.ts` in-memory store used as real DB | Build `db.service.ts` with real Supabase calls for attempts + analysis |
| 3 | Missing TypeScript exports in `pyqs.controller.ts` | `PYQ_REGISTRY` and `ROOT` not exported — currently causes TS errors |

### P1 — Do Next Sprint (Architecture)

| # | Problem | Fix |
|---|---|---|
| 4 | Flat `controllers/` folder | Move each controller into its domain module folder |
| 5 | JEE/NEET services not in dedicated sub-folder | Create `services/jee-neet/` and move all non-SSC files there |
| 6 | No service layer (controllers call Supabase directly) | Add `*.service.ts` per module |
| 7 | Web `lib/` has only `mock-data.ts` | Add `api.client.ts` base wrapper + React Query hooks |

### P2 — Do This Quarter (Polish)

| # | Problem | Fix |
|---|---|---|
| 8 | Shared UI components duplicated in every page | Extract `StatCard`, `DataTable`, `Toggle`, `Badge`, `Modal` to `components/shared/` |
| 9 | No structured logging | Add `pino` or `winston` logger, replace `console.error` calls |
| 10 | No centralized error handler | Add `errorHandler.middleware.ts`, remove try/catch boilerplate from every controller |
| 11 | Analysis engine runs synchronously | Queue heavy analysis jobs (BullMQ / pg-boss) for production scale |

---

## 10. Recommended Industry Patterns to Adopt

### 10.1 Repository Pattern for DB Calls

Instead of calling Supabase directly in controllers, introduce a thin repository layer:

```typescript
// modules/questions/questions.repository.ts
export class QuestionsRepository {
  async findById(id: string): Promise<Question | null> {
    const data = await sbFetch(`questions?id=eq.${id}&...`);
    return data[0] ?? null;
  }
  async bulkInsert(questions: Question[]): Promise<void> { ... }
}

// questions.controller.ts
const repo = new QuestionsRepository();
const q = await repo.findById(req.params.id);
```

**Why:** Testable, swappable, zero duplication of Supabase query strings.

### 10.2 Command/Query Separation (CQRS-lite)

For the analysis engine, separate reads from writes:

```typescript
// Commands (mutate state)
submitAttemptCommand(payload)
analyzeAttemptCommand(attemptId)

// Queries (read-only)
getAttemptQuery(attemptId)
getAnalysisResultQuery(attemptId)
```

### 10.3 Exam Pipeline Registry (Future-proof)

Replace the if-else exam router with a registry pattern:

```typescript
// analysis.registry.ts
const PIPELINE_REGISTRY: Record<string, ExamPipeline> = {
  "jee-main":    JeeNeetPipeline,
  "jee-advanced": JeeNeetPipeline,
  "neet":        JeeNeetPipeline,
  "ssc-cgl":     SscPipeline,
  "ssc-chsl":    SscPipeline,
};

// analysis.service.ts
const pipeline = PIPELINE_REGISTRY[attempt.exam_code] ?? JeeNeetPipeline;
return pipeline.analyze(attemptId, hasTimingData);
```

**Why:** Adding a new exam (e.g., CUET, GATE) requires only registering a new pipeline, zero changes to existing code. Open/Closed principle.

### 10.4 Feature Flags via Configuration Table

Already partially implemented in the SuperAdmin Configuration page. The backend counterpart:

```sql
CREATE TABLE feature_flags (
  key TEXT PRIMARY KEY,
  enabled BOOLEAN DEFAULT false,
  scope TEXT DEFAULT 'global',  -- 'global' | 'institute:{id}'
  updated_by UUID REFERENCES users(id)
);
```

---

## 11. Scale Targets vs. Current Architecture

| Metric | Target | Current State | Gap |
|---|---|---|---|
| Concurrent users | 250k (peak exam day) | Single Express process | Need clustering + load balancer |
| Analysis throughput | 10k submissions/hour | Synchronous in-request | Need async queue (BullMQ) |
| DB connections | Pooled via PgBouncer | Direct Supabase REST | Supabase handles pooling — OK for now |
| Question bank | 1M+ questions | File-based + Supabase | Supabase — OK |
| CDN for images | Global edge | None | Need Supabase Storage + CDN |

---

## 12. Folder Migration Plan

This is the step-by-step plan to migrate from the current flat structure to the modular architecture **without breaking anything**.

### Step 1: Create `jee-neet/` sub-folder in analysis engine

```bash
mkdir apps/api/src/modules/analysis-engine/services/jee-neet
# Move (do not delete) all non-SSC service files into jee-neet/
# Update import paths in analysis.service.ts
```

### Step 2: Create `pyqs.service.ts` and fix the import coupling

```bash
touch apps/api/src/modules/attempts/pyqs.service.ts
# Move PYQ_REGISTRY + ROOT + file loading logic here
# Update imports in attempts.controller.ts
```

### Step 3: Migrate controllers into module folders one at a time

```
questions.controller.ts → modules/questions/questions.controller.ts
tests.controller.ts     → modules/tests/tests.controller.ts
...
```

### Step 4: Add service files

For each module, add a `*.service.ts` that owns all DB queries.

### Step 5: Centralize Supabase client

```typescript
// apps/api/src/shared/supabase.ts
import { createClient } from "@supabase/supabase-js";
export const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);
```

Each service imports from this single file instead of re-creating headers/fetch logic.

---

## 13. Summary

The platform is architecturally sound at the macro level (monorepo, RBAC, isolated SSC engine). The gaps are at the **micro level**: flat controller organization, missing service layer, and the in-memory mock DB that must be replaced before going to production.

The analysis engine is the core IP of the platform. The SSC isolation pattern is exactly right and is now the **template for all exam types**. The target state has three fully isolated pipelines:

```
services/
├── jee/    ← JEE Main + JEE Advanced (integer Qs, multi-correct, Maths-heavy)
├── neet/   ← NEET UG + NEET OMR (pure MCQ, Biology = Botany + Zoology)
└── ssc/    ✅ Done (section locks, GK/GA grouping, +2/-0.5 scoring)
```

Each pipeline is fully self-contained: its own scoring, mistake classification, behavioral analysis, topic accuracy logic, narrative generator, and study plan. The `analysis.service.ts` file remains as a thin router only — it reads `exam_code` and delegates. Nothing else.

**The single most impactful change you can make right now is:**
1. Create `services/jee/` — move all current JEE/NEET services there, prefixed `jee-`
2. Create `services/neet/` — fork from JEE, adapt for Biology split + no-integer logic
3. Update the router in `analysis.service.ts` to use the registry pattern

Once this is done, adding any future exam (CUET, GATE, CAT) requires only creating a new folder and registering one line in the registry — zero changes to existing pipelines.
