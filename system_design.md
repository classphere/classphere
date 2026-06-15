# ExamPrep — System Design for 100,000+ Concurrent Users

**Author:** Engineering Team | **Version:** 1.0

---

## 1. Scale Targets & SLAs

### Traffic Profile
| Metric | Normal | Peak (Mega-Test day) |
|---|---|---|
| Concurrent users | 5,000 | 100,000 |
| Requests/second | 2,000 RPS | 45,000 RPS |
| Test submissions/minute | 500 | 80,000 |
| Analysis jobs/minute | 500 | 80,000 |
| Leaderboard reads/sec | 200 | 12,000 |

### SLA Commitments
| Endpoint | p50 | p95 | p99 |
|---|---|---|---|
| `GET /questions` (cached) | 20ms | 60ms | 120ms |
| `PATCH /attempts/:id` (autosave) | 30ms | 80ms | 150ms |
| `POST /attempts/:id/submit` | 100ms | 300ms | 500ms |
| `GET /analysis/:id` (polling) | 15ms | 40ms | 80ms |
| `GET /rankings/leaderboard` | 15ms | 40ms | 80ms |

### Peak Event Characteristics
JEE/NEET mock tests are time-gated — 80% of daily traffic hits within a **90-minute window**. The system must pre-scale 30min before the window opens and drain gracefully after.

---

## 2. Capacity Planning (Back-of-Envelope)

**Autosave load** (every 30s, 100k concurrent students):
```
100,000 / 30s = 3,333 RPS
Payload: ~2KB → 6.5 MB/s inbound
```

**Submission burst** (100k in 10 minutes):
```
100,000 / 600s = ~167 submissions/sec
DB writes: 167 × 75 rows (answers) = 12,525 rows/sec peak
```

**Analysis queue at peak**:
```
80,000 jobs × 800ms avg = needs ~1,060 parallel workers
200 pods × 6 concurrent = 1,200 slots → 67 second drain time
```

**Storage growth**:
```
Per attempt: 50KB (answers) + 15KB (analysis) = 65KB
100k attempts/day × 65KB = 6.5 GB/day → partition by month
```

---

## 3. Architecture Evolution

### Phase 1 — MVP (0–10k users): Modular Monolith
```
[Vercel CDN] → [Next.js Frontend]
                       |  HTTPS
               [Cloud Run: Node.js API]
                       |
            [Supabase PG] + [Upstash Redis]
```

### Phase 2 — Growth (10k–50k users): Extract Hot Services
```
[Vercel CDN] → [Next.js Frontend]
                       |
              [Cloud Run: API Gateway]
             /          |           \
    [Auth Svc]   [Test Engine]   [Analysis Svc]
                                       |
                               [BullMQ Workers]
                                       |
                           [Supabase PG + Redis]
```

### Phase 3 — Scale (50k–200k users): Full Microservices on GKE
```
[Cloudflare WAF + DDoS] → [GKE Ingress / Nginx]
                                     |
         ┌───────────────────────────┼───────────────────────┐
         ▼                           ▼                       ▼
  [Auth Service]            [Test Engine]          [Analysis Service]
  Stateless, JWT             10–60 pods HPA          8–200 pods (KEDA)
         |                           |                       |
         └─────────────┬─────────────┘                       |
                       ▼                                     ▼
              [PostgreSQL Primary]                  [Redis Cluster]
              + 2 Read Replicas                 (BullMQ + App Cache)
                       |
            [GCP Cloud Storage + CDN]
                 (Question images)
```

### Phase 4 — Hyper-Scale (200k+): CQRS + Event Sourcing
Introduce **Kafka** as event bus. Write path: submission events → Kafka topics → consumer services build denormalized read models. Leaderboard becomes an eventually-consistent materialized view. Full CQRS separation of read and write models.

---

## 4. Component Architecture

### 4.1 Edge Layer (Cloudflare)
- DDoS absorption — blocks volumetric attacks before origin
- Rate limiting at edge: 10 req/min on `/auth/*`, 300 req/min general
- Edge cache: static assets (1yr TTL), CDN for question images
- Cloudflare Workers: JWT signature validation at edge — bad tokens rejected in <1ms, never touch origin

### 4.2 Test Engine Service (Critical Path)
The most important service. Design principles:

