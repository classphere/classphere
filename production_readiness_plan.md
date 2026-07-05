# ExamPrep — Production Readiness Report

**Date:** July 2026 | **Current Readiness: ~40%**

This is not generic advice. Every issue below maps to a specific file, a specific line number, and a specific code change. Read it as a checklist you can execute sprint by sprint.

---

## Current State Snapshot

### ✅ What is solid

| Area | Evidence |
|---|---|
| Supabase Auth + Role routing | `auth.middleware.ts` — JWT is validated via Supabase, `req.user` is populated correctly |
| RBAC middleware | `rbac.middleware.ts` — `requireRole()` factory works, used on institute/superadmin routes |
| API module structure | 11 domain modules in `apps/api/src/modules/` — clean separation |
| Centralized `api.client.ts` | Sprint 1 complete — typed `get/post/put/patch/delete` wrapper exists |
| TypeScript — 0 errors | `tsc --noEmit` passes clean |
| Design system tokens | CSS variables in `globals.css` are correct and consistent |
| Component library | `StatCard`, `StatCardGrid`, `Modal`, `EmptyState` in `components/shared/` |
| Test submission engine | `test/[id]/page.tsx` has real `fetch` + real error handling for submit |

### ❌ The 10 Blockers

---

## Issue 1 — Critical Security Bug: `attempts` Routes Have No Auth

**Severity: P0 — This must be fixed before any real users touch the app.**

**File:** `apps/api/src/modules/attempts/attempts.routes.ts`

```ts
// CURRENT — all 5 routes are fully unauthenticated
router.get("/my",        getMyAttempts);
router.post("/",         startAttempt);
router.get("/:id",       getAttempt);
router.patch("/:id",     saveAttempt);
router.post("/:id/submit", submitAttempt);
```

Any person on the internet can call `POST /api/v1/attempts` without a token and create test attempts. They can also call `GET /api/v1/attempts/:id` and read any student's attempt data by guessing UUIDs.

**Fix:**
```ts
import { authenticate } from "../../middleware/auth.middleware";

router.get("/my",          authenticate, getMyAttempts);
router.post("/",           authenticate, startAttempt);
router.get("/:id",         authenticate, getAttempt);
router.patch("/:id",       authenticate, saveAttempt);
router.post("/:id/submit", authenticate, submitAttempt);
```

Additionally, **each controller must enforce data isolation**: `getAttempt` must verify that `attempt.student_id === req.user.id` before returning the row. Without that check, a logged-in student can view another student's attempt by knowing its UUID.

**Effort:** 30 minutes.

---

## Issue 2 — No Error Boundaries (White Screen of Death)

**Severity: P0**

**Files:**
- `apps/web/src/app/error.tsx` — **MISSING**
- `apps/web/src/app/global-error.tsx` — **MISSING**
- `apps/web/src/app/not-found.tsx` — **MISSING**

React does not catch errors thrown inside components. When a component throws (e.g., the analysis engine gets a malformed response), the **entire page goes blank**. Users see nothing. You get no report. This currently affects every page in the app.

**Fix — Create these three files:**

**`apps/web/src/app/error.tsx`** (catches errors within a route segment):
```tsx
"use client";
import { useEffect } from "react";
import { RiAlertLine, RiRefreshLine } from "@remixicon/react";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    // When Sentry is integrated: Sentry.captureException(error);
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <RiAlertLine size={40} className="text-t-secondary" />
      <h2 className="text-xl font-semibold text-t-primary">Something went wrong</h2>
      <p className="text-sm text-t-secondary max-w-sm text-center">{error.message}</p>
      <button onClick={reset} className="btn btn-primary flex items-center gap-2">
        <RiRefreshLine size={16} /> Try again
      </button>
    </div>
  );
}
```

