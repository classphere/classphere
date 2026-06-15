# ExamPrep — Production Readiness Audit

> Audited: 15 Jun 2026 · Status: **Pre-Production (MVP wiring needed)**

---

## TL;DR Verdict

The codebase has an excellent foundation:
- ✅ Full frontend shell (all pages built, design system polished)
- ✅ API structure + routes + middleware scaffolded correctly
- ✅ Analysis engine (rule-based, deterministic) fully implemented
- ✅ PYQ data pipeline works end-to-end (`submitAttempt` → analysis → results)

**What's missing for production:** Real auth, real database queries in controllers, route guards on the frontend, and deployment config. Every controller is a `// TODO: implement` stub except `submitAttempt` (which works against mock data).

---

## Priority Matrix

| Priority | Area | What |
|---|---|---|
| 🔴 P0 | Auth | Real Supabase login/signup wired end-to-end |
| 🔴 P0 | Frontend | Auth guard on all protected pages |
| 🔴 P0 | Frontend | Root layout does NOT exclude sidebar on login/signup pages |
| 🔴 P0 | API | `auth.controller.ts` — implement `signup`, `getMe` |
| 🔴 P0 | API | `attempts.controller.ts` — implement `startAttempt`, `saveAttempt`, `getMyAttempts` |
| 🔴 P0 | API | `tests.controller.ts` — implement `createTest`, `getTest` |
| 🟠 P1 | API | `questions.controller.ts` — `listQuestions`, `getExamsMeta` |
| 🟠 P1 | API | `institutes.controller.ts` — batch management CRUD |
| 🟠 P1 | API | `rankings.controller.ts` — `getLeaderboard`, `getMyRanks` |
| 🟠 P1 | Frontend | Login/signup pages — call real API (currently `localStorage.setItem("ep_auth", "true")`) |
| 🟠 P1 | Frontend | Dashboard (`page.tsx`) — replace all `mockUser`, `mockStats`, `mockRecentTests` with real API calls |
| 🟡 P2 | Frontend | History page — wire to `GET /api/v1/attempts/my` |
| 🟡 P2 | Frontend | Leaderboard page — wire to `GET /api/v1/rankings/leaderboard` |
| 🟡 P2 | Frontend | Profile page — wire to `GET /api/v1/auth/me` |
| 🟡 P2 | Frontend | Settings page — wire `Save Changes` to `PATCH /api/v1/auth/me` |
| 🟡 P2 | API | `internal.controller.ts` — nightly ranking job |
| 🟢 P3 | Infrastructure | `.env` files, Vercel deploy config, Cloud Run Dockerfile |
| 🟢 P3 | Infrastructure | Supabase DB schema migration scripts |
| 🟢 P3 | Frontend | Error boundaries, loading skeletons on every page |

---

## 1. CRITICAL — Auth System (P0)

### Problem
The entire auth system is fake. `login/page.tsx` does:
```js
localStorage.setItem("ep_auth", "true");
router.push("/");
```
There is no JWT, no session, no user context anywhere in the frontend.

### Root Layout Bug 🐛
`layout.tsx` always renders `<Sidebar />` — this means the sidebar shows up on `/login` and `/signup` too, which is broken.

### What needs to happen
1. **Install** `@supabase/supabase-js` in `apps/web`
2. **Create** `apps/web/src/lib/supabase.ts` — Supabase browser client
3. **Create** `apps/web/src/contexts/AuthContext.tsx` — wraps app, exposes `user`, `loading`, `signIn`, `signOut`
4. **Fix root layout** — render a conditional layout: auth pages get no sidebar, app pages get sidebar + auth guard
5. **Fix `login/page.tsx`** — call `supabase.auth.signInWithPassword()`, on success redirect to `/`
6. **Fix `signup/page.tsx`** — call `supabase.auth.signUp()`, on success redirect to `/`
7. **Implement `auth.controller.ts`** — `signup` creates the `public.users` row; `getMe` returns user profile

---

## 2. CRITICAL — Frontend Route Guards (P0)

Every protected page currently renders with zero auth check. Need a wrapper:

```tsx
// apps/web/src/components/AuthGuard.tsx (needs creation)
// Redirect to /login if no session
```

Pages that need guarding: **everything except `/login`, `/signup`, `/invite`**

---

## 3. API Controllers — Implementation Status

| Controller | Status | Priority |
|---|---|---|
| `auth.controller.ts` | 🔴 All stubs | P0 |
| `attempts.controller.ts` | 🟡 `submitAttempt` works (mock), rest stubs | P0 |
| `tests.controller.ts` | 🔴 All stubs | P0 |
| `questions.controller.ts` | 🔴 All stubs | P1 |
| `institutes.controller.ts` | 🔴 All stubs (large file) | P1 |
| `rankings.controller.ts` | 🔴 All stubs | P1 |
| `pyqs.controller.ts` | ✅ Works (reads from JSON files) | Done |
| `internal.controller.ts` | 🔴 Stub | P2 |

