# ExamPrep — System Design v2 (Complete)
> Covers JEE · NEET · SSC · Offline OMR · B2B White-label · 100k+ concurrent users

---

## 1. Scale Targets & SLAs

### Traffic Profile
| Metric | Normal | Peak (Mega-Test) |
|---|---|---|
| Concurrent users | 5,000 | 100,000 |
| Requests/sec | 2,000 | 45,000 |
| Autosave writes/sec | 167 | 3,333 |
| Test submissions/min | 500 | 80,000 |
| Analysis jobs/min | 500 | 80,000 |
| Leaderboard reads/sec | 200 | 12,000 |
| OMR CSV uploads/day | 10 | 500 |
| WhatsApp messages/day | 500 | 100,000 |

### SLA Commitments
| Endpoint | p50 | p95 | p99 |
|---|---|---|---|
| `GET /questions` (cached) | 20ms | 60ms | 120ms |
| `PATCH /attempts/:id` (autosave) | 30ms | 80ms | 150ms |
| `POST /attempts/:id/submit` | 100ms | 300ms | 500ms |
| `GET /analysis/:id` (polling) | 15ms | 40ms | 80ms |
| `GET /rankings/leaderboard` | 15ms | 40ms | 80ms |
| `POST /omr-upload` (500 students) | 2s | 8s | 15s |

### Peak Event: 90-Minute Window
JEE/NEET mocks are time-gated — 80% of daily traffic hits within a 90-minute window. System must pre-scale 30 min before open and drain gracefully after.

---

## 2. Capacity Planning (Back-of-Envelope)

**Autosave (100k concurrent, every 30s):**
```
100,000 / 30 = 3,333 RPS → Redis HSET only
Payload: ~2KB → 6.5 MB/s inbound
DB sync: background flush every 5s (decoupled)
```

**Submission burst (100k in 10 min):**
```
100,000 / 600s = ~167 submissions/sec
DB writes: 167 × 75 rows (answers) = 12,525 rows/sec peak
Mitigated by: Redis-first + BullMQ queue
```

**Analysis queue:**
```
80,000 jobs × 800ms avg = needs ~1,060 parallel workers
200 pods × 6 concurrent = 1,200 slots → 67s drain time
KEDA auto-scales pods by Redis list depth
```

**OMR CSV upload (500 students, 200 questions):**
```
100,000 answer rows generated per upload
Bulk INSERT via pg COPY → ~2s for full batch
Analysis: 500 BullMQ jobs enqueued immediately after
```

**Storage growth:**
```
Per attempt: 50KB answers + 15KB analysis = 65KB
100k attempts/day × 65KB = 6.5 GB/day
Partitioned by month; cold storage to GCS after 6 months
```

---

## 3. Architecture Evolution

### Phase 1 — MVP (0–10k users)
```
[Vercel CDN] → [Next.js Frontend + PWA]
                      | HTTPS
              [Cloud Run: Node.js API]
                      |
           [Supabase PG] + [Upstash Redis]
```

### Phase 2 — Growth (10k–50k users)
```
[Vercel CDN] → [Next.js Frontend]
                      |
             [Cloud Run: API Gateway]
            /          |           \
   [Auth Svc]   [Test Engine]   [Analysis Svc]
                                      |
                              [BullMQ Workers]
                              [WhatsApp Worker]
```

### Phase 3 — Scale (50k–200k users): GKE
```
[Cloudflare WAF + DDoS] → [GKE Ingress / Nginx]
                                    |
        ┌──────────────────┬────────┴──────────┬───────────────┐
        ▼                  ▼                   ▼               ▼
 [Auth Service]    [Test Engine]      [Analysis Svc]   [WhatsApp Svc]
 Stateless JWT     10–60 pods HPA     8–200 pods KEDA   4–20 pods
        |                  |                   |               |
        └──────────────────┴───────┬───────────┘               |
                                   ▼                           ▼
                          [PostgreSQL Primary]          [Redis Cluster]
                          + 2 Read Replicas          BullMQ + Cache + Sessions
                                   |
                      [GCP Cloud Storage + CDN]
                         (Question images, PDFs)
```

### Phase 4 — Hyper-Scale (200k+): CQRS + Kafka
Write path: submission events → Kafka topics → consumers build denormalized read models.
Leaderboard becomes eventually-consistent materialized view. Full CQRS.

---

## 4. Multi-Exam Engine Router

The single most important architectural decision after Phase 1: **exam codes drive pipeline selection**.

```typescript
// analysis.service.ts — top-level router
if (attempt.exam_code?.startsWith("ssc")) {
  return analyzeSscAttempt(attemptId, hasTimingData);
}
// else: JEE/NEET pipeline (default)
return analyzeJeeNeetAttempt(attemptId, hasTimingData);
```

### Exam Code Registry
| Code | Pipeline | Marking Scheme | Section Locks |
|---|---|---|---|
| `jee-main` | JEE/NEET | +4/-1, NTA integer | None |
| `jee-advanced` | JEE/NEET | Partial, multi-correct | None |
| `neet` | JEE/NEET | +4/-1 | None |
| `neet-omr` | JEE/NEET + Offline | +4/-1 | None |
| `ssc-cgl` | SSC | +2/-0.5 | 15-min section lock |
| `ssc-chsl` | SSC | +2/-0.5 | 15-min section lock |
| `ssc-mts` | SSC | +1/0 | 15-min section lock |
| `ssc-gd` | SSC | +1/0 | 15-min section lock |