**`apps/web/src/app/global-error.tsx`** (catches errors in the root layout itself):
```tsx
"use client";
export default function GlobalError({ reset }: { reset: () => void }) {
  return (
    <html><body>
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <h2 className="text-xl font-semibold">Critical application error</h2>
        <button onClick={reset}>Reload</button>
      </div>
    </body></html>
  );
}
```

**`apps/web/src/app/not-found.tsx`:**
```tsx
import Link from "next/link";
export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <h2 className="text-3xl font-bold text-t-primary">404</h2>
      <p className="text-t-secondary">This page does not exist.</p>
      <Link href="/" className="btn btn-primary">Go Home</Link>
    </div>
  );
}
```

**Effort:** 1 hour.

---

## Issue 3 — Five Pages Have a Rogue `API_BASE` Constant

**Severity: P1**

**Files with the problem:**
```
apps/web/src/app/test/[id]/page.tsx:55
apps/web/src/app/tests/page.tsx:32
apps/web/src/app/pyqs/page.tsx:33
apps/web/src/app/superadmin/questions/upload/page.tsx:19
apps/web/src/app/superadmin/questions/upload/BulkUpload.tsx:9
```

Each of these defines:
```ts
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api/v1";
```

Note the difference from `api.client.ts`:
- `api.client.ts` exports `API_URL` = `http://localhost:3001` (no `/api/v1` suffix)
- These pages use `API_BASE` = `http://localhost:3001/api/v1` (with suffix)

This is a **two-source-of-truth problem**. If you change the API base path in production, you must update 6 different places instead of 1.

**Fix:** Add `API_BASE` as a second export from `api.client.ts`:
```ts
// api.client.ts
export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
export const API_BASE = `${API_URL}/api/v1`;
```

Then in each affected page:
```ts
// REMOVE:
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api/v1";
// ADD:
import { API_BASE } from "@/lib/api.client";
```

**Effort:** 30 minutes.

---

## Issue 4 — Mock Data in Production-Bound Dashboards

**Severity: P1**

The student dashboard (`app/page.tsx`) always shows `8 Tests Taken`, `71.2% Accuracy`, `86 Avg Score`, `3 Booster Queue`. These are hardcoded static values — the user's real Supabase data is never fetched.

Similarly in `app/teacher/page.tsx`:
```ts
const mockBatches: any[] = [];    // line 21 — never populated
const mockDPPs: any[] = [];       // line 22 — never populated
```

And in `app/institute/page.tsx`:
```ts
const mockInstituteAdmin = {      // line 51 — fully hardcoded
  instituteName: "Lakshya Institute",
  studentsCount: 142,
  batchesCount: 6,
  plan: "ENTERPRISE",
  ...
};
```

**Fix — What each dashboard needs to fetch:**

**Student dashboard** → `GET /api/v1/attempts/my` (returns attempt history → derive stats client-side or add a `/api/v1/students/me/stats` endpoint)

**Teacher dashboard** → `GET /api/v1/batches?teacherId=<id>` and `GET /api/v1/dpps?teacherId=<id>`

**Institute dashboard** → `GET /api/v1/institutes/me` (endpoint exists: `institutes.routes.ts` line `router.get("/me", ...)`)

**Implementation pattern** to follow (consistent with codebase):
```tsx
const [stats, setStats] = useState<StudentStats | null>(null);
const [loading, setLoading] = useState(true);
const { user } = useAuth();

useEffect(() => {
  if (!user?.token) return;
  apiClient.get<StudentStats>("/api/v1/students/me/stats", user.token)
    .then(setStats)
    .catch(console.error)
    .finally(() => setLoading(false));
}, [user?.token]);
```

**Effort:** 2–3 days (requires backend endpoint additions + frontend wiring).

---

## Issue 5 — Three Monolithic Pages Need Splitting (Sprint 2)

**Severity: P1**

| File | Lines | Problem |
|---|---|---|
| `results/[id]/page.tsx` | 1,004 | Most important user page — untestable, unmaintainable |
| `test/[id]/page.tsx` | 899 | Core test engine — one bug can break all tests |
| `institute/reports/page.tsx` | 645 | UI-only, but no component reuse possible |

