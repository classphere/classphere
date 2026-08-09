# Work log

A running record of what changed, what it fixed, and what is still open.
Newest session first. Each entry names the commit so the record and the history
cannot drift apart.

---

## 3 – 8 August 2026

Thirteen commits. Three themes: remove things that were never wired up, unify the
PDF→CBT review path across every role that uses it, and add the first check that
compares an extracted paper against the PDF it came from.

### Shipped

| Date | Commit | What |
|---|---|---|
| 4 Aug | `91a7a50` | Removed the study streak — read by the dashboard, incremented by nothing |
| 4 Aug | `209718f` | Maintenance mode built for real: drain semantics, superadmin exempt, branded splash. Config page 8 controls → 1 |
| 5 Aug | `8bf03d2` | Removed the retired ranking/XP layer: `/internal` cron module, `rank_score`, XP counter, `leaderboards` table, two `410` endpoints |
| 5 Aug | `34872f4` | Weekly leaderboard counts unique **correct** answers; added the batch all-time board |
| 5 Aug | `55d056f` | Migration 50 — drops the four DB objects nothing writes |
| 6 Aug | `fd5c422` | Untracked `api_keys.txt` |
| 6 Aug | `6694f21` | Removed the Datalab-era extractor pipeline: 11 files, ~3,900 lines. `extract_common.py` → `question_diagnostics.py` (1,137 → 246 lines) |
| 6 Aug | `a43703f` | One KaTeX sizing rule; question and its options share one type token |
| 7 Aug | `df5ea0a` | Institute admin unblocked across upload, review and question-bank creation |
| 7 Aug | `b61e5c8` | `lib/paper-validation.ts` — one validator for review and publish, reporting per question. Question removal added |
| 7 Aug | `7ffb269` | `PaperReviewWorkspace` — one review screen for all four roles. TD 400→204 lines, superadmin 210→116 |
| 8 Aug | `63cb52e` | **New capability**: each question scored against the text PyMuPDF read off its page |
| 8 Aug | `a9884ea` | Schedule Test gains a question-bank mode alongside PDF upload |
| — | *uncommitted* | Removed `PDF_EXTRACTOR_V4`; document profiling is now unconditional |

### Bugs found

| Bug | Status | Commit |
|---|---|---|
| Streak permanently zero, shown as a real metric | Fixed | `91a7a50` |
| Weekly leaderboard counted clicks, not correct answers — guessing 180 beat solving 120 | Fixed | `34872f4` |
| Weekly leaderboard truncated at PostgREST's 1,000 rows — most of a batch showed as zero | Fixed | `34872f4` |
| Three KaTeX rules competing; stem and options set in different type and weight | Fixed | `a43703f` |
| Institute admin's "Schedule Batch Test" 403'd — their main dashboard CTA, broken end to end | Fixed | `df5ea0a` |
| "N questions have no correct answer" counted every question, always — the query never selected the field the check read | Fixed | `b61e5c8` |
| `createTest` fully built and reachable from no UI | Fixed | `a9884ea` |
| **29 API keys committed to git** | **Partial** | `fd5c422` |
| **Blank questions created from false anchors** | **Partial** | `b61e5c8` |

**Why the two partials are still open:**

- **API keys** — untracking stops future exposure. The keys remain in every
  pushed commit and stay valid until rotated. Only rotation closes this.
- **Blank questions** — they can now be deleted, and the most likely *cause* was
  removed afterwards by making document profiling unconditional (see below): with
  `PDF_EXTRACTOR_V4` unset, answer-key and solution pages were never excluded
  from extraction, so their numbering produced question anchors and
  `_gap_placeholders()` created a blank slot for each.

  Still open because that is a strong hypothesis, not a confirmed fix — it wants
  a re-run of the JEE Main paper that produced 79 questions. And a genuinely
  false anchor on a question page would still slip through:
  `prune_false_anchors()` only drops runs that are both under three anchors and
  wholly contained in the main sequence.

*Not listed as a product bug: a mid-test lockout in the first draft of
maintenance mode. That was an implementation error caught before commit — it
never existed in the product.*

---

## Open

### Needs a person, not a change

- [ ] **Rotate the Cerebras keys.** Still valid, still in pushed history.
- [ ] **Push.** Commits were sitting unpushed at the end of the session.
- [ ] **Manual QA of both review screens.** Both were substantially rewritten.
      Typecheck passes; the workflow transitions and the marking-scheme save want
      a click-through on a real draft paper.
- [ ] **Calibrate the text-match threshold (0.82).** Set from constructed cases,
      not real papers. Run known-good extractions and look at where clean
      questions cluster. This one number decides whether verification helps or
      annoys.
- [x] ~~Confirm `PDF_EXTRACTOR_V4=1` is set in the real environment.~~ Resolved
      by removing the flag — profiling is now unconditional, so it cannot be off.

### From the mentor review

- [ ] Institute add-modal opens narrow; should be wider / landscape
- [ ] Logo upload has no preview
- [ ] Institute admin does not need a username field
- [ ] **Institute admin should add all department members.** Today the admin
      appoints the Head and the Head appoints Editors.
- [ ] Institute admin has no dashboard link to the review screen they can now use

### Known gaps

- [ ] **Scanned PDFs are rejected outright.** `is_digital_pdf()` requires a text
      layer. The single biggest limit on selling extraction as a service.
- [ ] **Two API families** — `/tests/*` and `/test-department/papers/*`. Both now
      call the same shared functions so behaviour cannot diverge, but the
      maintenance surface is still doubled. This is how the institute-admin role
      gaps appeared in three separate places.
- [ ] `apps/api/src/scripts/` — 15 one-off debug scripts with hardcoded paths
- [ ] `CHANGES.md` still narrates the Marker/Cerebras era
- [ ] `computeRankings` 501 stub and the unused `/rankings/rank-card` remain

### Decisions open

- [ ] Extraction pricing. Working recommendation: **₹12,000/month base including
      2,000 questions, then ₹3/question**, with volume breaks. Deliver as a
      service, never as source, and no resale rights.
- [ ] Whether extraction-as-a-service becomes the main business or stays a wedge
      for the platform.

---

## Notes worth keeping

**The extractor's architecture changed, and the old engineering is why it works
now.** Under Marker/Cerebras, `segment_questions()` had to find question
boundaries deterministically because the LLM only ever saw text. Gemini sees the
rendered page and finds them itself. The anchors survived doing a different job:
`question_reconciler` uses them to verify the model returned everything rather
than to segment the input for it. Parser became auditor — which is what gives
completeness scoring and gap placeholders.

**Validation now has two independent axes.** Structure (does this question have
an answer, four options, balanced `$`) and source fidelity (do its words appear
on the page it came from). The first passes happily on an invented question,
because an invented question is perfectly well formed. Only the second catches
that.

**`createTest` existing but unreachable is worth remembering as a pattern.** A
complete, working endpoint with no caller. Worth periodically grepping for
others.