1. **Stateless** — all state lives in Redis/DB; any pod handles any request
2. **Questions from Redis** — DB never queried during active test
3. **Autosave is write-to-Redis-first** — returns 200 in <30ms; DB sync is async
4. **Submit is two-phase** — acknowledge sync, analyze async

**Autosave flow:**
```
PATCH /attempts/:id
  → Validate JWT (~5ms middleware)
  → HSET attempt:{id}:answers {field: value} → Redis (~2ms)
  → Return 200 { saved: true }         ← total: <30ms
  ↓ Background (every 5s, separate process)
  → Read Redis hash → bulk UPSERT to attempt_answers table
```

**Submit flow:**
```
POST /attempts/:id/submit
  → Validate JWT + attempt ownership
  → Flush final answers: Redis → DB (sync, single transaction)
  → Score: GET answerkey:{test_id} from Redis → score in-memory (<10ms)
  → UPDATE attempts SET score, status='submitted'
  → LPUSH bull:analysis:wait {attempt_id}  ← BullMQ enqueue
  → Return 200 { attempt_id, score: { correct, incorrect, marks } }
  ↓ BullMQ Worker (async)
  → 9-stage analysis pipeline runs (~800ms)
  → INSERT analysis_results {attempt_id, result, status:'ready'}
```

### 4.3 Analysis Engine (BullMQ Workers)
The deterministic rule-based engine (no LLM) is the correct architecture choice for scale:
- **Cost**: ₹0 per analysis vs ₹0.03–₹0.90 for LLM calls
- **Speed**: ~800ms vs 3–8s for LLM
- **Parallelizable**: spin up 200 workers trivially

**BullMQ Configuration:**
```typescript
const worker = new Worker('analysis', processJob, {
  connection: redis,
  concurrency: 6,  // 6 parallel jobs per pod
  limiter: { max: 100, duration: 1000 }  // 100 jobs/sec/pod cap
});
```

**KEDA (Kubernetes Event-Driven Autoscaling) — scales pods by queue depth:**
```yaml
triggers:
- type: redis
  metadata:
    listName: bull:analysis:wait
    listLength: "50"   # scale up when >50 waiting jobs per pod
minReplicaCount: 8
maxReplicaCount: 200
```

**9-stage pipeline (current implementation):**
1. Scoring — marks calculation with exam-specific scheme
2. Topic accuracy — per-topic correct/incorrect/skipped
3. Weak topic identification — accuracy < 50% threshold
4. Error classification — maps wrong answers to distractor error types
5. Time analysis — per-question time vs optimal speed
6. Error pattern detection — systematic mistake patterns
7. Study plan generation — 7-day personalized plan
8. Booster config — micro/full booster test configuration
9. Batch aggregation — feeds teacher batch analytics

### 4.4 Ranking Engine (Nightly Job)
```sql
-- Efficient batch ranking via window functions
WITH scored AS (
  SELECT student_id, exam_id,
    (avg_score * 0.40) + (consistency * 0.25) +
    (improvement * 0.20) + (speed_score * 0.15) AS rank_score
  FROM student_stats
  WHERE last_test_at > NOW() - INTERVAL '24 hours'
)
INSERT INTO leaderboards
  (student_id, exam_id, scope, rank_position, rank_score, percentile)
SELECT student_id, exam_id, 'global',
  RANK()         OVER (PARTITION BY exam_id ORDER BY rank_score DESC),
  rank_score,
  PERCENT_RANK() OVER (PARTITION BY exam_id ORDER BY rank_score)
FROM scored
ON CONFLICT (...) DO UPDATE SET rank_position = EXCLUDED.rank_position, ...
```

After compute, Redis leaderboard cache keys are invalidated. Next request repopulates cache.

---

## 5. Data Architecture

### PostgreSQL — Key Indexes
```sql
-- attempt_answers: bulk upserts + per-attempt reads
CREATE INDEX idx_aa_attempt ON attempt_answers(attempt_id);
CREATE UNIQUE INDEX idx_aa_pk ON attempt_answers(attempt_id, question_id);

-- attempts: student history + status filter
CREATE INDEX idx_att_student ON attempts(student_id, status, created_at DESC);

-- leaderboards: paginated sorted reads
CREATE INDEX idx_lb_exam_scope ON leaderboards(exam_id, scope, rank_position ASC);

-- analysis_results: polling reads
CREATE INDEX idx_ar_attempt_status ON analysis_results(attempt_id, status);

-- Time-series partitioning (attempt_answers grows fastest)
CREATE TABLE attempt_answers PARTITION BY RANGE (created_at);
CREATE TABLE attempt_answers_2026_06 PARTITION OF attempt_answers
  FOR VALUES FROM ('2026-06-01') TO ('2026-07-01');
```