**Extraction plan for `results/[id]/page.tsx`:**
```
components/
  results/
    ResultSummaryHeader.tsx      (~80 lines) — score, rank, marks
    SubjectBreakdownTable.tsx    (~120 lines) — subject-wise marks table
    QuestionAnalysisTab.tsx      (~200 lines) — per-question review
    ErrorPatternsCard.tsx        (~100 lines) — weak areas widget
    RevisionScheduleTab.tsx      (~150 lines) — 7-day plan
  analysis/
    ScoreGauge.tsx               — reusable donut/gauge chart
    AccuracyBar.tsx              — reusable horizontal accuracy bar
```

**Effort:** 3 days (Sprint 2).

---

## Issue 6 — 1,484 Hardcoded Hex Values Breaking Dark Mode

**Severity: P2**

```bash
$ grep -rn "text-\[#\|bg-\[#\|border-\[#" apps/web/src/app --include="*.tsx" | wc -l
1484
```

This means dark mode is visually broken across the majority of pages. `text-[#101010]` is black — it does not invert in dark mode. The CSS token `text-t-primary` does.

**Migration mapping:**

| Hardcoded | Token | Usage |
|---|---|---|
| `text-[#101010]` | `text-t-primary` | Primary text |
| `text-[#7B7B7B]` | `text-t-secondary` | Secondary/muted text |
| `bg-[#FDFDFD]` | `bg-b-surface2` | Card backgrounds |
| `bg-[#F9F9F9]` | `bg-b-surface1` | Page backgrounds |
| `border-[rgba(...)]` | `border-s-stroke2/40` | Subtle borders |
| `text-[#00A656]` | `text-primary-02` | Green accents |

**Strategy:** Do this page-by-page when Sprint 2 splits out components. Don't do a bulk regex replace — it's risky without visual review.

**Effort:** Ongoing, ~2 hours per page.

---

## Issue 7 — No Mobile Navigation

**Severity: P1**

In `components/layout/AppShell.tsx`, the Sidebar is wrapped in `<Sidebar />` which renders `<aside className="hidden md:flex ...">`. On screens under 768px, there is zero navigation. Students on mobile phones (the primary device for Indian exam prep) cannot navigate anywhere after logging in.

**Fix — Add a mobile drawer to `AppShell.tsx`:**
1. Create `components/layout/MobileDrawer.tsx` that renders the same nav links as `Sidebar.tsx` but in a slide-in panel.
2. Add a `<MobileTopBar />` component with a hamburger icon, visible only on `md:hidden`.
3. Wire the hamburger button to toggle a `drawerOpen` state that controls the drawer.

**Effort:** 1 day.

---

## Issue 8 — No Observability

**Severity: P1**

There is no error tracking, no structured logging, and no uptime monitoring. When a student's test submission fails silently in production (currently: `console.error(err)` and `alert()`), you have no record of it.

**Fix — Sentry integration:**

```bash
cd apps/web && npm install @sentry/nextjs
cd apps/api && npm install @sentry/node
```

In `apps/web/next.config.js`:
```ts
const { withSentryConfig } = require("@sentry/nextjs");
module.exports = withSentryConfig(nextConfig, { silent: true });
```

Create `apps/web/sentry.client.config.ts`:
```ts
import * as Sentry from "@sentry/nextjs";
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
});
```

Then replace all `console.error(err)` calls in `test/[id]/page.tsx` and `results/[id]/page.tsx` with `Sentry.captureException(err)`.

On the backend (`apps/api/src/index.ts`), add the Sentry error handler as the last middleware:
```ts
import * as Sentry from "@sentry/node";
Sentry.init({ dsn: process.env.SENTRY_DSN });
app.use(Sentry.Handlers.errorHandler());
```

**Effort:** 2 hours.

---

## Issue 9 — No CI/CD Pipeline

**Severity: P2**