Each controller has detailed `// TODO: implement` comments with the exact SQL to write — they're ready to be filled in.

---

## 4. Frontend Pages — Wire-up Status

### Student Flow
| Page | Mock/Wired | What's needed |
|---|---|---|
| `/` (Dashboard) | 🔴 Full mock | Replace `mockUser/mockStats/mockRecentTests` with real API |
| `/login` | 🔴 Fake auth | Real Supabase `signInWithPassword` |
| `/signup` | 🔴 Fake auth | Real Supabase `signUp` |
| `/test/[id]` | 🟡 Partial | Start/autosave/submit wired to PYQ API, works for PYQ tests |
| `/results/[id]` | 🟡 Partial | Polls `/api/v1/analysis/:id` — works for PYQ flow |
| `/history` | 🔴 Mock | Wire to `GET /api/v1/attempts/my` |
| `/leaderboard` | 🔴 Mock | Wire to `GET /api/v1/rankings/leaderboard` |
| `/profile` | 🔴 Mock | Wire to `GET /api/v1/auth/me` |
| `/settings` | 🔴 Mock Save | Wire to `PATCH /api/v1/auth/me` |
| `/analytics` | 🔴 Mock | Wire to analysis results |
| `/doubts` | 🟡 UI only | No backend for doubts yet |
| `/pyqs` | ✅ Works | Lists and starts real PYQ tests |

### Teacher Flow
| Page | Mock/Wired | What's needed |
|---|---|---|
| `/teacher` (dashboard) | 🔴 Mock | Wire to batches + tasks APIs |
| `/teacher/tasks/[id]` | 🟡 Partial | Question add form needs submit |
| `/teacher/tasks/[id]/distractors` | 🟡 Partial | Save needs real API endpoint |
| `/teacher/analytics` | 🔴 Mock | Wire to batch analysis |

### Institute Flow
| Page | Mock/Wired | What's needed |
|---|---|---|
| `/institute` (dashboard) | 🔴 Mock | Wire to institutes API |
| `/institute/batches` | 🔴 Mock | Wire to `GET /api/v1/institutes/:id/batches` |
| `/institute/tests` | 🔴 Mock | Wire to tests pipeline API |

### Super Admin Flow
| Page | Status | Notes |
|---|---|---|
| `/superadmin` | 🟡 UI shell | Need wire-up, lower priority |

---

## 5. Infrastructure Gaps (P3)

### No `.env` files exist
Neither `apps/web` nor `apps/api` have `.env` or `.env.local` files. Need:

**`apps/api/.env`:**
```
NODE_ENV=production
PORT=8080
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_JWT_SECRET=
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
INTERNAL_API_KEY=
```

**`apps/web/.env.local`:**
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_API_URL=https://your-api.run.app
```

### Supabase Database
No migration files found. The schema needs to be created in Supabase before the API can work. Tables needed: `users`, `exams`, `questions`, `tests`, `attempts`, `attempt_answers`, `batches`, `batch_students`, `batch_teachers`, `batch_invites`, `leaderboards`, `student_stats`, `institutes`.

### No Dockerfile for API
No `Dockerfile` found in `apps/api`. Needed for GCP Cloud Run deployment.

---

## 6. Recommended Execution Order

### Phase 1 — Get Auth Working (1–2 days)
1. Fix root layout to conditionally show sidebar
2. Implement Supabase client in frontend
3. Wire login/signup pages to Supabase
4. Create `AuthContext` + `AuthGuard`
5. Implement `auth.controller.ts` (`signup` creates user row, `getMe` returns profile)
6. Add Supabase JWT secret to API env

### Phase 2 — Core Student Flow (2–3 days)
7. Create Supabase DB schema (migrations)
8. Implement `tests.controller.ts` (`createTest`, `getTest`)
9. Implement `attempts.controller.ts` (`startAttempt`, `saveAttempt`, `submitAttempt` with real DB)
10. Wire dashboard to real user data

### Phase 3 — Wire All Pages (2 days)
11. History, Leaderboard, Profile, Settings — all get real API calls
12. Implement `rankings.controller.ts`
13. Wire teacher dashboard to batch APIs

### Phase 4 — Deploy (1 day)
14. Create `apps/api/Dockerfile`
15. Set up environment variables in Vercel + Cloud Run
16. Deploy API to Cloud Run, frontend to Vercel
17. Run Supabase migrations on production DB

---

## Currently Working End-to-End ✅
- `/pyqs` → list PYQ tests (real JSON data)
- `/test/[id]` → take a PYQ test (start, answer, autosave, submit)
- `/results/[id]` → analysis results (rule-based engine, real analysis)
- All UI pages render correctly with design system
- API server starts and routes correctly
- Auth middleware validates Supabase JWTs (just needs a real JWT to validate)