### Read Replicas
| Replica | Serves |
|---|---|
| Primary | All writes |
| Replica 1 | Leaderboard reads, history, profile |
| Replica 2 | Analytics dashboard, batch analysis, admin |

### Questions Data Flow
Questions are read-heavy, write-rarely:
```
PostgreSQL (source of truth)
    ↓ on first request (cache miss)
Redis: SET questions:{test_id} {json} EX 86400
    ↓ CDN
GCP Cloud Storage + CDN URL (for images)
```
100k students reading the same test → all hit Redis, zero DB load.

---

## 6. Caching Strategy

### Redis Key Taxonomy
| Key | TTL | Invalidation trigger |
|---|---|---|
| `questions:{test_id}` | 24h | Question update |
| `answerkey:{test_id}` | 24h | Answer key update |
| `attempt:{id}:answers` | 4h | On submit |
| `leaderboard:{exam}:{scope}:{page}` | Until midnight | Nightly ranking job |
| `user:{id}:profile` | 15min | Profile update |
| `ratelimit:{ip}:{route}` | 60s | Expires naturally |

### Cache Policies by Data Type
| Data | Strategy | Rationale |
|---|---|---|
| Question bank | Cache-aside, long TTL | Static once published |
| Active test answers | Write-through to Redis | Must be durable; DB sync async |
| Leaderboard | Read-aside, nightly invalidation | Acceptable staleness |
| Analysis results | Write-on-complete, read-aside | Written once, read many times |
| User profile | Cache-aside, short TTL | Can change (settings update) |

---

## 7. The Mega-Test Problem

**Scenario**: 100k students submit at 1:00 PM exactly.

### Timeline

**12:30 PM — Pre-scale trigger (Cloud Scheduler):**
```
Scale Test Engine pods: 4 → 60
Scale Analysis Workers: 8 → 200
Total analysis capacity: 200 × 6 = 1,200 jobs/sec
```

**12:50 PM — Cache warm-up job:**
```
Loads answer key into Redis
Validates all active attempt records exist
Confirms question cache is warm
```

**1:00 PM — Submit burst (100k in ~30 seconds):**
```
Each submit request:
1. Read client answer payload (from request body)
2. Score against answer key from Redis (no DB read, <10ms)
3. Write scored attempt to DB (single row UPDATE)
4. Enqueue analysis job → Redis LPUSH (<2ms)
5. Return 200 in < 150ms total
→ Queue peaks at ~80,000 jobs
→ Drain time: 80,000 / 1,200 = ~67 seconds
→ All students have analysis within ~2 minutes of submit
```

**1:05 PM — Thundering herd prevention for results polling:**
- Client adds random 500ms–3000ms jitter before first poll
- Redis serves status check in <2ms (no DB touch)
- At 100k polling simultaneously: 100,000 × 2ms = 200 seconds of Redis CPU if serial, but Redis pipelines handle this with trivial load

**1:30 PM — HPA scales back down automatically**

---

## 8. Security Architecture

### Auth Flow
```
1. Client: supabase.auth.signInWithPassword()
2. Supabase → JWT (RS256, 1h expiry) + refresh token (httpOnly cookie)
3. All API requests: Authorization: Bearer {jwt}
4. API middleware: jwt.verify(token, SUPABASE_JWT_SECRET) → req.user
5. Supabase RLS policies: defense-in-depth even if API is bypassed
```

> ⚠️ **Never store JWT in localStorage** — XSS risk. Use Supabase's built-in session management (stores in memory + refresh via httpOnly cookie).

### RBAC Matrix
| Role | Own data | Batch data | Institute data | All data |
|---|---|---|---|---|
| student | ✅ | ❌ | ❌ | ❌ |
| teacher | ✅ | Assigned batches only | ❌ | ❌ |
| institute | ✅ | Own institute | ✅ | ❌ |
| super_admin | ✅ | ✅ | ✅ | ✅ |

