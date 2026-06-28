# Developer Guide — ExamPrep Platform

> **Read this before writing a single line of code.**
> This document defines the architectural rules, folder conventions, and non-negotiable practices for this codebase. If you are onboarding, treat this as your contract.

---

## Table of Contents

1. [The Golden Rule](#1-the-golden-rule)
2. [Project Structure at a Glance](#2-project-structure-at-a-glance)
3. [API — Module Architecture](#3-api--module-architecture)
4. [Analysis Engine — The Most Critical Part](#4-analysis-engine--the-most-critical-part)
5. [What You Are NOT Allowed To Do](#5-what-you-are-not-allowed-to-do)
6. [Adding a New Feature — The Right Way](#6-adding-a-new-feature--the-right-way)
7. [Adding a New Exam Pipeline](#7-adding-a-new-exam-pipeline)
8. [Frontend Architecture](#8-frontend-architecture)
9. [Database & Service Layer Rules](#9-database--service-layer-rules)
10. [Code Review Checklist](#10-code-review-checklist)

---

## 1. The Golden Rule

> **Every piece of code belongs to exactly one domain. No exceptions.**

If you find yourself writing `import { something } from "../jee/..."` inside a NEET file — stop. You have made a mistake. Fix it before committing.

The same goes for mixing controller logic into routes, or writing DB queries inside a controller without a service layer.

---

## 2. Project Structure at a Glance

This is a **Turborepo monorepo**. Two apps, one shared types package.

```
test-jee-neet/
├── apps/
│   ├── api/          ← Express + TypeScript backend
│   └── web/          ← Next.js 16 frontend (App Router)
├── packages/
│   └── types/        ← Shared TypeScript types (consumed by both api and web)
├── ARCHITECTURE_V2.md        ← Technical design decisions and scale targets
└── DEVELOPER_GUIDE.md        ← You are here
```

**Key rule:** If a type is used by both `api` and `web`, it lives in `packages/types`. If it's only used inside one app, it lives inside that app.

---

## 3. API — Module Architecture

The API follows a **strict domain-module structure**. Every domain is a self-contained folder under `src/modules/`.

```
apps/api/src/
├── index.ts                  ← Express bootstrap ONLY. No business logic here.
├── middleware/               ← Auth, RBAC, internal API key. Do not modify unless you know why.
│   ├── auth.middleware.ts
│   ├── rbac.middleware.ts
│   └── internalAuth.middleware.ts
│
├── modules/                  ← ONE folder per domain. This is the law.
│   ├── auth/
│   │   ├── auth.controller.ts
│   │   └── auth.routes.ts
│   ├── questions/
│   │   ├── questions.controller.ts
│   │   └── questions.routes.ts
│   ├── tests/
│   ├── attempts/
│   ├── rankings/
│   ├── institutes/
│   ├── batches/
│   ├── superadmin/
│   ├── internal/
│   ├── pyqs/
│   │   ├── pyqs.controller.ts
│   │   ├── pyqs.routes.ts
│   │   └── pyqs.service.ts   ← Shared PYQ data accessed via service, not controller
│   │
│   └── analysis-engine/      ← See Section 4. This has its own strict rules.
│
└── routes/
    └── index.ts              ← ONLY imports and mounts module routers. Nothing else.
```

### The 3-Layer Rule inside a Module

Every module follows this pattern:

```
routes.ts  →  controller.ts  →  service.ts  →  [Database]
```

| Layer | Responsibility | What it must NOT do |
|---|---|---|
| `routes.ts` | Declare HTTP verbs, paths, middleware chain | Contain any business logic |
| `controller.ts` | Parse request, call service, send response | Query the database directly |
| `service.ts` | All business logic and DB queries | Import from another module's controller |

### ⚠️ The Controller-to-Controller Import is FORBIDDEN

```typescript
// ❌ THIS IS WRONG — NEVER DO THIS
// Inside attempts.controller.ts:
import { PYQ_REGISTRY } from "../pyqs/pyqs.controller";

// ✅ THIS IS CORRECT
// Shared data lives in a service:
import { PYQ_REGISTRY } from "../pyqs/pyqs.service";
```

This was a real bug in this codebase that has been fixed. Don't reintroduce it.

---

## 4. Analysis Engine — The Most Critical Part

The analysis engine is the **core intellectual property** of this platform. It has the strictest isolation rules.

### The Three Pipelines

```
src/modules/analysis-engine/services/
├── analysis.service.ts    ← ROUTER ONLY. 35 lines. Touch only to add new exams.
│
├── jee/                   ← JEE Main + JEE Advanced pipeline
│   ├── jee-analysis.service.ts       ← Entry point
│   ├── jee-scoring.service.ts
│   ├── jee-mistake-classifier.ts
│   ├── jee-behavioral-analysis.ts
│   ├── jee-topic-accuracy.ts
│   ├── jee-error-patterns.ts
│   ├── jee-free-marks.ts
│   ├── jee-skip-analysis.ts
│   ├── jee-attempt-strategy.ts
│   ├── jee-narrative-summary.ts
│   ├── jee-study-plan.ts
│   ├── jee-booster.ts
│   └── jee-longitudinal-profile.ts
│
├── neet/                  ← NEET UG + NEET OMR pipeline (separate from JEE)
│   ├── neet-analysis.service.ts
│   ├── neet-scoring.service.ts       ← Different from JEE (pure MCQ, 720 marks)
│   ├── neet-attempt-strategy.ts      ← Biology split, different time splits
│   ├── neet-narrative-summary.ts     ← Only knows NEET exam dates, not JEE
│   └── ... (all neet-* files)
│
└── ssc/                   ← SSC CGL/CHSL/MTS/GD pipeline (separate from both)
    ├── ssc-analysis.service.ts
    ├── ssc-scoring.service.ts        ← +2/-0.5, 4 fixed sections
    ├── ssc-behavioral-analysis.ts    ← Section locks, block panic, sweep quality
    ├── ssc-attempt-strategy.ts       ← 60 min, 4 equal section splits (NOT JEE splits)
    └── ... (all ssc-* files)
```

### Why They Are Separate

| Dimension | JEE | NEET | SSC |
|---|---|---|---|
| Question types | MCQ + Integer (no negative) | Pure MCQ only | Pure MCQ |
| Marking | +4/−1 MCQ, +4/0 integer | +4/−1 | +2/−0.5 |
| Total marks | 300 (Main) | 720 | 200 |
| Subjects | Physics, Chemistry, Maths | Physics, Chemistry, Biology (Botany+Zoology) | Reasoning, GA, Quant, English |
| Test structure | 3 sections, 90 min each | 3 sections | 4 locked sections, 15 min each |
| Skip behaviour | Integer Qs: separate skip type | Low skip expected | High skip on GA |

### The Router: `analysis.service.ts`

This is the only file that knows about all three pipelines. It reads `exam_code` and routes:

```typescript
export async function analyzeAttempt(attemptId, hasTimingData) {
  const { attempt } = await db.getAttemptWithAnswers(attemptId);
  const examCode = attempt.exam_code ?? "jee-main";

  if (examCode.startsWith("ssc"))                   return analyzeSscAttempt(...);
  if (examCode === "neet" || examCode === "neet-omr") return analyzeNeetAttempt(...);
  return analyzeJeeAttempt(...);   // default
}
```

**Adding a new exam = add one `if` block here + create a new `/<exam>/` folder.** Nothing else changes.

---

## 5. What You Are NOT Allowed To Do

These are hard rules. A PR that violates any of these will be rejected.

### ❌ Cross-Pipeline Imports

```typescript
// Inside neet/neet-scoring.service.ts:
import { scoreAttempt } from "../jee/jee-scoring.service"; // FORBIDDEN

// Inside ssc/ssc-behavioral-analysis.ts:
import { detectPanicCascade } from "../jee/jee-behavioral-analysis"; // FORBIDDEN
```

If two pipelines share logic that is genuinely exam-agnostic, extract it into a **shared utility** under `services/shared/` and import from there.

### ❌ JEE Data Inside NEET Files

```typescript
// Inside neet/neet-narrative-summary.ts:
const JEE_SESSION_DATES = [...]; // FORBIDDEN — this was a real bug, now fixed
```

### ❌ JEE/NEET Subject Names Inside SSC Files

```typescript
// Inside ssc/ssc-attempt-strategy.ts:
const OPTIMAL_SPLIT = { Physics: 35, Maths: 35 }; // FORBIDDEN in SSC context
```

### ❌ Business Logic in Routes Files

```typescript
// Inside tests.routes.ts:
router.get("/:id", authenticate, async (req, res) => {
  const test = await db.from("tests").select("*"); // FORBIDDEN
  res.json(test);
});
```

All logic goes in the controller (or service). Routes only define the HTTP interface.

### ❌ Raw DB Queries in Controllers

```typescript
// Inside questions.controller.ts:
const data = await fetch(`${SUPABASE_URL}/rest/v1/questions?...`); // FORBIDDEN in new code
```

Write a `questions.service.ts` and call it from the controller. The only exception is legacy controllers that haven't been refactored yet — do not add new raw queries to them, only extract.

### ❌ Hardcoded Credentials or Secrets

```typescript
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."; // IMMEDIATE REJECTION
```

All secrets come from `process.env`. See `.env.seed.example` for the full list.

---

## 6. Adding a New Feature — The Right Way

**Scenario:** You need to add a "download result as PDF" endpoint.

### Step 1: Identify the domain
This belongs to `attempts` or maybe a new `reports` module. It's not analysis, not auth, not superadmin.

### Step 2: Create the module structure
```
modules/reports/
├── reports.controller.ts
├── reports.routes.ts
└── reports.service.ts
```

### Step 3: Add the route to `routes/index.ts`
```typescript
import reportsRouter from "../modules/reports/reports.routes";
router.use("/reports", reportsRouter);
```

### Step 4: Wire authentication and roles
```typescript
// reports.routes.ts
router.get("/attempts/:id/pdf", authenticate, requireRole("student", "teacher"), downloadPdf);
```

### Step 5: Put logic in the service
```typescript
// reports.service.ts
export async function generateAttemptPdf(attemptId: string, userId: string) {
  // fetch data, generate PDF buffer
}

// reports.controller.ts
export const downloadPdf = async (req, res) => {
  const buffer = await generateAttemptPdf(req.params.id, req.user.id);
  res.setHeader("Content-Type", "application/pdf");
  res.send(buffer);
};
```

---

## 7. Adding a New Exam Pipeline

**Scenario:** You need to add CUET support.

### Step 1: Create the pipeline folder
```
modules/analysis-engine/services/cuet/
├── cuet-analysis.service.ts    ← Entry point
├── cuet-scoring.service.ts     ← CUET-specific marking scheme
├── cuet-mistake-classifier.ts
├── cuet-topic-accuracy.ts
├── cuet-narrative-summary.ts
└── ... (all cuet-* files)
```

**File naming rule:** Every file must be prefixed `cuet-`. This makes it unambiguous which pipeline a file belongs to when browsing the codebase.

### Step 2: Register in the router
```typescript
// analysis.service.ts — the ONLY file you touch in existing code
import { analyzeCuetAttempt } from "./cuet/cuet-analysis.service";

if (examCode.startsWith("cuet")) {
  return analyzeCuetAttempt(attemptId, hasTimingData);
}
```

### Step 3: Register exam codes in the DB
Add entries to the `exams` table: `cuet-ug`, `cuet-pg`, etc.

### What you must NOT do
- Do not modify `jee-scoring.service.ts` to handle CUET
- Do not add CUET logic to `analysis.service.ts` beyond the one routing line
- Do not share scoring functions between CUET and JEE directly — fork them

---

## 8. Frontend Architecture

The frontend uses **Next.js App Router** with role-based route groups.

```
apps/web/src/app/
├── (student)/        ← Default student routes
├── teacher/          ← Teacher portal
├── institute/        ← Institute admin portal
├── superadmin/       ← Super admin portal
├── test/[id]/        ← Full-screen test engine (no sidebar)
├── results/[id]/     ← Analysis result view
├── settings/         ← Role-aware via ?role= query param
└── help/             ← Role-aware via ?role= query param
```

### Sidebar Role Persistence

The `Sidebar` component reads the active role from `useSearchParams()`. Global routes like `/settings` and `/help` preserve the role via `?role=<role>` in the URL. The `AppShell` wraps `Sidebar` in a `Suspense` boundary because of this.

**Do not** hardcode role checks by reading `pathname`. Always use `useSearchParams` for role-aware logic in the sidebar.

### Adding a New Page

1. Create the page under the correct role folder: `app/teacher/newfeature/page.tsx`
2. Add the nav link in `Sidebar.tsx` under the correct role block
3. Protect it on the API side with `requireRole("teacher")`

### Component Rules

- **Shared UI components** (cards, tables, badges, modals) → `src/components/shared/`
- **Layout components** (sidebar, navbar, shell) → `src/components/layout/`
- **Analysis-specific charts** (fatigue curve, topic radar) → `src/components/analysis/`
- **Page-specific components** that are only used once → co-locate in the page folder

Do not define a component inside a `page.tsx` file if it's more than 30 lines. Extract it.

---

## 9. Database & Service Layer Rules

### The Supabase Client
We use the Supabase REST API via `fetch()`. A single shared client/helper must be used — do not reinvent the `sbFetch` helper in every file.

**Planned:** `src/shared/supabase.ts` — a single client export. When this lands, all service files should import from there.

### Migration Convention
All DB schema changes must be written as SQL migrations in `/supabase/migrations/`. Never modify the schema directly via the Supabase dashboard without writing the migration file.

### Naming Conventions in DB
- Tables: `snake_case` plural (`attempts`, `batch_students`)
- Columns: `snake_case` (`student_id`, `exam_code`, `is_active`)
- Foreign keys: `<table_singular>_id` pattern (`attempt_id`, `student_id`)

---

## 10. Code Review Checklist

Use this before opening a PR and before approving one.

### Architecture
- [ ] New code lives in the correct module folder
- [ ] No controller imports from another controller
- [ ] No cross-pipeline imports (JEE ↔ NEET ↔ SSC)
- [ ] New exam-specific logic is in the correct pipeline folder
- [ ] No business logic inside `routes.ts` files

### Analysis Engine
- [ ] JEE files are prefixed `jee-` and live in `services/jee/`
- [ ] NEET files are prefixed `neet-` and live in `services/neet/`
- [ ] SSC files are prefixed `ssc-` and live in `services/ssc/`
- [ ] `analysis.service.ts` has not been used to hold logic (it is a router only)
- [ ] No JEE subject names (Physics/Maths) appear in NEET or SSC files
- [ ] No SSC section times appear in JEE or NEET files

### Code Quality
- [ ] `npx tsc --noEmit` passes with 0 errors
- [ ] No hardcoded secrets or API keys
- [ ] No `console.log` left in production paths (use structured logging)
- [ ] `.env` values accessed via `process.env.VARIABLE_NAME` only

### Git
- [ ] Commit message follows `type(scope): description` format
- [ ] Each commit represents one logical unit of change
- [ ] No `fix-imports.js`, log files, or temp scripts committed

---

## Quick Reference: Exam Codes

| Exam | Code in DB | Pipeline |
|---|---|---|
| JEE Main | `jee-main` | `services/jee/` |
| JEE Advanced | `jee-advanced` | `services/jee/` |
| NEET UG | `neet` | `services/neet/` |
| NEET OMR | `neet-omr` | `services/neet/` |
| SSC CGL | `ssc-cgl` | `services/ssc/` |
| SSC CHSL | `ssc-chsl` | `services/ssc/` |
| SSC MTS | `ssc-mts` | `services/ssc/` |
| SSC GD | `ssc-gd` | `services/ssc/` |

---

## Questions?

Read `ARCHITECTURE_V2.md` for the full technical design rationale. If something isn't covered here or there, discuss it before writing code — architectural decisions made in isolation are the primary source of the coupling problems this guide is designed to prevent.