There are no automated checks. A broken build or a failed TypeScript check can be pushed to `main` and deployed without anyone noticing. The `tsc --noEmit` command today passes cleanly — that should be enforced forever.

**Fix — Create `.github/workflows/ci.yml`:**
```yaml
name: CI

on:
  push:
    branches: [main, dev]
  pull_request:
    branches: [main]

jobs:
  web-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: cd apps/web && npm ci
      - run: cd apps/web && npx tsc --noEmit
      - run: cd apps/web && npm run lint

  api-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: cd apps/api && npm ci
      - run: cd apps/api && npx tsc --noEmit
```

Also add branch protection on `main` in GitHub → Settings → Branches: require CI to pass before merge.

**Effort:** 1 hour.

---

## Issue 10 — Environment Variables Not Production-Ready

**Severity: P1**

Current `apps/web/.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:3001
```

This hardcodes `localhost` — the app cannot connect to a remote API server without this being updated. If this file is accidentally committed (it was not, `.gitignore` covers it), it would expose the Supabase URL.

**Fix — Vercel deployment checklist:**

| Variable | Where | Value |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | Vercel → Environment | `https://api.yourapp.com` |
| `NEXT_PUBLIC_SUPABASE_URL` | Vercel → Environment | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Vercel → Environment | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Railway/Render (API server only) | Supabase service role key — **never expose to frontend** |
| `SUPABASE_JWT_SECRET` | API server | From Supabase → Settings → API |
| `INTERNAL_API_KEY` | API server | A strong random secret for cron jobs |
| `SENTRY_DSN` | Both | From Sentry dashboard |

Create an `apps/web/.env.example` file (committed, no real values) so future developers know what they need.

**Effort:** 30 minutes (setup) + deployment configuration time.

---

## Graded Verdict

| Dimension | Grade | Notes |
|---|---|---|
| Frontend architecture | **B+** | Sprint 1 done, Sprint 2 pending (monolithic pages) |
| Backend / API | **B** | Real data, but attempts routes have no auth |
| Auth & RBAC | **B+** | Middleware is solid; data isolation in controllers needs verify |
| Test coverage | **F** | Zero tests exist |
| Observability | **F** | No Sentry, no logging, no uptime monitoring |
| Mobile experience | **D** | No navigation for mobile users |
| Data completeness | **C** | Most dashboards show hardcoded mock data |
| Environment management | **C** | `.env.local` is fine for dev, not production |
| CI/CD | **F** | No pipeline |
| **Overall** | **~40%** | |

---

## Execution Roadmap

### Sprint 2 — This Week (P0s first)
- [ ] `apps/api/src/modules/attempts/attempts.routes.ts` — add `authenticate` to all 5 routes
- [ ] Verify data isolation in `getAttempt` controller
- [ ] Create `apps/web/src/app/error.tsx`
- [ ] Create `apps/web/src/app/global-error.tsx`
- [ ] Create `apps/web/src/app/not-found.tsx`
- [ ] Fix `API_BASE` — export from `api.client.ts`, remove 5 page-level constants

### Sprint 3 — Next Week (P1s)
- [ ] Wire real data to student dashboard
- [ ] Wire real data to teacher dashboard (fetch real batches/DPPs)
- [ ] Wire real data to institute dashboard (fetch from `/api/v1/institutes/me`)
- [ ] Add mobile navigation (MobileDrawer + MobileTopBar)
- [ ] Sentry integration (web + API)
- [ ] Setup environment variables on Vercel/Railway

### Sprint 4 — Two Weeks Out (Sprint 2 Componentization + Quality)
- [ ] Split `results/[id]/page.tsx` into `components/results/`
- [ ] Split `test/[id]/page.tsx` — extract question renderer, timer, navigation panel
- [ ] GitHub Actions CI pipeline
- [ ] Write E2E tests for: login → take test → submit → view results
- [ ] Dark mode pass: migrate 1,484 hardcoded hex values page by page