### Rate Limiting (Redis sliding window)
| Route group | Limit | Window |
|---|---|---|
| `POST /auth/*` | 10 req | 1 min |
| `PATCH /attempts/:id` | 10 req | 30 sec |
| `POST /attempts/:id/submit` | 3 req | 1 hour |
| `GET /rankings/*` | 60 req | 1 min |
| All other authenticated | 300 req | 1 min |

### Critical Security Rules
- `correct_answer` field is **stripped server-side** before sending questions to students
- Supabase Row Level Security policies enforce `student_id = auth.uid()` on all attempt reads/writes
- Internal endpoints (`/api/v1/internal/*`) protected by `INTERNAL_API_KEY` header, not user JWT

---

## 9. Observability

### Metrics (Prometheus + Grafana)
**Mega-Test dashboard alerts:**

| Metric | Warning | Critical | Action |
|---|---|---|---|
| API error rate | >1% | >5% | Page on-call |
| BullMQ queue depth | >5,000 | >20,000 | Scale workers |
| DB connection pool | >70% | >90% | Scale API pods |
| Redis memory | >60% | >80% | Purge stale keys |
| p95 submit latency | >300ms | >1s | Investigate + scale |

### Distributed Tracing
Every request: `X-Request-ID` injected at Nginx → propagated through BullMQ job payload → worker → DB query.

On incident: search `X-Request-ID: abc123` in Datadog → full call chain in one view.

### Mega-Test Runbook
```
Alert: submit error rate > 5%
  T+2m: Check queue depth + pod count in Grafana
  T+3m: If queue saturated → kubectl scale deployment analysis-worker --replicas=300
  T+5m: If DB overloaded → force all reads to read-replica
  T+10m: If still degraded → circuit breaker → return cached stale results with warning banner
  T+60m: Post-mortem required
```

---

## 10. Deployment

### Zero-Downtime Strategy
**Cloud Run (Phase 1–2):**
```
gcloud run deploy → new revision (0% traffic) → smoke test → 
gcloud run services update-traffic → shift 100% → done in 30s
Rollback: --to-revisions=PREV=100 (takes 10 seconds)
```

**Database migrations (always additive):**
```
Deploy N:   Add new column (nullable, no default required)
Deploy N+1: Use new column in code
Deploy N+2: Backfill data, add NOT NULL constraint
Deploy N+3: Remove old column references
```
Never drop columns or tables in the same deploy that removes their usage.

### Dockerfile (API)
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . . && npm run build

FROM node:20-alpine AS runner
RUN addgroup -S app && adduser -S app -G app
WORKDIR /app
COPY --from=builder --chown=app:app /app/dist ./dist
COPY --from=builder --chown=app:app /app/node_modules ./node_modules
USER app
EXPOSE 8080
HEALTHCHECK CMD wget -qO- http://localhost:8080/health || exit 1
CMD ["node", "dist/index.js"]
```

---

## 11. Cost Model

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
| Cloud SQL PostgreSQL + 2 read replicas | $600 |
| Redis Cluster (Memorystore 10GB HA) | $300 |
| Vercel Enterprise | $150 |
| Cloudflare Business | $200 |
| Datadog monitoring | $150 |
| Cloud Storage + CDN | $50 |
| **Total** | **$2,650/month** |

**Break-even at Phase 3:**
- 27 student subscriptions @ ₹999/month covers all infra
- 1 institute @ ₹15,000/month covers all infra

---

## 12. Trade-off Register

| Decision | Chosen | Rejected | Reason |
|---|---|---|---|
| Analysis engine | Rule-based | LLM | ₹0 vs ₹3k–₹90k/day at 100k scale |
| Auth | Supabase JWT | Custom sessions | Handles refresh, PKCE, MFA out of the box |
| Database | PostgreSQL only | PG + MongoDB | JSONB handles semi-structured; simpler operations |
| Submit flow | Async (BullMQ) | Synchronous | Sync blocks 800ms+; unacceptable at 100k concurrent |
| Leaderboard | Nightly batch | Real-time | Real-time needs re-score on every submit — prohibitive |
| Autosave | Redis-first → async DB | Direct DB write | 3,333 RPS would overwhelm Supabase free tier |
| Frontend session | Supabase SDK (memory) | localStorage | XSS protection; SDK handles token refresh |
| Infra scaling | Cloud Run → GKE | Serverless functions | Functions have cold starts; containers are predictable |
| Image storage | GCP Cloud Storage + CDN | DB blobs | Offloads bandwidth from API, CDN edge caching |