**Why isolation matters:** SSC has section-level time locks, different weak-topic thresholds (≥2 Qs vs JEE's ≥3), GK/GA chapter-level grouping, and no time-based heuristics for skip classification.

---

## 5. Test Engine Service (Critical Path)

### 5.1 Anti-Cheating: Question Shuffle (Sequence ≠ UUID)
- Each question has an immutable UUID. Answer key maps UUID → correct option.
- On test start, backend shuffles UUID array per attempt (seeded by attempt_id).
- Frontend renders `shuffled[0]` as "Q1" — purely cosmetic. Submission payload always uses UUIDs.
- 100k students = 100k unique sequences. Answer sharing by position is useless.

### 5.2 Autosave Flow
```
PATCH /attempts/:id
  → Validate JWT (~5ms)
  → HSET attempt:{id}:answers {questionId: option} → Redis (~2ms)
  → Return 200 { saved: true }  ← total: <30ms
  ↓ Background flush (every 5s)
  → Bulk UPSERT to attempt_answers (PostgreSQL)
```

### 5.3 B2B Deferred Submit → Publish Flow
```
[STUDENT] POST /attempts/:id/submit
  → Validate time window (now ≤ end_time + 2min grace)
  → Idempotency: if status='submitted' → 409
  → Flush Redis → DB (atomic transaction)
  → UPDATE attempts SET status='submitted_pending_publish'
  → Return 200  ← Student sees "Pending Publication" screen

[ADMIN] POST /admin/tests/:id/close-and-analyze
  → Validates end_time has passed (cannot close early)
  → Enqueues BullMQ jobs for all submitted attempts
  → UPDATE tests SET status='analysis_in_progress'

[ADMIN] POST /admin/tests/:id/publish
  → Validates all analysis jobs = 'done'
  → UPDATE tests SET publish_status='published'
  → Computes leaderboards (SQL window functions)
  → Enqueues WhatsApp blast (rate-limited: 1msg/5s)
  → Invalidates leaderboard cache keys
```

**Edge cases handled:**
- Student submits after end_time: rejected with 403
- Admin closes test while analysis still running: blocked, returns current job count
- Admin publishes before analysis completes: blocked with `{ pending_jobs: N }`
- Student refreshes results before publish: returns `{ status: 'pending_publish' }` — no data leak
- BullMQ job fails mid-analysis: job retries 3× with exponential backoff, attempt marked `analysis_failed`

### 5.4 SSC Section Pacing Lock (15-min enforcement)
```typescript
POST /attempts/:id/switch-section
  → GET ssc:attempt:{id}:section:{n}:opened_at from Redis
  → If (now - opened_at) < 900s → 403 { secondsRemaining: X }
  → Else: SET ssc:attempt:{id}:section:{n+1}:opened_at = now
```

---

## 6. Analysis Engine v4 (Complete Pipeline)

### 6.1 Full Stage Map
| Stage | Service | Input | Output |
|---|---|---|---|
| 1 | `scoring.service` | answers, marking_scheme | score, %, correct/wrong/skipped |
| 2 | `mistake-classifier` | each answer + question | error_type, confidence, tip |
| 3 | `topic-accuracy` | classified answers | per-topic accuracy + errorBreakdown |
| 4 | `error-patterns` | classified (9 detectors) | pattern flags with severity |
| 5 | `free-marks` | classified + scoring | recoverable marks + projected score |
| 6 | `skip-analysis` | classified | 4 skip types + subject breakdown |
| 6.5 | `attempt-strategy` | classified + exam_code | linear/sweep/chaotic + strategyScore |
| 6.6 | `longitudinal-profile` | topicStats + DB history | recurring_blind_spot, regression flags |
| 6.7 | `narrative-summary` | all above | headline + overview + biggestWin |
| 6.8 | `behavioral-analysis` | classified + start_timestamp | fatigue curve, panic cascade, subject movement, difficulty breakdown, attempt classification |
| 7 | `study-plan` | topicStats + longitudinal + freeMarks + daysToExam | urgency-aware 7-day plan |
| 8 | `booster` | topicStats + seenQIds | auto-generated next test config |
| 9 | `batch-analysis` | all attempts in batch | teacher dashboard aggregations |

### 6.2 Error Type Reference
| Error Type | Detection | Typical Cause |
|---|---|---|
| `conceptual` | Slow, marked review, or default | Topic not understood |
| `calculation` | Easy Q + normal time + wrong | Arithmetic slip |
| `silly` | time < 30% avg, or misread signal | Rushed / careless read |
| `partial_solve` | Distractor map hit: intermediate answer selected | Stopped too early |
| `sign_error` | Distractor map hit: sign/direction variant | Physics/Maths sign confusion |
| `wrong_method` | Distractor map hit | Applied wrong formula |
| `correct_guessed` | Correct AND (time < 40% avg OR marked_review) | Luck / elimination |
| `unknown` | Cannot classify with confidence | Needs self-tagging |

### 6.3 Behavioral Analysis (v4)
- **Fatigue Curve**: 30-min buckets by `start_timestamp`. Drop >30% = fatigue signal.
- **Panic Cascade**: Window of 6 Qs: ≥4 wrong AND avg time drops ≥30% → panic detected.
- **Subject Movement**: Chronological subject blocks reveal linear vs multi-round sweep strategy.
- **Attempt Classification**: Perfect / Overtime / Wasted / Confused per subject (MathonGo parity).
- **Difficulty Breakdown**: correct/incorrect/skipped × (subject × easy/medium/hard).

### 6.4 Urgency-Aware Study Plan
| Days to Exam | Mode | Strategy |
|---|---|---|
| >90 | Foundation | Conceptual rebuild, 90-min sessions |
| 30–90 | Growth | Mixed theory + drills, 75-min |
| 14–30 | Sprint | Free-marks recovery first, 60-min drills |
| <14 | Crisis | Only silly mistake fixes + attempt strategy. No new concepts. |

### 6.5 Offline Mode (OMR — hasTimingData=false)
Time-based features disabled; scoring, topic accuracy, distractor map, longitudinal profile still work.

---

## 7. Data Architecture

### 7.1 PostgreSQL Key Tables
```
institutes, users, batches, tests, questions (+ distractor_map JSONB)
attempts, attempt_answers (+ error_classification JSONB, start_timestamp)
analysis_results, student_error_profile (rolling cross-test memory)
leaderboards, pyq_questions, staging_questions
```
`attempt_answers` partitioned by `created_at` (monthly). Cold storage to GCS after 6 months.

### 7.2 Key Indexes
```sql
UNIQUE INDEX (attempt_id, question_id) ON attempt_answers;
INDEX (student_id, status, created_at DESC) ON attempts;
INDEX (exam_id, scope, rank_position ASC) ON leaderboards;
INDEX (institute_id, role) ON users;
INDEX (batch_id, publish_status, start_time DESC) ON tests;
```

### 7.3 Redis Key Taxonomy
| Key | TTL | Purpose |
|---|---|---|
| `questions:{test_id}` | 24h | Question payload (correct_answer stripped) |
| `answerkey:{test_id}` | 24h | uuid→correct_option hash |
| `attempt:{id}:answers` | 4h | Autosave buffer |
| `attempt:{id}:order` | 4h | Shuffled UUID array |
| `ssc:attempt:{id}:section:{n}:opened_at` | 6h | Section pacing lock |
| `leaderboard:{exam}:{scope}:{page}` | Midnight | Paginated leaderboard |
| `user:{id}:profile` | 15min | JWT payload supplement |
| `ratelimit:{ip}:{route}` | 60s | Sliding window counter |
| `whatsapp:session:{institute_id}` | 30d | BYON session token |

---

## 8. Multi-Tenancy & White-Label Architecture

### 8.1 Tenant Isolation Strategy
Single PostgreSQL database, every core table has `institute_id` column.
Supabase RLS enforces `WHERE institute_id = auth.jwt().institute_id` at DB engine level.
API middleware validates `req.user.institute_id` matches all queried resources.

### 8.2 Subdomain/Domain Routing
```
student visits: vidyamandir.examprep.com
  → Next.js reads host header
  → Fetches institute config: logo, primary_color, name, custom_domain
  → Injects CSS variables: --primary, --secondary, institute logo
  → JWT issued contains institute_id: 'vidya-123'
  → All subsequent queries sandboxed to that institute_id
```
Custom domains (`tests.vidyamandir.com`) via Vercel domain aliases + automatic SSL.

### 8.3 PWA (Progressive Web App)
- Next.js `manifest.json` + service worker per institute slug
- Dynamic icons from institute logo → students "install" institute's branded app
- No App Store required; avoids Apple rejection of white-label clones

### 8.4 Institute Onboarding Timeline
| Step | Action | Time |
|---|---|---|
| 1 | Super admin creates institute record | 5 min |
| 2 | Subdomain live (Vercel DNS) + SSL | ~10 min |
| 3 | Admin creates institute_admin account | 2 min |
| 4 | Admin bulk uploads student CSV | auto-creates accounts + sends welcome email |
| 5 | Teachers join via invite link | self-serve |
| 6 | First test created, PDF uploaded | ~15 min |
| **Total** | | **~48 hours end-to-end** |

### 8.5 Student Enrollment Flows
- **CSV Upload**: Institute uploads Excel → bulk account creation → branded welcome email
- **Batch Invite Code**: 6-digit code written on whiteboard → students self-register → auto-assigned to batch + institute

---

## 9. OMR / Offline Ingestion Pipeline

### 9.1 Institute Bulk Upload (B2B MVP)
```
POST /api/institute/tests/:testId/omr-upload
  → Validate test has answer key uploaded
  → Parse CSV (csv-parse): roll_number → Q1..Q200 bubbled answers
  → Batch lookup: roll_number → student_id (missing = error report)
  → Bulk INSERT attempt records (submission_mode='omr_upload', has_timing_data=false)
  → Bulk INSERT attempt_answers (time_taken_sec=0, start_timestamp=null)
  → Enqueue BullMQ: analyzeAttempt(id, hasTimingData=false) per student
  → Return: { matched: 490, missing_roll_numbers: ['NT001', 'NT002'], jobs_enqueued: 490 }
```

### 9.2 CSV Parsing Rules
| Value | Maps to |
|---|---|
| `A`, `B`, `C`, `D` | `selected_answer: 'A'` etc. |
| `1`, `2`, `3`, `4` | Normalized to `A/B/C/D` |
| Empty / `BLANK` | `selected_answer: null` (skipped) |
| `A,C` (multiple bubbles) | `selected_answer: null` (invalidated per NEET rules) |

### 9.3 Hybrid Speed Run (At-Home)
Student solves on physical paper, taps A/B/C/D in app simultaneously.
Benefits: preserves `time_taken_sec` and `start_timestamp` → full analysis engine with timing data.

---

## 10. PDF Ingestion Architecture

### V1 — Image-Based Smart Cropping (MVP)
```
PDF Upload → Page → High-res PNG
  → YOLOv8 / Vision LLM: detect [y1, x1, y2, x2] per question block
  → OpenCV: crop → q{n}.jpg → upload to GCP Cloud Storage
  → RAG Agent: assigns subject/chapter/topic tags (not for display, just taxonomy)
  → Student sees: cropped image + [A][B][C][D] buttons
```
**Why V1 wins**: Zero rendering errors (it's a photo). No LaTeX. No verification step.

### V2 — Multi-Agent Text Extraction (Future)
- Agent 1: Vision Extractor → raw text + LaTeX + diagram bounding boxes
- Agent 2: LaTeX Critic → compiles LaTeX, sends back errors if broken (iterative loop)
- Agent 3: RAG Taxonomy Specialist → pgvector similarity against 10k tagged PYQs
- Agent 4 (optional): Auto-Solver → generates distractor_map from programmatic solution
- Human-in-loop: staging table → split-screen verification UI before publish

---

## 11. WhatsApp Automation (BYON)

### Architecture
Dedicated microservice (`apps/whatsapp-worker`). Institute director scans QR code once → session saved (encrypted) to Redis/DB.

### Messaging Flow
```
Admin clicks "Publish Results"
  → Main API: LPUSH bull:whatsapp:send { attempt_id, parent_phone, institute_id }
  → WhatsApp worker: picks job → loads institute session
  → Formats message (spintax variation per send)
  → chat.sendStateTyping() → 2s delay → sendMessage()
  → Rate limit: 1 msg / 5s (BullMQ limiter)
  → 500 students → safely complete in ~42 minutes
```

### Anti-Ban Guards
- 1 msg/5s hard rate limit
- Typing simulation before each send
- Spintax: 3 message template variants randomly selected
- Batch pause: 5-min cooldown after every 100 messages
- Onboarding mandate: parents must save institute number before enrollment

---

## 12. Security Architecture

### RBAC Matrix
| Role | Own Data | Batch Data | Institute Data | All Institutes |
|---|---|---|---|---|
| student | ✅ | ❌ | ❌ | ❌ |
| teacher | ✅ | Assigned batches | ❌ | ❌ |
| institute_admin | ✅ | Own institute | ✅ | ❌ |
| super_admin | ✅ | ✅ | ✅ | ✅ |

### Critical Security Rules
1. `correct_answer`, `distractor_map`, `explanation` stripped server-side before question delivery
2. JWT never in localStorage — Supabase SDK uses memory + httpOnly refresh cookie
3. All user inputs sanitized (DOMPurify) before rendering (XSS prevention)
4. Zod strict validation on every route's body/query/params
5. `institute_id` in JWT — every DB query appends tenant filter
6. Internal endpoints (`/api/v1/internal/*`) require `INTERNAL_API_KEY` header
7. Backend recalculates score from answer key — never trusts client-provided score
8. Submit window validated server-side — client timer is cosmetic

### Rate Limiting (Redis sliding window)
| Route | Limit | Window |
|---|---|---|
| `POST /auth/*` | 10 req | 1 min |
| `PATCH /attempts/:id` | 10 req | 30 sec |
| `POST /attempts/:id/submit` | 3 req | 1 hour |
| `GET /rankings/*` | 60 req | 1 min |
| `POST /omr-upload` | 5 req | 10 min |
| All other authenticated | 300 req | 1 min |

---

## 13. Mega-Test Problem (100k Simultaneous Submissions)

### Timeline
**12:30 PM — Pre-scale (Cloud Scheduler):**
```
Scale Test Engine: 4 → 60 pods
Scale Analysis Workers: 8 → 200 pods
Total capacity: 200 × 6 = 1,200 analysis jobs/sec
```

**12:50 PM — Cache warm-up:**
```
Load answer key → Redis
Validate all attempt records exist
Warm question cache
```

**1:00 PM — Submit burst:**
```
Each submit: JWT validate → Redis flush → DB write → BullMQ enqueue → 200ms response
Queue peaks: ~80,000 jobs
Drain time: 80,000 / 1,200 = ~67 seconds
All results ready: ~2 minutes after submit
```

**1:05 PM — Thundering herd (results polling):**
- Client adds random 500ms–3000ms jitter before first poll
- Redis serves status check in <2ms — DB never touched for status reads

**1:30 PM — HPA scales back down automatically**

---

## 14. Observability

### Mega-Test Alerts (Prometheus + Grafana)
| Metric | Warning | Critical | Action |
|---|---|---|---|
| API error rate | >1% | >5% | Page on-call |
| BullMQ queue depth | >5,000 | >20,000 | Scale workers |
| DB connection pool | >70% | >90% | Scale API pods |
| Redis memory | >60% | >80% | Purge stale keys |
| p95 submit latency | >300ms | >1s | Investigate + scale |
| WhatsApp send failures | >10% | >25% | Check session health |
| OMR upload errors | >5% | >20% | Check CSV parser |

### Incident Runbook
```
Alert: submit error rate > 5%
  T+2m: Check queue depth + pod count (Grafana)
  T+3m: If queue saturated → scale analysis workers to 300
  T+5m: If DB overloaded → route all reads to replica
  T+10m: If degraded → circuit breaker → serve cached stale results + banner
  T+60m: Post-mortem required
```

---

## 15. Deployment

### Zero-Downtime (Cloud Run Phase 1–2)
```
Deploy → new revision (0% traffic) → smoke test → shift 100% → done in 30s
Rollback: --to-revisions=PREV=100 (10 seconds)
```

### Database Migrations (Always Additive)
```
N:   Add nullable column
N+1: Use new column in code
N+2: Backfill + add NOT NULL
N+3: Remove old references
```
Never drop columns in same deploy that removes their usage.

### Feature Flags (LaunchDarkly or custom Redis flags)
Used for: SSC section locks (new feature rollout), v4 behavioral analysis (gradual), OMR upload (per-institute enable).

---

## 16. Cost Model

### Phase 2 (10k–50k users): ~$236/month
| Service | Cost |
|---|---|
| Cloud Run API (4–20 instances) | $80 |
| Cloud Run Workers (4–50 instances) | $60 |
| Supabase Pro + read replica | $25 |
| Upstash Redis | $30 |
| Vercel Pro | $20 |
| Cloudflare Pro | $20 |
| **Total** | **$235/month** |

### Phase 3 (50k–200k users): ~$2,650/month
| Service | Cost |
|---|---|
| GKE cluster (n2-standard-4 × 10 nodes) | $1,200 |
| Cloud SQL PG + 2 read replicas | $600 |
| Redis Cluster (Memorystore 10GB HA) | $300 |
| Vercel Enterprise | $150 |
| Cloudflare Business | $200 |
| Datadog | $150 |
| Cloud Storage + CDN | $50 |
| **Total** | **$2,650/month** |

**Break-even at Phase 3:** 1 institute @ ₹35,000/month covers all infra.

---

## 17. What's In v1 SYSTEM_DESIGN.md vs What's New Here

| Area | Old Doc | New (v2) |
|---|---|---|
| Multi-exam routing | ❌ | ✅ SSC vs JEE/NEET engine isolation |
| SSC section pacing | ❌ | ✅ 15-min section lock architecture |
| OMR ingestion | ❌ | ✅ CSV parsing, bulk attempt generation |
| PDF ingestion | ❌ | ✅ V1 smart crop + V2 multi-agent |
| WhatsApp BYON | ❌ | ✅ Session management + anti-ban guards |
| White-label/Tenancy | ❌ | ✅ Subdomain routing, RLS, JWT isolation |
| Anti-cheating detail | Partial | ✅ Full UUID shuffle + server-side clock |
| Analysis v4 | v2 only | ✅ Behavioral analysis, panic cascade, fatigue |
| Longitudinal profile | Mentioned | ✅ Full DB schema + detector logic |
| Correct-but-guessed | ❌ | ✅ Detector + UX recommendation |
| Urgency-aware study plan | ❌ | ✅ 4 modes (Foundation/Growth/Sprint/Crisis) |
| NL Narrative | ❌ | ✅ Teacher-quality text summary |
| B2B publish edge cases | Partial | ✅ All failure modes documented |
| OMR offline mode degradation | ❌ | ✅ Feature-by-feature disabled list |
| PWA strategy | ❌ | ✅ Per-institute branded home screen app |
| Student enrollment flows | ❌ | ✅ CSV + invite code flows |
| Feature flags | ❌ | ✅ Gradual rollout strategy |
| PYQ system | ❌ | ✅ Mentioned in schema |
| Booster auto-generation | ❌ | ✅ seenQIds dedup in schema |

---

## 18. Trade-off Register

| Decision | Chosen | Rejected | Reason |
|---|---|---|---|
| Analysis engine | Rule-based | LLM | ₹0 vs ₹3k–₹90k/day at 100k scale |
| Auth | Supabase JWT | Custom sessions | Handles refresh, PKCE, MFA |
| Database | PostgreSQL only | PG + MongoDB | JSONB handles semi-structured |
| Submit flow | Async (BullMQ) | Synchronous | Sync blocks 800ms+ at 100k |
| Leaderboard | Nightly batch | Real-time | Real-time requires re-score on every submit |
| Autosave | Redis-first | Direct DB write | 3,333 RPS would overwhelm DB |
| Question delivery | Image crops | LaTeX text | Zero rendering errors, instant |
| WhatsApp | BYON (institute number) | Meta Official API | ₹0 vs ₹0.11–0.30/msg; trust from known number |
| Multi-tenancy | Single DB + RLS | Separate DB per institute | Ops simplicity; RLS enforces isolation |
| PWA | Per-institute manifest | 100 App Store apps | Apple rejects white-label clones |
| OMR ingestion | CSV bulk upload | Manual entry | DTP operator already has this file |
| SSC engine | Isolated pipeline | Shared with JEE | Prevents SSC quirks from breaking JEE logic |

---

## 19. Open Edge Cases & Known Gaps

### 🔴 Critical (must solve before launch)
- [ ] **Payment/Billing**: No subscription management system designed. Stripe/Razorpay integration needed.
- [ ] **Email delivery**: Welcome emails, OTPs, PDF reports — transactional email service (SendGrid/Postmark) not in design.
- [ ] **PDF report generation**: Branded PDF analytics reports promised to institutes — no pipeline designed.
- [ ] **WhatsApp session expiry**: What happens when the institute director changes phone or session expires? Recovery flow missing.

### 🟡 Important (solve in first 3 months)
- [ ] **Velocity tracking**: Rate of improvement per topic per week — mentioned in pitch, not in analysis engine output.
- [ ] **At-risk student alerts**: Teacher dashboard alert when student score drops 2 weeks consecutively.
- [ ] **Distractor map UX**: Teacher question tagging flow not designed — currently distractor_map is always null.
- [ ] **PYQ system**: `pyqs.controller.ts` exists but no search/filter/serve pipeline documented.
- [ ] **Doubt/Forum module**: Mentioned in past conversations (batch discussion forum) — no system design.
- [ ] **Parent dashboard**: Parents see child's weekly progress — promised in pitch, not designed.
- [ ] **Mobile OMR scanning**: App camera → OpenCV bubble scan (Workflow C in neet_offline_architecture.md).
- [ ] **Batch invite code expiry**: 6-digit codes should expire after N days or N uses.

### 🟢 Nice to Have
- [ ] **Cross-institute leaderboard**: National rank across all institutes using ExamPrep.
- [ ] **Teacher question tagging**: Teacher adds `distractor_map` to questions via UI — upgrades classifier from 70% to 90%+ confidence.
- [ ] **Adaptive test generation**: Booster tests that dynamically adjust difficulty based on real-time answer stream.
- [ ] **Student score velocity chart**: Week-over-week improvement graph across all tests.

## 20. Ranking Engine (Nightly Batch Job)

```sql
-- Runs at midnight via pg_cron / Cloud Scheduler
-- Efficient batch ranking via window functions
WITH scored AS (
  SELECT student_id, exam_id,
    (avg_score * 0.40) + (consistency * 0.25) +
    (improvement * 0.20) + (speed_score * 0.15) AS rank_score
  FROM student_stats
  WHERE last_test_at > NOW() - INTERVAL '24 hours'
)
INSERT INTO leaderboards
  (student_id, exam_id, scope, rank_position, rank_score, percentile, computed_at)
SELECT
  student_id, exam_id, 'global',
  RANK()         OVER (PARTITION BY exam_id ORDER BY rank_score DESC),
  rank_score,
  PERCENT_RANK() OVER (PARTITION BY exam_id ORDER BY rank_score),
  NOW()
FROM scored
ON CONFLICT (student_id, exam_id, scope)
DO UPDATE SET
  rank_position = EXCLUDED.rank_position,
  rank_score    = EXCLUDED.rank_score,
  percentile    = EXCLUDED.percentile,
  computed_at   = EXCLUDED.computed_at;
-- After compute: DEL leaderboard:{exam}:* from Redis → next read repopulates cache
```

**Ranking scopes:** `global` (all institutes), `institute` (within institute), `batch` (within batch).
All three computed in the same nightly job with different `PARTITION BY` clauses.

**Velocity tracking (feeds ranking score):**
```sql
-- improvement component = avg accuracy delta over last 5 tests
WITH deltas AS (
  SELECT student_id, exam_id,
    accuracy - LAG(accuracy, 1) OVER (PARTITION BY student_id, exam_id ORDER BY created_at) AS delta
  FROM analysis_results
  WHERE created_at > NOW() - INTERVAL '30 days'
)
SELECT student_id, exam_id, AVG(delta) AS improvement_velocity
FROM deltas WHERE delta IS NOT NULL
GROUP BY student_id, exam_id;
```

---

## 21. PYQ System (Past Year Questions)

### 21.1 Data Model
```sql
CREATE TABLE pyq_questions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_exam TEXT NOT NULL,   -- 'jee-main', 'neet', 'ssc-cgl'
  year        INTEGER,
  shift       TEXT,            -- 'shift-1', 'shift-2', null for NEET
  subject     TEXT,
  chapter     TEXT,
  topic       TEXT,
  image_url   TEXT,            -- GCS URL (V1 image-crop approach)
  latex_text  TEXT,            -- V2 text extraction (nullable)
  answer      TEXT,            -- A/B/C/D or integer
  difficulty  TEXT,
  distractor_map JSONB,
  tags        TEXT[],
  created_at  TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_pyq_exam_subject ON pyq_questions(source_exam, subject, chapter);
CREATE INDEX idx_pyq_year ON pyq_questions(source_exam, year DESC);
```

### 21.2 PYQ API Endpoints
| Method | Path | Purpose |
|---|---|---|
| `GET` | `/pyqs?exam=jee-main&subject=Physics&chapter=...` | Filter + paginate |
| `GET` | `/pyqs/:id` | Single question (with answer stripped until solved) |
| `GET` | `/pyqs/topics?exam=jee-main` | Topic tree for filter UI |
| `POST` | `/pyqs/:id/attempt` | Record student's PYQ attempt (feeds into longitudinal profile) |

### 21.3 PYQ → Booster Loop
```
Student weak in "Thermodynamics" (from analysis)
  → booster.ts: SELECT from pyq_questions WHERE topic='Thermodynamics'
                AND id NOT IN (student's seenQIds)
                ORDER BY difficulty ASC (easy first for confidence)
                LIMIT 15
  → Generates next_test_config with those 15 PYQ question IDs
  → Student takes booster → attempt recorded → feeds back into analysis
```

---

## 22. Velocity Tracking (At-Risk Detection)

### 22.1 Student Velocity Metric
```typescript
// Computed per student after each new analysis result
interface StudentVelocity {
  student_id: string;
  exam_id: string;
  topic: string;
  week_over_week_delta: number;  // accuracy change vs last test
  rolling_5_test_trend: "improving" | "flat" | "declining";
  at_risk: boolean;              // declining for 2+ consecutive tests on same topic
}
```

### 22.2 At-Risk Alert Rules
| Condition | Alert Level | Teacher Action |
|---|---|---|
| Same topic weak in 3+ consecutive tests | `critical` | Longitudinal flag surfaced in dashboard |
| Overall score declined 2 tests in a row | `warning` | Student marked orange in batch list |
| Score improved >15% week-over-week | `positive` | Highlighted in batch dashboard (gamification signal) |
| Topic accuracy 0% with ≥3 Qs attempted | `blind_spot` | Teacher recommendation: "Re-teach this topic in class" |

### 22.3 Teacher Dashboard Feed
```
Batch: JEE 2026 — Morning
  🔴 Rohan Sharma      — Thermodynamics: 0% for 4 consecutive tests. Needs intervention.
  🟡 Priya Mehta       — Score dropped: 156 → 132 → 119. Investigate.
  🟢 Arjun Verma       — Chemistry improved 28% this week. Share with class.
```

---

## 23. PDF Report Generation

### 23.1 Architecture
```
Analysis complete → POST /internal/reports/generate
  → Triggered by: Admin publish flow
  → Template engine: Puppeteer (headless Chrome) renders HTML → PDF
  → Data: analysis_results JOIN institute (logo, colors, name)
  → Output: branded PDF uploaded to GCS → signed URL (24h expiry)
  → Stored: reports table (attempt_id, url, expires_at)
```

### 23.2 Report Contents
- Page 1: Cover — Institute logo + student name + test name + date
- Page 2: Score Summary — marks, percentile, rank (global + batch)
- Page 3: Topic Heatmap — all chapters color-coded (green/yellow/red)
- Page 4: Error Pattern Analysis — 9 detectors with explanations
- Page 5: Free Marks — "You left X marks on the table" projection
- Page 6: 7-Day Study Plan — urgency-aware, exam-date-aware
- Page 7: Behavioral Analysis — fatigue curve chart, attempt strategy

### 23.3 Institute Branding
```typescript
// Puppeteer template receives:
interface ReportTheme {
  logoUrl: string;
  primaryColor: string;   // e.g. '#E63946'
  instituteName: string;
  headerText: string;     // e.g. "Vidyamandir Classes — JEE 2026 Test Series"
}
```

---

## 24. Email Delivery

### 24.1 Transactional Email Events
| Trigger | Template | Provider |
|---|---|---|
| New student account created | Welcome + set-password link | SendGrid / Postmark |
| Test published | "Your results are ready" + link | SendGrid |
| PDF report ready | Report attached or linked | SendGrid |
| OTP / password reset | OTP code | SendGrid |
| Weekly progress digest | Top 3 improvements + 1 alert | SendGrid |
| Institute trial expiring | "7 days left" upsell | SendGrid |

### 24.2 Email Architecture
```
Event occurs in main API
  → LPUSH bull:email:send { template_id, to, data }
  → Email worker picks job → renders template → SendGrid API
  → Rate limit: 100 emails/sec (SendGrid Pro)
  → Retry: 3× on 5xx, dead-letter queue on final failure
```

### 24.3 Branded Emails
From address: `results@vidyamandir.examprep.com` (custom domain per institute via SendGrid sub-users).
Subject: "Arjun, your NEET Mock 4 results from Vidyamandir Classes are ready."

---

## 25. Payment & Billing System

### 25.1 Architecture (Razorpay — India-first)
```
Institute admin clicks "Upgrade Plan"
  → POST /billing/create-subscription { plan_id, institute_id }
  → Razorpay: create subscription object → returns checkout URL
  → Webhook: razorpay.subscription.activated → UPDATE institutes SET plan='growth', plan_expires_at=...
  → Webhook: razorpay.subscription.charged → INSERT payment_history record
  → Webhook: razorpay.subscription.halted → email admin → downgrade to free tier after 7-day grace
```

### 25.2 Plan Enforcement (Middleware)
```typescript
// On every institute-scoped API request:
const institute = await getInstitute(req.user.institute_id);
if (institute.plan_expires_at < new Date()) {
  // Grace period check
  if (daysSinceExpiry > 7) {
    return 402({ error: 'Subscription expired. Renew at billing.examprep.com' });
  }
}
// Feature gate: OMR upload only on Growth+ plans
if (req.path.includes('omr-upload') && institute.plan === 'starter') {
  return 403({ error: 'OMR upload requires Growth plan or above' });
}
```

### 25.3 Plan Limits
| Plan | Students | Batches | OMR Upload | WhatsApp | PDF Reports |
|---|---|---|---|---|---|
| Free (trial) | 50 | 1 | ❌ | ❌ | ❌ |
| Starter ₹8k/mo | 60 | 1 | ❌ | ✅ | ✅ |
| Growth ₹18k/mo | 200 | 5 | ✅ | ✅ | ✅ |
| Institute ₹35k/mo | Unlimited | Unlimited | ✅ | ✅ | ✅ + Custom domain |

---

## 26. Doubts & Community Forum

### 26.1 Architecture
Not a chat system — a structured Q&A forum per batch.

```
Student asks doubt → POST /batches/:id/doubts { question_text, image_url, topic, chapter }
  → Stored in doubts table (batch_id, student_id, text, status='open')
  → Broadcast via WebSocket to teacher's dashboard: new doubt notification

Peer answers → POST /doubts/:id/answers { text }
  → stored in doubt_answers, sender_id = another student

Teacher endorses → PATCH /doubts/:id/answers/:answer_id/endorse
  → status='endorsed', doubt.status='resolved'
  → Endorsed answers appear at top (teacher-certified)

Anonymity → student can post doubts anonymously (display as "Student #42")
  → institute_admin and teacher can see real identity for moderation
```

### 26.2 Schema
```sql
CREATE TABLE doubts (
  id UUID PRIMARY KEY, batch_id UUID, student_id UUID,
  question_text TEXT, image_url TEXT,
  topic TEXT, chapter TEXT, subject TEXT,
  status TEXT DEFAULT 'open',  -- open / resolved / closed
  upvotes INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE doubt_answers (
  id UUID PRIMARY KEY, doubt_id UUID, student_id UUID,
  answer_text TEXT, is_anonymous BOOLEAN DEFAULT false,
  is_endorsed BOOLEAN DEFAULT false,  -- teacher-endorsed = verified answer
  upvotes INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## 27. Parent Dashboard

### 27.1 Access Flow
- Parent gets a read-only magic link per student (no password required)
- Link: `examprep.com/parent/:parent_token` — JWT with `role: 'parent', student_id: '...'`
- Parent token generated when student account created; sent via WhatsApp/SMS

### 27.2 Parent Dashboard Contents
- **This Week**: Last test score + percentile + "improved/declined vs last week"
- **Attendance**: Tests taken vs tests assigned (% participation)
- **Top 3 Weak Topics**: With simple language (no jargon)
- **Teacher Note**: If teacher added a remark for the student
- **Next Test**: Date + time of upcoming mock

### 27.3 Parent Notification Triggers
| Event | Channel | Message |
|---|---|---|
| Test result published | WhatsApp | "Arjun scored 187/300. Weakest: Thermodynamics. Full report: [link]" |
| Score dropped >15% | WhatsApp | "Arjun's score fell this week. We recommend a parent-teacher discussion." |
| Test not attended | WhatsApp | "Arjun did not appear for today's mock test." |
| Weekly digest | WhatsApp (Sunday) | "This week's performance summary for Arjun." |

---

## 28. CI/CD Pipeline

### 28.1 Pipeline (GitHub Actions)
```
[Push to main] → CI:
  → pnpm install (cached)
  → tsc --noEmit (type check)
  → eslint (lint)
  → vitest run (unit tests: analysis engine services)
  → docker build (smoke test: API starts without crash)

[All green] → CD:
  → gcloud run deploy apps/api → new revision (0% traffic)
  → smoke test: GET /health → 200
  → gcloud run services update-traffic → 100% to new revision
  → Vercel: auto-deploy apps/web on push (zero config)
```

### 28.2 Environment Strategy
| Env | Branch | DB | Notes |
|---|---|---|---|
| Local | any | Supabase local / Docker PG | .env.local |
| Staging | `develop` | Supabase staging project | Real data, institute_id=staging |
| Production | `main` | Supabase prod + read replicas | Protected branch, requires PR |

### 28.3 Database Migration Safety
- Migrations via `supabase db push` or Prisma migrate
- All migrations are additive (never DROP in same release as removal from code)
- Staging always runs migrations 24h before production
- Rollback plan: every migration paired with a corresponding rollback script

---

## 29. DTP Operator Workflow (B2B Ingestion)

ExamPrep explicitly rejects the "collaborative teacher task" workflow. Teachers hate data entry.

### The Real-World Pipeline
```
1. Subject teacher handwrites/rough-drafts questions
2. DTP operator types full 200-Q paper → generates PDF
3. Institute admin/DTP logs into ExamPrep dashboard
4. Clicks "Create Test" → uploads PDF
5. V1 Smart Cropping: PDF → 200 question images (seconds)
6. Uploads CSV answer key (A/B/C/D per question)
7. Sets: test date, batch, duration, marking scheme
8. Students take test → see question images → tap A/B/C/D
9. Admin: "Close & Analyze" → all reports generated
10. Admin: "Publish" → students see results + WhatsApp blast fires
```

### Why This Wins B2B
- Institute does NOT change existing workflow (they already make a PDF)
- Zero teacher involvement in data entry
- From PDF upload to live test: ~15 minutes
- No dependency on teacher tech-savviness

---

## 30. Future Roadmap

### v5 Analysis Engine
- [ ] **Peer comparison**: "You score 23% lower than batch average on Carnot Cycle — but 15% higher on Kinetic Theory"
- [ ] **Adaptive difficulty**: Real-time question difficulty adjusts based on live answer stream (requires text-based questions, not image crops)
- [ ] **Teacher distractor map UI**: Teachers tag distractors directly in question editor → upgrades classifier confidence from ~70% to 90%+
- [ ] **Cross-institute anonymized benchmarks**: "Your batch's Thermodynamics accuracy is in the bottom 30% of all ExamPrep institutes"

### Mobile App (React Native)
- [ ] Offline test mode (Hybrid Speed Run workflow) — requires local SQLite buffer
- [ ] Push notifications for test reminders, result alerts
- [ ] OMR scanning via phone camera (OpenCV / AWS Rekognition)
- [ ] Biometric login (TouchID/FaceID) for exam-day security

### Infrastructure
- [ ] Kafka event bus (Phase 4 trigger at 200k+ users)
- [ ] pgvector for semantic PYQ search ("find questions similar to this one")
- [ ] Multi-region deployment (Mumbai + Singapore) for sub-50ms latency nationwide
- [ ] Automated KEDA scaling tests before each Mega-Test

